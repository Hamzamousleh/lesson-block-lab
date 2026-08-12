import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "@/lib/use-session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CaseLab — fra fagligt stof til klar undervisning" },
      {
        name: "description",
        content:
          "CaseLab er lærerens arbejdsrum til gymnasiet: planlæg lektioner, byg varierede aktiviteter og genbrug dit materiale.",
      },
      { property: "og:title", content: "CaseLab — lærerens arbejdsrum" },
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
        <span className="font-display text-xl font-semibold">
          Case<span className="text-primary">Lab</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/join">
            <Button variant="outline" className="rounded-full">
              Deltag med kode
            </Button>
          </Link>
          <Link to="/auth">
            <Button variant="ghost">Log ind</Button>
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24 text-center sm:pt-24">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">
          Til undervisere i gymnasiet
        </p>
        <h1 className="mt-6 text-4xl leading-tight font-semibold text-balance sm:text-6xl">
          Fra fagligt stof til undervisning, der er klar til klassen.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          CaseLab er dit arbejdsrum til at planlægge lektioner, bygge varierede aktiviteter og
          genbruge dit materiale — uden at drukne i systemer.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="rounded-full px-8">
              Kom i gang
            </Button>
          </Link>
          <Link to="/join">
            <Button size="lg" variant="outline" className="rounded-full px-8">
              Jeg er elev — deltag med kode
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
