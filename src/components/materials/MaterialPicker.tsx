import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Library, Loader2, Paperclip, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  materialFilesQuery,
  materialKindLabel,
  uploadMaterialFile,
  validateMaterialFile,
  type MaterialFile,
} from "@/lib/materials";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Shared teacher picker for reusable material files and inline uploads. */
export function MaterialPicker({
  selectedIds,
  onChange,
  context,
  inlineUpload = false,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  context?: { classId?: string | null; unitId?: string | null; lessonId?: string | null };
  inlineUpload?: boolean;
}) {
  const queryClient = useQueryClient();
  const files = useQuery(materialFilesQuery());
  const inputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(!inlineUpload);
  const all = files.data ?? [];
  const selected = selectedIds
    .map((id) => all.find((file) => file.id === id))
    .filter((file): file is MaterialFile => !!file);

  const relevance = (f: MaterialFile) =>
    (context?.lessonId && f.lesson_id === context.lessonId ? 4 : 0) +
    (context?.unitId && f.unit_id === context.unitId ? 2 : 0) +
    (context?.classId && f.class_id === context.classId ? 1 : 0);
  const list = [...all].sort((a, b) => relevance(b) - relevance(a));

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const invalid = validateMaterialFile(file);
      if (invalid) throw new Error(invalid);
      return uploadMaterialFile({
        file,
        class_id: context?.classId || null,
        unit_id: context?.unitId || null,
        lesson_id: context?.lessonId || null,
      });
    },
    onSuccess: (file) => {
      queryClient.setQueryData<MaterialFile[]>(["material-files"], (current = []) => [
        file,
        ...current.filter((item) => item.id !== file.id),
      ]);
      onChange(selectedIds.includes(file.id) ? selectedIds : [...selectedIds, file.id]);
      toast.success("Filen er uploadet og valgt.");
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => {
      if (inputRef.current) inputRef.current.value = "";
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className="flex items-center gap-2">
          <Paperclip className="size-4" />{" "}
          {inlineUpload ? "Vedhæft materiale" : "Uploadede filer (valgfri)"}
        </Label>
        {inlineUpload ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setLibraryOpen((open) => !open)}
            >
              <Library className="size-4" /> Vælg fra materialebibliotek
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {upload.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload ny fil
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept=".pdf,.pptx,.docx,.png,.jpg,.jpeg,.webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
              }}
            />
          </div>
        ) : (
          <Link to="/materials">
            <Button type="button" variant="ghost" size="sm" className="rounded-full">
              Upload materiale
            </Button>
          </Link>
        )}
      </div>

      {inlineUpload && (
        <p className="text-sm text-muted-foreground">
          Vælg eksisterende filer eller upload PDF, PowerPoint, Word og billeder (maks. 20 MB).
        </p>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Valgte materialefiler">
          {selected.map((file) => (
            <span
              key={file.id}
              className="flex max-w-full items-center gap-2 rounded-xl border border-primary/30 bg-accent px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0" />
              <span className="min-w-0 truncate">
                {file.file_name} · {materialKindLabel(file.mime_type, file.file_name)}
              </span>
              <button
                type="button"
                className="shrink-0 rounded-full p-0.5 hover:bg-background"
                aria-label={`Fjern ${file.file_name}`}
                onClick={() => toggle(file.id)}
              >
                <X className="size-4" />
              </button>
            </span>
          ))}
        </div>
      )}

      {!files.isLoading && all.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Du har ingen filer endnu. Upload PDF, PowerPoint, Word eller billeder under Materialer.
        </p>
      )}

      {libraryOpen && (
        <div className="space-y-2">
          {list.map((f) => {
            const on = selectedIds.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(f.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  on ? "border-primary bg-accent" : "border-border/70 hover:bg-secondary/60"
                }`}
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{f.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {f.file_name} · {materialKindLabel(f.mime_type, f.file_name)}
                    {relevance(f) > 0 ? " · knyttet til denne kontekst" : ""}
                  </span>
                </span>
                {on && <span className="text-xs font-medium text-primary">Valgt</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function selectedFileNames(files: MaterialFile[], ids: string[]): string[] {
  return ids
    .map((id) => files.find((f) => f.id === id)?.file_name)
    .filter((n): n is string => !!n);
}
