import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/use-session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Didaktiva — Fra fagligt stof til aktiv undervisning" },
      {
        name: "description",
        content:
          "Didaktiva er lærerens arbejdsrum til gymnasiet: planlæg lektioner, byg varierede aktiviteter og genbrug dit materiale.",
      },
      { property: "og:title", content: "Didaktiva — Fra fagligt stof til aktiv undervisning" },
      {
        property: "og:description",
        content: "Kom hurtigere fra fagligt stof til undervisning, der er klar til klassen.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-20 max-w-5xl items-center px-6">
        <div className="flex items-center gap-2 font-display text-xl font-semibold">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <span className="font-display text-sm font-bold">D</span>
          </div>
          <span>
            Didakt<span className="text-primary">iva</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/join">Deltag med kode</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/auth">Log ind</Link>
          </Button>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24 text-center sm:pt-24">
        <p className="text-sm font-bold tracking-wide text-primary uppercase">
          Til undervisere i gymnasiet
        </p>
        <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-balance sm:text-6xl">
          Fra fagligt stof til undervisning, der er klar til klassen.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Didaktiva er dit arbejdsrum til at planlægge lektioner, bygge varierede aktiviteter og
          genbruge dit materiale — uden at drukne i systemer.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-14 rounded-full px-8 text-lg font-medium shadow-lift">
            <Link to="/auth">Prøv Didaktiva gratis</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 rounded-full px-8 text-lg font-medium">
            <Link to="/join">Jeg er elev — deltag med kode</Link>
          </Button>
        </div>
      </section>

      <footer className="mx-auto mt-auto max-w-5xl border-t border-border/70 px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2 font-display text-xl font-semibold">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <span className="font-display text-sm font-bold">D</span>
            </div>
            <span>Didaktiva</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Fra fagligt stof til aktiv undervisning
          </p>
        </div>
      </footer>
    </div>
  );
}
