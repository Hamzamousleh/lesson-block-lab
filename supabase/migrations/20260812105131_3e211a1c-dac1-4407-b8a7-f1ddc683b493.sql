ALTER TYPE library_item_type ADD VALUE IF NOT EXISTS 'response_example';

ALTER TABLE public.lesson_blocks
  ADD COLUMN IF NOT EXISTS variant_group text,
  ADD COLUMN IF NOT EXISTS variant_label text;

CREATE TABLE IF NOT EXISTS public.class_insight_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  title text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_insight_notes TO authenticated;
GRANT ALL ON public.class_insight_notes TO service_role;

ALTER TABLE public.class_insight_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own class insight notes" ON public.class_insight_notes
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE TRIGGER class_insight_notes_updated_at
  BEFORE UPDATE ON public.class_insight_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();