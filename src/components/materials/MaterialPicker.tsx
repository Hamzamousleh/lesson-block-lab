import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Paperclip } from "lucide-react";
import { materialFilesQuery, materialKindLabel, type MaterialFile } from "@/lib/materials";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Lets the teacher pick uploaded files to attach in ChatGPT.
 * CaseLab never reads the file contents — only the filenames enter the prompt.
 */
export function MaterialPicker({
  selectedIds,
  onChange,
  context,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  context?: { classId?: string | null; unitId?: string | null; lessonId?: string | null };
}) {
  const files = useQuery(materialFilesQuery());
  const all = files.data ?? [];

  const relevance = (f: MaterialFile) =>
    (context?.lessonId && f.lesson_id === context.lessonId ? 4 : 0) +
    (context?.unitId && f.unit_id === context.unitId ? 2 : 0) +
    (context?.classId && f.class_id === context.classId ? 1 : 0);
  const list = [...all].sort((a, b) => relevance(b) - relevance(a));

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="flex items-center gap-2">
          <Paperclip className="size-4" /> Uploadede filer (valgfri)
        </Label>
        <Link to="/materials">
          <Button type="button" variant="ghost" size="sm" className="rounded-full">
            Upload materiale
          </Button>
        </Link>
      </div>

      {!files.isLoading && all.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Du har ingen filer endnu. Upload PDF, PowerPoint, Word eller billeder under Materialer.
        </p>
      )}

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
    </div>
  );
}

export function selectedFileNames(files: MaterialFile[], ids: string[]): string[] {
  return ids
    .map((id) => files.find((f) => f.id === id)?.file_name)
    .filter((n): n is string => !!n);
}
