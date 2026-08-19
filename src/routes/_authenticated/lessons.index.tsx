import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { classesQuery, lessonsQuery } from "@/lib/data";
import { LESSON_STATUS_LABEL } from "@/lib/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/lessons/")({
  head: () => ({
    meta: [
      { title: "Lektioner — Didaktiva" },
      { name: "description", content: "Alle dine lektioner samlet ét sted." },
      { property: "og:title", content: "Lektioner — Didaktiva" },
      { property: "og:description", content: "Alle dine lektioner samlet ét sted." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LessonsPage,
});

function LessonsPage() {
  const lessons = useQuery(lessonsQuery());
  const classes = useQuery(classesQuery());
  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Lektioner</h1>
          <p className="mt-2 text-muted-foreground">
            En lektion er en konkret undervisningsgang, som du kan redigere eller køre live.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/lessons/new">
            <Plus className="size-4" /> Opret lektion
          </Link>
        </Button>
      </div>

      {lessons.isLoading && (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Henter lektioner …
        </div>
      )}

      {lessons.data?.length === 0 && (
        <div className="surface-card mt-10 p-10 text-center">
          <h2 className="text-xl font-semibold">Ingen lektioner endnu</h2>
          <p className="mt-2 text-muted-foreground">
            Opret din første undervisningsgang, og byg den af aktiviteter.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/lessons/new">Opret lektion</Link>
          </Button>
        </div>
      )}

      <div className="mt-10 space-y-3">
        {lessons.data?.map((l) => {
          const c = classById.get(l.class_id);
          return (
            <div key={l.id} className="group relative flex flex-col gap-4 rounded-3xl border border-border/80 bg-card px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift hover:border-primary/30 sm:flex-row sm:items-center sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium">
                  {l.mode === "rescue" && <span className="mr-2">⚡</span>}
                  {l.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {c ? `${c.name} · ${c.subject}` : "Lektion"} · {l.duration_minutes} min ·{" "}
                  {LESSON_STATUS_LABEL[l.status]}
                </p>
              </div>
              <Button asChild className="rounded-full">
                <Link to="/lessons/$lessonId/run" params={{ lessonId: l.id }}>
                  Kør lektion
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/lessons/$lessonId/edit" params={{ lessonId: l.id }}>
                  Redigér
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
