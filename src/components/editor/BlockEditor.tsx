import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  INVALID_URL_MESSAGE,
  isSafeUrl,
  readResources,
  withResources,
  type BlockResource,
} from "@/lib/resources";
import { ResourcePreview } from "@/components/ResourcePreview";
import { blockDef } from "@/lib/blocks";
import { blockMaterialFilesQuery } from "@/lib/materials";
import type { LessonBlock } from "@/lib/types";
import { MaterialPicker } from "@/components/materials/MaterialPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface BlockDraft {
  title: string;
  duration_minutes: number;
  student_instructions: string;
  teacher_notes: string;
  content: Record<string, unknown>;
}

function ResourceLinksEditor({
  resources,
  onChange,
}: {
  resources: BlockResource[];
  onChange: (next: BlockResource[]) => void;
}) {
  const update = (i: number, patch: Partial<BlockResource>) =>
    onChange(resources.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 p-4">
      <div>
        <p className="text-sm font-medium">Materialer og links</p>
        <p className="text-xs text-muted-foreground">
          Fx et kapitel i en iBog, en artikel eller en video. Eleverne ser linket i aktiviteten.
        </p>
      </div>

      {resources.map((r, i) => {
        const invalid = r.url.trim().length > 0 && !isSafeUrl(r.url);
        return (
          <div key={i} className="space-y-2 rounded-xl border border-border/60 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  value={r.title}
                  placeholder="Titel, fx Kapitel 5.2 i iBog"
                  aria-label={`Titel på link ${i + 1}`}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
                <Input
                  value={r.url}
                  placeholder="https://…"
                  inputMode="url"
                  aria-label={`URL på link ${i + 1}`}
                  aria-invalid={invalid}
                  onChange={(e) => update(i, { url: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fjern link"
                onClick={() => onChange(resources.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {invalid ? (
              <p className="text-xs text-destructive">{INVALID_URL_MESSAGE}</p>
            ) : isSafeUrl(r.url) ? (
              <ResourcePreview resource={r} />
            ) : null}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        onClick={() => onChange([...resources, { title: "", url: "" }])}
      >
        <Plus className="size-4" /> Tilføj link
      </Button>
    </div>
  );
}

export function BlockEditor({
  block,
  onClose,
  onSave,
  saving,
  materialContext,
}: {
  block: LessonBlock | null;
  onClose: () => void;
  onSave: (patch: BlockDraft, materialFileIds: string[]) => void;
  saving: boolean;
  materialContext?: { classId?: string | null; unitId?: string | null; lessonId?: string | null };
}) {
  const [draft, setDraft] = useState<BlockDraft | null>(null);
  const [materialFileIds, setMaterialFileIds] = useState<string[]>([]);
  const materialLinks = useQuery(blockMaterialFilesQuery(block?.id ?? ""));

  useEffect(() => {
    if (!block) {
      setDraft(null);
      setMaterialFileIds([]);
      return;
    }
    setDraft({
      title: block.title,
      duration_minutes: block.duration_minutes,
      student_instructions: block.student_instructions ?? "",
      teacher_notes: block.teacher_notes ?? "",
      content: { ...(block.content ?? {}) },
    });
  }, [block]);

  useEffect(() => {
    if (!block || !materialLinks.data) return;
    setMaterialFileIds(materialLinks.data.map((link) => link.material_file_id));
  }, [block, materialLinks.data]);

  const def = block ? blockDef(block.type) : null;
  const draftResources = readResources(draft?.content);

  const setContent = (key: string, value: unknown) =>
    setDraft((d) => (d ? { ...d, content: { ...d.content, [key]: value } } : d));

  return (
    <Sheet open={!!block} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {block && def && draft && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <span>{def.icon}</span> {def.label}
              </SheetTitle>
              <SheetDescription>{def.description}</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-8">
              <div className="space-y-2">
                <Label htmlFor="b-title">Titel</Label>
                <Input
                  id="b-title"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="b-duration">Varighed (min)</Label>
                <Input
                  id="b-duration"
                  type="number"
                  min={1}
                  max={180}
                  value={draft.duration_minutes}
                  onChange={(e) =>
                    setDraft({ ...draft, duration_minutes: Number(e.target.value) })
                  }
                />
              </div>

              {def.fields.map((f) => {
                const value = draft.content[f.key];
                if (f.kind === "textarea") {
                  return (
                    <div key={f.key} className="space-y-2">
                      <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                      <Textarea
                        id={`f-${f.key}`}
                        rows={5}
                        placeholder={f.placeholder ?? ""}
                        value={typeof value === "string" ? value : ""}
                        onChange={(e) => setContent(f.key, e.target.value)}
                      />
                    </div>
                  );
                }
                if (f.kind === "number") {
                  return (
                    <div key={f.key} className="space-y-2">
                      <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                      <Input
                        id={`f-${f.key}`}
                        type="number"
                        value={typeof value === "number" ? value : 0}
                        onChange={(e) => setContent(f.key, Number(e.target.value))}
                      />
                    </div>
                  );
                }
                if (f.kind === "switch") {
                  return (
                    <div key={f.key} className="flex items-center justify-between gap-4">
                      <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                      <Switch
                        id={`f-${f.key}`}
                        checked={value === true}
                        onCheckedChange={(v) => setContent(f.key, v)}
                      />
                    </div>
                  );
                }
                if (f.kind === "list") {
                  const items = Array.isArray(value) ? (value as string[]) : [];
                  return (
                    <div key={f.key} className="space-y-2">
                      <Label>{f.label}</Label>
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              value={item}
                              placeholder={`${f.itemLabel ?? "Element"} ${i + 1}`}
                              onChange={(e) => {
                                const next = [...items];
                                next[i] = e.target.value;
                                setContent(f.key, next);
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Fjern"
                              onClick={() =>
                                setContent(
                                  f.key,
                                  items.filter((_, idx) => idx !== i),
                                )
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setContent(f.key, [...items, ""])}
                      >
                        <Plus className="size-4" /> Tilføj {f.itemLabel?.toLowerCase() ?? "element"}
                      </Button>
                    </div>
                  );
                }
                return (
                  <div key={f.key} className="space-y-2">
                    <Label htmlFor={`f-${f.key}`}>{f.label}</Label>
                    <Input
                      id={`f-${f.key}`}
                      placeholder={f.placeholder ?? ""}
                      value={typeof value === "string" ? value : ""}
                      onChange={(e) => setContent(f.key, e.target.value)}
                    />
                  </div>
                );
              })}

              <div className="space-y-2">
                <Label htmlFor="b-instructions">Elevinstruktion</Label>
                <Textarea
                  id="b-instructions"
                  value={draft.student_instructions}
                  onChange={(e) => setDraft({ ...draft, student_instructions: e.target.value })}
                />
              </div>

              <ResourceLinksEditor
                resources={draftResources}
                onChange={(next) =>
                  setDraft((d) => (d ? { ...d, content: withResources(d.content, next) } : d))
                }
              />

              <div className="rounded-2xl border border-border/70 p-4">
                <MaterialPicker
                  selectedIds={materialFileIds}
                  onChange={setMaterialFileIds}
                  {...(materialContext ? { context: materialContext } : {})}
                  inlineUpload
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Filerne bliver kun vist for elever, mens denne aktivitet er aktiv.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="b-notes">Lærernoter</Label>
                <Textarea
                  id="b-notes"
                  value={draft.teacher_notes}
                  onChange={(e) => setDraft({ ...draft, teacher_notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  className="rounded-full"
                  disabled={saving || materialLinks.isLoading}
                  onClick={() => onSave(draft, materialFileIds)}
                >
                  Gem aktivitet
                </Button>
                <Button variant="outline" className="rounded-full" onClick={onClose}>
                  Annullér
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
