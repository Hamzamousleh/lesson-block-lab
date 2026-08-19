/**
 * Didaktiva V2 presentation of /home. Same queries and same links as the
 * classic Home — only layout, hierarchy and styling differ.
 */
import { Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  Clock3,
  FileText,
  Globe2,
  Layers3,
  Library,
  ListChecks,
  Pencil,
  Play,
  Sparkles,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { blocksQuery, classesQuery, lessonsQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";

interface PrimaryAction {
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  to: string;
  tone: "primary" | "warm" | "muted";
  featured?: boolean;
}

const PRIMARY_ACTIONS: PrimaryAction[] = [
  {
    icon: Sparkles,
    title: "Planlæg undervisning",
    description: "Skab en lektion fra et emne, en idé eller et læringsmål",
    cta: "Planlæg",
    to: "/create-with-chatgpt",
    tone: "primary",
    featured: true,
  },
  {
    icon: FileText,
    title: "Brug mit materiale",
    description: "Lav undervisning med dine filer og materialer som fagligt grundlag",
    cta: "Brug materiale",
    to: "/material-to-lesson",
    tone: "muted",
  },
  {
    icon: Zap,
    title: "Red mig",
    description: "Få hurtigt en brugbar plan, når undervisningen er tæt på",
    cta: "Få hjælp",
    to: "/rescue",
    tone: "warm",
  },
  {
    icon: Users,
    title: "Kør undervisning",
    description: "Vælg en lektion og start den live med eleverne",
    cta: "Vælg lektion",
    to: "/lessons",
    tone: "primary",
  },
];

const TOOLS = [
  {
    icon: Clock3,
    title: "Fyld lektionen ud",
    description: "Tilføj relevante aktiviteter til en lektion, du allerede har planlagt",
    to: "/extra-time",
  },
  {
    icon: Activity,
    title: "Gør den mere aktiv",
    description: "Skab mere elevaktivitet i en eksisterende lektion",
    to: "/improve-lesson",
  },
  {
    icon: Library,
    title: "Mit bibliotek",
    description: "Genbrug gemte aktiviteter og lektioner",
    to: "/library",
  },
  {
    icon: Globe2,
    title: "Worlds",
    description: "Skab længere forløb, hvor elevvalg påvirker udviklingen",
    to: "/worlds",
  },
  {
    icon: Layers3,
    title: "Differentiér en aktivitet",
    description: "Lav niveauinddelte varianter med samme faglige mål",
    to: "/differentiate",
  },
] as const;


const TONE_CLASS: Record<PrimaryAction["tone"], string> = {
  primary: "bg-accent text-primary",
  warm: "bg-accent-warm text-accent-warm-foreground",
  muted: "bg-secondary text-secondary-foreground",
};

const updatedDateFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

export function HomeV2() {
  const classes = useQuery(classesQuery());
  const lessons = useQuery(lessonsQuery({ limit: 3 }));
  const lessonBlocks = useQueries({
    queries: (lessons.data ?? []).map((lesson) => blocksQuery(lesson.id)),
  });

  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));
  const blockCountByLesson = new Map(
    (lessons.data ?? []).map((lesson, index) => [lesson.id, lessonBlocks[index]?.data?.length]),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Didaktiva
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">
          Hvad skal du bruge i dag?
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Kom hurtigere fra fagligt stof til undervisning, der er klar til klassen.
        </p>
      </section>

      <section
        aria-label="Primære handlinger"
        className="mt-8 rounded-3xl border border-border/70 bg-surface/70 p-3 sm:p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {PRIMARY_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.to}
                className={`group flex min-h-24 items-center gap-4 rounded-2xl border bg-card p-4 transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none sm:p-5 ${
                  action.featured
                    ? "border-primary/35 hover:border-primary/55"
                    : "border-border/80 hover:border-primary/30"
                }`}
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-2xl ${TONE_CLASS[action.tone]}`}
                >
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold sm:text-lg">{action.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                    {action.description}
                  </span>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Start
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
                    />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-xl font-semibold">Fortsæt hvor du slap</h2>
          <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full">
            <Link to="/lessons">Se alle lektioner →</Link>
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {lessons.isLoading && (
            <div className="space-y-3" aria-hidden="true">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl border border-border/70 bg-secondary/40 motion-reduce:animate-none"
                />
              ))}
            </div>
          )}
          {lessons.isLoading && (
            <p role="status" aria-live="polite" className="sr-only">
              Henter lektioner …
            </p>
          )}
          {lessons.isError && (
            <p className="text-sm text-destructive">Kunne ikke hente dine lektioner.</p>
          )}
          {lessons.data?.length === 0 && !lessons.isLoading && (
            <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border bg-card/60 p-8">
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-primary">
                <Sparkles aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-lg font-medium">Du har ikke lavet en lektion endnu</p>
                <p className="mt-1 text-muted-foreground">
                  Planlæg din første lektion, og importér den bagefter til din klasse.
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
              <article
                key={l.id}
                className="group relative flex flex-col gap-4 rounded-2xl border border-border/80 bg-card px-5 py-4 transition-colors duration-200 hover:border-primary/30 hover:bg-accent/15 focus-within:border-primary/30 sm:flex-row sm:items-center sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold leading-snug">
                    <Link
                      to="/lessons/$lessonId/edit"
                      params={{ lessonId: l.id }}
                      className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="line-clamp-2">{l.title}</span>
                    </Link>
                  </p>
                  <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {c ? `${c.name} · ${c.subject}` : l.subject || "Lektion"}
                  </p>
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
                <div className="relative z-10 flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  <Button asChild className="rounded-full">
                    <Link to="/lessons/$lessonId/run" params={{ lessonId: l.id }}>
                      <Play aria-hidden="true" className="size-4" /> Kør lektion
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="rounded-full">
                    <Link to="/lessons/$lessonId/edit" params={{ lessonId: l.id }}>
                      <Pencil aria-hidden="true" className="size-4" /> Redigér
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Flere værktøjer
        </h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                to={tool.to}
                className="flex min-h-16 items-start gap-3 rounded-2xl border border-border/80 bg-card/70 px-4 py-3 transition-colors duration-200 hover:border-primary/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary/80"
                  strokeWidth={1.8}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{tool.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {tool.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
