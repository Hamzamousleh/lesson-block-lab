import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, Loader2, Plus, Undo2 } from "lucide-react";
import {
  applyConsequence,
  describeChange,
  formatStateValue,
  previewChanges,
  releasePendingConsequences,
  rollbackEvent,
} from "@/lib/consequences";
import {
  consequencesQuery,
  complexityLabel,
  episodesQuery,
  EPISODE_STATUS_LABEL,
  REVEAL_LABEL,
  TRIGGER_LABEL,
  updateEpisode,
  worldEventsQuery,
  worldQuery,
  worldStateQuery,
  WORLD_STATUS_LABEL,
  type StateChange,
  type WorldConsequence,
  type WorldEpisode,
  type WorldStateVar,
} from "@/lib/worlds";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/worlds/$worldId")({
  head: () => ({
    meta: [
      { title: "World — CaseLab" },
      { name: "description", content: "Følg tilstand, episoder og konsekvenser i dit læringsunivers." },
      { property: "og:title", content: "World — CaseLab" },
      { property: "og:description", content: "Tilstand, episoder, konsekvenser og World-hukommelse." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorldDetail,
});

function StateBar({ s }: { s: WorldStateVar }) {
  const isNumber = s.value_type === "number";
  const pct = isNumber
    ? Math.max(
        0,
        Math.min(100, ((Number(s.value) - (s.min_value ?? 0)) / ((s.max_value ?? 100) - (s.min_value ?? 0))) * 100),
      )
    : 0;
  return (
    <div className="rounded-xl border border-border/70 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{s.label}</p>
        <p className="text-sm text-muted-foreground">{formatStateValue(s)}</p>
      </div>
      {isNumber && (
        <div className="mt-3 h-2 rounded-full bg-secondary">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      )}
      {s.description && <p className="mt-2 text-xs text-muted-foreground">{s.description}</p>}
      {!s.student_visible && <p className="mt-1 text-xs text-muted-foreground">Kun synlig for læreren</p>}
    </div>
  );
}

function ConsequenceCard({
  consequence,
  states,
  episodeTitle,
  onApplied,
}: {
  consequence: WorldConsequence;
  states: WorldStateVar[];
  episodeTitle: string;
  onApplied: () => void;
}) {
  const changes = (consequence.consequence_config?.["changes"] ?? []) as StateChange[];
  const { applied, errors } = previewChanges(states, changes);

  const apply = useMutation({
    mutationFn: async () =>
      applyConsequence({
        consequence,
        states,
        changes,
        episodeTitle,
        reasonText: "Læreren bekræftede konsekvensen.",
      }),
    onSuccess: (res) => {
      toast.success(
        res.deferred
          ? "Konsekvensen er planlagt og mærkes i næste episode."
          : "Konsekvensen er anvendt på World-tilstanden.",
      );
      onApplied();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-xl border border-border/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{consequence.title}</p>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
          {TRIGGER_LABEL[consequence.trigger_type]}
        </span>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
          {REVEAL_LABEL[consequence.reveal_timing]}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {changes.map((c, i) => {
          const hit = applied.find((a) => a.state_key === c.state_key);
          return (
            <li key={`${c.state_key}-${i}`}>
              {describeChange(
                states.find((s) => s.state_key === c.state_key),
                c,
              )}
              {hit ? ` (${String(hit.before)} → ${String(hit.after)})` : ""}
            </li>
          );
        })}
      </ul>
      {consequence.academic_rationale && (
        <p className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
          <span className="font-medium">Fagligt: </span>
          {consequence.academic_rationale}
        </p>
      )}
      {errors.length > 0 && (
        <p className="mt-3 text-sm text-destructive">{errors[0]}</p>
      )}
      <div className="mt-4 flex items-center gap-3">
        <Button
          size="sm"
          className="rounded-full"
          disabled={consequence.status === "applied" || apply.isPending || errors.length > 0}
          onClick={() => apply.mutate()}
        >
          {apply.isPending && <Loader2 className="size-4 animate-spin" />}
          {consequence.status === "applied"
            ? "Anvendt"
            : consequence.status === "pending"
              ? "Planlagt til næste episode"
              : "Bekræft konsekvens"}
        </Button>
      </div>
    </div>
  );
}

function EpisodeCard({
  episode,
  states,
  worldId,
  refresh,
}: {
  episode: WorldEpisode;
  states: WorldStateVar[];
  worldId: string;
  refresh: () => void;
}) {
  const consequences = useQuery(consequencesQuery(worldId, episode.id));
  const list = consequences.data ?? [];

  const setStatus = useMutation({
    mutationFn: async (status: WorldEpisode["status"]) => {
      if (status === "active") {
        const pending = list.filter((c) => c.status === "pending");
        if (pending.length) await releasePendingConsequences(pending, states, episode.id);
      }
      return updateEpisode(episode.id, { status });
    },
    onSuccess: () => {
      refresh();
      toast.success("Episoden er opdateret.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
          Episode {episode.episode_number}
        </span>
        <p className="text-lg font-medium">{episode.title}</p>
        <span className="text-xs text-muted-foreground">{complexityLabel(episode.complexity_level)}</span>
        <span className="ml-auto rounded-full bg-secondary px-3 py-1 text-xs">
          {EPISODE_STATUS_LABEL[episode.status]}
        </span>
      </div>
      {episode.learning_goal && (
        <p className="mt-3 text-sm text-muted-foreground">Mål: {episode.learning_goal}</p>
      )}
      {episode.academic_concepts.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          Begreber: {episode.academic_concepts.join(", ")}
        </p>
      )}

      {list.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium">Konsekvenser</p>
          {list.map((c) => (
            <ConsequenceCard
              key={c.id}
              consequence={c}
              states={states}
              episodeTitle={episode.title}
              onApplied={refresh}
            />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {episode.lesson_id && (
          <>
            <Link to="/lessons/$lessonId/edit" params={{ lessonId: episode.lesson_id }}>
              <Button variant="outline" size="sm" className="rounded-full">
                Åbn lektion
              </Button>
            </Link>
            <Link to="/lessons/$lessonId/run" params={{ lessonId: episode.lesson_id }}>
              <Button size="sm" className="rounded-full">
                Start undervisning
              </Button>
            </Link>
          </>
        )}
        {episode.status !== "active" && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setStatus.mutate("active")}
          >
            Sæt i gang
          </Button>
        )}
        {episode.status !== "completed" && (
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => setStatus.mutate("completed")}
          >
            Markér som gennemført
          </Button>
        )}
      </div>
    </div>
  );
}

function WorldDetail() {
  const { worldId } = Route.useParams();
  const queryClient = useQueryClient();
  const world = useQuery(worldQuery(worldId));
  const episodes = useQuery(episodesQuery(worldId));
  const states = useQuery(worldStateQuery(worldId));
  const events = useQuery(worldEventsQuery(worldId));

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["world", worldId] });
    void queryClient.invalidateQueries({ queryKey: ["world-state", worldId] });
    void queryClient.invalidateQueries({ queryKey: ["world-episodes", worldId] });
    void queryClient.invalidateQueries({ queryKey: ["world-events", worldId] });
    void queryClient.invalidateQueries({ queryKey: ["world-consequences", worldId] });
  }

  const undo = useMutation({
    mutationFn: async () => {
      const latest = (events.data ?? []).find((e) => !e.reverted_at && e.state_changes.length > 0);
      if (!latest) throw new Error("Der er ingen ændring at fortryde.");
      return rollbackEvent(latest, states.data ?? []);
    },
    onSuccess: () => {
      refresh();
      toast.success("Den seneste ændring er fortrudt.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (world.isLoading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-14 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Henter World …
      </div>
    );
  }
  if (!world.data) {
    return <div className="mx-auto max-w-5xl px-6 py-14">Dette World blev ikke fundet.</div>;
  }

  const w = world.data;

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold">{w.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {w.subject} · {WORLD_STATUS_LABEL[w.status]}
            {w.academic_focus ? ` · ${w.academic_focus}` : ""}
          </p>
          {w.premise && <p className="mt-4 text-muted-foreground">{w.premise}</p>}
        </div>
        <Link to="/worlds/$worldId/episodes/new" params={{ worldId }}>
          <Button className="rounded-full">
            <Plus className="size-4" /> Ny episode
          </Button>
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">World-tilstand</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tilstanden ændrer sig kun, når du bekræfter en konsekvens.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(states.data ?? []).map((s) => (
            <StateBar key={s.id} s={s} />
          ))}
          {states.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Dette World har endnu ingen variabler.</p>
          )}
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold">Episoder</h2>
        {episodes.data?.length === 0 && (
          <div className="surface-card p-8 text-center text-muted-foreground">
            Ingen episoder endnu. Byg den første episode med ChatGPT.
          </div>
        )}
        {(episodes.data ?? []).map((e) => (
          <EpisodeCard key={e.id} episode={e} states={states.data ?? []} worldId={worldId} refresh={refresh} />
        ))}
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <History className="size-5" /> World-hukommelse
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => undo.mutate()}
            disabled={undo.isPending}
          >
            <Undo2 className="size-4" /> Fortryd seneste ændring
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {events.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Der er endnu ikke sket noget i dette World.</p>
          )}
          {(events.data ?? []).map((ev) => (
            <div
              key={ev.id}
              className={`rounded-xl border border-border/70 p-4 ${ev.reverted_at ? "opacity-50" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{ev.title}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(ev.created_at).toLocaleString("da-DK")}
                </span>
                {ev.reverted_at && <span className="text-xs text-muted-foreground">Fortrudt</span>}
              </div>
              {ev.description && <p className="mt-1 text-sm text-muted-foreground">{ev.description}</p>}
              {ev.state_changes.length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {ev.state_changes
                    .map((c) => `${c.label}: ${String(c.before)} → ${String(c.after)}`)
                    .join(" · ")}
                </p>
              )}
              {ev.academic_rationale && (
                <p className="mt-2 text-sm">
                  <span className="font-medium">Fagligt: </span>
                  {ev.academic_rationale}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
