import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, WifiOff } from "lucide-react";
import { setProgressFn, studentStateFn, submitResponseFn } from "@/lib/session.functions";
import { clearToken, readToken } from "@/lib/participant";
import { StudentBlock } from "@/components/student/StudentBlock";
import { Button } from "@/components/ui/button";

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

function StudentSession() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);

  useEffect(() => {
    const t = readToken(code);
    if (!t) void navigate({ to: "/join/$code", params: { code }, replace: true });
    else setToken(t);
  }, [code, navigate]);

  const state = useQuery({
    queryKey: ["student-state", code],
    enabled: !!token,
    queryFn: () => studentStateFn({ data: { participant_token: token as string } }),
    refetchInterval: 3000,
    retry: 1,
  });

  const s = state.data;
  const selfPaced = s?.session.mode === "self_paced";
  const index = s?.participant.progress_index ?? 0;
  const currentBlock = selfPaced ? s?.blocks[index] : s?.blocks[0];

  const submit = useMutation({
    mutationFn: (vars: { block_id: string; response_data: Record<string, unknown> }) =>
      submitResponseFn({ data: { participant_token: token as string, ...vars } }),
    onSuccess: async (res) => {
      setFeedback(res.feedback ?? null);
      await queryClient.invalidateQueries({ queryKey: ["student-state", code] });
    },
  });

  const progress = useMutation({
    mutationFn: (vars: { progress_index: number; completed?: boolean }) =>
      setProgressFn({ data: { participant_token: token as string, ...vars } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-state", code] }),
  });

  if (!token || state.isLoading) {
    return (
      <Shell>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Henter aktivitet …
        </p>
      </Shell>
    );
  }

  if (state.isError || !s) {
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

  const header = (
    <div className="mb-8 flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span className="min-w-0 truncate">{s.lesson.title}</span>
      <span className="flex items-center gap-2">
        {state.isRefetching && <span className="text-xs">opdaterer …</span>}
        {state.isError ? <WifiOff className="size-4" /> : null}
        {s.participant.display_name}
      </span>
    </div>
  );

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
            <p className="text-sm text-muted-foreground">{s.lesson.subject ?? "Aktivitet"}</p>
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
              Start
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
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {currentBlock && (
          <StudentBlock
            block={currentBlock}
            saved={s.responses[currentBlock.id]}
            submitting={submit.isPending}
            disabled={false}
            feedback={feedback}
            onSubmit={(data) => submit.mutate({ block_id: currentBlock.id, response_data: data })}
          />
        )}
        {submit.isError && (
          <p className="mt-3 text-sm text-destructive">{(submit.error as Error).message}</p>
        )}

        <div className="mt-10 flex gap-3">
          <Button
            variant="outline"
            className="h-14 flex-1 rounded-2xl"
            disabled={index === 0 || progress.isPending}
            onClick={() => {
              setFeedback(null);
              progress.mutate({ progress_index: index - 1 });
            }}
          >
            Forrige
          </Button>
          <Button
            className="h-14 flex-1 rounded-2xl"
            disabled={progress.isPending}
            onClick={() => {
              setFeedback(null);
              if (isLast) progress.mutate({ progress_index: index, completed: true });
              else progress.mutate({ progress_index: index + 1 });
            }}
          >
            {progress.isPending && <Loader2 className="size-4 animate-spin" />}
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

  return (
    <Shell>
      {header}
      <StudentBlock
        block={currentBlock}
        saved={s.responses[currentBlock.id]}
        submitting={submit.isPending}
        disabled={false}
        revealed={s.revealed?.block_id === currentBlock.id ? s.revealed.summary : null}
        onSubmit={(data) => submit.mutate({ block_id: currentBlock.id, response_data: data })}
      />
      {submit.isError && <p className="mt-3 text-sm text-destructive">{(submit.error as Error).message}</p>}
    </Shell>
  );
}
