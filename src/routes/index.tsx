import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/use-session";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/components/public/PublicLayout";

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
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
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
          <Button
            asChild
            size="lg"
            className="h-14 rounded-full px-8 text-lg font-medium shadow-lift"
          >
            <Link to="/auth">Prøv Didaktiva gratis</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-14 rounded-full px-8 text-lg font-medium"
          >
            <Link to="/join">Jeg er elev — deltag med kode</Link>
          </Button>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
