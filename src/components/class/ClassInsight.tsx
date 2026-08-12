import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { sessionsQuery } from "@/lib/sessions";
import { lessonsQuery } from "@/lib/data";
import {
  classNotesQuery,
  createClassNote,
  deleteClassNote,
  sessionStatsQuery,
} from "@/lib/class-insight";
import { buildClassPlanningPrompt } from "@/lib/prompt";
import { PromptResult } from "@/components/PromptResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClassInsight({
  classId,
  className,
  subject,
}: {
  classId: string;
  className: string;
  subject: string | null;
}) {
  const queryClient = useQueryClient();
  const sessions = useQuery(sessionsQuery({ classId }));
  const lessons = useQuery(lessonsQuery({ classId }));
  const notes = useQuery(classNotesQuery(classId));

  const list = sessions.data ?? [];
  const stats = useQuery(sessionStatsQuery(list));

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [focus, setFocus] = useState("");
  const [duration, setDuration] = useState(90);
  const [prompt, setPrompt] = useState<string | null>(null);

  const lessonById = new Map((lessons.data ?? []).map((l) => [l.id, l]));

  const totals = useMemo(() => {
    const rows = Object.values(stats.data ?? {});
    const graded = rows.filter((r) => r.gradedAnswers > 0);
    const correct = graded.reduce((s, r) => s + r.correctAnswers, 0);
    const answered = graded.reduce((s, r) => s + r.gradedAnswers, 0);
    return {
      sessions: rows.length,
      responses: rows.reduce((s, r) => s + r.responses, 0),
      participants: rows.reduce((s, r) => s + r.participants, 0),
      correctPercent: answered ? Math.round((correct / answered) * 100) : null,
    };
  }, [stats.data]);

  const overviewText = useMemo(() => {
    const lines = [
      `Sessioner afholdt: ${totals.sessions}`,
      `Elevsvar i alt: ${totals.responses}`,
      totals.correctPercent === null
        ? "Andel korrekte svar: ikke opgjort (ingen aktiviteter med facit)"
        : `Andel korrekte svar på tværs: ${totals.correctPercent}%`,
      "",
      "Pr. session:",
      ...list.map((s) => {
        const st = stats.data?.[s.id];
        return `- ${lessonById.get(s.lesson_id)?.title ?? "Lektion"} (${new Date(
          s.created_at,
        ).toLocaleDateString("da-DK")}): ${st?.participants ?? 0} deltagere, ${
          st?.responses ?? 0
        } svar${st?.correctPercent === null || st === undefined ? "" : `, ${st.correctPercent}% korrekte`}`;
      }),
    ];
    return lines.join("\n");
  }, [totals, list, stats.data, lessonById]);

  const notesText = (notes.data ?? [])
    .map((n) => `${n.title ? `${n.title}: ` : ""}${n.body}`)
    .join("\n");

  const addNote = useMutation({
    mutationFn: () => createClassNote({ class_id: classId, title, body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["class-insight-notes", classId] });
      setTitle("");
      setBody("");
      toast.success("Noten er gemt ✓");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeNote = useMutation({
    mutationFn: deleteClassNote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["class-insight-notes", classId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <section className="mt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Fagligt overblik</h2>
          <Link to="/sessions/compare">
            <Button variant="ghost" className="rounded-full">
              Sammenlign sessioner
            </Button>
          </Link>
        </div>

        {list.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            Når klassen har deltaget i en elevsession, samler CaseLab tallene her.
          </p>
        ) : (
          <div className="surface-card mt-4 p-8">
            {stats.isLoading ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Henter overblik …
              </p>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-3">
                  <div>
                    <p className="text-3xl font-semibold tabular-nums">{totals.sessions}</p>
                    <p className="text-sm text-muted-foreground">sessioner</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold tabular-nums">{totals.responses}</p>
                    <p className="text-sm text-muted-foreground">elevsvar</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold tabular-nums">
                      {totals.correctPercent === null ? "—" : `${totals.correctPercent}%`}
                    </p>
                    <p className="text-sm text-muted-foreground">korrekte svar</p>
                  </div>
                </div>
                <ul className="mt-8 space-y-2">
                  {list.slice(0, 6).map((s) => {
                    const st = stats.data?.[s.id];
                    return (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/40 px-5 py-3"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {lessonById.get(s.lesson_id)?.title ?? "Lektion"}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {st?.participants ?? 0} deltagere · {st?.responses ?? 0} svar
                          {st?.correctPercent !== null && st?.correctPercent !== undefined
                            ? ` · ${st.correctPercent}% korrekte`
                            : ""}
                        </span>
                        <Link to="/sessions/$sessionId/follow-up" params={{ sessionId: s.id }}>
                          <Button variant="outline" size="sm" className="rounded-full">
                            Arbejd videre
                          </Button>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-6 text-sm text-muted-foreground">
                  Tallene er rå opgørelser fra elevernes svar. CaseLab fortolker dem ikke.
                </p>
              </>
            )}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Faglige noter om klassen</h2>
        <div className="surface-card mt-4 space-y-5 p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="note-title">Overskrift (valgfri)</Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Fx: Metodeforståelse"
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-body">Note</Label>
            <Textarea
              id="note-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Fx: Klassen er stærk til begreber, men har svært ved at anvende dem på nye cases."
              className="min-h-28 rounded-xl"
            />
          </div>
          <Button
            className="rounded-full"
            disabled={!body.trim() || addNote.isPending}
            onClick={() => addNote.mutate()}
          >
            <Plus className="size-4" /> Gem note
          </Button>

          {(notes.data ?? []).length > 0 && (
            <ul className="space-y-3 pt-2">
              {(notes.data ?? []).map((n) => (
                <li key={n.id} className="flex gap-4 rounded-xl bg-secondary/40 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    {n.title && <p className="font-medium">{n.title}</p>}
                    <p className="whitespace-pre-wrap text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("da-DK")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Slet note"
                    onClick={() => removeNote.mutate(n.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Planlæg næste lektion</h2>
        <div className="surface-card mt-4 space-y-5 p-8">
          <p className="text-muted-foreground">
            CaseLab samler overblikket og dine noter til en prompt, du kan bruge i ChatGPT.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="focus">Hvad skal der arbejdes med?</Label>
              <Input
                id="focus"
                value={focus}
                onChange={(e) => {
                  setFocus(e.target.value);
                  setPrompt(null);
                }}
                placeholder="Fx: anvendelse af teori på nye cases"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dur">Varighed</Label>
              <Input
                id="dur"
                type="number"
                min={15}
                value={duration}
                onChange={(e) => {
                  setDuration(Number(e.target.value));
                  setPrompt(null);
                }}
                className="rounded-xl"
              />
            </div>
          </div>
          <Button
            className="rounded-full"
            onClick={() =>
              setPrompt(
                buildClassPlanningPrompt({
                  className,
                  subject: subject ?? undefined,
                  overview: overviewText,
                  notes: notesText,
                  focus,
                  duration,
                }),
              )
            }
          >
            Lav prompt
          </Button>
        </div>
      </section>

      {prompt && <PromptResult prompt={prompt} />}
    </>
  );
}
