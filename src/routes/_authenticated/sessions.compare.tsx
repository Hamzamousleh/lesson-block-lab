import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SESSION_MODE_LABEL, SESSION_STATUS_LABEL, sessionsQuery } from "@/lib/sessions";
import { classesQuery, lessonsQuery } from "@/lib/data";
import { sessionStatsQuery } from "@/lib/class-insight";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/sessions/compare")({
  head: () => ({
    meta: [
      { title: "Sammenlign sessioner — CaseLab" },
      {
        name: "description",
        content: "Sammenlign op til tre elevsessioner på deltagelse, svar og korrekte besvarelser.",
      },
      { property: "og:title", content: "Sammenlign sessioner — CaseLab" },
      { property: "og:description", content: "Se udviklingen på tværs af sessioner." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const sessions = useQuery(sessionsQuery());
  const lessons = useQuery(lessonsQuery());
  const classes = useQuery(classesQuery());
  const [picked, setPicked] = useState<string[]>([]);

  const all = sessions.data ?? [];
  const chosen = all.filter((s) => picked.includes(s.id));
  const stats = useQuery(sessionStatsQuery(chosen));

  const lessonById = new Map((lessons.data ?? []).map((l) => [l.id, l]));
  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));

  function toggle(id: string) {
    setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Sammenlign sessioner</h1>
          <p className="mt-2 text-muted-foreground">
            Vælg op til tre sessioner. Tallene er opgjort af CaseLab — ingen fortolkning.
          </p>
        </div>
        <Button asChild variant="ghost" className="rounded-full">
          <Link to="/sessions">Alle sessioner</Link>
        </Button>
      </div>

      <section className="surface-card mt-8 p-8">
        <h2 className="text-xl font-semibold">Vælg sessioner ({picked.length}/3)</h2>
        {all.length === 0 && (
          <p className="mt-3 text-muted-foreground">Du har ingen sessioner endnu.</p>
        )}
        <ul className="mt-4 space-y-2">
          {all.map((s) => {
            const on = picked.includes(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`w-full rounded-xl border px-5 py-4 text-left transition-colors ${
                    on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-medium">{lessonById.get(s.lesson_id)?.title ?? "Lektion"}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.class_id ? `${classById.get(s.class_id)?.name ?? ""} · ` : ""}
                    {SESSION_MODE_LABEL[s.mode]} · {SESSION_STATUS_LABEL[s.status]} ·{" "}
                    {new Date(s.created_at).toLocaleDateString("da-DK")}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {chosen.length > 0 && (
        <section className="surface-card mt-6 overflow-x-auto p-8">
          <h2 className="text-xl font-semibold">Sammenligning</h2>
          {stats.isLoading ? (
            <p className="mt-4 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Henter tal …
            </p>
          ) : (
            <table className="mt-6 w-full text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Mål</th>
                  {chosen.map((s) => (
                    <th key={s.id} className="pb-3 pr-4 font-medium">
                      {lessonById.get(s.lesson_id)?.title ?? "Lektion"}
                      <span className="block text-xs font-normal">
                        {new Date(s.created_at).toLocaleDateString("da-DK")}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Deltagere", (id: string) => String(stats.data?.[id]?.participants ?? 0)],
                    ["Færdige", (id: string) => String(stats.data?.[id]?.completed ?? 0)],
                    ["Svar i alt", (id: string) => String(stats.data?.[id]?.responses ?? 0)],
                    [
                      "Spørgsmål med facit",
                      (id: string) => String(stats.data?.[id]?.gradedQuestions ?? 0),
                    ],
                    [
                      "Andel korrekte",
                      (id: string) => {
                        const p = stats.data?.[id]?.correctPercent;
                        return p === null || p === undefined ? "—" : `${p}%`;
                      },
                    ],
                  ] as const
                ).map(([label, get]) => (
                  <tr key={label} className="border-t border-border/60">
                    <td className="py-3 pr-4 text-muted-foreground">{label}</td>
                    {chosen.map((s) => (
                      <td key={s.id} className="py-3 pr-4 tabular-nums">
                        {get(s.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            “Andel korrekte” tælles kun for aktiviteter, hvor du har markeret et korrekt svar.
          </p>
        </section>
      )}
    </div>
  );
}
