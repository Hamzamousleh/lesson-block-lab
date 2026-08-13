import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, Loader2, Monitor, Play, Sparkles } from "lucide-react";
import {
  SESSION_MODE_LABEL,
  activeParticipants,
  SESSION_STATUS_LABEL,
  endSession,
  joinUrl,
  participantsQuery,
  responsesQuery,
  sessionQuery,
  startSession,
  updateSession,
} from "@/lib/sessions";
import { blocksQuery, lessonQuery } from "@/lib/data";
import { summarize } from "@/lib/results";
import { blockDef } from "@/lib/blocks";
import { ResultBars } from "@/components/student/StudentBlock";
import { downloadCsv, responsesToCsv } from "@/lib/response-export";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  head: () => ({
    meta: [
      { title: "Elevsession — CaseLab" },
      { name: "description", content: "Deltagere, svar og styring af elevsessionen." },
      { property: "og:title", content: "Elevsession — CaseLab" },
      { property: "og:description", content: "Deltagere, svar og styring." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionDetail,
});

function SessionDetail() {
  const { sessionId } = Route.useParams();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [showNames, setShowNames] = useState(true);

  const session = useQuery({ ...sessionQuery(sessionId), refetchInterval: 5000 });
  const lesson = useQuery({ ...lessonQuery(session.data?.lesson_id ?? ""), enabled: !!session.data });
  const blocks = useQuery({ ...blocksQuery(session.data?.lesson_id ?? ""), enabled: !!session.data });
  const participants = useQuery(participantsQuery(sessionId, true));
  const responses = useQuery(responsesQuery(sessionId, true));

  const list = (blocks.data ?? []).filter((b) => !b.is_fallback);
  const s = session.data;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["session", sessionId] });

  const start = useMutation({
    mutationFn: () => startSession(sessionId, list[0]?.id ?? null),
    onSuccess: async () => {
      await invalidate();
      toast.success("Sessionen er startet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setBlock = useMutation({
    mutationFn: (blockId: string) => updateSession(sessionId, { current_block_id: blockId, reveal_results: false }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const reveal = useMutation({
    mutationFn: (v: boolean) => updateSession(sessionId, { reveal_results: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const stop = useMutation({
    mutationFn: () => endSession(sessionId),
    onSuccess: async () => {
      await invalidate();
      toast.success("Sessionen er afsluttet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (session.isLoading || !s) {
    return (
      <div className="mx-auto flex max-w-4xl items-center gap-2 px-6 py-20 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Henter session …
      </div>
    );
  }

  const url = joinUrl(s.join_code);
  const people = activeParticipants(participants.data ?? [], s);
  const answers = responses.data ?? [];
  const nameById = new Map(people.map((p) => [p.id, p.display_name]));
  const completed = people.filter((p) => p.completed_at).length;

  const current = list.find((b) => b.id === s.current_block_id);
  const currentAnswers = current ? answers.filter((a) => a.block_id === current.id) : [];
  const summary = current
    ? summarize(
        current.type,
        (current.content ?? {}) as Record<string, unknown>,
        currentAnswers.map((a) => ({
          display_name: showNames ? (nameById.get(a.participant_id) ?? "") : "",
          response_data: a.response_data,
        })),
      )
    : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {SESSION_MODE_LABEL[s.mode]} · {SESSION_STATUS_LABEL[s.status]}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold">{lesson.data?.title ?? "Lektion"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.status === "draft" && (
            <Button className="rounded-full" disabled={start.isPending} onClick={() => start.mutate()}>
              {start.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Start session
            </Button>
          )}
          {s.status !== "ended" && s.mode === "live" && (
            <Link to="/lessons/$lessonId/run" params={{ lessonId: s.lesson_id }} search={{ session: sessionId }}>
              <Button className="rounded-full">
                <Monitor className="size-4" /> Åbn lærercockpit
              </Button>
            </Link>
          )}
          {s.status !== "ended" && (
            <Button variant="outline" className="rounded-full" disabled={stop.isPending} onClick={() => stop.mutate()}>
              Afslut session
            </Button>
          )}
          <Link to="/sessions/$sessionId/follow-up" params={{ sessionId }}>
            <Button variant="outline" className="rounded-full">
              <Sparkles className="size-4" /> Arbejd videre med svarene
            </Button>
          </Link>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() =>
              downloadCsv(
                `caselab-svar-${s.join_code}.csv`,
                responsesToCsv({
                  responses: answers,
                  participants: people,
                  blocks: list,
                  anonymized: true,
                }),
              )
            }
          >
            <Download className="size-4" /> Eksportér svar
          </Button>
          <Link to="/sessions">
            <Button variant="ghost" className="rounded-full">
              Alle sessioner
            </Button>
          </Link>
        </div>
      </div>

      {/* share */}
      <section className="surface-card mt-8 p-8">
        <h2 className="text-xl font-semibold">Eleverne kan deltage nu</h2>
        <p className="mt-6 font-mono text-5xl font-semibold tracking-[0.2em]">{s.join_code}</p>
        <p className="mt-3 break-all text-muted-foreground">{url}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                toast.success("Linket er kopieret ✓");
                setTimeout(() => setCopied(false), 2000);
              } catch {
                toast.error("Kunne ikke kopiere. Markér linket og kopiér manuelt.");
              }
            }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Kopiér link
          </Button>
          <a href={`/join/${s.join_code}`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="rounded-full">
              Åbn elevvisning
            </Button>
          </a>
        </div>
        <p className="mt-6 text-lg">
          {people.length} {people.length === 1 ? "deltager" : "deltagere"} med i aktiviteten nu
          {s.mode === "self_paced" ? ` · ${completed} færdige` : ""}
        </p>
      </section>

      {/* live control */}
      {s.mode === "live" && s.status === "active" && (
        <section className="surface-card mt-8 p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Aktiv aktivitet</h2>
            <span className="text-sm text-muted-foreground">
              {currentAnswers.length} / {people.length} har svaret
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {list.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBlock.mutate(b.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                  b.id === s.current_block_id ? "bg-accent text-accent-foreground" : "hover:bg-secondary"
                }`}
              >
                <span className="tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate">
                  {blockDef(b.type).icon} {b.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {answers.filter((a) => a.block_id === b.id).length} svar
                </span>
              </button>
            ))}
          </div>

          {current && summary && (
            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-medium">Svar · {current.title}</h3>
                <Button
                  variant={s.reveal_results ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => reveal.mutate(!s.reveal_results)}
                >
                  {s.reveal_results ? "Skjul resultat for eleverne" : "Vis resultat på projektor"}
                </Button>
                {summary.kind === "text" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setShowNames((v) => !v)}
                  >
                    {showNames ? "Skjul navne" : "Vis navne"}
                  </Button>
                )}
              </div>
              <ResultBars summary={summary} />
            </div>
          )}
        </section>
      )}

      {/* participants */}
      <section className="surface-card mt-8 p-8">
        <h2 className="text-xl font-semibold">Deltagere</h2>
        {people.length === 0 && <p className="mt-3 text-muted-foreground">Ingen er kommet ind endnu.</p>}
        <ul className="mt-4 space-y-2">
          {people.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{p.display_name}</span>
              <span className="text-muted-foreground">
                {s.mode === "self_paced"
                  ? p.completed_at
                    ? "Færdig ✓"
                    : `${Math.min(p.progress_index + 1, Math.max(list.length, 1))} / ${list.length}`
                  : `${answers.filter((a) => a.participant_id === p.id).length} svar`}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
