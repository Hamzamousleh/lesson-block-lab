import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { classesQuery } from "@/lib/data";
import { buildRescuePrompt } from "@/lib/prompt";
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

export const Route = createFileRoute("/_authenticated/rescue")({
  head: () => ({
    meta: [
      { title: "Red mig — CaseLab" },
      {
        name: "description",
        content: "Lav en nødlektion på få minutter med en færdig ChatGPT-prompt.",
      },
      { property: "og:title", content: "Red mig — CaseLab" },
      { property: "og:description", content: "Nødundervisning klar på få minutter." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RescuePage,
});

const DURATIONS = [45, 60, 90];

function RescuePage() {
  const classes = useQuery(classesQuery());
  const [classId, setClassId] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(45);
  const [customDuration, setCustomDuration] = useState("");
  const [prior, setPrior] = useState("");
  const [material, setMaterial] = useState("");
  const [showMaterial, setShowMaterial] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);

  const klass = useMemo(
    () => (classes.data ?? []).find((c) => c.id === classId),
    [classes.data, classId],
  );

  const effectiveDuration = customDuration ? Number(customDuration) || duration : duration;
  const canGenerate = topic.trim().length > 1;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-sm font-medium text-primary">⚡ Red mig</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Nødundervisning på få minutter</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Svar på det nødvendige. Så laver vi en prompt, der giver dig en lektion, du kan undervise
        med det samme.
      </p>

      <section className="surface-card mt-10 space-y-6 p-8">
        <div>
          <h2 className="text-xl font-semibold">Hvad skal du undervise i?</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Klasse (valgfrit)</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="rounded-xl">
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
              <Label>Emne</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Fx stress"
                className="rounded-xl"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold">Hvor lang tid?</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {DURATIONS.map((d) => (
              <Button
                key={d}
                variant={!customDuration && duration === d ? "default" : "outline"}
                className="rounded-full"
                onClick={() => {
                  setDuration(d);
                  setCustomDuration("");
                }}
              >
                {d} min
              </Button>
            ))}
            <Input
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value.replace(/\D/g, ""))}
              placeholder="Andet"
              inputMode="numeric"
              className="w-28 rounded-full"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Hvad ved eleverne allerede? (valgfrit)</Label>
          <Input
            value={prior}
            onChange={(e) => setPrior(e.target.value)}
            placeholder="Fx de har læst om det autonome nervesystem"
            className="rounded-xl"
          />
        </div>

        <div className="space-y-3">
          {showMaterial ? (
            <>
              <Label>Fagligt materiale (valgfrit)</Label>
              <Textarea
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Indsæt tekst, noter eller uddrag …"
                className="min-h-40 rounded-xl"
              />
            </>
          ) : (
            <Button variant="ghost" className="rounded-full" onClick={() => setShowMaterial(true)}>
              + Jeg har fagligt materiale
            </Button>
          )}
        </div>

        <Button
          size="lg"
          className="rounded-full"
          disabled={!canGenerate}
          onClick={() =>
            setPrompt(
              buildRescuePrompt({
                className: klass?.name,
                subject: klass?.subject,
                topic: topic.trim(),
                duration: effectiveDuration,
                priorKnowledge: prior.trim() || undefined,
                material,
              }),
            )
          }
        >
          Lav nødprompt
        </Button>
        {!canGenerate && (
          <p className="text-sm text-muted-foreground">Skriv et emne for at lave prompten.</p>
        )}
      </section>

      {prompt && <PromptResult prompt={prompt} />}
    </div>
  );
}
