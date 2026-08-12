CREATE TYPE public.world_status AS ENUM ('draft','active','completed','archived');
CREATE TYPE public.world_episode_status AS ENUM ('locked','available','active','completed');
CREATE TYPE public.world_state_value_type AS ENUM ('number','boolean','text','enum');
CREATE TYPE public.world_consequence_status AS ENUM ('idle','pending','applied','skipped');

CREATE TABLE public.worlds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  title text NOT NULL,
  subject text NOT NULL DEFAULT '',
  description text,
  premise text,
  world_type text NOT NULL DEFAULT 'other',
  academic_focus text,
  visual_theme text,
  status public.world_status NOT NULL DEFAULT 'draft',
  completed_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worlds TO authenticated;
GRANT ALL ON public.worlds TO service_role;
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own worlds" ON public.worlds FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE TRIGGER worlds_updated_at BEFORE UPDATE ON public.worlds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX worlds_teacher_idx ON public.worlds(teacher_id);

CREATE TABLE public.world_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  learning_goal text,
  academic_concepts text[] NOT NULL DEFAULT '{}'::text[],
  episode_number integer NOT NULL DEFAULT 1,
  branch_key text,
  complexity_level text NOT NULL DEFAULT 'anvendelse',
  status public.world_episode_status NOT NULL DEFAULT 'available',
  unlock_condition jsonb,
  completion_condition jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.world_episodes TO authenticated;
GRANT ALL ON public.world_episodes TO service_role;
ALTER TABLE public.world_episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own world episodes" ON public.world_episodes FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE TRIGGER world_episodes_updated_at BEFORE UPDATE ON public.world_episodes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX world_episodes_world_idx ON public.world_episodes(world_id, episode_number);

CREATE TABLE public.world_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_key text NOT NULL,
  label text NOT NULL,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  initial_value jsonb,
  value_type public.world_state_value_type NOT NULL DEFAULT 'number',
  min_value numeric,
  max_value numeric,
  enum_options text[] NOT NULL DEFAULT '{}'::text[],
  description text,
  student_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (world_id, state_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.world_state TO authenticated;
GRANT ALL ON public.world_state TO service_role;
ALTER TABLE public.world_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own world state" ON public.world_state FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE TRIGGER world_state_updated_at BEFORE UPDATE ON public.world_state FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.world_consequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES public.world_episodes(id) ON DELETE CASCADE,
  source_block_id uuid REFERENCES public.lesson_blocks(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  consequence_config jsonb NOT NULL DEFAULT '{"changes":[]}'::jsonb,
  reveal_timing text NOT NULL DEFAULT 'immediate',
  teacher_explanation text,
  student_explanation text,
  academic_rationale text,
  status public.world_consequence_status NOT NULL DEFAULT 'idle',
  pending_changes jsonb,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.world_consequences TO authenticated;
GRANT ALL ON public.world_consequences TO service_role;
ALTER TABLE public.world_consequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own world consequences" ON public.world_consequences FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE TRIGGER world_consequences_updated_at BEFORE UPDATE ON public.world_consequences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX world_consequences_world_idx ON public.world_consequences(world_id);

CREATE TABLE public.world_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id uuid REFERENCES public.world_episodes(id) ON DELETE SET NULL,
  consequence_id uuid REFERENCES public.world_consequences(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'consequence',
  title text NOT NULL,
  description text,
  academic_rationale text,
  state_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'teacher',
  student_visible boolean NOT NULL DEFAULT true,
  reverted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.world_events TO authenticated;
GRANT ALL ON public.world_events TO service_role;
ALTER TABLE public.world_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own world events" ON public.world_events FOR ALL TO authenticated USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
CREATE INDEX world_events_world_idx ON public.world_events(world_id, created_at DESC);

ALTER TABLE public.sessions ADD COLUMN episode_id uuid REFERENCES public.world_episodes(id) ON DELETE SET NULL;