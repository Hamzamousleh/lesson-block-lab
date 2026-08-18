/**
 * Didaktiva V2 presentation of /home. Same queries and same links as the
 * classic Home — only layout, hierarchy and styling differ.
 */
import { Link } from "@tanstack/react-router";
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
  type LucideIcon,
} from "lucide-react";
import { blocksQuery, classesQuery, lessonsQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";

interface PrimaryAction {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  tone: "primary" | "warm" | "muted";
}

const PRIMARY_ACTIONS: PrimaryAction[] = [
  {
    icon: Sparkles,
    title: "Planlæg undervisning",
    description: "Fra idé til færdig lektion",
    to: "/create-with-chatgpt",
    tone: "primary",
  },
  {
    icon: FileText,
    title: "Brug mit materiale",
    description: "Gør dine egne filer til undervisning",
    to: "/material-to-lesson",
    tone: "muted",
  },
  {
    icon: Zap,
    title: "Red mig",
    description: "Noget brugbart på få minutter",
    to: "/rescue",
    tone: "warm",
  },
  {
    icon: Users,
    title: "Kør undervisning",
    description: "Start en lektion med eleverne",
    to: "/lessons",
    tone: "primary",
  },
];

const TOOLS = [
  { icon: Clock3, title: "Jeg mangler tid", to: "/extra-time" },
  { icon: Activity, title: "Gør den mere aktiv", to: "/improve-lesson" },
  { icon: Library, title: "Mit bibliotek", to: "/library" },
  { icon: Globe2, title: "Worlds", to: "/worlds" },
  { icon: Layers3, title: "Differentiér en aktivitet", to: "/differentiate" },
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
  const lessons = useQuery(lessonsQuery({ limit: 4 }));
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

      <section aria-label="Primære handlinger" className="mt-8 grid gap-4 sm:grid-cols-2">
        {PRIMARY_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={action.to}
              className="surface-card group relative flex min-h-32 items-start gap-4 overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-2xl transition-transform duration-200 group-hover:scale-105 ${TONE_CLASS[action.tone]}`}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold sm:text-xl">{action.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                  {action.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary/50 transition-transform duration-200 group-hover:scale-x-100"
              />
            </Link>
          );
        })}
      </section>

      <section className="mt-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-xl font-semibold">Fortsæt hvor du slap</h2>
          <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full">
            <Link to="/lessons">Alle lektioner</Link>
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {lessons.isLoading && (
            <div className="space-y-3" aria-hidden="true">
              {[0, 1].map((i) => (
                <div key={i} className="surface-card h-24 animate-pulse bg-secondary/40" />
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
            <div className="surface-card flex flex-col items-start gap-4 border-dashed p-8">
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
                className="surface-card flex flex-col gap-4 px-5 py-4 transition-shadow hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {c ? `${c.name} · ${c.subject}` : l.subject || "Lektion"}
                  </p>
                  <p className="mt-1 truncate text-lg font-medium">{l.title}</p>
                  {blockCount !== undefined && blockCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="mt-2 flex flex-wrap items-center gap-1"
                      title={`${blockCount} aktiviteter`}
                    >
                      {Array.from({ length: Math.min(blockCount, 12) }).map((_, i) => (
                        <span key={i} className="h-1.5 w-5 rounded-full bg-primary/25" />
                      ))}
                    </span>
                  )}
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
                  <Button asChild variant="ghost" className="rounded-full">
                    <Link to="/lessons/$lessonId/edit" params={{ lessonId: l.id }}>
                      <Pencil aria-hidden="true" className="size-4" /> Redigér
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
          {lessons.isLoading && (
            <span className="sr-only">
              <Loader2 aria-hidden="true" />
            </span>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Flere værktøjer
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                to={tool.to}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium transition-colors hover:border-primary/30 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon aria-hidden="true" className="size-4 text-primary/80" strokeWidth={1.8} />
                {tool.title}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
