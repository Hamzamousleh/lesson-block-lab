CREATE TABLE public.material_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  title text NOT NULL,
  note text,
  subject text,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_files TO authenticated;
GRANT ALL ON public.material_files TO service_role;

ALTER TABLE public.material_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage their own material files"
ON public.material_files FOR ALL TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE TRIGGER material_files_updated_at
BEFORE UPDATE ON public.material_files
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX material_files_teacher_idx ON public.material_files (teacher_id, created_at DESC);

CREATE POLICY "Teachers read own material objects"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'material-files' AND owner = auth.uid());

CREATE POLICY "Teachers upload own material objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'material-files' AND owner = auth.uid() AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers update own material objects"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'material-files' AND owner = auth.uid());

CREATE POLICY "Teachers delete own material objects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'material-files' AND owner = auth.uid());