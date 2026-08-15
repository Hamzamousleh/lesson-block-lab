-- Enforce tenant ownership for every parent referenced by a session.
-- The trigger also protects service-role writes, while RLS protects direct
-- authenticated API writes before they reach the trigger.

CREATE OR REPLACE FUNCTION public.validate_session_parent_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.lessons lesson
    WHERE lesson.id = NEW.lesson_id
      AND lesson.teacher_id = NEW.teacher_id
  ) THEN
    RAISE EXCEPTION 'Sessionens lektion tilhører ikke læreren.' USING ERRCODE = '23514';
  END IF;

  IF NEW.class_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.classes teacher_class
    WHERE teacher_class.id = NEW.class_id
      AND teacher_class.teacher_id = NEW.teacher_id
  ) THEN
    RAISE EXCEPTION 'Sessionens klasse tilhører ikke læreren.' USING ERRCODE = '23514';
  END IF;

  IF NEW.episode_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.world_episodes episode
    JOIN public.worlds world ON world.id = episode.world_id
    WHERE episode.id = NEW.episode_id
      AND episode.teacher_id = NEW.teacher_id
      AND world.teacher_id = NEW.teacher_id
      AND episode.lesson_id = NEW.lesson_id
  ) THEN
    RAISE EXCEPTION 'Sessionens World-episode tilhører ikke læreren eller lektionen.' USING ERRCODE = '23514';
  END IF;

  IF NEW.current_block_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.lesson_blocks block
    WHERE block.id = NEW.current_block_id
      AND block.lesson_id = NEW.lesson_id
      AND block.teacher_id = NEW.teacher_id
  ) THEN
    RAISE EXCEPTION 'Sessionens aktivitet tilhører ikke lektionen.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_session_parent_ownership() FROM PUBLIC;

DROP TRIGGER IF EXISTS sessions_validate_parent_ownership ON public.sessions;
CREATE TRIGGER sessions_validate_parent_ownership
  BEFORE INSERT OR UPDATE OF teacher_id, lesson_id, class_id, episode_id, current_block_id
  ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_session_parent_ownership();

DROP POLICY IF EXISTS "own sessions" ON public.sessions;
CREATE POLICY "own sessions" ON public.sessions
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (
    auth.uid() = teacher_id
    AND EXISTS (
      SELECT 1 FROM public.lessons lesson
      WHERE lesson.id = sessions.lesson_id
        AND lesson.teacher_id = auth.uid()
    )
    AND (
      sessions.class_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.classes teacher_class
        WHERE teacher_class.id = sessions.class_id
          AND teacher_class.teacher_id = auth.uid()
      )
    )
    AND (
      sessions.episode_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.world_episodes episode
        JOIN public.worlds world ON world.id = episode.world_id
        WHERE episode.id = sessions.episode_id
          AND episode.teacher_id = auth.uid()
          AND world.teacher_id = auth.uid()
          AND episode.lesson_id = sessions.lesson_id
      )
    )
    AND (
      sessions.current_block_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.lesson_blocks block
        WHERE block.id = sessions.current_block_id
          AND block.lesson_id = sessions.lesson_id
          AND block.teacher_id = auth.uid()
      )
    )
  );
