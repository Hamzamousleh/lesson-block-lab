import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Eye,
  Loader2,
  Maximize2,
  NotebookPen,
  ListOrdered,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { blocksQuery, classQuery, lessonQuery, updateLesson } from "@/lib/data";
import { blockDef } from "@/lib/blocks";
import type { LessonBlock } from "@/lib/types";
import { BlockRenderer, revealSteps } from "@/components/run/BlockRenderer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  participantsQuery,
  responsesQuery,
  sessionsQuery,
  updateSession,
} from "@/lib/sessions";
import { summarize } from "@/lib/results";
import { ResultBars } from "@/components/student/StudentBlock";


export const Route = createFileRoute("/lessons/$lessonId/run")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Undervis — CaseLab" },
      { name: "description", content: "Kør lektionen direkte fra CaseLab med projektorvisning." },
      { property: "og:title", content: "Undervis — CaseLab" },
      { property: "og:description", content: "Kør lektionen direkte fra CaseLab." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RunMode,
});

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (!active) return;
    if (startRef.current === null) startRef.current = Date.now();
    const t = setInterval(() => {
      setSeconds(Math.floor((Date.now() - (startRef.current as number)) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [active]);
  return Math.floor(seconds / 60);
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

  const [started, setStarted] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [projector, setProjector] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [hideTime, setHideTime] = useState(false);
  const [finished, setFinished] = useState(false);

  const active = useFallback ? fallback : main;
  const elapsed = useElapsed(started);

  const current: LessonBlock | undefined = active[index];
  const totalSteps = current ? revealSteps(current) : 1;

  const plannedStart = active.slice(0, index).reduce((s, b) => s + b.duration_minutes, 0);
  const plannedEnd = plannedStart + (current?.duration_minutes ?? 0);
  const drift = elapsed - plannedStart;

  /* ---------- live student session (optional) ---------- */
  const sessions = useQuery({ ...sessionsQuery({ lessonId }), refetchInterval: 15000 });
  const liveSession =
    (sessions.data ?? []).find((s) => s.mode === "live" && s.status !== "ended") ?? null;
  const liveId = liveSession?.id ?? "";
  const participants = useQuery({ ...participantsQuery(liveId, true), enabled: !!liveId });
  const responses = useQuery({ ...responsesQuery(liveId, true), enabled: !!liveId });

  useEffect(() => {
    if (!liveSession || !current) return;
    if (liveSession.current_block_id === current.id) return;
    void updateSession(liveSession.id, {
      current_block_id: current.id,
      status: "active",
      reveal_results: false,
    }).then(() => queryClient.invalidateQueries({ queryKey: ["sessions"] }));
  }, [liveSession, current, queryClient]);

  const liveAnswers = current ? (responses.data ?? []).filter((a) => a.block_id === current.id) : [];
  const liveNames = new Map((participants.data ?? []).map((p) => [p.id, p.display_name]));
  const liveSummary =
    current && liveSession
      ? summarize(
          current.type,
          (current.content ?? {}) as Record<string, unknown>,
          liveAnswers.map((a) => ({
            display_name: liveNames.get(a.participant_id) ?? "",
            response_data: a.response_data,
          })),
        )
      : null;


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

  const next = () => {
    if (!current) return;
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (index < active.length - 1) {
      setIndex((i) => i + 1);
      setStep(0);
    } else {
      setFinished(true);
    }
  };
  const prev = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      return;
    }
    if (index > 0) {
      const target = active[index - 1];
      setIndex(index - 1);
      setStep(target ? revealSteps(target) - 1 : 0);
    }
  };
  const jumpTo = (i: number) => {
    setIndex(i);
    setStep(0);
    setFinished(false);
    setOverviewOpen(false);
  };

  useEffect(() => {
    if (!started || finished) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (step < totalSteps - 1) setStep((s) => s + 1);
        else if (index < active.length - 1) {
          setIndex((i) => i + 1);
          setStep(0);
        } else setFinished(true);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key.toLowerCase() === "n") {
        setNotesOpen((v) => !v);
      } else if (e.key.toLowerCase() === "o") {
        setOverviewOpen((v) => !v);
      } else if (e.key.toLowerCase() === "f") {
        setProjector((v) => {
          const nextVal = !v;
          try {
            if (nextVal && !document.fullscreenElement) void document.documentElement.requestFullscreen();
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
        <h1 className="font-display text-3xl font-semibold">Lektionen har endnu ingen aktiviteter.</h1>
        <Link to="/lessons/$lessonId/edit" params={{ lessonId }} className="mt-8 inline-block">
          <Button className="rounded-full">Tilføj aktivitet</Button>
        </Link>
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
        <h1 className="mt-3 font-display text-4xl font-semibold text-balance sm:text-5xl">{l.title}</h1>
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
          <Link to="/lessons/$lessonId/edit" params={{ lessonId }}>
            <Button size="lg" variant="outline" className="rounded-full">
              Tilbage til redigering
            </Button>
          </Link>
        </div>
        <p className="mt-10 text-sm text-muted-foreground">
          Genveje: ← → skift · Mellemrum viser næste trin · N noter · O oversigt · F projektor
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
          Planlagt {l.duration_minutes} min · {main.length} aktiviteter · brugt {elapsed} min
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/lessons/$lessonId/edit" params={{ lessonId }}>
            <Button variant="outline" className="rounded-full">
              Tilbage til lektionen
            </Button>
          </Link>
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
              onClick={() => {
                setUseFallback(true);
                setIndex(0);
                setStep(0);
                setFinished(false);
              }}
            >
              Ekstra aktivitet
            </Button>
          )}
        </div>
      </div>
    );
  }

  const progress = ((index + 1) / active.length) * 100;

  /* ---------- projector ---------- */
  if (projector) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="h-1 w-full bg-secondary">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex flex-1 items-center px-10 py-12 sm:px-20">
          <div className="w-full">
            {current && <BlockRenderer block={current} step={step} view="projector" />}
          </div>
        </div>
        <div className="flex items-center justify-between px-10 pb-8 text-sm text-muted-foreground sm:px-20">
          <button type="button" onClick={prev} className="rounded-full px-4 py-2 hover:bg-secondary">
            ← Forrige
          </button>
          <span>
            {index + 1} / {active.length}
          </span>
          <button type="button" onClick={next} className="rounded-full px-4 py-2 hover:bg-secondary">
            Næste →
          </button>
        </div>
      </div>
    );
  }

  /* ---------- teacher view ---------- */
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex flex-wrap items-center gap-4 border-b border-border/70 px-6 py-3 text-sm">
        <div className="min-w-0 flex-1 truncate">
          <span className="font-medium">{l.title}</span>
          {klass.data && <span className="text-muted-foreground"> · {klass.data.name}</span>}
          {useFallback && <span className="ml-2 text-primary">· Ekstra aktivitet</span>}
        </div>
        {liveSession && (
          <Link to="/sessions/$sessionId" params={{ sessionId: liveSession.id }}>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              Elevsession · {liveSession.join_code} · {(participants.data ?? []).length} deltagere
            </span>
          </Link>
        )}
        <span className="tabular-nums text-muted-foreground">
          {index + 1} / {active.length}
        </span>

        {!hideTime && (
          <span className="flex items-center gap-2 tabular-nums text-muted-foreground">
            <Clock className="size-4" /> {elapsed} min
          </span>
        )}
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setHideTime((v) => !v)}>
          {hideTime ? "Vis tid" : "Skjul tid"}
        </Button>
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setNotesOpen(true)}>
          <NotebookPen className="size-4" /> Noter
        </Button>
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setOverviewOpen(true)}>
          <ListOrdered className="size-4" /> Oversigt
        </Button>
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setProjector(true)}>
          <Maximize2 className="size-4" /> Projektor
        </Button>
        <Link to="/lessons/$lessonId/edit" params={{ lessonId }}>
          <Button variant="ghost" size="sm" className="rounded-full" aria-label="Afslut visning">
            <X className="size-4" />
          </Button>
        </Link>
      </header>

      <div className="h-1 w-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <main className="flex-1 px-6 py-10 sm:px-12">
        <div className="mx-auto max-w-5xl">
          {!hideTime && (
            <p className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>
                Planlagt: {plannedStart}–{plannedEnd} min
              </span>
              {Math.abs(drift) >= 3 && (
                <span className="rounded-full bg-secondary px-3 py-1">
                  {drift < 0 ? `${Math.abs(drift)} min foran planen` : `${drift} min efter planen`}
                </span>
              )}
            </p>
          )}
          {current && (
            <BlockRenderer
              block={current}
              step={step}
              view="teacher"
              onSkip={() => {
                if (index < active.length - 1) jumpTo(index + 1);
                else setFinished(true);
              }}
            />
          )}
          {step < totalSteps - 1 && (
            <Button variant="outline" className="mt-10 rounded-full" onClick={next}>
              <Eye className="size-4" /> Vis næste trin
            </Button>
          )}

          {liveSession && liveSummary && (
            <section className="surface-card mt-12 p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Elevsvar</h2>
                <span className="text-sm text-muted-foreground">
                  {liveAnswers.length} / {(participants.data ?? []).length} har svaret · kode{" "}
                  <span className="font-mono">{liveSession.join_code}</span>
                </span>
              </div>
              <div className="mt-5">
                <ResultBars summary={liveSummary} />
              </div>
              <Button
                variant={liveSession.reveal_results ? "default" : "outline"}
                size="sm"
                className="mt-5 rounded-full"
                onClick={() =>
                  void updateSession(liveSession.id, {
                    reveal_results: !liveSession.reveal_results,
                  }).then(() => queryClient.invalidateQueries({ queryKey: ["sessions"] }))
                }
              >
                {liveSession.reveal_results ? "Skjul resultat for eleverne" : "Vis resultat for eleverne"}
              </Button>
            </section>
          )}

        </div>
      </main>

      <footer className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-border/70 bg-background/90 px-6 py-4 backdrop-blur">
        <Button variant="outline" className="rounded-full" onClick={prev} disabled={index === 0 && step === 0}>
          <ArrowLeft className="size-4" /> Forrige
        </Button>
        <span className="min-w-0 truncate text-center text-sm text-muted-foreground">
          {current ? `${blockDef(current.type).icon} ${current.title}` : ""}
        </span>
        <Button className="rounded-full" onClick={next}>
          {index === active.length - 1 && step === totalSteps - 1 ? "Afslut" : "Næste"}
          <ArrowRight className="size-4" />
        </Button>
      </footer>

      {/* teacher notes */}
      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Kun til dig</SheetTitle>
          </SheetHeader>
          {current && (
            <div className="space-y-6 px-4 pb-10">
              <div>
                <p className="text-xs tracking-widest text-muted-foreground uppercase">Aktivitet</p>
                <p className="mt-1 font-medium">
                  {blockDef(current.type).label} · {current.duration_minutes} min
                </p>
              </div>
              <div>
                <p className="text-xs tracking-widest text-muted-foreground uppercase">Lærernoter</p>
                <p className="mt-1 whitespace-pre-wrap">
                  {current.teacher_notes || "Ingen noter til denne aktivitet."}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-widest text-muted-foreground uppercase">
                  Elevinstruktion
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {current.student_instructions || "Ingen instruktion."}
                </p>
              </div>
              {fallback.length > 0 && !useFallback && (
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => {
                    setUseFallback(true);
                    setIndex(0);
                    setStep(0);
                    setNotesOpen(false);
                  }}
                >
                  Ekstra aktivitet ({fallback.length})
                </Button>
              )}
              {useFallback && (
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => {
                    setUseFallback(false);
                    setIndex(0);
                    setStep(0);
                    setNotesOpen(false);
                  }}
                >
                  Tilbage til lektionen
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* overview */}
      <Sheet open={overviewOpen} onOpenChange={setOverviewOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Oversigt</SheetTitle>
          </SheetHeader>
          <ol className="space-y-2 px-4 pb-10">
            {active.map((b, i) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                    i === index ? "bg-accent text-accent-foreground" : "hover:bg-secondary"
                  }`}
                >
                  <span className="tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {blockDef(b.type).label} · {b.title}
                  </span>
                  <span className="text-sm text-muted-foreground">{b.duration_minutes} min</span>
                </button>
              </li>
            ))}
          </ol>
        </SheetContent>
      </Sheet>
    </div>
  );
}
