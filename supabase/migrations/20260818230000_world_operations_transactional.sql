-- Atomic World consequence operations.
-- Each RPC invocation is one PostgreSQL transaction: any exception rolls back
-- state, consequence status, and event/history writes together.

CREATE OR REPLACE FUNCTION public._world_apply_state_changes(
  p_world_id uuid,
  p_teacher_id uuid,
  p_changes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_change jsonb;
  v_state public.world_state%ROWTYPE;
  v_key text;
  v_operation text;
  v_input jsonb;
  v_before jsonb;
  v_after jsonb;
  v_amount numeric;
  v_current numeric;
  v_text text;
  v_applied jsonb := '[]'::jsonb;
  v_existing_index integer;
  v_requested_keys integer;
  v_locked_keys integer;
BEGIN
  IF p_changes IS NULL OR jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes) = 0 THEN
    RAISE EXCEPTION 'Konsekvensen ændrer ingenting.' USING ERRCODE = '22023';
  END IF;

  SELECT count(DISTINCT item->>'state_key')
  INTO v_requested_keys
  FROM jsonb_array_elements(p_changes) AS item
  WHERE nullif(item->>'state_key', '') IS NOT NULL;

  IF v_requested_keys <> jsonb_array_length(p_changes) AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_changes) AS item
    WHERE nullif(item->>'state_key', '') IS NULL
  ) THEN
    RAISE EXCEPTION 'En state-ændring mangler state_key.' USING ERRCODE = '22023';
  END IF;

  -- Lock every affected state row in deterministic order before reading values.
  -- This prevents lost updates and avoids opposite lock order between requests.
  PERFORM 1
  FROM public.world_state AS ws
  WHERE ws.world_id = p_world_id
    AND ws.teacher_id = p_teacher_id
    AND ws.state_key IN (
      SELECT DISTINCT item->>'state_key'
      FROM jsonb_array_elements(p_changes) AS item
    )
  ORDER BY ws.state_key
  FOR UPDATE;

  SELECT count(*)
  INTO v_locked_keys
  FROM public.world_state AS ws
  WHERE ws.world_id = p_world_id
    AND ws.teacher_id = p_teacher_id
    AND ws.state_key IN (
      SELECT DISTINCT item->>'state_key'
      FROM jsonb_array_elements(p_changes) AS item
    );

  IF v_locked_keys <> v_requested_keys THEN
    RAISE EXCEPTION 'En eller flere World-variabler findes ikke.' USING ERRCODE = '22023';
  END IF;

  FOR v_change IN SELECT value FROM jsonb_array_elements(p_changes)
  LOOP
    IF jsonb_typeof(v_change) <> 'object' THEN
      RAISE EXCEPTION 'En state-ændring skal være et objekt.' USING ERRCODE = '22023';
    END IF;

    v_key := nullif(v_change->>'state_key', '');
    v_operation := v_change->>'operation';
    IF v_operation NOT IN ('set', 'increase', 'decrease', 'enum_change', 'boolean_toggle') THEN
      RAISE EXCEPTION 'Ugyldig state-operation: %', coalesce(v_operation, 'mangler') USING ERRCODE = '22023';
    END IF;

    SELECT *
    INTO STRICT v_state
    FROM public.world_state
    WHERE world_id = p_world_id
      AND teacher_id = p_teacher_id
      AND state_key = v_key;

    v_before := v_state.value;
    v_after := v_before;
    v_input := coalesce(v_change->'amount', v_change->'value');

    IF v_operation IN ('increase', 'decrease') OR (v_operation = 'set' AND v_state.value_type = 'number') THEN
      IF v_state.value_type <> 'number' THEN
        RAISE EXCEPTION '''%'' er ikke en talvariabel.', v_state.label USING ERRCODE = '22023';
      END IF;
      IF jsonb_typeof(v_state.value) IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_input) IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'Ændringen for ''%'' kræver et tal.', v_state.label USING ERRCODE = '22023';
      END IF;
      v_current := (v_state.value #>> '{}')::numeric;
      v_amount := (v_input #>> '{}')::numeric;
      IF v_operation = 'increase' THEN
        v_current := v_current + v_amount;
      ELSIF v_operation = 'decrease' THEN
        v_current := v_current - v_amount;
      ELSE
        v_current := v_amount;
      END IF;
      IF v_state.min_value IS NOT NULL THEN
        v_current := greatest(v_current, v_state.min_value);
      END IF;
      IF v_state.max_value IS NOT NULL THEN
        v_current := least(v_current, v_state.max_value);
      END IF;
      v_after := to_jsonb(round(v_current, 2));
    ELSIF v_operation = 'boolean_toggle' THEN
      IF v_state.value_type <> 'boolean' OR jsonb_typeof(v_state.value) <> 'boolean' THEN
        RAISE EXCEPTION '''%'' er ikke en ja/nej-variabel.', v_state.label USING ERRCODE = '22023';
      END IF;
      v_after := to_jsonb(NOT ((v_state.value #>> '{}')::boolean));
    ELSIF v_operation = 'enum_change' THEN
      IF v_state.value_type <> 'enum' OR jsonb_typeof(v_input) IS DISTINCT FROM 'string' THEN
        RAISE EXCEPTION '''%'' er ikke en enum-variabel.', v_state.label USING ERRCODE = '22023';
      END IF;
      v_text := v_input #>> '{}';
      IF array_length(v_state.enum_options, 1) IS NOT NULL
        AND NOT (v_text = ANY(v_state.enum_options)) THEN
        RAISE EXCEPTION '''%'' er ikke en gyldig værdi for ''%''.', v_text, v_state.label USING ERRCODE = '22023';
      END IF;
      v_after := to_jsonb(v_text);
    ELSIF v_operation = 'set' THEN
      IF v_state.value_type = 'boolean' AND jsonb_typeof(v_input) = 'boolean' THEN
        v_after := v_input;
      ELSIF v_state.value_type IN ('text', 'enum') AND jsonb_typeof(v_input) = 'string' THEN
        v_text := v_input #>> '{}';
        IF v_state.value_type = 'enum'
          AND array_length(v_state.enum_options, 1) IS NOT NULL
          AND NOT (v_text = ANY(v_state.enum_options)) THEN
          RAISE EXCEPTION '''%'' er ikke en gyldig værdi for ''%''.', v_text, v_state.label USING ERRCODE = '22023';
        END IF;
        v_after := to_jsonb(v_text);
      ELSE
        RAISE EXCEPTION 'Ugyldig datatype for ''%''.', v_state.label USING ERRCODE = '22023';
      END IF;
    END IF;

    UPDATE public.world_state
    SET value = v_after
    WHERE id = v_state.id;

    SELECT ordinality::integer - 1
    INTO v_existing_index
    FROM jsonb_array_elements(v_applied) WITH ORDINALITY AS item(value, ordinality)
    WHERE item.value->>'state_key' = v_key
    LIMIT 1;

    IF v_existing_index IS NULL THEN
      v_applied := v_applied || jsonb_build_array(jsonb_build_object(
        'state_key', v_key,
        'label', v_state.label,
        'before', v_before,
        'after', v_after
      ));
    ELSE
      v_applied := jsonb_set(v_applied, ARRAY[v_existing_index::text, 'after'], v_after, false);
    END IF;
    v_existing_index := NULL;
  END LOOP;

  RETURN v_applied;
END;
$$;

REVOKE ALL ON FUNCTION public._world_apply_state_changes(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.world_apply_consequence(
  p_consequence_id uuid,
  p_changes jsonb,
  p_reason_text text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_teacher_id uuid := auth.uid();
  v_consequence public.world_consequences%ROWTYPE;
  v_event public.world_events%ROWTYPE;
  v_applied jsonb := '[]'::jsonb;
  v_state jsonb;
  v_deferred boolean;
BEGIN
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Du er ikke logget ind.' USING ERRCODE = '42501';
  END IF;

  SELECT wc.*
  INTO v_consequence
  FROM public.world_consequences AS wc
  JOIN public.worlds AS w ON w.id = wc.world_id
  WHERE wc.id = p_consequence_id
    AND wc.teacher_id = v_teacher_id
    AND w.teacher_id = v_teacher_id
  FOR UPDATE OF wc;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Konsekvensen blev ikke fundet i dit World.' USING ERRCODE = '42501';
  END IF;
  IF v_consequence.episode_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.world_episodes AS we
    WHERE we.id = v_consequence.episode_id
      AND we.world_id = v_consequence.world_id
      AND we.teacher_id = v_teacher_id
  ) THEN
    RAISE EXCEPTION 'Konsekvensens episode matcher ikke Worldet.' USING ERRCODE = '22023';
  END IF;

  v_deferred := v_consequence.reveal_timing = 'next_episode';
  IF v_consequence.status IN ('applied', 'pending') THEN
    SELECT * INTO v_event
    FROM public.world_events
    WHERE consequence_id = v_consequence.id
      AND world_id = v_consequence.world_id
      AND teacher_id = v_teacher_id
      AND reverted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
    SELECT coalesce(jsonb_agg(to_jsonb(ws) ORDER BY ws.sort_order), '[]'::jsonb)
    INTO v_state FROM public.world_state AS ws
    WHERE ws.world_id = v_consequence.world_id AND ws.teacher_id = v_teacher_id;
    RETURN jsonb_build_object(
      'duplicate', true,
      'deferred', v_consequence.status = 'pending',
      'applied', coalesce(v_event.state_changes, '[]'::jsonb),
      'consequence', to_jsonb(v_consequence),
      'event', CASE WHEN v_event.id IS NULL THEN NULL ELSE to_jsonb(v_event) END,
      'state', v_state
    );
  END IF;
  IF v_consequence.status <> 'idle' THEN
    RAISE EXCEPTION 'Konsekvensen kan ikke anvendes i sin nuværende status.' USING ERRCODE = '22023';
  END IF;

  IF v_deferred THEN
    IF p_changes IS NULL OR jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes) = 0 THEN
      RAISE EXCEPTION 'Konsekvensen ændrer ingenting.' USING ERRCODE = '22023';
    END IF;
    -- Validate delayed operations now; release repeats validation against the
    -- then-current values while holding row locks.
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_changes) AS item
      LEFT JOIN public.world_state AS ws
        ON ws.world_id = v_consequence.world_id
       AND ws.teacher_id = v_teacher_id
       AND ws.state_key = item->>'state_key'
      WHERE nullif(item->>'state_key', '') IS NULL
        OR ws.id IS NULL
        OR item->>'operation' NOT IN ('set', 'increase', 'decrease', 'enum_change', 'boolean_toggle')
        OR (
          item->>'operation' IN ('increase', 'decrease')
          AND (
            ws.value_type <> 'number'
            OR jsonb_typeof(coalesce(item->'amount', item->'value')) IS DISTINCT FROM 'number'
          )
        )
        OR (item->>'operation' = 'boolean_toggle' AND ws.value_type <> 'boolean')
        OR (
          item->>'operation' = 'enum_change'
          AND (
            ws.value_type <> 'enum'
            OR jsonb_typeof(coalesce(item->'amount', item->'value')) IS DISTINCT FROM 'string'
            OR (
              array_length(ws.enum_options, 1) IS NOT NULL
              AND NOT ((coalesce(item->'amount', item->'value') #>> '{}') = ANY(ws.enum_options))
            )
          )
        )
        OR (
          item->>'operation' = 'set'
          AND CASE ws.value_type
            WHEN 'number' THEN jsonb_typeof(coalesce(item->'amount', item->'value')) IS DISTINCT FROM 'number'
            WHEN 'boolean' THEN jsonb_typeof(coalesce(item->'amount', item->'value')) IS DISTINCT FROM 'boolean'
            WHEN 'text' THEN jsonb_typeof(coalesce(item->'amount', item->'value')) IS DISTINCT FROM 'string'
            WHEN 'enum' THEN
              jsonb_typeof(coalesce(item->'amount', item->'value')) IS DISTINCT FROM 'string'
              OR (
                array_length(ws.enum_options, 1) IS NOT NULL
                AND NOT ((coalesce(item->'amount', item->'value') #>> '{}') = ANY(ws.enum_options))
              )
          END
        )
    ) THEN
      RAISE EXCEPTION 'Konsekvensen indeholder en ugyldig state-ændring.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.world_consequences
    SET status = 'pending', pending_changes = p_changes, applied_at = NULL
    WHERE id = v_consequence.id
    RETURNING * INTO v_consequence;

    INSERT INTO public.world_events (
      world_id, teacher_id, episode_id, consequence_id, event_type, title,
      description, academic_rationale, state_changes, source, student_visible
    ) VALUES (
      v_consequence.world_id, v_teacher_id, v_consequence.episode_id,
      v_consequence.id, 'consequence_scheduled',
      coalesce(nullif(v_consequence.title, ''), 'Konsekvens planlagt'),
      concat_ws(' ', nullif(p_reason_text, ''), 'Effekten mærkes først i næste episode.'),
      v_consequence.academic_rationale, '[]'::jsonb, 'teacher', false
    ) RETURNING * INTO v_event;
  ELSE
    v_applied := public._world_apply_state_changes(
      v_consequence.world_id, v_teacher_id, p_changes
    );

    UPDATE public.world_consequences
    SET status = 'applied', applied_at = now(), pending_changes = NULL
    WHERE id = v_consequence.id
    RETURNING * INTO v_consequence;

    INSERT INTO public.world_events (
      world_id, teacher_id, episode_id, consequence_id, event_type, title,
      description, academic_rationale, state_changes, source, student_visible
    ) VALUES (
      v_consequence.world_id, v_teacher_id, v_consequence.episode_id,
      v_consequence.id, 'consequence',
      coalesce(nullif(v_consequence.title, ''), 'Konsekvens'),
      concat_ws(' ', nullif(p_reason_text, ''), v_consequence.student_explanation),
      v_consequence.academic_rationale, v_applied, 'student_decision', true
    ) RETURNING * INTO v_event;
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(ws) ORDER BY ws.sort_order), '[]'::jsonb)
  INTO v_state FROM public.world_state AS ws
  WHERE ws.world_id = v_consequence.world_id AND ws.teacher_id = v_teacher_id;
  RETURN jsonb_build_object(
    'duplicate', false,
    'deferred', v_deferred,
    'applied', v_applied,
    'consequence', to_jsonb(v_consequence),
    'event', to_jsonb(v_event),
    'state', v_state
  );
END;
$$;

REVOKE ALL ON FUNCTION public.world_apply_consequence(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.world_apply_consequence(uuid, jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.world_release_consequences(
  p_consequence_ids uuid[],
  p_episode_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_teacher_id uuid := auth.uid();
  v_target_episode public.world_episodes%ROWTYPE;
  v_consequence public.world_consequences%ROWTYPE;
  v_source_number integer;
  v_changes jsonb;
  v_applied jsonb;
  v_all_applied jsonb := '[]'::jsonb;
  v_events jsonb := '[]'::jsonb;
  v_event public.world_events%ROWTYPE;
  v_state jsonb;
  v_requested integer;
  v_owned integer;
  v_changed integer := 0;
BEGIN
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Du er ikke logget ind.' USING ERRCODE = '42501';
  END IF;
  IF p_consequence_ids IS NULL
    OR cardinality(p_consequence_ids) = 0
    OR array_position(p_consequence_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Der er ingen planlagte konsekvenser at frigive.' USING ERRCODE = '22023';
  END IF;

  SELECT we.* INTO v_target_episode
  FROM public.world_episodes AS we
  JOIN public.worlds AS w ON w.id = we.world_id
  WHERE we.id = p_episode_id
    AND we.teacher_id = v_teacher_id
    AND w.teacher_id = v_teacher_id
    AND we.status = 'active'
  FOR UPDATE OF we;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Den aktive episode blev ikke fundet i dit World.' USING ERRCODE = '42501';
  END IF;

  SELECT count(DISTINCT requested.id)
  INTO v_requested
  FROM unnest(p_consequence_ids) AS requested(id);
  SELECT count(*) INTO v_owned
  FROM public.world_consequences AS wc
  WHERE wc.id = ANY(p_consequence_ids)
    AND wc.world_id = v_target_episode.world_id
    AND wc.teacher_id = v_teacher_id;
  IF v_owned <> v_requested THEN
    RAISE EXCEPTION 'En konsekvens tilhører ikke dit aktive World.' USING ERRCODE = '42501';
  END IF;
  PERFORM 1
  FROM public.world_consequences AS wc
  WHERE wc.id = ANY(p_consequence_ids)
    AND wc.world_id = v_target_episode.world_id
    AND wc.teacher_id = v_teacher_id
  ORDER BY wc.id
  FOR UPDATE;
  SELECT count(*) INTO v_owned
  FROM public.world_consequences AS wc
  WHERE wc.id = ANY(p_consequence_ids)
    AND wc.world_id = v_target_episode.world_id
    AND wc.teacher_id = v_teacher_id;
  IF v_owned <> v_requested THEN
    RAISE EXCEPTION 'En konsekvens blev ændret under frigivelsen.' USING ERRCODE = '40001';
  END IF;

  FOR v_consequence IN
    SELECT * FROM public.world_consequences
    WHERE id = ANY(p_consequence_ids)
    ORDER BY id
  LOOP
    IF v_consequence.status = 'applied' THEN
      CONTINUE;
    END IF;
    IF v_consequence.status <> 'pending' THEN
      RAISE EXCEPTION 'En konsekvens er ikke planlagt til frigivelse.' USING ERRCODE = '22023';
    END IF;
    IF v_consequence.episode_id IS NOT NULL THEN
      SELECT episode_number INTO v_source_number
      FROM public.world_episodes
      WHERE id = v_consequence.episode_id
        AND world_id = v_target_episode.world_id
        AND teacher_id = v_teacher_id;
      IF NOT FOUND OR v_source_number >= v_target_episode.episode_number THEN
        RAISE EXCEPTION 'Konsekvensen kan først frigives i en senere episode.' USING ERRCODE = '22023';
      END IF;
    END IF;

    v_changes := coalesce(
      v_consequence.pending_changes,
      v_consequence.consequence_config->'changes'
    );
    v_applied := public._world_apply_state_changes(
      v_consequence.world_id, v_teacher_id, v_changes
    );
    v_all_applied := v_all_applied || v_applied;

    UPDATE public.world_consequences
    SET status = 'applied', applied_at = now(), pending_changes = NULL
    WHERE id = v_consequence.id
    RETURNING * INTO v_consequence;

    INSERT INTO public.world_events (
      world_id, teacher_id, episode_id, consequence_id, event_type, title,
      description, academic_rationale, state_changes, source, student_visible
    ) VALUES (
      v_consequence.world_id, v_teacher_id, v_target_episode.id,
      v_consequence.id, 'delayed_consequence',
      coalesce(nullif(v_consequence.title, ''), 'Forsinket konsekvens'),
      coalesce(v_consequence.student_explanation, 'En tidligere beslutning viser først sin virkning nu.'),
      v_consequence.academic_rationale, v_applied, 'student_decision', true
    ) RETURNING * INTO v_event;
    v_events := v_events || jsonb_build_array(to_jsonb(v_event));
    v_changed := v_changed + 1;
  END LOOP;

  SELECT coalesce(jsonb_agg(to_jsonb(ws) ORDER BY ws.sort_order), '[]'::jsonb)
  INTO v_state FROM public.world_state AS ws
  WHERE ws.world_id = v_target_episode.world_id AND ws.teacher_id = v_teacher_id;
  RETURN jsonb_build_object(
    'duplicate', v_changed = 0,
    'deferred', false,
    'applied', v_all_applied,
    'consequences', (
      SELECT coalesce(jsonb_agg(to_jsonb(wc) ORDER BY wc.created_at), '[]'::jsonb)
      FROM public.world_consequences AS wc
      WHERE wc.id = ANY(p_consequence_ids)
    ),
    'events', v_events,
    'state', v_state
  );
END;
$$;

REVOKE ALL ON FUNCTION public.world_release_consequences(uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.world_release_consequences(uuid[], uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.world_rollback_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_teacher_id uuid := auth.uid();
  v_original public.world_events%ROWTYPE;
  v_rollback public.world_events%ROWTYPE;
  v_consequence public.world_consequences%ROWTYPE;
  v_change jsonb;
  v_state_row public.world_state%ROWTYPE;
  v_reversed jsonb := '[]'::jsonb;
  v_state jsonb;
  v_requested_keys integer;
  v_locked_keys integer;
BEGIN
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Du er ikke logget ind.' USING ERRCODE = '42501';
  END IF;

  SELECT ev.* INTO v_original
  FROM public.world_events AS ev
  JOIN public.worlds AS w ON w.id = ev.world_id
  WHERE ev.id = p_event_id
    AND ev.teacher_id = v_teacher_id
    AND w.teacher_id = v_teacher_id
  FOR UPDATE OF ev;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hændelsen blev ikke fundet i dit World.' USING ERRCODE = '42501';
  END IF;

  IF v_original.reverted_at IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(to_jsonb(ws) ORDER BY ws.sort_order), '[]'::jsonb)
    INTO v_state FROM public.world_state AS ws
    WHERE ws.world_id = v_original.world_id AND ws.teacher_id = v_teacher_id;
    RETURN jsonb_build_object(
      'duplicate', true,
      'event', to_jsonb(v_original),
      'state', v_state
    );
  END IF;
  IF jsonb_typeof(v_original.state_changes) IS DISTINCT FROM 'array'
    OR jsonb_array_length(v_original.state_changes) = 0 THEN
    RAISE EXCEPTION 'Denne hændelse ændrede ikke World-tilstanden.' USING ERRCODE = '22023';
  END IF;

  -- Keep the same consequence -> state lock order as apply/release to avoid
  -- deadlocks with a concurrent request for the same consequence.
  IF v_original.consequence_id IS NOT NULL THEN
    SELECT * INTO v_consequence
    FROM public.world_consequences
    WHERE id = v_original.consequence_id
      AND world_id = v_original.world_id
      AND teacher_id = v_teacher_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Rollback kan ikke finde den tilknyttede konsekvens.' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT count(DISTINCT item->>'state_key')
  INTO v_requested_keys
  FROM jsonb_array_elements(v_original.state_changes) AS item;
  PERFORM 1
  FROM public.world_state AS ws
  WHERE ws.world_id = v_original.world_id
    AND ws.teacher_id = v_teacher_id
    AND ws.state_key IN (
      SELECT DISTINCT item->>'state_key'
      FROM jsonb_array_elements(v_original.state_changes) AS item
    )
  ORDER BY ws.state_key
  FOR UPDATE;
  SELECT count(*) INTO v_locked_keys
  FROM public.world_state AS ws
  WHERE ws.world_id = v_original.world_id
    AND ws.teacher_id = v_teacher_id
    AND ws.state_key IN (
      SELECT DISTINCT item->>'state_key'
      FROM jsonb_array_elements(v_original.state_changes) AS item
    );
  IF v_locked_keys <> v_requested_keys THEN
    RAISE EXCEPTION 'Rollback kan ikke udføres, fordi en World-variabel mangler.' USING ERRCODE = '22023';
  END IF;

  FOR v_change IN SELECT value FROM jsonb_array_elements(v_original.state_changes)
  LOOP
    SELECT * INTO STRICT v_state_row
    FROM public.world_state
    WHERE world_id = v_original.world_id
      AND teacher_id = v_teacher_id
      AND state_key = v_change->>'state_key';
    IF v_state_row.value IS DISTINCT FROM v_change->'after' THEN
      RAISE EXCEPTION 'Rollback er ikke sikker: World-tilstanden er ændret efter denne hændelse.' USING ERRCODE = '40001';
    END IF;
    UPDATE public.world_state
    SET value = v_change->'before'
    WHERE id = v_state_row.id;
    v_reversed := v_reversed || jsonb_build_array(jsonb_build_object(
      'state_key', v_change->>'state_key',
      'label', v_change->>'label',
      'before', v_change->'after',
      'after', v_change->'before'
    ));
  END LOOP;

  UPDATE public.world_events
  SET reverted_at = now()
  WHERE id = v_original.id
  RETURNING * INTO v_original;

  IF v_original.consequence_id IS NOT NULL THEN
    UPDATE public.world_consequences
    SET status = 'idle', applied_at = NULL, pending_changes = NULL
    WHERE id = v_consequence.id
    RETURNING * INTO v_consequence;
  END IF;

  INSERT INTO public.world_events (
    world_id, teacher_id, episode_id, consequence_id, event_type, title,
    description, state_changes, source, student_visible
  ) VALUES (
    v_original.world_id, v_teacher_id, v_original.episode_id, NULL,
    'rollback', 'Fortrudt: ' || v_original.title,
    'Læreren fortrød den seneste ændring af World-tilstanden.',
    v_reversed, 'teacher', false
  ) RETURNING * INTO v_rollback;

  SELECT coalesce(jsonb_agg(to_jsonb(ws) ORDER BY ws.sort_order), '[]'::jsonb)
  INTO v_state FROM public.world_state AS ws
  WHERE ws.world_id = v_original.world_id AND ws.teacher_id = v_teacher_id;
  RETURN jsonb_build_object(
    'duplicate', false,
    'event', to_jsonb(v_rollback),
    'reverted_event', to_jsonb(v_original),
    'consequence', CASE WHEN v_consequence.id IS NULL THEN NULL ELSE to_jsonb(v_consequence) END,
    'state', v_state
  );
END;
$$;

REVOKE ALL ON FUNCTION public.world_rollback_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.world_rollback_event(uuid) TO authenticated;
