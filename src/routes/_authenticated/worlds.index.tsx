import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Globe2, Loader2, Plus } from "lucide-react";
import { classesQuery } from "@/lib/data";
import { episodesQuery, worldsQuery, WORLD_STATUS_LABEL, WORLD_TYPE_LABEL, type WorldType } from "@/lib/worlds";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/worlds/")({
  head: () => ({
    meta: [
      { title: "Worlds — CaseLab" },
      {
        name: "description",
        content: "Vedvarende læringsuniverser, hvor eleverne anvender teori over tid og møder konsekvenser.",
      },
      { property: "og:title", content: "Worlds — CaseLab" },
      { property: "og:description", content: "Byg vedvarende læringsuniverser med progression og konsekvenser." },
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
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Vedvarende læringsuniverser, hvor eleverne anvender teori igen og igen på de samme personer,
            samfund eller organisationer — og møder konsekvenserne af deres beslutninger.
          </p>
        </div>
        <Link to="/worlds/new">
          <Button className="rounded-full">
            <Plus className="size-4" /> Nyt World
          </Button>
        </Link>
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
          <Link to="/worlds/new">
            <Button className="mt-6 rounded-full">Opret dit første World</Button>
          </Link>
        </div>
      )}

      <div className="mt-10 space-y-4">
        {worlds.data?.map((w) => {
          const c = w.class_id ? classById.get(w.class_id) : undefined;
          return (
            <Link
              key={w.id}
              to="/worlds/$worldId"
              params={{ worldId: w.id }}
              className="surface-card flex flex-wrap items-center gap-4 px-6 py-5 transition-colors hover:bg-secondary/40"
            >
              <div className="min-w-0 flex-1">
                <p className="text-lg font-medium">{w.title}</p>
                <p className="text-sm text-muted-foreground">
                  {w.subject} · {WORLD_TYPE_LABEL[(w.world_type as WorldType) ?? "other"]}
                  {c ? ` · ${c.name}` : ""} · {WORLD_STATUS_LABEL[w.status]}
                </p>
                <WorldCard worldId={w.id} />
              </div>
              <Button variant="outline" className="rounded-full">
                Åbn World
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
