import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, Loader2 } from "lucide-react";
import {
  buildNextEpisodePrompt,
  buildWorldReflectionPrompt,
  extractRecurringCharacters,
} from "@/lib/prompt";
import { formatStateValue } from "@/lib/consequences";
import {
  COMPLEXITY_LEVELS,
  complexityLabel,
  episodesQuery,
  worldEventsQuery,
  worldQuery,
  worldStateQuery,
} from "@/lib/worlds";
import { validateWorldPackage } from "@/lib/world-package";
import { episodeConflict, importEpisodePackage } from "@/lib/world-import";
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

export const Route = createFileRoute("/_authenticated/worlds/$worldId_/episodes/new")({
  head: () => ({
    meta: [
      { title: "Ny episode — CaseLab" },
      { name: "description", content: "Byg næste episode i dit World med World-hukommelsen som grundlag." },
      { property: "og:title", content: "Ny episode — CaseLab" },
      { property: "og:description", content: "Næste episode bygges oven på tilstand og tidligere beslutninger." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewEpisodePage,
});

function NewEpisodePage() {
  const { worldId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const world = useQuery(worldQuery(worldId));
  const episodes = useQuery(episodesQuery(worldId));
  const states = useQuery(worldStateQuery(worldId));
  const events = useQuery(worldEventsQuery(worldId));

  const [complexity, setComplexity] = useState("anvendelse");
  const [intention, setIntention] = useState("");
  const [concepts, setConcepts] = useState("");
  const [duration, setDuration] = useState(90);
  const [mode, setMode] = useState<"episode" | "reflection">("episode");
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState<string | null>(null);

  const w = world.data;
  const list = episodes.data ?? [];
  const nextNumber = list.reduce((max, e) => Math.max(max, e.episode_number), 0) + 1;
  const stateLines = (states.data ?? []).map((s) => `${s.label}: ${formatStateValue(s)}`);
  const historyLines = (events.data ?? [])
    .filter((e) => !e.reverted_at && e.state_changes.length > 0)
    .slice(0, 12)
    .map(
      (e) =>
        `${e.title}: ${e.state_changes.map((c) => `${c.label} ${String(c.before)} → ${String(c.after)}`).join(", ")}`,
    );

  const prompt = !w
    ? ""
    : mode === "reflection"
      ? buildWorldReflectionPrompt({
          worldTitle: w.title,
          subject: w.subject,
          premise: w.premise ?? "",
          startLines: (states.data ?? []).map((s) => `${s.label}: ${formatStateValue(s, s.initial_value)}`),
          endLines: stateLines,
          decisionLines: historyLines,
          duration,
        })
      : buildNextEpisodePrompt({
          worldTitle: w.title,
          subject: w.subject,
          premise: w.premise ?? "",
          academicFocus: w.academic_focus ?? "",
          stateLines,
          historyLines,
          previousEpisodes: list.map((e) => ({
            number: e.episode_number,
            title: e.title,
            complexity: complexityLabel(e.complexity_level),
            goal: e.learning_goal ?? "",
          })),
          complexityLabel: complexityLabel(complexity),
          intention: intention || "Eleverne skal anvende teorien på en ny situation i dette World.",
          concepts: concepts || w.academic_focus || "fagets kernebegreber",
          duration,
          episodeNumber: nextNumber,
          recurringCharacters: extractRecurringCharacters(w.premise),
        });

  const importEpisode = useMutation({
    mutationFn: async (asCopy = false) => {
      if (!w) throw new Error("Dette World blev ikke fundet.");
      const result = validateWorldPackage(pasted);
      if (!result.ok || !result.data) {
        setErrors(result.errors);
        throw new Error("Pakken kunne ikke godkendes.");
      }
      if (result.data.package_type !== "world_episode") {
        setErrors(["Dette er ikke en episode-pakke. Brug 'package_type': \"world_episode\"."]);
        throw new Error("Forkert pakketype.");
      }
      const clash = episodeConflict(list, result.data.episode);
      if (clash && !asCopy) {
        setConflict(clash);
        throw new Error(clash);
      }
      setErrors([]);
      setConflict(null);
      return importEpisodePackage(result.data, w, nextNumber, { asCopy });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["world-episodes", worldId] });
      toast.success("Episoden er importeret.");
      navigate({ to: "/worlds/$worldId", params: { worldId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success("Prompten er kopieret ✓");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunne ikke kopiere automatisk. Markér teksten og kopiér manuelt.");
    }
  }

  if (world.isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-14 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Henter World …
      </div>
    );
  }
  if (!w) return <div className="mx-auto max-w-3xl px-6 py-14">Dette World blev ikke fundet.</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold">
        {mode === "reflection" ? "Afslutning" : `Episode ${nextNumber}`}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {w.title} · CaseLab sender World-hukommelsen med, så ChatGPT bygger videre på det, der faktisk
        er sket — og ikke opfinder en ny fortid.
      </p>

      <section className="surface-card mt-8 space-y-5 p-8">
        <div className="flex gap-2">
          <Button
            variant={mode === "episode" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setMode("episode")}
          >
            Næste episode
          </Button>
          <Button
            variant={mode === "reflection" ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setMode("reflection")}
          >
            Afsluttende refleksion
          </Button>
        </div>

        {mode === "episode" && (
          <>
            <div className="space-y-2">
              <Label>Fagligt kompleksitetsniveau</Label>
              <Select value={complexity} onValueChange={setComplexity}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLEXITY_LEVELS.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-intent">Hvad skal eleverne opnå?</Label>
              <Textarea
                id="ep-intent"
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="Fx: eleverne skal se konsekvenserne af deres tidligere beslutning gennem konfliktteori."
                className="min-h-24 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-concepts">Faglige begreber</Label>
              <Input
                id="ep-concepts"
                value={concepts}
                onChange={(e) => setConcepts(e.target.value)}
                placeholder="Fx gruppepres, normer, social kapital"
                className="rounded-xl"
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="ep-duration">Varighed (minutter)</Label>
          <Input
            id="ep-duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 90)}
            className="w-32 rounded-xl"
          />
        </div>

        <div className="rounded-xl bg-secondary/50 p-4">
          <p className="text-sm font-medium">Det sender CaseLab med</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {stateLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
            {historyLines.map((l) => (
              <li key={l}>{l}</li>
            ))}
            {!historyLines.length && <li>Ingen konsekvenser er registreret endnu.</li>}
          </ul>
        </div>
      </section>

      <section className="surface-card mt-6 space-y-4 p-8">
        <h2 className="text-xl font-semibold">Din prompt</h2>
        <Textarea readOnly value={prompt} className="min-h-64 rounded-xl font-mono text-xs" />
        <div className="flex flex-wrap gap-3">
          <Button className="rounded-full" onClick={() => void copyPrompt()}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Kopiér prompt
          </Button>
          <a href="https://chatgpt.com" target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-full">
              Åbn ChatGPT
            </Button>
          </a>
        </div>
      </section>

      {mode === "episode" ? (
        <section className="surface-card mt-6 space-y-4 p-8">
          <h2 className="text-xl font-semibold">Importér episoden</h2>
          <Textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Indsæt episode-pakken (JSON) her …"
            className="min-h-40 rounded-xl font-mono text-xs"
          />
          {errors.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {conflict && (
            <div className="rounded-xl border border-border/70 bg-secondary/60 p-4 text-sm">
              <p className="font-medium">{conflict}</p>
              <p className="mt-1 text-muted-foreground">
                Vil du importere den som en kopi i stedet?
              </p>
              <div className="mt-3 flex gap-3">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => importEpisode.mutate(true)}
                  disabled={importEpisode.isPending}
                >
                  Importér som kopi
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => setConflict(null)}
                >
                  Annullér
                </Button>
              </div>
            </div>
          )}
          <Button
            className="rounded-full"
            onClick={() => importEpisode.mutate(false)}
            disabled={importEpisode.isPending || !pasted.trim()}
          >
            {importEpisode.isPending && <Loader2 className="size-4 animate-spin" />} Importér episode
          </Button>
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Refleksionslektionen er en almindelig CaseLab-lektion. Indsæt JSON-svaret under Importér.
        </p>
      )}
    </div>
  );
}
