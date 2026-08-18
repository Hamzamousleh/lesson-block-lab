import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  History,
  Loader2,
  Lock,
  Plus,
  Radio,
  Undo2,
  Users,
} from "lucide-react";
import {
  applyConsequence,
  describeChange,
  eligiblePendingConsequences,
  evaluateTrigger,
  formatStateValue,
  pendingChangesOf,
  previewChanges,
  releasePendingConsequences,
  rollbackEvent,
} from "@/lib/consequences";
import { describeUnlockCondition, evaluateUnlock, syncEpisodeLocks } from "@/lib/unlock";
import {
  buildWorldSummary,
  completeWorld,
  consequencesQuery,
  complexityLabel,
  decisionQuery,
  duplicateWorld,
  episodeStatsQuery,
  episodesQuery,
  EPISODE_STATUS_LABEL,
  REVEAL_LABEL,
  TRIGGER_LABEL,
  updateEpisode,
  worldEventsQuery,
  worldQuery,
  worldStateQuery,
  WORLD_STATUS_LABEL,
  type UnlockCondition,
  type WorldConsequence,
  type WorldEpisode,
  type WorldEvent,
  type WorldStateVar,
  type WorldTransactionResult,
} from "@/lib/worlds";
import { blocksQuery } from "@/lib/data";
import { ConsequenceEditor } from "@/components/worlds/ConsequenceEditor";
import { StartSessionDialog } from "@/components/session/StartSessionDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/worlds/$worldId")({
  head: () => ({
    meta: [
      { title: "World — CaseLab" },
      {
        name: "description",
        content: "Følg tilstand, episoder og konsekvenser i dit læringsunivers.",
      },
      { property: "og:title", content: "World — CaseLab" },
      {
        property: "og:description",
        content: "Tilstand, episoder, konsekvenser og World-hukommelse.",
      },
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
        Math.min(
          100,
          ((Number(s.value) - (s.min_value ?? 0)) / ((s.max_value ?? 100) - (s.min_value ?? 0))) *
            100,
        ),
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
      {!s.student_visible && (
        <p className="mt-1 text-xs text-muted-foreground">Kun synlig for læreren</p>
      )}
    </div>
  );
}

/* ---------------- consequences ---------------- */

function ConsequenceCard({
  consequence,
  states,
  episode,
  onApplied,
  onEdit,
}: {
  consequence: WorldConsequence;
  states: WorldStateVar[];
  episode: WorldEpisode;
  onApplied: (result: WorldTransactionResult) => void | Promise<void>;
  onEdit: () => void;
}) {
  const changes = pendingChangesOf(consequence);
  const { applied, errors } = previewChanges(states, changes);
  const decision = useQuery(decisionQuery(episode.id, consequence.source_block_id));
  const evaluation = evaluateTrigger(consequence, decision.data?.summary ?? null);
  const responded = decision.data?.total ?? 0;

  const apply = useMutation({
    mutationFn: async () =>
      applyConsequence({
        consequence,
        states,
        changes,
        episodeTitle: episode.title,
        reasonText: evaluation.detail
          ? `${evaluation.reason} (${evaluation.detail})`
          : evaluation.reason,
      }),
    onSuccess: async (res) => {
      toast.success(
        res.deferred
          ? "Konsekvensen er planlagt og mærkes i næste episode."
          : "Konsekvensen er anvendt på World-tilstanden.",
      );
      await onApplied(res.transaction);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isApplied = consequence.status === "applied";
  const canApply = !isApplied && errors.length === 0 && (evaluation.fires || evaluation.tie);

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
        <Button variant="ghost" size="sm" className="ml-auto rounded-full" onClick={onEdit}>
          Redigér
        </Button>
      </div>

      {consequence.source_block_id && (
        <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
          <p className="font-medium">
            Elevernes beslutning{decision.data?.blockTitle ? `: ${decision.data.blockTitle}` : ""}
          </p>
          <p className="mt-1 text-muted-foreground">
            {responded === 0
              ? "Der er endnu ingen elevsvar at basere konsekvensen på."
              : `${responded} svar · ${evaluation.reason}`}
          </p>
          {evaluation.detail && (
            <p className="mt-1 text-xs text-muted-foreground">{evaluation.detail}</p>
          )}
        </div>
      )}

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
      {errors.length > 0 && <p className="mt-3 text-sm text-destructive">{errors[0]}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          className="rounded-full"
          disabled={isApplied || apply.isPending || !canApply}
          onClick={() => apply.mutate()}
        >
          {apply.isPending && <Loader2 className="size-4 animate-spin" />}
          {isApplied
            ? "Anvendt"
            : consequence.status === "pending"
              ? "Planlagt til næste episode"
              : "Bekræft konsekvens"}
        </Button>
        {!isApplied && !canApply && (
          <span className="text-xs text-muted-foreground">{evaluation.reason}</span>
        )}
      </div>
    </div>
  );
}

/* ---------------- episode ---------------- */

function EpisodeCard({
  episode,
  episodes,
  states,
  worldId,
  worldClassId,
  refresh,
  onWorldTransaction,
  tone,
}: {
  episode: WorldEpisode;
  episodes: WorldEpisode[];
  states: WorldStateVar[];
  worldId: string;
  worldClassId: string | null;
  refresh: () => void | Promise<void>;
  onWorldTransaction: (result: WorldTransactionResult) => void | Promise<void>;
  tone: "now" | "past" | "next";
}) {
  const consequences = useQuery(consequencesQuery(worldId, episode.id));
  const stats = useQuery({ ...episodeStatsQuery(episode.id), refetchInterval: 8000 });
  const blocks = useQuery({
    ...blocksQuery(episode.lesson_id ?? ""),
    enabled: !!episode.lesson_id,
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<WorldConsequence | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);

  const list = consequences.data ?? [];
  const unlock = evaluateUnlock(episode, episodes, states);
  const locked = episode.status === "locked";

  const setStatus = useMutation({
    mutationFn: (status: WorldEpisode["status"]) => updateEpisode(episode.id, { status }),
    onSuccess: async () => {
      await refresh();
      toast.success("Episoden er opdateret.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div
      className={`surface-card p-6 ${
        tone === "now"
          ? "border-primary/40 ring-1 ring-primary/20"
          : tone === "past"
            ? "opacity-90"
            : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
          Episode {episode.episode_number}
        </span>
        {episode.branch_key && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Forgrening · {episode.branch_key}
          </span>
        )}
        <p className="text-lg font-medium">{episode.title}</p>
        <span className="text-xs text-muted-foreground">
          {complexityLabel(episode.complexity_level)}
        </span>
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

      {locked && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-secondary/60 p-3 text-sm">
          <Lock className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {describeUnlockCondition(episode.unlock_condition as UnlockCondition | null, states)}{" "}
            {unlock.reason}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto rounded-full"
            onClick={() => setStatus.mutate("available")}
          >
            Lås op
          </Button>
        </div>
      )}

      {stats.data?.sessionId && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-secondary/60 p-3 text-sm">
          <Users className="size-4 text-muted-foreground" />
          <span>
            {stats.data.participants} deltagere · {stats.data.responses} svar
            {stats.data.joinCode ? ` · kode ${stats.data.joinCode}` : ""}
          </span>
          <Button asChild size="sm" variant="outline" className="ml-auto rounded-full">
            <Link to="/sessions/$sessionId" params={{ sessionId: stats.data.sessionId }}>
              Se elevsvar
            </Link>
          </Button>
        </div>
      )}

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Konsekvenser</p>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="size-4" /> Tilføj konsekvens
          </Button>
        </div>
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ingen konsekvenser endnu. Tilføj en regel, så elevernes valg får følger.
          </p>
        )}
        {list.map((c) => (
          <ConsequenceCard
            key={c.id}
            consequence={c}
            states={states}
            episode={episode}
            onApplied={onWorldTransaction}
            onEdit={() => {
              setEditing(c);
              setEditorOpen(true);
            }}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {episode.lesson_id && !locked && (
          <>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/lessons/$lessonId/edit" params={{ lessonId: episode.lesson_id }}>
                Redigér
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/lessons/$lessonId/run" params={{ lessonId: episode.lesson_id }}>
                Kør lektion
              </Link>
            </Button>
            <Button size="sm" className="rounded-full" onClick={() => setSessionOpen(true)}>
              <Radio className="size-4" /> Start elevsession
            </Button>
          </>
        )}
        {episode.status !== "active" && !locked && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setStatus.mutate("active")}
          >
            Sæt i gang
          </Button>
        )}
        {episode.status !== "completed" && !locked && (
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

      {editorOpen && (
        <ConsequenceEditor
          key={editing?.id ?? "new"}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          worldId={worldId}
          episode={episode}
          states={states}
          editing={editing}
          onSaved={refresh}
        />
      )}
      {episode.lesson_id && (
        <StartSessionDialog
          open={sessionOpen}
          onOpenChange={setSessionOpen}
          lessonId={episode.lesson_id}
          classId={worldClassId}
          blocks={blocks.data ?? []}
          episodeId={episode.id}
        />
      )}
    </div>
  );
}

/* ---------------- page ---------------- */

function WorldDetail() {
  const { worldId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const world = useQuery(worldQuery(worldId));
  const episodes = useQuery(episodesQuery(worldId));
  const states = useQuery(worldStateQuery(worldId));
  const events = useQuery(worldEventsQuery(worldId));
  const allConsequences = useQuery(consequencesQuery(worldId));

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["world", worldId] }),
      queryClient.invalidateQueries({ queryKey: ["world-state", worldId] }),
      queryClient.invalidateQueries({ queryKey: ["world-episodes", worldId] }),
      queryClient.invalidateQueries({ queryKey: ["world-events", worldId] }),
      queryClient.invalidateQueries({ queryKey: ["world-consequences", worldId] }),
      queryClient.invalidateQueries({ queryKey: ["world-decision"] }),
    ]);
  }

  async function reconcileTransaction(result: WorldTransactionResult) {
    queryClient.setQueryData(["world-state", worldId], result.state);

    const confirmedConsequences = [
      ...(result.consequence ? [result.consequence] : []),
      ...(result.consequences ?? []),
    ];
    if (confirmedConsequences.length > 0) {
      queryClient.setQueriesData<WorldConsequence[]>(
        { queryKey: ["world-consequences", worldId] },
        (existing) =>
          existing?.map(
            (current) =>
              confirmedConsequences.find((confirmed) => confirmed.id === current.id) ?? current,
          ),
      );
    }

    queryClient.setQueryData<WorldEvent[]>(["world-events", worldId], (existing) => {
      if (!existing) return existing;
      let next = result.reverted_event
        ? existing.map((event) =>
            event.id === result.reverted_event?.id ? result.reverted_event : event,
          )
        : existing;
      if (!result.duplicate) {
        const confirmedEvents = [...(result.event ? [result.event] : []), ...(result.events ?? [])];
        next = [
          ...confirmedEvents.filter((event) => !next.some((current) => current.id === event.id)),
          ...next,
        ];
      }
      return next;
    });

    await refresh();
  }

  const undo = useMutation({
    mutationFn: async () => {
      const latest = (events.data ?? []).find((e) => !e.reverted_at && e.state_changes.length > 0);
      if (!latest) throw new Error("Der er ingen ændring at fortryde.");
      return rollbackEvent(latest);
    },
    onSuccess: async (result) => {
      await reconcileTransaction(result);
      toast.success("Den seneste ændring er fortrudt.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = episodes.data ?? [];
  const stateList = states.data ?? [];

  const checkLocks = useMutation({
    mutationFn: () => syncEpisodeLocks(list, stateList),
    onSuccess: async (n) => {
      await refresh();
      toast.success(n ? `${n} episode(r) blev låst op.` : "Ingen episoder kunne låses op endnu.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: () => duplicateWorld(worldId, world.data?.class_id ?? null),
    onSuccess: (copy) => {
      toast.success("Worldet er kopieret til en ny klasse.");
      void navigate({ to: "/worlds/$worldId", params: { worldId: copy.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const finish = useMutation({
    mutationFn: async () => {
      if (!world.data) throw new Error("Worldet blev ikke fundet.");
      return completeWorld(world.data, buildWorldSummary(list, stateList, events.data ?? []));
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Worldet er afsluttet.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const releaseAll = useMutation({
    mutationFn: async (eligible: WorldConsequence[]) => {
      const active = list.find((e) => e.status === "active") ?? list[0];
      if (!active) throw new Error("Der er ingen aktiv episode.");
      return releasePendingConsequences(eligible, active.id);
    },
    onSuccess: async (result) => {
      await reconcileTransaction(result);
      toast.success("De planlagte konsekvenser er nu synlige i World-tilstanden.");
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
  const active = list.find((e) => e.status === "active") ?? null;
  const past = list.filter((e) => e.status === "completed");
  const upcoming = list.filter((e) => e.id !== active?.id && e.status !== "completed");
  const lastCompleted = past[past.length - 1] ?? null;

  const episodeNumberOf = (id: string | null) =>
    id ? (list.find((e) => e.id === id)?.episode_number ?? null) : null;
  const pending = (allConsequences.data ?? []).filter((c) => c.status === "pending");
  const eligible = active
    ? eligiblePendingConsequences(pending, episodeNumberOf, active.episode_number)
    : [];

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
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={duplicate.isPending}
            onClick={() => duplicate.mutate()}
          >
            <Copy className="size-4" /> Kopiér til ny klasse
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/worlds/$worldId/episodes/new" params={{ worldId }}>
              <Plus className="size-4" /> Ny episode
            </Link>
          </Button>
        </div>
      </div>

      {eligible.length > 0 && (
        <div className="mt-8 rounded-2xl border border-primary/40 bg-primary/5 p-5">
          <p className="font-medium">Planlagte konsekvenser er klar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {eligible.length} konsekvens(er) fra en tidligere episode kan nu mærkes i
            World-tilstanden.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {eligible.map((c) => (
              <li key={c.id}>· {c.title}</li>
            ))}
          </ul>
          <Button
            size="sm"
            className="mt-4 rounded-full"
            disabled={releaseAll.isPending}
            onClick={() => releaseAll.mutate(eligible)}
          >
            {releaseAll.isPending && <Loader2 className="size-4 animate-spin" />} Anvend nu
          </Button>
        </div>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">World-tilstand</h2>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => checkLocks.mutate()}
            disabled={checkLocks.isPending}
          >
            Tjek låste episoder
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Tilstanden ændrer sig kun, når du bekræfter en konsekvens.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {stateList.map((s) => (
            <StateBar key={s.id} s={s} />
          ))}
          {stateList.length === 0 && (
            <p className="text-sm text-muted-foreground">Dette World har endnu ingen variabler.</p>
          )}
        </div>
      </section>

      {list.length === 0 && (
        <div className="surface-card mt-12 p-8 text-center text-muted-foreground">
          Ingen episoder endnu. Byg den første episode med ChatGPT.
        </div>
      )}

      {active && (
        <section className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold">Nu</h2>
          <EpisodeCard
            episode={active}
            episodes={list}
            states={stateList}
            worldId={worldId}
            worldClassId={w.class_id}
            refresh={refresh}
            onWorldTransaction={reconcileTransaction}
            tone="now"
          />
        </section>
      )}

      {lastCompleted && (
        <section className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold">Sidst</h2>
          <EpisodeCard
            episode={lastCompleted}
            episodes={list}
            states={stateList}
            worldId={worldId}
            worldClassId={w.class_id}
            refresh={refresh}
            onWorldTransaction={reconcileTransaction}
            tone="past"
          />
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold">Næste</h2>
          {upcoming.map((e) => (
            <EpisodeCard
              key={e.id}
              episode={e}
              episodes={list}
              states={stateList}
              worldId={worldId}
              worldClassId={w.class_id}
              refresh={refresh}
              onWorldTransaction={reconcileTransaction}
              tone="next"
            />
          ))}
        </section>
      )}

      {past.length > 1 && (
        <section className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold">Tidligere episoder</h2>
          {past.slice(0, -1).map((e) => (
            <EpisodeCard
              key={e.id}
              episode={e}
              episodes={list}
              states={stateList}
              worldId={worldId}
              worldClassId={w.class_id}
              refresh={refresh}
              onWorldTransaction={reconcileTransaction}
              tone="past"
            />
          ))}
        </section>
      )}

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
            <p className="text-sm text-muted-foreground">
              Der er endnu ikke sket noget i dette World.
            </p>
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
              {ev.description && (
                <p className="mt-1 text-sm text-muted-foreground">{ev.description}</p>
              )}
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

      {w.status !== "completed" && (
        <div className="mt-12 rounded-2xl border border-border/70 p-6">
          <p className="font-medium">Afslut Worldet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Gemmer et fagligt resumé med start- og sluttilstand samt de vigtigste begivenheder.
          </p>
          <Button
            variant="outline"
            className="mt-4 rounded-full"
            disabled={finish.isPending}
            onClick={() => finish.mutate()}
          >
            <CheckCircle2 className="size-4" /> Afslut World
          </Button>
        </div>
      )}
    </div>
  );
}
