import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Activity,
  CalendarClock,
  Clock3,
  FileText,
  Globe2,
  Layers3,
  Library,
  ListChecks,
  Loader2,
  Pencil,
  Play,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { blocksQuery, classesQuery, lessonsQuery } from "@/lib/data";
import { useDesignMode } from "@/lib/design-mode";
import { HomeV2 } from "@/components/home/HomeV2";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Hjem — Didaktiva" },
      {
        name: "description",
        content: "Dit overblik: planlæg undervisning og fortsæt hvor du slap.",
      },
      { property: "og:title", content: "Hjem — Didaktiva" },
      { property: "og:description", content: "Planlæg undervisning og fortsæt hvor du slap." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Home,
});

const primaryActions = [
  {
    icon: Sparkles,
    title: "Planlæg undervisning",
    description: "Lav en lektion eller et forløb.",
    to: "/create-with-chatgpt",
  },
  {
    icon: FileText,
    title: "Brug mit materiale",
    description: "Lav undervisning ud fra dit eget materiale.",
    to: "/material-to-lesson",
  },
  { icon: Zap, title: "Red mig", description: "Jeg skal undervise snart.", to: "/rescue" },
  {
    icon: Users,
    title: "Kør undervisning",
    description: "Start en lektion live med eleverne.",
    to: "/lessons",
  },
] as const;

const secondaryActions = [
  {
    icon: Clock3,
    title: "Jeg mangler tid",
    description: "Få ekstra aktiviteter til en lektion.",
    to: "/extra-time",
  },
  {
    icon: Activity,
    title: "Gør den mere aktiv",
    description: "Skab mere variation i en eksisterende lektion.",
    to: "/improve-lesson",
  },
  {
    icon: Library,
    title: "Mit bibliotek",
    description: "Genbrug aktiviteter og lektioner, du har gemt.",
    to: "/library",
  },
  {
    icon: Globe2,
    title: "Worlds",
    description: "Vedvarende læringsuniverser med progression og konsekvenser.",
    to: "/worlds",
  },
  {
    icon: Layers3,
    title: "Differentiér en aktivitet",
    description: "Lav niveaudelte varianter med samme faglige mål.",
    to: "/differentiate",
  },
] as const;

const updatedDateFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

function Home() {
  const mode = useDesignMode();
  if (mode === "v2") return <HomeV2 />;
  return <HomeClassic />;
}

function HomeClassic() {
  const classes = useQuery(classesQuery());
  const lessons = useQuery(lessonsQuery({ limit: 4 }));
  const lessonBlocks = useQueries({
    queries: (lessons.data ?? []).map((lesson) => blocksQuery(lesson.id)),
  });

  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));
  const blockCountByLesson = new Map(
    (lessons.data ?? []).map((lesson, index) => [lesson.id, lessonBlocks[index]?.data?.length]),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
      <section className="text-center">
        <h1 className="text-3xl font-semibold text-balance sm:text-4xl">
          Hvad skal du bruge i dag?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
          Kom hurtigere fra fagligt stof til undervisning, der er klar til klassen.
        </p>
      </section>

      <section
        aria-label="Primære handlinger"
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {primaryActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={action.to}
              className="surface-card group flex min-h-40 flex-col justify-between gap-5 border-primary/20 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary transition-colors group-hover:bg-primary/15">
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </span>
              <span>
                <span className="block text-xl font-semibold">{action.title}</span>
                <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                  {action.description}
                </span>
              </span>
            </Link>
          );
        })}
      </section>

      <section className="mt-9">
        <h2 className="text-lg font-semibold">Flere værktøjer</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {secondaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.to}
                className="group flex min-h-28 flex-col rounded-2xl border border-border bg-card/60 p-4 text-left transition-colors hover:border-primary/25 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon aria-hidden="true" className="size-5 text-primary/75" strokeWidth={1.7} />
                <span className="mt-3 text-sm font-semibold leading-snug">{action.title}</span>
                <span className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {action.description}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Fortsæt hvor du slap</h2>
        <div className="mt-4 space-y-3">
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
                  Planlæg din første lektion med ChatGPT, og importér den bagefter til din klasse.
                </p>
              </div>
              <Button asChild className="rounded-full">
                <Link to="/create-with-chatgpt">Planlæg din første lektion</Link>
              </Button>
            </div>
          )}
          {lessons.data?.map((l) => {
            const c = classById.get(l.class_id);
            const blockCount = blockCountByLesson.get(l.id);
            return (
              <div
                key={l.id}
                className="surface-card flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">
                    {c ? `${c.name} · ${c.subject}` : l.subject || "Lektion"}
                  </p>
                  <p className="mt-0.5 truncate text-lg font-medium">{l.title}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 aria-hidden="true" className="size-3.5" /> {l.duration_minutes} min
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <ListChecks aria-hidden="true" className="size-3.5" />
                      {blockCount === undefined
                        ? "Henter aktiviteter …"
                        : `${blockCount} ${blockCount === 1 ? "aktivitet" : "aktiviteter"}`}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock aria-hidden="true" className="size-3.5" /> Redigeret{" "}
                      {updatedDateFormatter.format(new Date(l.updated_at))}
                    </span>
                  </div>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  <Button asChild className="rounded-full">
                    <Link to="/lessons/$lessonId/run" params={{ lessonId: l.id }}>
                      <Play aria-hidden="true" className="size-4" /> Kør lektion
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/lessons/$lessonId/edit" params={{ lessonId: l.id }}>
                      <Pencil aria-hidden="true" className="size-4" /> Redigér
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
