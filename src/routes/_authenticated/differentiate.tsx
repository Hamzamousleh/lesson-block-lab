import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { blocksQuery, classesQuery, lessonsQuery } from "@/lib/data";
import { blockDef } from "@/lib/blocks";
import { buildDifferentiatePrompt } from "@/lib/prompt";
import { VARIANT_LEVELS } from "@/lib/types";
import { PromptResult } from "@/components/PromptResult";
import { MaterialPicker, selectedFileNames } from "@/components/materials/MaterialPicker";
import { materialFilesQuery } from "@/lib/materials";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/differentiate")({
  head: () => ({
    meta: [
      { title: "Differentiér en aktivitet — CaseLab" },
      {
        name: "description",
        content:
          "Lav niveaudelte varianter af den samme aktivitet med Støtte, Standard og Udfordring.",
      },
      { property: "og:title", content: "Differentiér en aktivitet — CaseLab" },
      { property: "og:description", content: "Samme faglige mål, tre niveauer." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DifferentiatePage,
});

function blockToText(b: {
  type: string;
  title: string;
  duration_minutes: number;
  student_instructions: string | null;
  content: Record<string, unknown>;
}): string {
  const lines = [
    `Type: ${b.type}`,
    `Titel: ${b.title}`,
    `Varighed: ${b.duration_minutes} min`,
    b.student_instructions ? `Elevinstruktion: ${b.student_instructions}` : null,
    `Indhold: ${JSON.stringify(b.content ?? {}, null, 2)}`,
  ].filter(Boolean);
  return lines.join("\n");
}

function DifferentiatePage() {
  const classes = useQuery(classesQuery());
  const lessons = useQuery(lessonsQuery());

  const [lessonId, setLessonId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [levels, setLevels] = useState<string[]>([...VARIANT_LEVELS]);
  const [minutes, setMinutes] = useState(15);
  const [note, setNote] = useState("");
  const [manual, setManual] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [promptFiles, setPromptFiles] = useState<string[]>([]);
  const materials = useQuery(materialFilesQuery());
  const attachedFiles = selectedFileNames(materials.data ?? [], fileIds);

  const blocks = useQuery({ ...blocksQuery(lessonId), enabled: !!lessonId });
  const lesson = (lessons.data ?? []).find((l) => l.id === lessonId);
  const klass = (classes.data ?? []).find((c) => c.id === lesson?.class_id);
  const block = (blocks.data ?? []).find((b) => b.id === blockId);

  const sourceText = block ? blockToText(block) : manual;

  function toggleLevel(level: string) {
    setPrompt(null);
    setLevels((s) => (s.includes(level) ? s.filter((x) => x !== level) : [...s, level]));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-accent">
          <Layers className="size-5 text-primary" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold">Differentiér en aktivitet</h1>
          <p className="text-muted-foreground">
            Samme faglige mål — forskellig stilladsering. Niveauet vises aldrig for eleverne.
          </p>
        </div>
      </div>

      <section className="surface-card mt-8 space-y-6 p-4 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label id="differentiate-lesson-label">Lektion (valgfri)</Label>
            <Select
              value={lessonId}
              onValueChange={(v) => {
                setLessonId(v);
                setBlockId("");
                setPrompt(null);
              }}
            >
              <SelectTrigger aria-labelledby="differentiate-lesson-label" className="rounded-xl">
                <SelectValue placeholder="Vælg lektion" />
              </SelectTrigger>
              <SelectContent>
                {(lessons.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label id="differentiate-block-label">Aktivitet</Label>
            <Select
              value={blockId}
              onValueChange={(v) => {
                setBlockId(v);
                setPrompt(null);
              }}
              disabled={!lessonId}
            >
              <SelectTrigger aria-labelledby="differentiate-block-label" className="rounded-xl">
                <SelectValue placeholder="Vælg aktivitet" />
              </SelectTrigger>
              <SelectContent>
                {(blocks.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {blockDef(b.type).icon} {b.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!block && (
          <div className="space-y-2">
            <Label>… eller beskriv aktiviteten selv</Label>
            <Textarea
              value={manual}
              onChange={(e) => {
                setManual(e.target.value);
                setPrompt(null);
              }}
              placeholder="Fx: Eleverne analyserer en case om prisdannelse på boligmarkedet."
              className="min-h-32 rounded-xl"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Niveauer</Label>
          <div className="flex flex-wrap gap-2">
            {VARIANT_LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => toggleLevel(l)}
                className={`rounded-full border px-5 py-2 text-sm transition-colors ${
                  levels.includes(l)
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Navnene er neutrale og bruges kun internt i CaseLab.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Varighed pr. variant</Label>
            <Input
              type="number"
              min={5}
              value={minutes}
              onChange={(e) => {
                setMinutes(Number(e.target.value));
                setPrompt(null);
              }}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Bemærkning (valgfri)</Label>
            <Input
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setPrompt(null);
              }}
              placeholder="Fx: mange har svært ved begrebet elasticitet"
              className="rounded-xl"
            />
          </div>
        </div>

        <MaterialPicker
          selectedIds={fileIds}
          onChange={setFileIds}
          context={{ classId: lesson?.class_id ?? null, lessonId }}
        />

        <Button
          className="rounded-full"
          disabled={!sourceText.trim() || levels.length === 0}
          onClick={() => {
            setPromptFiles(attachedFiles);
            setPrompt(
              buildDifferentiatePrompt({
                className: klass?.name,
                subject: lesson?.subject ?? undefined,
                lessonTitle: lesson?.title,
                levels,
                sourceText,
                minutes,
                note: note.trim() || undefined,
                attachedFiles,
              }),
            );
          }}
        >
          Klargør til ChatGPT
        </Button>
      </section>

      {prompt && (
        <PromptResult
          prompt={prompt}
          importSearch={lessonId ? { lessonId } : {}}
          attachedFiles={promptFiles}
        />
      )}
    </div>
  );
}
