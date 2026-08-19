import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Loader2, Plus } from "lucide-react";
import { classesQuery } from "@/lib/data";
import {
  episodesQuery,
  worldsQuery,
  WORLD_STATUS_LABEL,
  WORLD_TYPE_LABEL,
  type WorldType,
} from "@/lib/worlds";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/worlds/")({
  head: () => ({
    meta: [
      { title: "Worlds — Didaktiva" },
      {
        name: "description",
        content:
          "Vedvarende læringsuniverser, hvor eleverne anvender teori over tid og møder konsekvenser.",
      },
      { property: "og:title", content: "Worlds — Didaktiva" },
      {
        property: "og:description",
        content: "Byg vedvarende læringsuniverser med progression og konsekvenser.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorldsPage,
});

function WorldCard({ worldId }: { worldId: string }) {
  const episodes = useQuery(episodesQuery(worldId));
  const list = episodes.data ?? [];
  const done = list.filter((e) => e.status === "completed").length;
  return (
    <p className="text-sm text-muted-foreground">
      {list.length} episoder · {done} gennemført
    </p>
  );
}

function WorldsPage() {
  const worlds = useQuery(worldsQuery());
  const classes = useQuery(classesQuery());
  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Worlds</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Worlds er længere undervisningsforløb, hvor elevernes valg kan påvirke næste episode.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/worlds/new">
            <Plus className="size-4" /> Nyt World
          </Link>
        </Button>
      </div>

      {worlds.isLoading && (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Henter Worlds …
        </div>
      )}

      {worlds.data?.length === 0 && (
        <div className="surface-card mt-10 p-10 text-center">
          <Globe2 className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Ingen Worlds endnu</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Et World er ikke et spil. Det er en ramme, hvor eleverne bruger fagteori på de samme
            situationer over tid og oplever, at beslutninger har konsekvenser.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/worlds/new">Opret dit første World</Link>
          </Button>
        </div>
      )}

      <div className="mt-10 space-y-4">
        {worlds.data?.map((w) => {
          const c = w.class_id ? classById.get(w.class_id) : undefined;
          return (
            <div
              key={w.id}
              className="group relative flex flex-col gap-4 rounded-3xl border border-border/80 bg-card px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift hover:border-primary/30 sm:flex-row sm:items-center sm:px-6"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary text-secondary-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Globe2 aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold leading-snug">
                  <Link
                    to="/worlds/$worldId"
                    params={{ worldId: w.id }}
                    className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {w.title}
                  </Link>
                </p>
                <p className="mt-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {c ? `${c.name} · ${c.subject}` : w.subject || "World"} ·{" "}
                  {WORLD_TYPE_LABEL[(w.world_type as WorldType) ?? "other"]}
                </p>
                <WorldCard worldId={w.id} />
              </div>
              <div className="relative z-10 flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                <Button asChild className="rounded-full">
                  <Link to="/worlds/$worldId" params={{ worldId: w.id }}>
                    Åbn World
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
