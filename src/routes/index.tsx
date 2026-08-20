import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CalendarCheck, FileText, MessagesSquare, Radio, ShieldCheck } from "lucide-react";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: CalendarCheck,
    title: "Planlæg undervisning",
    body: "Gå fra emne, idé eller læringsmål til en struktureret lektion.",
  },
  {
    icon: FileText,
    title: "Brug mit materiale",
    body: "Tag udgangspunkt i dine egne tekster, præsentationer og filer.",
  },
  {
    icon: Radio,
    title: "Kør undervisning",
    body: "Styr aktiviteter, tid og elevdeltagelse fra Teacher Cockpit.",
  },
  {
    icon: MessagesSquare,
    title: "Arbejd videre med elevsvar",
    body: "Brug klassens svar til opfølgning, refleksion og næste undervisningsgreb.",
  },
] as const;

const steps = [
  { number: 1, title: "Planlæg", body: "Start med dit faglige indhold." },
  {
    number: 2,
    title: "Gennemfør",
    body: "Kør lektionen live eller lad eleverne arbejde selvstændigt.",
  },
  {
    number: 3,
    title: "Følg op",
    body: "Se elevsvar og brug dem til næste didaktiske beslutning.",
  },
] as const;

const privacyPoints = [
  "Elever behøver ikke en konto",
  "Intet krav om rigtigt navn",
  "Automatisk alias til hver elev",
  "Ingen reklame- eller analytics-tracking i pilotversionen",
  "Ingen automatisk AI-overførsel af elevdata",
] as const;

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-5 pt-14 pb-12 text-center sm:px-6 sm:pt-20">
          <p className="text-sm font-bold tracking-[0.14em] text-primary uppercase">Didaktiva</p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-balance sm:text-6xl">
            Fra fagligt stof til aktiv undervisning
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Didaktiva hjælper lærere med at planlægge, strukturere og gennemføre undervisning med
            variation, elevaktivitet og et tydeligt flow.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="h-13 rounded-full px-8 text-base shadow-lift">
              <Link to="/auth">Prøv Didaktiva</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 rounded-full px-8 text-base"
            >
              <Link to="/about">Se hvad Didaktiva kan</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Gratis pilotversion</p>
        </section>

        <section className="mx-auto max-w-5xl px-5 pb-14 sm:px-6" aria-label="Produktvisning">
          <img
            src="/images/about/home-actions.jpg"
            alt="Didaktiva Hjem med genveje til Planlæg undervisning, Brug mit materiale, Red mig og Kør undervisning"
            width={1891}
            height={915}
            loading="eager"
            className="w-full rounded-2xl border border-border/70 shadow-sm"
          />
        </section>

        <section
          className="mx-auto max-w-5xl px-5 py-12 sm:px-6"
          aria-labelledby="landing-om-didaktiva"
        >
          <div className="surface-quiet rounded-[32px] p-8 sm:p-10">
            <h2 id="landing-om-didaktiva" className="font-display text-3xl font-semibold">
              Om Didaktiva
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Didaktiva er lærerens arbejdsrum før, under og efter undervisningen. Start med et
              emne, en idé eller dit eget materiale. Byg lektionen med aktiviteter, kør den live med
              eleverne, og brug svarene aktivt i undervisningen.
            </p>
            <Button asChild variant="outline" className="mt-6 rounded-full">
              <Link to="/about">Læs mere om Didaktiva</Link>
            </Button>
          </div>
        </section>

        <section
          className="mx-auto max-w-5xl px-5 py-12 sm:px-6"
          aria-labelledby="landing-funktioner"
        >
          <h2 id="landing-funktioner" className="font-display text-3xl font-semibold">
            Det kan du gøre
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
              >
                <feature.icon aria-hidden="true" className="size-6 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6" aria-labelledby="landing-hvordan">
          <h2 id="landing-hvordan" className="font-display text-3xl font-semibold">
            Hvordan virker det?
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((step) => (
              <li key={step.number} className="rounded-3xl border border-border/70 p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-secondary font-display font-semibold">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 pb-20 sm:px-6" aria-labelledby="landing-privatliv">
          <div className="surface-quiet rounded-[32px] p-8 sm:p-10">
            <ShieldCheck aria-hidden="true" className="size-6 text-primary" />
            <h2 id="landing-privatliv" className="mt-4 font-display text-3xl font-semibold">
              Enkel elevdeltagelse
            </h2>
            <ul className="mt-5 space-y-2 text-muted-foreground">
              {privacyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="mt-6 text-sm">
              Læs mere i{" "}
              <Link className="underline underline-offset-4 hover:text-foreground" to="/privacy">
                Privatliv
              </Link>{" "}
              og{" "}
              <Link className="underline underline-offset-4 hover:text-foreground" to="/cookies">
                Cookies
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
