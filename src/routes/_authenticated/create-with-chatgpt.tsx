import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { classesQuery, lessonsQuery, unitsQuery } from "@/lib/data";
import { buildBlocksPrompt, buildLessonPrompt } from "@/lib/prompt";
import { PromptResult } from "@/components/PromptResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/create-with-chatgpt")({
  head: () => ({
    meta: [
      { title: "Planlæg med ChatGPT — CaseLab" },
      {
        name: "description",
        content:
          "CaseLab samler det vigtigste, så ChatGPT kan lave undervisningen i det rigtige format.",
      },
      { property: "og:title", content: "Planlæg med ChatGPT — CaseLab" },
      { property: "og:description", content: "Byg en færdig ChatGPT-prompt til din undervisning." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromptGenerator,
});

const FEELS = [
  "Høj elevaktivitet",
  "Casebaseret",
  "Diskussion",
  "Teorianvendelse",
  "Eksamenstræning",
  "Rolig og struktureret",
  "Varieret",
];

const NEEDS = [
  "Noget mere aktivt",
  "Case",
  "Diskussion",
  "Dilemma",
  "Teorianvendelse",
  "Afslutning",
  "Overrask mig",
];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-transparent hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function PromptGenerator() {
  const classes = useQuery(classesQuery());
  const units = useQuery(unitsQuery());
  const lessons = useQuery(lessonsQuery());

  const [kind, setKind] = useState<"lesson" | "blocks">("lesson");

  const [classId, setClassId] = useState("");
  const [unitId, setUnitId] = useState("none");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("90");
  const [customDuration, setCustomDuration] = useState("");
  const [goal, setGoal] = useState("");
  const [prior, setPrior] = useState("");
  const [feels, setFeels] = useState<string[]>([]);

  const [lessonId, setLessonId] = useState("none");
  const [minutes, setMinutes] = useState("20");
  const [customMinutes, setCustomMinutes] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);

  const [material, setMaterial] = useState("");
  const [prompt, setPrompt] = useState("");

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const klass = classes.data?.find((c) => c.id === classId);
  const unit = units.data?.find((u) => u.id === unitId);
  const lesson = lessons.data?.find((l) => l.id === lessonId);

  const generate = () => {
    if (!topic.trim()) {
      toast.error("Skriv et emne først.");
      return;
    }
    if (kind === "lesson") {
      const mins = duration === "custom" ? Number(customDuration) || 60 : Number(duration);
      setPrompt(
        buildLessonPrompt({
          className: klass?.name,
          subject: klass?.subject,
          unitTitle: unit?.title,
          topic,
          duration: mins,
          learningGoal: goal,
          priorKnowledge: prior,
          feels,
          material,
        }),
      );
    } else {
      const mins = minutes === "custom" ? Number(customMinutes) || 20 : Number(minutes);
      setPrompt(
        buildBlocksPrompt({
          lessonTitle: lesson?.title,
          topic,
          minutes: mins,
          needs,
          material,
        }),
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
      <h1 className="font-display text-4xl font-semibold">Planlæg med ChatGPT</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Fortæl hvad du skal undervise i. CaseLab klargør instruktionen, som du selv tager med til
        ChatGPT.
      </p>

      <section className="surface-card mt-8 space-y-5 p-4 sm:mt-10 sm:p-8">
        <h2 className="text-xl font-semibold">Hvad skal du lave?</h2>
        <div className="flex flex-wrap gap-3">
          <Chip
            label="En hel lektion"
            active={kind === "lesson"}
            onClick={() => setKind("lesson")}
          />
          <Chip
            label="En eller flere aktiviteter"
            active={kind === "blocks"}
            onClick={() => setKind("blocks")}
          />
        </div>
      </section>

      {kind === "lesson" && (
        <section className="surface-card mt-6 space-y-6 p-4 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label id="planning-class-label">Klasse</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger aria-labelledby="planning-class-label" className="rounded-xl">
                  <SelectValue placeholder="Vælg klasse" />
                </SelectTrigger>
                <SelectContent>
                  {(classes.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label id="planning-unit-label">Forløb (valgfrit)</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger aria-labelledby="planning-unit-label" className="rounded-xl">
                  <SelectValue placeholder="Intet forløb" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Intet forløb</SelectItem>
                  {(units.data ?? [])
                    .filter((u) => !classId || u.class_id === classId)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="planning-topic">Emne</Label>
            <Input
              id="planning-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Fx konformitet og gruppepres"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>Varighed</Label>
            <div className="flex flex-wrap items-center gap-3">
              {["45", "60", "90", "custom"].map((d) => (
                <Chip
                  key={d}
                  label={d === "custom" ? "Andet" : `${d} min`}
                  active={duration === d}
                  onClick={() => setDuration(d)}
                />
              ))}
              {duration === "custom" && (
                <Input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="w-28 rounded-xl"
                  placeholder="min"
                />
              )}
            </div>
          </div>

          <details className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer font-medium">Tilpas lektionen (valgfrit)</summary>
            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="planning-goal">Læringsmål</Label>
                <Textarea
                  id="planning-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planning-prior">Hvad ved eleverne allerede?</Label>
                <Textarea
                  id="planning-prior"
                  value={prior}
                  onChange={(e) => setPrior(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Hvordan skal undervisningen føles?</Label>
                <div className="flex flex-wrap gap-2">
                  {FEELS.map((f) => (
                    <Chip
                      key={f}
                      label={f}
                      active={feels.includes(f)}
                      onClick={() => toggle(feels, setFeels, f)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </details>
        </section>
      )}

      {kind === "blocks" && (
        <section className="surface-card mt-6 space-y-6 p-4 sm:p-8">
          <div className="space-y-2">
            <Label id="planning-lesson-label">Eksisterende lektion (valgfrit)</Label>
            <Select value={lessonId} onValueChange={setLessonId}>
              <SelectTrigger aria-labelledby="planning-lesson-label" className="rounded-xl">
                <SelectValue placeholder="Ingen lektion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ingen lektion</SelectItem>
                {(lessons.data ?? []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Emne</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Fx gruppepres i klassen"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Hvor meget tid skal aktiviteterne fylde?</Label>
            <div className="flex flex-wrap items-center gap-3">
              {["10", "20", "30", "custom"].map((d) => (
                <Chip
                  key={d}
                  label={d === "custom" ? "Andet" : `${d} min`}
                  active={minutes === d}
                  onClick={() => setMinutes(d)}
                />
              ))}
              {minutes === "custom" && (
                <Input
                  type="number"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="w-28 rounded-xl"
                  placeholder="min"
                />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hvad har du brug for?</Label>
            <div className="flex flex-wrap gap-2">
              {NEEDS.map((n) => (
                <Chip
                  key={n}
                  label={n}
                  active={needs.includes(n)}
                  onClick={() => toggle(needs, setNeeds, n)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {kind && (
        <>
          <section className="surface-card mt-6 space-y-3 p-8">
            <h2 className="text-xl font-semibold">Fagligt materiale</h2>
            <p className="text-muted-foreground">
              Indsæt tekst eller egne noter. Indholdet bruges kun i den instruktion, du kopierer.
            </p>
            <Textarea
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="min-h-40 rounded-xl"
            />
          </section>

          <Button className="mt-6 rounded-full" onClick={generate}>
            Klargør til ChatGPT
          </Button>
        </>
      )}

      {prompt && <PromptResult prompt={prompt} />}
    </div>
  );
}
