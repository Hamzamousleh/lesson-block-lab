ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS timer_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS timer_remaining_seconds integer,
  ADD COLUMN IF NOT EXISTS timer_show_students boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reveal_answer_key boolean NOT NULL DEFAULT false;