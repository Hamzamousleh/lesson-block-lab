import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { classesQuery, lessonsQuery, unitsQuery } from "@/lib/data";
import { UNIT_STATUS_LABEL } from "@/lib/types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/units")({
  head: () => ({
    meta: [
      { title: "Forløb — CaseLab" },
      { name: "description", content: "Alle dine teaching sequences på tværs af klasser." },
      { property: "og:title", content: "Forløb — CaseLab" },
      { property: "og:description", content: "Alle dine forløb på tværs af klasser." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnitsPage,
});

function UnitsPage() {
  const units = useQuery(unitsQuery());
  const classes = useQuery(classesQuery());
  const lessons = useQuery(lessonsQuery());
  const classById = new Map((classes.data ?? []).map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <h1 className="text-3xl font-semibold">Forløb</h1>
      <p className="mt-2 text-muted-foreground">Dine teaching sequences på tværs af klasser.</p>

      {units.isLoading && (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Henter forløb …
        </div>
      )}

      {units.data?.length === 0 && (
        <div className="surface-card mt-10 p-10 text-center">
          <h2 className="text-xl font-semibold">Ingen forløb endnu</h2>
          <p className="mt-2 text-muted-foreground">
            Forløb oprettes inde på en klasse — vælg en klasse for at komme i gang.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/classes">Gå til klasser</Link>
          </Button>
        </div>
      )}

      <div className="mt-10 space-y-4">
        {units.data?.map((u) => {
          const c = classById.get(u.class_id);
          const count = (lessons.data ?? []).filter((l) => l.unit_id === u.id).length;
          return (
            <div key={u.id} className="surface-card flex flex-wrap items-center gap-4 px-6 py-5">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-medium">{u.title}</p>
                <p className="text-sm text-muted-foreground">
                  {c ? `${c.name} · ${c.subject}` : "Klasse"} · {count} lektioner ·{" "}
                  {UNIT_STATUS_LABEL[u.status]}
                </p>
              </div>
              {c && (
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/classes/$classId" params={{ classId: c.id }}>
                    Åbn klasse
                  </Link>
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
