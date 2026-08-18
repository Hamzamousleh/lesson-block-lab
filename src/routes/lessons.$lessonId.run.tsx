import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { blocksQuery, classQuery, lessonQuery, updateLesson } from "@/lib/data";
import { blockDef } from "@/lib/blocks";
import type { LessonBlock } from "@/lib/types";
import { BlockRenderer, revealSteps } from "@/components/run/BlockRenderer";
import { Button } from "@/components/ui/button";
import {
  activeParticipants,
  participantsQuery,
  responsesQuery,
  sessionsQuery,
  type StudentSession,
  updateSession,
} from "@/lib/sessions";
import { CockpitSyncCoordinator, type CockpitSyncState } from "@/lib/cockpit-sync";
import { summarize } from "@/lib/results";
import { ResultBars, StudentBlock } from "@/components/student/StudentBlock";
import { correctOptionIndex, timerLabel, toPreviewBlock, workMode } from "@/lib/cockpit";
import {
  blockMaterialFilesQuery,
  formatFileSize,
  materialFilesQuery,
  materialFileUrl,
  materialKindLabel,
} from "@/lib/materials";

export const Route = createFileRoute("/lessons/$lessonId/run")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { session?: string } =>
    typeof search["session"] === "string" ? { session: search["session"] } : {},
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Undervis — CaseLab" },
      {
        name: "description",
        content: "Kør lektionen live med elevvisning, tid og svar i ét billede.",
      },
      { property: "og:title", content: "Undervis — CaseLab" },
      { property: "og:description", content: "Lærercockpit til live undervisning." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RunMode,
});

function useElapsed(active: boolean, storageKey: string) {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active) return;
    if (startRef.current === null) {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      const parsed = saved ? Number(saved) : NaN;
      startRef.current = Number.isFinite(parsed) ? parsed : Date.now();
      try {
        window.localStorage.setItem(storageKey, String(startRef.current));
      } catch {
        /* private mode */
      }
    }
    const t = setInterval(() => {
      setSeconds(Math.floor((Date.now() - (startRef.current as number)) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [active, storageKey]);
  return Math.floor(seconds / 60);
}

/* ------------------------------------------------------------------ *
 * Activity countdown. State survives rerenders and query refreshes
 * (refs + localStorage), and is mirrored to the session row so students
 * can optionally see it and a browser refresh recovers it.
 * ------------------------------------------------------------------ */
interface TimerState {
  endsAt: number | null;
  /** signed seconds; negative = overtime */
  remaining: number;
}

function timerFromSession(session: StudentSession, fallbackSeconds: number): TimerState {
  if (session.timer_ends_at) {
    return {
      endsAt: new Date(session.timer_ends_at).getTime(),
      remaining: session.timer_remaining_seconds ?? fallbackSeconds,
    };
  }
  return {
    endsAt: null,
    remaining: session.timer_remaining_seconds ?? fallbackSeconds,
  };
}

function RunMode() {
  const { lessonId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const lesson = useQuery(lessonQuery(lessonId));
  const blocksRes = useQuery(blocksQuery(lessonId));
  const klass = useQuery({
    ...classQuery(lesson.data?.class_id ?? ""),
    enabled: !!lesson.data?.class_id,
  });

  const all = useMemo(() => blocksRes.data ?? [], [blocksRes.data]);
  const main = useMemo(() => all.filter((b) => !b.is_fallback), [all]);
  const fallback = useMemo(() => all.filter((b) => b.is_fallback), [all]);

  const search = Route.useSearch();
  // Opened straight from a running student session: skip the start screen.
  const [started, setStarted] = useState(!!search.session);
  const [useFallback, setUseFallback] = useState(false);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [projector, setProjector] = useState(false);
  const [finished, setFinished] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [showNames, setShowNames] = useState(false);
  const [syncState, setSyncState] = useState<CockpitSyncState>({ phase: "idle", label: null });
  const syncCoordinatorRef = useRef<CockpitSyncCoordinator<StudentSession> | null>(null);
  if (!syncCoordinatorRef.current) {
    syncCoordinatorRef.current = new CockpitSyncCoordinator<StudentSession>(setSyncState);
  }

  const active = useFallback ? fallback : main;
  const elapsed = useElapsed(started, `caselab-run-start-${lessonId}`);

  const current: LessonBlock | undefined = active[index];
  const totalSteps = current ? revealSteps(current) : 1;
  const materialLinks = useQuery(blockMaterialFilesQuery(current?.id ?? ""));
  const materialFiles = useQuery(materialFilesQuery());
  const currentMaterials = (materialLinks.data ?? [])
    .map((link) => (materialFiles.data ?? []).find((file) => file.id === link.material_file_id))
    .filter((file): file is NonNullable<typeof file> => !!file);

  const plannedTotal = active.reduce((s, b) => s + b.duration_minutes, 0);
  const plannedStart = active.slice(0, index).reduce((s, b) => s + b.duration_minutes, 0);
  const plannedEnd = plannedStart + (current?.duration_minutes ?? 0);
  const drift = elapsed - plannedStart;

  /* ---------- live student session (optional) ---------- */
  const sessions = useQuery({ ...sessionsQuery({ lessonId }), refetchInterval: 5000 });
  const liveSession =
    (search.session ? (sessions.data ?? []).find((s) => s.id === search.session) : undefined) ??
    (sessions.data ?? []).find((s) => s.mode === "live" && s.status !== "ended") ??
    null;
  const liveId = liveSession?.id ?? "";
  const participants = useQuery({ ...participantsQuery(liveId, true), enabled: !!liveId });
  const responses = useQuery({ ...responsesQuery(liveId, true), enabled: !!liveId });

  const reconcileSession = useCallback(
    async (updated: StudentSession) => {
      queryClient.setQueriesData<StudentSession[]>({ queryKey: ["sessions"] }, (existing) =>
        existing?.map((session) => (session.id === updated.id ? updated : session)),
      );
      queryClient.setQueryData(["session", updated.id], updated);
      await queryClient.invalidateQueries({ queryKey: ["sessions"], refetchType: "none" });
    },
    [queryClient],
  );

  const syncSession = useCallback(
    (
      label: string,
      patch: Parameters<typeof updateSession>[1],
      onConfirmed: (session: StudentSession) => void | Promise<void> = () => undefined,
    ) => {
      if (!liveSession) return Promise.resolve(false);
      return syncCoordinatorRef.current!.run({
        label,
        execute: () => updateSession(liveSession.id, patch),
        confirm: async (updated) => {
          await reconcileSession(updated);
          await onConfirmed(updated);
        },
      });
    },
    [liveSession, reconcileSession],
  );

  const syncPending = syncState.phase === "pending";

  /* Adopt the session's current activity once, so opening the cockpit from a
     running session continues where the class is — instead of resetting it. */
  const adoptedRef = useRef(false);
  useEffect(() => {
    if (adoptedRef.current || !liveSession) return;
    if (!all.length) return;
    adoptedRef.current = true;
    const sessionBlock = all.find((b) => b.id === liveSession.current_block_id);
    if (!sessionBlock) return;
    const sessionList = sessionBlock.is_fallback ? fallback : main;
    const i = sessionList.findIndex((b) => b.id === sessionBlock.id);
    if (i >= 0) {
      setUseFallback(sessionBlock.is_fallback);
      setIndex(i);
      setStep(0);
    }
  }, [all, fallback, liveSession, main]);

  /* ---------- activity timer ---------- */
  const timerKey = `caselab-timer-${lessonId}`;
  const [timer, setTimer] = useState<TimerState>({ endsAt: null, remaining: 0 });
  const [, tick] = useState(0);
  const timerBlockRef = useRef<string | null>(null);

  const persistTimer = useCallback(
    (blockId: string, next: TimerState) => {
      try {
        window.localStorage.setItem(timerKey, JSON.stringify({ blockId, ...next }));
      } catch {
        /* local persistence is optional */
      }
    },
    [timerKey],
  );

  // A live session is authoritative. Local storage is only a fallback when no
  // student session is connected.
  useEffect(() => {
    if (!current) return;
    if (liveSession && liveSession.current_block_id === current.id) {
      timerBlockRef.current = current.id;
      const next = timerFromSession(liveSession, current.duration_minutes * 60);
      setTimer((previous) =>
        previous.endsAt === next.endsAt && previous.remaining === next.remaining ? previous : next,
      );
      return;
    }

    if (timerBlockRef.current === current.id) return;
    timerBlockRef.current = current.id;
    let next: TimerState = { endsAt: null, remaining: current.duration_minutes * 60 };
    try {
      const raw = window.localStorage.getItem(timerKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { blockId?: string } & TimerState;
        if (parsed.blockId === current.id)
          next = { endsAt: parsed.endsAt, remaining: parsed.remaining };
      }
    } catch {
      /* ignore */
    }
    setTimer(next);
  }, [current, timerKey, liveSession]);

  const running = timer.endsAt !== null;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [running]);

  const seconds = timer.endsAt !== null ? (timer.endsAt - Date.now()) / 1000 : timer.remaining;

  const applyTimer = useCallback(
    (next: TimerState) => {
      if (!current) return;
      if (!liveSession) {
        setTimer(next);
        persistTimer(current.id, next);
        return;
      }

      void syncSession(
        "Timer",
        {
          timer_ends_at: next.endsAt ? new Date(next.endsAt).toISOString() : null,
          timer_remaining_seconds: Math.round(next.remaining),
        },
        (confirmed) => {
          const serverTimer = timerFromSession(confirmed, current.duration_minutes * 60);
          setTimer(serverTimer);
          persistTimer(current.id, serverTimer);
        },
      );
    },
    [current, liveSession, persistTimer, syncSession],
  );

  const startTimer = () =>
    applyTimer({ endsAt: Date.now() + timer.remaining * 1000, remaining: timer.remaining });
  const pauseTimer = () => applyTimer({ endsAt: null, remaining: seconds });
  const resetTimer = () =>
    applyTimer({ endsAt: null, remaining: (current?.duration_minutes ?? 0) * 60 });
  const addMinutes = (m: number) =>
    timer.endsAt !== null
      ? applyTimer({ endsAt: timer.endsAt + m * 60000, remaining: timer.remaining })
      : applyTimer({ endsAt: null, remaining: timer.remaining + m * 60 });

  /* ---------- live responses ---------- */
  const liveAnswers = current
    ? (responses.data ?? []).filter((a) => a.block_id === current.id)
    : [];
  const people = activeParticipants(participants.data ?? [], liveSession);
  const liveNames = new Map(people.map((p) => [p.id, p.display_name]));
  const liveSummary =
    current && liveSession
      ? summarize(
          current.type,
          (current.content ?? {}) as Record<string, unknown>,
          liveAnswers.map((a) => ({
            display_name: showNames ? (liveNames.get(a.participant_id) ?? "") : "",
            response_data: a.response_data,
          })),
        )
      : null;

  const answerKeyIndex = correctOptionIndex(current);

  const complete = useMutation({
    mutationFn: () => updateLesson(lessonId, { status: "completed" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Lektionen er markeret som afholdt ✓");
      navigate({ to: "/lessons/$lessonId/edit", params: { lessonId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goToActivity = (
    targetIndex: number,
    targetFallback = useFallback,
    targetStep = 0,
    skippedBlockId?: string,
  ) => {
    const targetList = targetFallback ? fallback : main;
    const target = targetList[targetIndex];
    if (!target) return;

    const applyConfirmedActivity = (confirmedBlockId: string) => {
      const confirmedBlock = all.find((block) => block.id === confirmedBlockId);
      if (!confirmedBlock) return;
      const confirmedList = confirmedBlock.is_fallback ? fallback : main;
      const confirmedIndex = confirmedList.findIndex((block) => block.id === confirmedBlock.id);
      if (confirmedIndex < 0) return;
      setUseFallback(confirmedBlock.is_fallback);
      setIndex(confirmedIndex);
      setStep(confirmedBlock.id === target.id ? targetStep : 0);
      setFinished(false);
      if (skippedBlockId && confirmedBlock.id === target.id) {
        setSkipped((existing) =>
          existing.includes(skippedBlockId) ? existing : [...existing, skippedBlockId],
        );
      }
    };

    if (!liveSession) {
      applyConfirmedActivity(target.id);
      return;
    }

    const resetSeconds = target.duration_minutes * 60;
    void syncSession(
      "Aktivitet",
      {
        current_block_id: target.id,
        status: "active",
        reveal_results: false,
        reveal_answer_key: false,
        timer_ends_at: null,
        timer_remaining_seconds: resetSeconds,
      },
      (confirmed) => {
        if (!confirmed.current_block_id) return;
        applyConfirmedActivity(confirmed.current_block_id);
        const serverTimer = timerFromSession(confirmed, resetSeconds);
        setTimer(serverTimer);
        persistTimer(confirmed.current_block_id, serverTimer);
      },
    );
  };

  const next = () => {
    if (syncCoordinatorRef.current?.isPending) return;
    if (!current) return;
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (index < active.length - 1) {
      goToActivity(index + 1);
    } else {
      setFinished(true);
    }
  };
  const prev = () => {
    if (syncCoordinatorRef.current?.isPending) return;
    if (step > 0) {
      setStep((s) => s - 1);
      return;
    }
    if (index > 0) {
      const target = active[index - 1];
      goToActivity(index - 1, useFallback, target ? revealSteps(target) - 1 : 0);
    }
  };
  const jumpTo = (i: number) => {
    if (syncCoordinatorRef.current?.isPending) return;
    goToActivity(i);
  };
  const skipCurrent = () => {
    if (!current || syncCoordinatorRef.current?.isPending) return;
    if (index < active.length - 1) goToActivity(index + 1, useFallback, 0, current.id);
    else {
      setSkipped((existing) =>
        existing.includes(current.id) ? existing : [...existing, current.id],
      );
      setFinished(true);
    }
  };

  useEffect(() => {
    if (!started || finished) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key.toLowerCase() === "f") {
        setProjector((v) => {
          const nextVal = !v;
          try {
            if (nextVal && !document.fullscreenElement)
              void document.documentElement.requestFullscreen();
            if (!nextVal && document.fullscreenElement) void document.exitFullscreen();
          } catch {
            /* fullscreen is optional */
          }
          return nextVal;
        });
      } else if (e.key === "Escape" && projector) {
        setProjector(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (lesson.isLoading || blocksRes.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Henter lektion …
      </div>
    );
  }
  if (lesson.isError || !lesson.data) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <p className="text-destructive">Lektionen kunne ikke hentes.</p>
        <Link to="/lessons" className="mt-4 inline-block underline">
          Tilbage til lektioner
        </Link>
      </div>
    );
  }

  const l = lesson.data;

  /* ---------- empty ---------- */
  if (main.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-28 text-center">
        <h1 className="font-display text-3xl font-semibold">
          Lektionen har endnu ingen aktiviteter.
        </h1>
        <Button asChild className="mt-8 rounded-full">
          <Link to="/lessons/$lessonId/edit" params={{ lessonId }}>
            Tilføj aktivitet
          </Link>
        </Button>
      </div>
    );
  }

  /* ---------- start screen ---------- */
  if (!started) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <p className="text-lg text-muted-foreground">
          {klass.data ? `${klass.data.name} · ${klass.data.subject}` : (l.subject ?? "Lektion")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-balance sm:text-5xl">
          {l.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {l.duration_minutes} min · {main.length} aktiviteter
          {fallback.length > 0 ? ` · ${fallback.length} ekstra i baghånden` : ""}
        </p>
        {l.learning_goal && (
          <div className="mt-8">
            <p className="text-xs tracking-widest text-muted-foreground uppercase">Læringsmål</p>
            <p className="mt-2 text-xl">{l.learning_goal}</p>
          </div>
        )}
        <div className="mt-12 flex flex-wrap gap-3">
          <Button size="lg" className="rounded-full px-8" onClick={() => setStarted(true)}>
            Start undervisning
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <Link to="/lessons/$lessonId/edit" params={{ lessonId }}>
              Tilbage til redigering
            </Link>
          </Button>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          Genveje: ← → skift aktivitet · Mellemrum næste · F projektor
        </p>
      </div>
    );
  }

  /* ---------- finished ---------- */
  if (finished) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16 text-center">
        <h1 className="font-display text-4xl font-semibold">Lektionen er afsluttet</h1>
        <p className="mt-4 text-xl">{l.title}</p>
        <p className="mt-2 text-muted-foreground">
          Planlagt {plannedTotal} min · {main.length} aktiviteter · brugt {elapsed} min
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/lessons/$lessonId/edit" params={{ lessonId }}>
              Tilbage til lektionen
            </Link>
          </Button>
          <Button
            className="rounded-full"
            disabled={complete.isPending}
            onClick={() => complete.mutate()}
          >
            {complete.isPending && <Loader2 className="size-4 animate-spin" />}
            Markér som afsluttet
          </Button>
          {fallback.length > 0 && !useFallback && (
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={syncPending}
              onClick={() => goToActivity(0, true)}
            >
              Ekstra aktivitet
            </Button>
          )}
        </div>
      </div>
    );
  }

  const progressPct = ((index + 1) / active.length) * 100;

  /* ---------- projector ---------- */
  if (projector) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="h-1 w-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex flex-1 items-center px-10 py-12 sm:px-20">
          <div className="w-full">
            {current && <BlockRenderer block={current} step={step} view="projector" />}
          </div>
        </div>
        <div className="flex items-center justify-between px-10 pb-8 text-sm text-muted-foreground sm:px-20">
          <button
            type="button"
            onClick={prev}
            disabled={syncPending}
            className="rounded-full px-4 py-2 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Forrige
          </button>
          <span className="tabular-nums">{timerLabel(seconds)}</span>
          <span>
            {index + 1} / {active.length}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={syncPending}
            className="rounded-full px-4 py-2 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Næste →
          </button>
        </div>
      </div>
    );
  }

  /* ---------- cockpit ---------- */
  const overtime = seconds <= -1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-3 text-sm sm:gap-3 sm:px-6">
        <div className="min-w-0 basis-full break-words sm:flex-1 sm:basis-auto">
          <span className="font-medium">{l.title}</span>
          {klass.data && <span className="text-muted-foreground"> · {klass.data.name}</span>}
          {useFallback && <span className="ml-2 text-primary">· Ekstra aktivitet</span>}
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 font-medium tabular-nums">
          Aktivitet {index + 1} af {active.length}
        </span>
        {liveSession && (
          <Link to="/sessions/$sessionId" params={{ sessionId: liveSession.id }}>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              Elevsession · {liveSession.join_code} · {people.length}{" "}
              {people.length === 1 ? "deltager" : "deltagere"}
            </span>
          </Link>
        )}
        {liveSession && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
              syncState.phase === "error"
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {syncState.phase === "pending" && (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Synkroniserer…
              </>
            )}
            {syncState.phase === "synced" && (
              <>
                <Check className="size-3.5" /> Synkroniseret
              </>
            )}
            {syncState.phase === "error" && (
              <>
                <span>Kunne ikke synkronisere ændringen</span>
                <button
                  type="button"
                  className="rounded-full underline underline-offset-2 hover:no-underline"
                  onClick={() => void syncCoordinatorRef.current?.retry()}
                >
                  Prøv igen
                </button>
              </>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => setProjector(true)}
        >
          <Maximize2 className="size-4" /> Projektor
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-full"
          aria-label="Afslut visning"
        >
          <Link to="/lessons/$lessonId/edit" params={{ lessonId }}>
            <X className="size-4" />
          </Link>
        </Button>
      </header>

      <div className="h-1 w-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          {/* ---------------- left: what students see + responses ---------------- */}
          <div className="space-y-6">
            <section className="surface-card p-4 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Det eleverne ser</h2>
                <span className="text-xs tracking-widest text-muted-foreground uppercase">
                  {blockDef(current?.type ?? "").label} · {workMode(current?.type ?? "")}
                </span>
              </div>
              <div className="mt-6 rounded-2xl border border-border bg-background p-4 sm:p-6">
                {current ? (
                  <>
                    {currentMaterials.length > 0 && (
                      <div className="mb-6 rounded-2xl border border-primary/25 bg-accent/60 p-5">
                        <p className="flex items-center gap-2 font-semibold">
                          <FileText className="size-5 text-primary" /> Materialer til denne
                          aktivitet
                        </p>
                        <div className="mt-3 space-y-2">
                          {currentMaterials.map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-left transition-colors hover:border-primary/50"
                              onClick={async () => {
                                try {
                                  window.open(
                                    await materialFileUrl(file),
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Filen kunne ikke åbnes.",
                                  );
                                }
                              }}
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{file.title}</span>
                                <span className="block truncate text-sm text-muted-foreground">
                                  {file.file_name} ·{" "}
                                  {materialKindLabel(file.mime_type, file.file_name)} ·{" "}
                                  {formatFileSize(file.file_size)}
                                </span>
                              </span>
                              <Download className="size-5 shrink-0 text-primary" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <StudentBlock
                      key={current.id}
                      block={toPreviewBlock(current)}
                      saved={undefined}
                      submitting={false}
                      disabled
                      preview
                    />
                  </>
                ) : (
                  <p className="text-muted-foreground">Ingen aktiv aktivitet.</p>
                )}
              </div>
              {step < totalSteps - 1 && (
                <Button
                  variant="outline"
                  className="mt-6 rounded-full"
                  onClick={next}
                  disabled={syncPending}
                >
                  <Eye className="size-4" /> Vis næste trin
                </Button>
              )}
            </section>

            {liveSession && liveSummary && (
              <section className="surface-card p-4 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Elevsvar</h2>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    Svar:{" "}
                    {
                      liveAnswers.filter((a) => people.some((p) => p.id === a.participant_id))
                        .length
                    }{" "}
                    / {people.length}
                  </span>
                </div>
                <div className="mt-5">
                  <ResultBars summary={liveSummary} />
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    variant={liveSession.reveal_results ? "default" : "outline"}
                    size="sm"
                    className="rounded-full"
                    disabled={syncPending}
                    onClick={() =>
                      void syncSession("Svarfordeling", {
                        reveal_results: !liveSession.reveal_results,
                      })
                    }
                  >
                    {liveSession.reveal_results ? "Skjul svarfordeling" : "Vis svarfordeling"}
                  </Button>
                  {answerKeyIndex !== null && (
                    <Button
                      variant={liveSession.reveal_answer_key ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      disabled={syncPending}
                      onClick={() =>
                        void syncSession("Facit", {
                          reveal_answer_key: !liveSession.reveal_answer_key,
                        })
                      }
                    >
                      {liveSession.reveal_answer_key ? "Skjul facit" : "Vis facit"}
                    </Button>
                  )}
                  {liveSession.reveal_answer_key && answerKeyIndex !== null && (
                    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                      <Check className="size-4" /> Facit vist
                    </span>
                  )}
                  {liveSummary.kind === "text" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setShowNames((v) => !v)}
                    >
                      {showNames ? "Skjul navne" : "Vis navne"}
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link
                      to="/sessions/$sessionId/follow-up"
                      params={{ sessionId: liveSession.id }}
                      target="_blank"
                    >
                      Reagér på svarene
                    </Link>
                  </Button>
                </div>
              </section>
            )}
          </div>

          {/* ---------------- right: time, plan, notes ---------------- */}
          <aside className="space-y-6">
            <section className="surface-card p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Tid til aktiviteten</h2>
                <span className="text-sm text-muted-foreground">
                  Afsat tid: {current?.duration_minutes ?? 0} min
                </span>
              </div>
              <p
                className={`mt-4 font-mono text-4xl font-semibold tabular-nums ${
                  overtime ? "text-destructive" : ""
                }`}
              >
                {timerLabel(seconds)}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {running ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={pauseTimer}
                    disabled={syncPending}
                  >
                    <Pause className="size-4" /> Pause
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={startTimer}
                    disabled={syncPending}
                  >
                    <Play className="size-4" /> Start timer
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={resetTimer}
                  disabled={syncPending}
                >
                  <RotateCcw className="size-4" /> Nulstil
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => addMinutes(1)}
                  disabled={syncPending}
                >
                  +1 min
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => addMinutes(2)}
                  disabled={syncPending}
                >
                  +2 min
                </Button>
              </div>
              {overtime && (
                <Button className="mt-4 w-full rounded-full" onClick={next} disabled={syncPending}>
                  Gå til næste
                </Button>
              )}
              {liveSession && (
                <Button
                  variant={liveSession.timer_show_students ? "default" : "ghost"}
                  size="sm"
                  className="mt-4 w-full rounded-full"
                  disabled={syncPending}
                  onClick={() =>
                    void syncSession("Timervisning", {
                      timer_show_students: !liveSession.timer_show_students,
                    })
                  }
                >
                  {liveSession.timer_show_students
                    ? "Skjul tiden for elever"
                    : "Vis tiden for elever"}
                </Button>
              )}
            </section>

            <section className="surface-card p-6">
              <h2 className="text-sm font-semibold">Lektionens tid</h2>
              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Clock className="size-4" /> Planlagt: {plannedTotal} min
                </p>
                <p>Planlagt progression: {plannedEnd} min</p>
                <p>Brugt: {elapsed} min</p>
              </div>
              <p
                className={`mt-3 inline-block rounded-full px-3 py-1 text-sm ${
                  Math.abs(drift) < 3
                    ? "bg-secondary text-muted-foreground"
                    : drift < 0
                      ? "bg-primary/10 text-primary"
                      : "bg-accent-warm text-accent-warm-foreground"
                }`}
              >
                {Math.abs(drift) < 3
                  ? "Følger planen"
                  : drift < 0
                    ? `${Math.abs(drift)} min foran planen`
                    : `${drift} min efter planen`}
              </p>
            </section>

            <section className="surface-card p-6">
              <h2 className="text-sm font-semibold">Lærernote</h2>
              <p className="mt-3 text-sm whitespace-pre-wrap">
                {current?.teacher_notes || "Ingen noter til denne aktivitet."}
              </p>
              {current?.student_instructions && (
                <>
                  <p className="mt-5 text-xs tracking-widest text-muted-foreground uppercase">
                    Elevinstruktion
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{current.student_instructions}</p>
                </>
              )}
              {answerKeyIndex !== null && (
                <p className="mt-5 text-sm">
                  <span className="text-xs tracking-widest text-muted-foreground uppercase">
                    Facit
                  </span>
                  <br />
                  Korrekt svar: {String.fromCharCode(65 + answerKeyIndex)}
                </p>
              )}
            </section>

            <section className="surface-card p-6">
              <h2 className="text-sm font-semibold">Forløbet</h2>
              <ol className="mt-3 space-y-1">
                {active.map((b, i) => {
                  const isSkipped = skipped.includes(b.id);
                  const done = i < index && !isSkipped;
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => jumpTo(i)}
                        disabled={syncPending}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          i === index
                            ? "bg-accent font-medium text-accent-foreground"
                            : "hover:bg-secondary"
                        } ${isSkipped ? "line-through opacity-50" : ""} ${
                          done ? "text-muted-foreground" : ""
                        }`}
                      >
                        <span className="w-4 shrink-0">
                          {i === index ? "→" : done ? "✓" : isSkipped ? "–" : ""}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{b.title}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {b.duration_minutes} min
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {fallback.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full rounded-full"
                  disabled={syncPending}
                  onClick={() => goToActivity(0, !useFallback)}
                >
                  {useFallback ? "Tilbage til lektionen" : `Ekstra aktivitet (${fallback.length})`}
                </Button>
              )}
            </section>
          </aside>
        </div>
      </main>

      <footer className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
        <Button
          variant="outline"
          className="min-h-11 rounded-full"
          onClick={prev}
          disabled={syncPending || (index === 0 && step === 0)}
        >
          <ArrowLeft className="size-4" /> Forrige
        </Button>
        <Button className="min-h-11 rounded-full sm:order-3" onClick={next} disabled={syncPending}>
          {index === active.length - 1 && step === totalSteps - 1 ? "Afslut" : "Næste"}
          <ArrowRight className="size-4" />
        </Button>
        <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-center gap-2 sm:order-2 sm:col-span-1 sm:flex-nowrap sm:gap-3">
          <span className="min-w-0 basis-full break-words text-center text-sm text-muted-foreground sm:basis-auto">
            {current ? `${blockDef(current.type).icon} ${current.title}` : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 shrink-0 rounded-full sm:min-h-8"
            onClick={skipCurrent}
            disabled={syncPending}
          >
            <SkipForward className="size-4" /> Spring over
          </Button>
        </div>
      </footer>
    </div>
  );
}
