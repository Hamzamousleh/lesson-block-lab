ALTER TABLE public.lesson_blocks ADD COLUMN IF NOT EXISTS is_fallback boolean NOT NULL DEFAULT false;

CREATE TYPE public.library_item_type AS ENUM ('block', 'lesson');

CREATE TABLE public.library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type public.library_item_type NOT NULL,
  title text NOT NULL,
  subject text,
  block_type text,
  duration_minutes integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own library items" ON public.library_items FOR ALL TO authenticated
USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE TRIGGER library_items_updated_at BEFORE UPDATE ON public.library_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX library_items_teacher_idx ON public.library_items (teacher_id, created_at DESC);