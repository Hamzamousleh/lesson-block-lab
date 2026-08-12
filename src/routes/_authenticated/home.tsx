import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { classesQuery, lessonsQuery } from "@/lib/data";
import { loadDemoData } from "@/lib/demo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Hjem — CaseLab" },
      { name: "description", content: "Dit overblik: planlæg undervisning og fortsæt hvor du slap." },
      { property: "og:title", content: "Hjem — CaseLab" },
      { property: "og:description", content: "Planlæg undervisning og fortsæt hvor du slap." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Home,
});

const actions = [
  {
    icon: "✨",
    title: "Planlæg undervisning",
    description: "Lav en lektion eller et forløb.",
    to: "/create-with-chatgpt",
  },
  { icon: "⚡", title: "Red mig", description: "Jeg skal undervise snart.", to: "/rescue" },
  {
    icon: "⏱",
    title: "Jeg mangler tid",
    description: "Få ekstra aktiviteter til en lektion.",
    to: "/extra-time",
  },
  {
    icon: "🎨",
    title: "Gør den mere aktiv",
    description: "Skab mere variation i en eksisterende lektion.",
    to: "/improve-lesson",
  },
  {
    icon: "📚",
    title: "Mit bibliotek",
    description: "Genbrug aktiviteter og lektioner, du har gemt.",
    to: "/library",
  },
  {
    icon: "📄",
    title: "Brug mit materiale",
    description: "Lav undervisning ud fra tekst eller noter.",
    to: "/material-to-lesson",
  },
  {
    icon: "📱",
    title: "Elevsessioner",
    description: "Lad eleverne svare fra deres egen enhed.",
    to: "/sessions",
  },

] as const;

function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const classes = useQuery(classesQuery());
  const lessons = useQuery(lessonsQuery({ limit: 4 }));

  const demo = useMutation({
    mutationFn: loadDemoData,
    onSuccess: async (lessonId) => {
      await queryClient.invalidateQueries();
      toast.success("Demodata er indlæst");
      navigate({ to: "/lessons/$lessonId/edit", params: { lessonId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <section className="text-center">
        <h1 className="text-4xl font-semibold text-balance sm:text-5xl">Hvad skal du bruge i dag?</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Kom hurtigere fra fagligt stof til undervisning, der er klar til klassen.
        </p>
      </section>

      <section className="mt-14 grid gap-5 sm:grid-cols-2">
        {actions.map((a) => (
          <Link
            key={a.title}
            to={a.to}
            className="surface-card group flex flex-col gap-3 p-8 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="text-3xl">{a.icon}</span>
            <span className="text-xl font-semibold">{a.title}</span>
            <span className="text-muted-foreground">{a.description}</span>
          </Link>
        ))}

      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold">Fortsæt hvor du slap</h2>
        <div className="mt-6 space-y-3">
          {lessons.isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Henter lektioner …
            </div>
          )}
          {lessons.isError && (
            <p className="text-sm text-destructive">Kunne ikke hente dine lektioner.</p>
          )}
          {lessons.data?.length === 0 && !lessons.isLoading && (
            <div className="surface-card flex flex-col items-start gap-4 p-8">
              <div>
                <p className="text-lg font-medium">Du har ikke lavet en lektion endnu</p>
                <p className="mt-1 text-muted-foreground">
                  Start med en klasse, eller indlæs demodata for at se, hvordan CaseLab fungerer.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/lessons/new">
                  <Button className="rounded-full">Opret din første lektion</Button>
                </Link>
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={demo.isPending}
                  onClick={() => demo.mutate()}
                >
                  {demo.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Indlæs demo
                </Button>
              </div>
            </div>
          )}
          {lessons.data?.map((l) => {
            const c = classById.get(l.class_id);
            return (
              <div
                key={l.id}
                className="surface-card flex flex-wrap items-center gap-4 px-6 py-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">
                    {c ? `${c.name} · ${c.subject}` : "Lektion"}
                  </p>
                  <p className="truncate text-lg font-medium">{l.title}</p>
                </div>
                <span className="text-sm text-muted-foreground">{l.duration_minutes} min</span>
                <Link to="/lessons/$lessonId/edit" params={{ lessonId: l.id }}>
                  <Button variant="outline" className="rounded-full">
                    Åbn lektion
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
