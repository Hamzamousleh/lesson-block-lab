import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, FileText, Loader2, Timer, WifiOff } from "lucide-react";
import {
  setProgressFn,
  studentMaterialsFn,
  studentStateFn,
  submitResponseFn,
} from "@/lib/session.functions";
import { formatFileSize, materialKindLabel } from "@/lib/materials";
import { clearToken, readToken } from "@/lib/participant";
import { StudentBlock, type SaveState } from "@/components/student/StudentBlock";
import { StudentWorldHeader, StudentWorldRecap } from "@/components/student/StudentWorldHeader";
import { Button } from "@/components/ui/button";
import { StudentProgressCoordinator, type StudentProgressState } from "@/lib/student-progress";

export const Route = createFileRoute("/student/$code")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aktivitet — CaseLab" },
      { name: "description", content: "Din aktivitet i CaseLab." },
      { property: "og:title", content: "Aktivitet — CaseLab" },
      { property: "og:description", content: "Din aktivitet i CaseLab." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentSession,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">{children}</div>
    </div>
  );
}

function mmss(total: number): string {
  const s = Math.max(0, Math.floor(total));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Calm, non-dominant countdown. Only rendered when the teacher enabled it. */
function StudentTimer({ endsAt, paused }: { endsAt: string | null; paused: number | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const remaining = endsAt
    ? (new Date(endsAt).getTime() - Date.now()) / 1000
    : paused !== null
      ? paused
      : null;
  if (remaining === null) return null;

  return (
    <span className="flex items-center gap-1.5 tabular-nums text-muted-foreground">
      <Timer className="size-3.5" />
      {remaining <= 0 ? "Tiden er gået" : `${mmss(remaining)} tilbage`}
      {!endsAt && " (pause)"}
    </span>
  );
}

function StudentMaterials({
  materials,
}: {
  materials: Array<{
    id: string;
    title: string;
    file_name: string;
    mime_type: string;
    file_size: number;
    download_url: string;
  }>;
}) {
  if (materials.length === 0) return null;
  return (
    <section className="mb-6 rounded-2xl border border-primary/25 bg-accent/60 p-5">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-primary" />
        <h2 className="font-semibold">Materialer til denne aktivitet</h2>
      </div>
      <div className="mt-3 space-y-2">
        {materials.map((file) => (
          <a
            key={file.id}
            href={file.download_url}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:border-primary/50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{file.title}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {file.file_name} · {materialKindLabel(file.mime_type, file.file_name)} ·{" "}
                {formatFileSize(file.file_size)}
              </span>
            </span>
            <Download className="size-5 shrink-0 text-primary" aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}

function StudentSession() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [progressState, setProgressState] = useState<StudentProgressState>({
    phase: "idle",
    message: null,
  });
  const progressCoordinator = useRef<StudentProgressCoordinator | null>(null);
  if (!progressCoordinator.current) {
    progressCoordinator.current = new StudentProgressCoordinator(setProgressState);
  }

  useEffect(() => {
    const t = readToken(code);
    if (!t) void navigate({ to: "/join/$code", params: { code }, replace: true });
    else setToken(t);
  }, [code, navigate]);

  const state = useQuery({
    queryKey: ["student-state", code],
    enabled: !!token,
    queryFn: () => studentStateFn({ data: { participant_token: token as string } }),
    refetchInterval: 4000,
    /* Background polling must be invisible: never blank the screen, never
       surface transient fetch states, never refetch on focus/reconnect. */
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
    notifyOnChangeProps: ["data", "isError", "error"],
    structuralSharing: true,
    retry: 1,
  });

  const s = state.data;
  const selfPaced = s?.session.mode === "self_paced";
  const index = s?.participant.progress_index ?? 0;
  const currentBlock = selfPaced ? s?.blocks[index] : s?.blocks[0];
  const currentId = currentBlock?.id ?? null;

  const materials = useQuery({
    queryKey: ["student-materials", code, currentId],
    enabled: !!token && !!currentId,
    queryFn: () =>
      studentMaterialsFn({
        data: { participant_token: token as string, block_id: currentId as string },
      }),
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
    retry: 1,
  });

  /* Reset the save indicator when the activity changes, not on every poll. */
  const lastBlock = useRef<string | null>(null);
  useEffect(() => {
    if (lastBlock.current !== currentId) {
      lastBlock.current = currentId;
      setSaveState("idle");
      setFeedback(null);
    }
  }, [currentId]);

  const submit = useMutation({
    mutationFn: (vars: { block_id: string; response_data: Record<string, unknown> }) =>
      submitResponseFn({ data: { participant_token: token as string, ...vars } }),
    onMutate: () => setSaveState("saving"),
    onSuccess: async (res) => {
      setFeedback(res.feedback ?? null);
      setSaveState("saved");
      await queryClient.invalidateQueries({ queryKey: ["student-state", code] });
    },
    onError: () => setSaveState("error"),
  });

  const setProgress = (vars: { progress_index: number; completed?: boolean }) =>
    progressCoordinator.current!.run(async () => {
      await setProgressFn({ data: { participant_token: token as string, ...vars } });
      await queryClient.invalidateQueries({ queryKey: ["student-state", code] });
    });

  const timerNode = useMemo(
    () =>
      s?.timer ? (
        <StudentTimer endsAt={s.timer.ends_at} paused={s.timer.remaining_seconds} />
      ) : null,
    [s?.timer],
  );

  /* Only a true first load may show a loading screen. */
  if (!token || (state.isLoading && !s)) {
    return (
      <Shell>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Henter aktivitet …
        </p>
      </Shell>
    );
  }

  if (!s) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-semibold">Vi kunne ikke finde din deltagelse</h1>
        <p className="mt-2 text-muted-foreground">
          {(state.error as Error | null)?.message ?? "Prøv at deltage igen med koden."}
        </p>
        <Button
          className="mt-6 h-14 w-full rounded-2xl"
          onClick={() => {
            clearToken(code);
            void navigate({ to: "/join/$code", params: { code }, replace: true });
          }}
        >
          Deltag igen
        </Button>
      </Shell>
    );
  }

  /* ---------- ended ---------- */
  if (s.session.status === "ended") {
    return (
      <Shell>
        <div className="flex min-h-[70vh] flex-col justify-center text-center">
          <h1 className="font-display text-3xl font-semibold">Aktiviteten er afsluttet</h1>
          <p className="mt-3 text-lg text-muted-foreground">Tak for din deltagelse.</p>
        </div>
      </Shell>
    );
  }

  const world = s.world ?? null;
  const header = (
    <>
      {world && <StudentWorldHeader world={world} />}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="min-w-0 break-words">{s.lesson.title}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-3">
          {timerNode}
          {state.isError ? <WifiOff className="size-4" aria-label="Ingen forbindelse" /> : null}
          <span className="break-words">{s.participant.display_name}</span>
        </span>
      </div>
    </>
  );

  const answerKey =
    s.answerKey && currentId && s.answerKey.block_id === currentId
      ? {
          correct_option_index: s.answerKey.correct_option_index,
          my_correct: s.answerKey.my_correct,
          message: s.answerKey.message,
        }
      : null;

  /* ---------- self-paced ---------- */
  if (selfPaced) {
    if (s.participant.completed) {
      return (
        <Shell>
          <div className="flex min-h-[70vh] flex-col justify-center text-center">
            <h1 className="font-display text-3xl font-semibold">Du er færdig</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              {s.lesson.block_count} aktiviteter gennemført
            </p>
          </div>
        </Shell>
      );
    }

    if (!started && index === 0) {
      return (
        <Shell>
          <div className="flex min-h-[75vh] flex-col justify-center">
            {world && <StudentWorldRecap world={world} />}
            <p className="mt-8 text-sm text-muted-foreground">
              {world ? `Nu · Episode ${world.episode_number}` : (s.lesson.subject ?? "Aktivitet")}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-balance sm:text-4xl">
              {s.lesson.title}
            </h1>
            {s.lesson.learning_goal && (
              <p className="mt-5 text-lg text-muted-foreground">{s.lesson.learning_goal}</p>
            )}
            <p className="mt-5 text-muted-foreground">
              Ca. {s.lesson.duration_minutes} min · {s.lesson.block_count} aktiviteter
            </p>
            <Button
              size="lg"
              className="mt-10 h-14 w-full rounded-2xl text-base"
              onClick={() => setStarted(true)}
            >
              Start aktivitet
            </Button>
          </div>
        </Shell>
      );
    }

    const total = s.blocks.length;
    const pct = total ? ((index + 1) / total) * 100 : 0;
    const isLast = index >= total - 1;

    return (
      <Shell>
        {header}
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-sm text-muted-foreground">
            <span>
              {index + 1} / {total}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {currentBlock && (
          <>
            <StudentMaterials materials={materials.data ?? []} />
            <StudentBlock
              key={currentBlock.id}
              block={currentBlock}
              saved={s.responses[currentBlock.id]}
              submitting={submit.isPending}
              saveState={saveState}
              disabled={false}
              feedback={feedback}
              answerKey={answerKey}
              onSubmit={(data) => submit.mutate({ block_id: currentBlock.id, response_data: data })}
            />
          </>
        )}

        {progressState.phase === "error" && (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <p>{progressState.message}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-11 rounded-full"
              onClick={() => void progressCoordinator.current?.retry()}
            >
              Prøv igen
            </Button>
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-14 flex-1 rounded-2xl"
            disabled={index === 0 || progressState.phase === "pending"}
            onClick={() => {
              setFeedback(null);
              void setProgress({ progress_index: index - 1 });
            }}
          >
            Forrige
          </Button>
          <Button
            className="h-14 flex-1 rounded-2xl"
            disabled={progressState.phase === "pending"}
            onClick={() => {
              setFeedback(null);
              if (isLast) void setProgress({ progress_index: index, completed: true });
              else void setProgress({ progress_index: index + 1 });
            }}
          >
            {progressState.phase === "pending" && <Loader2 className="size-4 animate-spin" />}
            {isLast ? "Afslut" : "Næste"}
          </Button>
        </div>
      </Shell>
    );
  }

  /* ---------- live ---------- */
  if (!currentBlock) {
    return (
      <Shell>
        {header}
        <div className="flex min-h-[65vh] flex-col justify-center text-center">
          <h1 className="font-display text-3xl font-semibold">Du er med</h1>
          <p className="mt-3 text-lg text-muted-foreground">Vent på næste aktivitet.</p>
          <p className="mt-6 text-muted-foreground">{s.lesson.title}</p>
        </div>
      </Shell>
    );
  }

  const hasAnswered = !!s.responses[currentBlock.id];

  return (
    <Shell>
      {header}
      <StudentMaterials materials={materials.data ?? []} />
      <StudentBlock
        key={currentBlock.id}
        block={currentBlock}
        saved={s.responses[currentBlock.id]}
        submitting={submit.isPending}
        saveState={saveState}
        disabled={false}
        answerKey={answerKey}
        revealed={s.revealed?.block_id === currentBlock.id ? s.revealed.summary : null}
        onSubmit={(data) => submit.mutate({ block_id: currentBlock.id, response_data: data })}
      />
      {hasAnswered && saveState !== "saving" && saveState !== "error" && (
        <div className="mt-8 rounded-2xl bg-secondary px-5 py-4 text-center">
          <p className="flex items-center justify-center gap-2 font-medium">
            <Check className="size-4 text-primary" /> Dit svar er gemt
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Vent på næste aktivitet.</p>
        </div>
      )}
    </Shell>
  );
}
