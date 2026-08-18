import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { blocksQuery, classQuery, lessonQuery, lessonsQuery } from "@/lib/data";
import { buildImprovePrompt, lessonToDetailedText } from "@/lib/prompt";
import { blockDef } from "@/lib/blocks";
import { PromptResult } from "@/components/PromptResult";
import { MaterialPicker, selectedFileNames } from "@/components/materials/MaterialPicker";
import { materialFilesQuery } from "@/lib/materials";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/improve-lesson")({
  validateSearch: (search: Record<string, unknown>): { lessonId?: string } =>
    typeof search["lessonId"] === "string" ? { lessonId: search["lessonId"] } : {},
  head: () => ({
    meta: [
      { title: "Gør lektionen mere aktiv — CaseLab" },
      {
        name: "description",
        content: "Få forslag til aktiviteter, der gør en eksisterende lektion mere aktiv.",
      },
      { property: "og:title", content: "Gør lektionen mere aktiv — CaseLab" },
      { property: "og:description", content: "Mere elevaktivitet i en eksisterende lektion." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ImprovePage,
});

const WISHES = [
  "Mere elevaktivitet",
  "Mindre læreroplæg",
  "Mere bevægelse",
  "Mere diskussion",
  "Mere teorianvendelse",
  "Mere variation",
  "Mere eksamenstræning",
];

function ImprovePage() {
  const search = Route.useSearch();
  const lessons = useQuery(lessonsQuery());
  const [lessonId, setLessonId] = useState(search.lessonId ?? "");
  const [wishes, setWishes] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [promptFiles, setPromptFiles] = useState<string[]>([]);
  const materials = useQuery(materialFilesQuery());
  const attachedFiles = selectedFileNames(materials.data ?? [], fileIds);

  const lesson = useQuery({ ...lessonQuery(lessonId), enabled: !!lessonId });
  const blocks = useQuery({ ...blocksQuery(lessonId), enabled: !!lessonId });
  const klass = useQuery({
    ...classQuery(lesson.data?.class_id ?? ""),
    enabled: !!lesson.data?.class_id,
  });

  const main = useMemo(() => (blocks.data ?? []).filter((b) => !b.is_fallback), [blocks.data]);

  const toggle = (w: string) =>
    setWishes((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));

  const canGenerate = !!lessonId && main.length > 0 && (wishes.length > 0 || !!freeText.trim());

  let running = 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-medium text-primary">🎨 Gør den mere aktiv</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Forbedr en eksisterende lektion</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Vælg lektionen, fortæl hvad du vil ændre, og få en prompt, der giver dig nye aktiviteter.
      </p>

      <section className="surface-card mt-10 space-y-6 p-8">
        <div className="space-y-2">
          <Label>Lektion</Label>
          <Select value={lessonId} onValueChange={setLessonId}>
            <SelectTrigger aria-label="Lektion" className="rounded-xl">
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

        {lessonId && main.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold">Lektionens struktur i dag</h2>
            <ul className="mt-4 space-y-2">
              {main.map((b) => {
                const start = running;
                running += b.duration_minutes;
                return (
                  <li
                    key={b.id}
                    className="flex items-center gap-4 rounded-xl bg-secondary/40 px-5 py-3"
                  >
                    <span className="w-16 shrink-0 text-sm tabular-nums text-muted-foreground">
                      {start}–{running}
                    </span>
                    <span>{blockDef(b.type).icon}</span>
                    <span className="min-w-0 flex-1 truncate">{b.title}</span>
                    <span className="text-sm text-muted-foreground">{blockDef(b.type).label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold">Hvad vil du ændre?</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {WISHES.map((w) => (
              <Button
                key={w}
                variant={wishes.includes(w) ? "default" : "outline"}
                className="rounded-full"
                onClick={() => toggle(w)}
              >
                {w}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Andet du vil ændre (valgfrit)</Label>
          <Textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Fx: Case-delen fylder for lidt, og eleverne keder sig i starten."
            className="min-h-28 rounded-xl"
          />
        </div>

        <MaterialPicker
          selectedIds={fileIds}
          onChange={setFileIds}
          context={{ classId: lesson.data?.class_id ?? null, lessonId }}
        />

        <Button
          size="lg"
          className="rounded-full"
          disabled={!canGenerate}
          onClick={() => {
            setPromptFiles(attachedFiles);
            if (lesson.data)
              setPrompt(
                buildImprovePrompt({
                  className: klass.data?.name,
                  subject: klass.data?.subject ?? lesson.data.subject ?? undefined,
                  lessonTitle: lesson.data.title,
                  duration: lesson.data.duration_minutes,
                  learningGoal: lesson.data.learning_goal ?? undefined,
                  blockDetail: lessonToDetailedText(main),
                  wishes,
                  freeText,
                  attachedFiles,
                }),
              );
          }}
        >
          Lav prompt til ChatGPT
        </Button>
        {!canGenerate && (
          <p className="text-sm text-muted-foreground">
            Vælg en lektion med aktiviteter, og vælg mindst én ændring.
          </p>
        )}
      </section>

      {prompt && (
        <PromptResult prompt={prompt} importSearch={{ lessonId }} attachedFiles={promptFiles} />
      )}
    </div>
  );
}
