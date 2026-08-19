-- Pilot privacy controls: teacher-scoped deletion and 90-day student-data retention.

CREATE OR REPLACE FUNCTION public.delete_session_student_data(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_teacher_id uuid := auth.uid();
  v_owner_id uuid;
  v_status public.session_status;
  v_participants integer;
  v_responses integer;
BEGIN
  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT teacher_id, status INTO v_owner_id, v_status
  FROM public.sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF v_owner_id IS NULL OR v_owner_id <> v_teacher_id THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_status <> 'ended'::public.session_status THEN
    RAISE EXCEPTION 'Only ended sessions can have student data deleted';
  END IF;

  SELECT count(*) INTO v_participants
  FROM public.session_participants
  WHERE session_id = p_session_id;

  SELECT count(*) INTO v_responses
  FROM public.session_responses
  WHERE session_id = p_session_id;

  -- Responses are removed by the participant FK cascade in the same transaction.
  DELETE FROM public.session_participants WHERE session_id = p_session_id;

  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'participants_deleted', v_participants,
    'responses_deleted', v_responses
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_session_student_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_session_student_data(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cleanup_expired_student_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff timestamptz := now() - interval '90 days';
  v_participants integer;
  v_responses integer;
BEGIN
  WITH expired AS (
    SELECT sp.id
    FROM public.session_participants sp
    JOIN public.sessions s ON s.id = sp.session_id
    WHERE
      (s.ended_at IS NOT NULL AND s.ended_at < v_cutoff)
      OR (
        s.ended_at IS NULL
        AND s.updated_at < v_cutoff
        AND sp.last_seen_at < v_cutoff
      )
  )
  SELECT count(*) INTO v_responses
  FROM public.session_responses sr
  WHERE sr.participant_id IN (SELECT id FROM expired);

  WITH expired AS (
    SELECT sp.id
    FROM public.session_participants sp
    JOIN public.sessions s ON s.id = sp.session_id
    WHERE
      (s.ended_at IS NOT NULL AND s.ended_at < v_cutoff)
      OR (
        s.ended_at IS NULL
        AND s.updated_at < v_cutoff
        AND sp.last_seen_at < v_cutoff
      )
  ), deleted AS (
    DELETE FROM public.session_participants sp
    WHERE sp.id IN (SELECT id FROM expired)
    RETURNING sp.id
  )
  SELECT count(*) INTO v_participants FROM deleted;

  RETURN jsonb_build_object(
    'cutoff', v_cutoff,
    'participants_deleted', v_participants,
    'responses_deleted', v_responses
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_student_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_student_data() TO service_role;

CREATE INDEX IF NOT EXISTS sessions_student_retention_idx
  ON public.sessions (ended_at, updated_at);
CREATE INDEX IF NOT EXISTS session_participants_retention_idx
  ON public.session_participants (last_seen_at, session_id);

-- Schedule automatically only where pg_cron is already enabled. Environments
-- without it retain the service-role-only cleanup function for controlled runs.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR v_job_id IN EXECUTE
      'SELECT jobid FROM cron.job WHERE jobname = ''didaktiva-student-data-retention'''
    LOOP
      EXECUTE format('SELECT cron.unschedule(%s)', v_job_id);
    END LOOP;
    EXECUTE $schedule$
      SELECT cron.schedule(
        'didaktiva-student-data-retention',
        '17 3 * * *',
        'SELECT public.cleanup_expired_student_data()'
      )
    $schedule$;
  END IF;
END;
$$;
