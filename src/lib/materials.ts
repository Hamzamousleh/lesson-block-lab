import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

export const MATERIAL_BUCKET = "material-files";

export interface MaterialFile {
  id: string;
  teacher_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  title: string;
  note: string | null;
  subject: string | null;
  class_id: string | null;
  unit_id: string | null;
  lesson_id: string | null;
  created_at: string;
  updated_at: string;
}

/** V1 whitelist — PDF, PPTX, DOCX and common images. */
export const ALLOWED_MATERIAL_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
};

const EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const MAX_MATERIAL_BYTES = 20 * 1024 * 1024;

export function materialKindLabel(mime: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_MATERIAL_TYPES[mime] ?? ALLOWED_MATERIAL_TYPES[EXT_TO_MIME[ext] ?? ""] ?? "Fil";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns a Danish error message, or null when the file is accepted. */
export function validateMaterialFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type || EXT_TO_MIME[ext] || "";
  const known = ALLOWED_MATERIAL_TYPES[mime] || (EXT_TO_MIME[ext] ? true : false);
  if (!known)
    return "Filtypen understøttes ikke. Du kan uploade PDF, PPTX, DOCX, PNG, JPG og WEBP.";
  if (file.size > MAX_MATERIAL_BYTES)
    return `Filen er for stor (maks. ${formatFileSize(MAX_MATERIAL_BYTES)}).`;
  if (file.size === 0) return "Filen er tom.";
  return null;
}

function resolveMime(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return file.type || EXT_TO_MIME[ext] || "application/octet-stream";
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du er ikke logget ind.");
  return data.user.id;
}

export const materialFilesQuery = () =>
  queryOptions({
    queryKey: ["material-files"],
    queryFn: async (): Promise<MaterialFile[]> => {
      const { data, error } = await supabase
        .from("material_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as MaterialFile[];
    },
  });

function safeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

export async function uploadMaterialFile(input: {
  file: File;
  title?: string;
  note?: string | null;
  subject?: string | null;
  class_id?: string | null;
  unit_id?: string | null;
  lesson_id?: string | null;
}): Promise<MaterialFile> {
  const invalid = validateMaterialFile(input.file);
  if (invalid) throw new Error(invalid);

  const teacher_id = await currentUserId();
  const mime = resolveMime(input.file);
  const path = `${teacher_id}/${crypto.randomUUID()}-${safeName(input.file.name)}`;

  const { error: upErr } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .upload(path, input.file, { contentType: mime, upsert: false });
  if (upErr) throw new Error("Filen kunne ikke uploades. Prøv igen.");

  const { data, error } = await supabase
    .from("material_files")
    .insert({
      teacher_id,
      file_name: input.file.name,
      storage_path: path,
      mime_type: mime,
      file_size: input.file.size,
      title: input.title?.trim() || input.file.name,
      note: input.note?.trim() || null,
      subject: input.subject || null,
      class_id: input.class_id || null,
      unit_id: input.unit_id || null,
      lesson_id: input.lesson_id || null,
    })
    .select()
    .single();

  if (error || !data) {
    /* never leave an orphaned storage object behind */
    await supabase.storage.from(MATERIAL_BUCKET).remove([path]);
    throw new Error("Filen kunne ikke gemmes. Prøv igen.");
  }
  return data as MaterialFile;
}

export async function updateMaterialFile(
  id: string,
  patch: Partial<Pick<MaterialFile, "title" | "note" | "subject" | "class_id" | "unit_id" | "lesson_id">>,
): Promise<MaterialFile> {
  const { data, error } = await supabase
    .from("material_files")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error("Filen kunne ikke opdateres.");
  return data as MaterialFile;
}

export async function deleteMaterialFile(file: MaterialFile): Promise<void> {
  const { error: sErr } = await supabase.storage.from(MATERIAL_BUCKET).remove([file.storage_path]);
  if (sErr) throw new Error("Filen kunne ikke slettes fra lageret.");
  const { error } = await supabase.from("material_files").delete().eq("id", file.id);
  if (error) throw new Error(error.message);
}

/** Short-lived signed URL — the bucket is private. */
export async function materialFileUrl(file: MaterialFile): Promise<string> {
  const { data, error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .createSignedUrl(file.storage_path, 60 * 10, { download: false });
  if (error || !data) throw new Error("Filen kunne ikke åbnes.");
  return data.signedUrl;
}
