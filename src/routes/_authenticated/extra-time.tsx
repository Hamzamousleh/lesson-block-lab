import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { blocksQuery, classQuery, lessonQuery, lessonsQuery } from "@/lib/data";
import { buildExtraTimePrompt } from "@/lib/prompt";
import { PromptResult } from "@/components/PromptResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/extra-time")({
  validateSearch: (search: Record<string, unknown>): { lessonId?: string } =>
    typeof search["lessonId"] === "string" ? { lessonId: search["lessonId"] } : {},
  head: () => ({
    meta: [
      { title: "Jeg mangler tid — CaseLab" },
      {
        name: "description",
        content: "Få ekstra aktiviteter til lektionen, når der er minutter tilovers.",
      },
      { property: "og:title", content: "Jeg mangler tid — CaseLab" },
      { property: "og:description", content: "Ekstra aktiviteter på få klik." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExtraTimePage,
});

const MINUTES = [10, 15, 20, 30];
const WANTS = [
  "Noget aktivt",
  "Case",
  "Diskussion",
  "Dilemma",
  "Teorianvendelse",
  "Opsamling",
  "Overrask mig",
];

function ExtraTimePage() {
  const search = Route.useSearch();
  const lessons = useQuery(lessonsQuery());
  const [lessonId, setLessonId] = useState(search.lessonId ?? "");
  const [minutes, setMinutes] = useState(15);
  const [custom, setCustom] = useState("");
  const [want, setWant] = useState("Noget aktivt");
  const [topic, setTopic] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);

  const lesson = useQuery({ ...lessonQuery(lessonId), enabled: !!lessonId });
  const blocks = useQuery({ ...blocksQuery(lessonId), enabled: !!lessonId });
  const klass = useQuery({
    ...classQuery(lesson.data?.class_id ?? ""),
    enabled: !!lesson.data?.class_id,
  });

  const summary = useMemo(
    () =>
      (blocks.data ?? [])
        .filter((b) => !b.is_fallback)
        .map(
          (b, i) =>
            `${String(i + 1).padStart(2, "0")}. [${b.type}] ${b.title} — ${b.duration_minutes} min`,
        )
        .join("\n"),
    [blocks.data],
  );

  const effectiveMinutes = custom ? Number(custom) || minutes : minutes;
  const canGenerate = !!lessonId || topic.trim().length > 1;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-medium text-primary">⏱ Jeg mangler tid</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Få ekstra aktiviteter</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Vælg lektion, hvor mange minutter du mangler, og hvad du har brug for.
      </p>

      <section className="surface-card mt-10 space-y-6 p-8">
        <div className="space-y-2">
          <Label>Lektion (valgfrit)</Label>
          <Select value={lessonId} onValueChange={setLessonId}>
            <SelectTrigger className="rounded-xl">
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

        {!lessonId && (
          <div className="space-y-2">
            <Label>Emne</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Fx udviklingspsykologi"
              className="rounded-xl"
            />
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold">Hvor mange minutter?</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {MINUTES.map((m) => (
              <Button
                key={m}
                variant={!custom && minutes === m ? "default" : "outline"}
                className="rounded-full"
                onClick={() => {
                  setMinutes(m);
                  setCustom("");
                }}
              >
                {m} min
              </Button>
            ))}
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
              placeholder="Andet"
              inputMode="numeric"
              className="w-28 rounded-full"
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Hvad vil du have?</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {WANTS.map((w) => (
              <Button
                key={w}
                variant={want === w ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setWant(w)}
              >
                {w}
              </Button>
            ))}
          </div>
        </div>

        <Button
          size="lg"
          className="rounded-full"
          disabled={!canGenerate}
          onClick={() =>
            setPrompt(
              buildExtraTimePrompt({
                className: klass.data?.name,
                subject: klass.data?.subject ?? lesson.data?.subject ?? undefined,
                lessonTitle: lesson.data?.title,
                learningGoal: lesson.data?.learning_goal ?? undefined,
                blockSummary: summary || undefined,
                topic: topic.trim() || undefined,
                minutes: effectiveMinutes,
                want,
              }),
            )
          }
        >
          Lav prompt til ChatGPT
        </Button>
        {!canGenerate && (
          <p className="text-sm text-muted-foreground">
            Vælg en lektion eller skriv et emne for at lave prompten.
          </p>
        )}
      </section>

      {prompt && (
        <PromptResult prompt={prompt} importSearch={lessonId ? { lessonId } : {}} />
      )}
    </div>
  );
}
