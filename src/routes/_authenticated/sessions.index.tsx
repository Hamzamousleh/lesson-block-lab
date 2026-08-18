import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  SESSION_MODE_LABEL,
  SESSION_STATUS_LABEL,
  deleteSession,
  endSession,
  sessionsQuery,
} from "@/lib/sessions";
import { classesQuery, lessonsQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/sessions/")({
  head: () => ({
    meta: [
      { title: "Elevsessioner — CaseLab" },
      { name: "description", content: "Overblik over aktive og tidligere elevsessioner." },
      { property: "og:title", content: "Elevsessioner — CaseLab" },
      { property: "og:description", content: "Aktive og tidligere elevsessioner." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  const queryClient = useQueryClient();
  const sessions = useQuery(sessionsQuery());
  const lessons = useQuery(lessonsQuery());
  const classes = useQuery(classesQuery());

  const lessonById = new Map((lessons.data ?? []).map((l) => [l.id, l]));
  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sessions"] });

  const stop = useMutation({
    mutationFn: endSession,
    onSuccess: async () => {
      await invalidate();
      toast.success("Sessionen er afsluttet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: deleteSession,
    onSuccess: async () => {
      await invalidate();
      toast.success("Sessionen er slettet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = sessions.data ?? [];
  const active = all.filter((s) => s.status !== "ended");
  const past = all.filter((s) => s.status === "ended");

  const card = (s: (typeof all)[number]) => {
    const lesson = lessonById.get(s.lesson_id);
    const klass = s.class_id ? classById.get(s.class_id) : undefined;
    return (
      <div key={s.id} className="surface-card flex flex-wrap items-center gap-4 px-6 py-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-medium">{lesson?.title ?? "Lektion"}</p>
          <p className="text-sm text-muted-foreground">
            {klass ? `${klass.name} · ` : ""}
            {SESSION_MODE_LABEL[s.mode]} · {SESSION_STATUS_LABEL[s.status]} · kode {s.join_code}
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/sessions/$sessionId" params={{ sessionId: s.id }}>
            Åbn
          </Link>
        </Button>
        {s.status !== "ended" && (
          <Button
            variant="ghost"
            className="rounded-full"
            disabled={stop.isPending}
            onClick={() => stop.mutate(s.id)}
          >
            Afslut
          </Button>
        )}
        <Button
          variant="ghost"
          className="rounded-full text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm("Vil du slette denne session og dens svar?")) remove.mutate(s.id);
          }}
        >
          Slet
        </Button>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Elevsessioner</h1>
          <p className="mt-2 text-muted-foreground">
            Sessioner startes fra en lektion med “Start elevsession”.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/sessions/compare">Sammenlign sessioner</Link>
        </Button>
      </div>

      {sessions.isLoading && (
        <p className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Henter sessioner …
        </p>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Aktive</h2>
        <div className="mt-4 space-y-3">
          {active.length === 0 && !sessions.isLoading && (
            <p className="text-muted-foreground">Ingen aktive sessioner.</p>
          )}
          {active.map(card)}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Tidligere</h2>
        <div className="mt-4 space-y-3">
          {past.length === 0 && !sessions.isLoading && (
            <p className="text-muted-foreground">Ingen tidligere sessioner endnu.</p>
          )}
          {past.map(card)}
        </div>
      </section>
    </div>
  );
}
