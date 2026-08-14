-- Material files are linked to lesson activities outside the CaseLab 2.0 JSON
-- contract. Students never read this table directly; session-scoped server
-- functions validate the participant before issuing a short-lived file URL.
CREATE TABLE public.block_material_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_block_id uuid NOT NULL REFERENCES public.lesson_blocks(id) ON DELETE CASCADE,
  material_file_id uuid NOT NULL REFERENCES public.material_files(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_block_id, material_file_id)
);

GRANT SELECT, INSERT, DELETE ON public.block_material_files TO authenticated;
GRANT ALL ON public.block_material_files TO service_role;

ALTER TABLE public.block_material_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers read own activity materials"
ON public.block_material_files FOR SELECT TO authenticated
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers attach own materials to own activities"
ON public.block_material_files FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = teacher_id
  AND EXISTS (
    SELECT 1 FROM public.lesson_blocks block
    WHERE block.id = lesson_block_id AND block.teacher_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.material_files file
    WHERE file.id = material_file_id AND file.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers remove own activity materials"
ON public.block_material_files FOR DELETE TO authenticated
USING (auth.uid() = teacher_id);

CREATE INDEX block_material_files_block_idx
ON public.block_material_files (lesson_block_id, created_at);

CREATE INDEX block_material_files_file_idx
ON public.block_material_files (material_file_id);