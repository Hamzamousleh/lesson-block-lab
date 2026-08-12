CREATE TYPE public.session_mode AS ENUM ('live','self_paced');
CREATE TYPE public.session_status AS ENUM ('draft','active','ended');

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  mode public.session_mode NOT NULL DEFAULT 'live',
  status public.session_status NOT NULL DEFAULT 'draft',
  join_code text NOT NULL UNIQUE,
  current_block_id uuid REFERENCES public.lesson_blocks(id) ON DELETE SET NULL,
  reveal_results boolean NOT NULL DEFAULT false,
  allow_anonymous boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.sessions FOR ALL TO authenticated
  USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX sessions_lesson_idx ON public.sessions(lesson_id);
CREATE INDEX sessions_class_idx ON public.sessions(class_id);

CREATE TABLE public.session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  participant_token text NOT NULL UNIQUE,
  progress_index integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.session_participants TO authenticated;
GRANT ALL ON public.session_participants TO service_role;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher reads own session participants" ON public.session_participants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));
CREATE POLICY "teacher removes own session participants" ON public.session_participants FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));
CREATE INDEX session_participants_session_idx ON public.session_participants(session_id);

CREATE TABLE public.session_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.session_participants(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES public.lesson_blocks(id) ON DELETE CASCADE,
  response_type text NOT NULL,
  response_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, block_id)
);
GRANT SELECT, DELETE ON public.session_responses TO authenticated;
GRANT ALL ON public.session_responses TO service_role;
ALTER TABLE public.session_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teacher reads own session responses" ON public.session_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));
CREATE POLICY "teacher deletes own session responses" ON public.session_responses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid()));
CREATE INDEX session_responses_session_block_idx ON public.session_responses(session_id, block_id);
CREATE TRIGGER session_responses_set_updated_at BEFORE UPDATE ON public.session_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();