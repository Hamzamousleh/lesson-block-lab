import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Blocks,
  BookOpenCheck,
  BrainCircuit,
  FileText,
  Library,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { PublicPage } from "@/components/public/PublicLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Om Didaktiva | Aktiv undervisning fra fagligt stof" },
      {
        name: "description",
        content:
          "Se hvordan Didaktiva hjælper lærere fra fagligt stof og materialer til aktiv undervisning.",
      },
      { property: "og:title", content: "Om Didaktiva | Aktiv undervisning fra fagligt stof" },
      {
        property: "og:description",
        content: "Lærerens arbejdsrum før, under og efter undervisningen.",
      },
    ],
  }),
  component: AboutPage,
});

const activityTypes = [
  "Lærerindhold",
  "Fortælling",
  "Case",
  "Teoritest",
  "Sammenligning",
  "Find fejlen",
  "Diskussion",
  "Dilemma",
  "Position",
  "Afstemning",
  "Rangering",
  "Skala",
  "Kort svar",
  "Exit ticket",
];

function ProductScreenshot({
  src,
  alt,
  width,
  height,
  caption,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string | undefined;
  priority?: boolean | undefined;
}) {
  return (
    <figure className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="block h-auto w-full"
      />
      {caption ? (
        <figcaption className="border-t border-border px-5 py-3 text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function ProductRow({
  eyebrow,
  title,
  icon: Icon,
  screenshotSrc,
  screenshotAlt,
  screenshotWidth,
  screenshotHeight,
  screenshotCaption,
  screenshotPriority,
  reverse = false,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: typeof Sparkles;
  screenshotSrc: string;
  screenshotAlt: string;
  screenshotWidth: number;
  screenshotHeight: number;
  screenshotCaption?: string | undefined;
  screenshotPriority?: boolean | undefined;
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="grid items-center gap-8 py-10 md:grid-cols-5 md:gap-12 md:py-16">
      <div className={reverse ? "md:order-2 md:col-span-2" : "md:col-span-2"}>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
          <Icon aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold">{title}</h2>
        <div className="mt-4 space-y-4 leading-7 text-muted-foreground">{children}</div>
      </div>
      <div className={reverse ? "md:order-1 md:col-span-3" : "md:col-span-3"}>
        <ProductScreenshot
          src={screenshotSrc}
          alt={screenshotAlt}
          width={screenshotWidth}
          height={screenshotHeight}
          caption={screenshotCaption}
          priority={screenshotPriority}
        />
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <PublicPage>
      <section className="mx-auto max-w-5xl px-5 py-14 text-center sm:px-6 sm:py-24">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
          Om Didaktiva
        </p>
        <h1 className="mx-auto mt-4 max-w-4xl font-display text-4xl font-semibold text-balance sm:text-6xl">
          Fra fagligt stof til aktiv undervisning
        </h1>
        <div className="mx-auto mt-7 max-w-3xl space-y-4 text-lg leading-8 text-muted-foreground">
          <p>
            Didaktiva er udviklet til lærere, der gerne vil bruge mindre tid på at få undervisningen
            til at hænge sammen – og mere tid på selve undervisningen.
          </p>
          <p>
            Platformen hjælper med at gå fra fagligt stof, idéer og materialer til en konkret
            lektion med variation, elevaktivitet og et tydeligt undervisningsflow.
          </p>
          <p className="font-medium text-foreground">
            Didaktiva er ikke tænkt som endnu et LMS. Det er lærerens arbejdsrum før, under og efter
            undervisningen.
          </p>
        </div>
      </section>

      <div className="border-y border-border/70 bg-surface/50">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <ProductRow
            eyebrow="Fra idé til undervisning"
            title="Start dér, hvor dit faglige arbejde allerede er"
            icon={Sparkles}
            screenshotSrc="/images/about/home.jpg"
            screenshotAlt="Didaktiva Hjem med genveje til Planlæg undervisning, Brug mit materiale, Red mig og Kør undervisning"
            screenshotWidth={2040}
            screenshotHeight={1248}
            screenshotCaption="Planlæg, genbrug og kør undervisningen fra ét sted."
            screenshotPriority
          >
            <p>
              En lektion begynder sjældent i et tomt system. Den begynder med en PowerPoint, en
              tekst, et dokument, et emne, en case, et tidligere forløb eller en idé. Didaktiva gør
              disse udgangspunkter til konkrete næste skridt.
            </p>
          </ProductRow>

          <ProductRow
            eyebrow="Planlæg undervisning"
            title="Byg et tydeligt og varieret undervisningsflow"
            icon={BookOpenCheck}
            screenshotSrc="/images/about/lesson-editor.jpg"
            screenshotAlt="Didaktiva Lesson Editor med aktivitetstimeline, læringsmål og lektionshandlinger"
            screenshotWidth={2040}
            screenshotHeight={1272}
            reverse
          >
            <p>
              Angiv fag, varighed og læringsmål, og arbejd videre med konkrete aktiviteter.
              Didaktiva understøtter kombinationen af digitalt arbejde, mundtlighed, makkerarbejde
              og plenum. Målet er ikke at digitalisere alt.
            </p>
          </ProductRow>

          <ProductRow
            eyebrow="Brug mit materiale"
            title="Lad dit eget faglige materiale være udgangspunktet"
            icon={FileText}
            screenshotSrc="/images/about/materialer.jpg"
            screenshotAlt="Didaktiva Brug mit materiale med uploadede undervisningsfiler og lektionsopsætning"
            screenshotWidth={2040}
            screenshotHeight={1272}
          >
            <p>
              Organisér egne PDF-, PPTX- og DOCX-filer samt billeder i Didaktiva. De kan bruges som
              grundlag for en ChatGPT-prompt, men filerne sendes ikke automatisk til AI.
            </p>
          </ProductRow>

          <section className="mx-auto my-8 max-w-3xl rounded-3xl border border-accent-warm/60 bg-accent-warm/35 p-7 sm:p-9">
            <Zap className="size-7 text-accent-warm-foreground" aria-hidden="true" />
            <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-accent-warm-foreground uppercase">
              Red mig
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Find hurtigt en brugbar vej videre</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Når der er mere tid end planlagt, eller undervisningen har brug for en ny vinkel,
              tager Red mig udgangspunkt i den eksisterende lektion og hjælper læreren med næste
              aktivitet.
            </p>
          </section>

          <ProductRow
            eyebrow="Kør undervisning"
            title="Bevar overblikket i Teacher Cockpit"
            icon={Workflow}
            screenshotSrc="/images/about/teacher-cockpit.jpg"
            screenshotAlt="Teacher Cockpit med elevvisning, timer, progression og lærerens styring af aktiviteten"
            screenshotWidth={2040}
            screenshotHeight={1272}
          >
            <p>
              Cockpittet samler student preview, aktivitetsnavigation, timer, svarantal,
              fordelinger, fritekstsvar, facit, noter og progression, så læreren kan styre
              undervisningen fra ét roligt overblik.
            </p>
          </ProductRow>

          <ProductRow
            eyebrow="Eleverne deltager"
            title="Lav adgangstærskel, tydeligt fagligt fokus"
            icon={Users}
            screenshotSrc="/images/about/student-view.jpg"
            screenshotAlt="Elevvisning i Didaktiva med aktiv undervisningsopgave og svarmuligheder"
            screenshotWidth={2040}
            screenshotHeight={1272}
            reverse
          >
            <p>
              Elever deltager med sessionskode og automatisk alias uden konto. De kan tage stilling,
              stemme, rangere, anvende teori, analysere, begrunde og skrive korte svar. Den digitale
              deltagelse skal understøtte samtalen – ikke erstatte den.
            </p>
          </ProductRow>

          <div className="mx-auto max-w-4xl pb-10 md:pb-16">
            <ProductScreenshot
              src="/images/about/elev-alias.jpg"
              alt="Elevens join-visning med automatisk genereret Didaktiva-alias"
              width={2040}
              height={1272}
              caption="Elever deltager med et automatisk alias og uden elevkonto."
            />
          </div>

          <ProductRow
            eyebrow="Fra elevsvar til lærerhandling"
            title="Se det, der er vigtigt for næste faglige greb"
            icon={MessagesSquare}
            screenshotSrc="/images/about/elevresultater.jpg"
            screenshotAlt="Didaktiva-visning af klassens elevsvar og mulighed for at arbejde videre med resultaterne"
            screenshotWidth={2040}
            screenshotHeight={1272}
          >
            <p>
              Fordelinger og fritekstsvar kan synliggøre forskellige forståelser, argumenter,
              misforståelser og uenighed, så læreren kan følge op i plenum.
            </p>
            <p className="font-medium text-foreground">
              Målet er ikke mere data for dataens skyld. Målet er bedre beslutninger i
              undervisningen.
            </p>
          </ProductRow>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
              <Blocks aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              Lektionseditor
            </p>
            <h2 className="mt-2 text-3xl font-semibold">
              Blocks er selve byggestenene i Didaktiva
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              En lektion består af små, flytbare undervisningselementer, som kan kombineres og
              genbruges uden at låse læreren til én arbejdsform.
            </p>
          </div>
          <ul
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            aria-label="Didaktivas 14 aktivitetstyper"
          >
            {activityTypes.map((type) => (
              <li
                key={type}
                className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-soft"
              >
                {type}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-border/70 bg-secondary/35">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <article className="surface-card p-7 sm:p-9">
            <Library className="size-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-semibold">Genbrug det, der virker</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Biblioteket samler aktiviteter, lektioner og relevante svareksempler. Over tid bliver
              det lærerens egen samling af undervisning, som kan tilpasses og bruges igen.
            </p>
          </article>
          <article className="surface-card p-7 sm:p-9">
            <BrainCircuit className="size-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-semibold">
              ChatGPT som værktøj – Didaktiva som arbejdsrum
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              ChatGPT kan være den genererende motor, mens Didaktiva strukturerer undervisningen.
              Læreren kontrollerer copy/paste. Elevdata og filer sendes ikke automatisk til AI.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Worlds</p>
            <h2 className="mt-2 text-3xl font-semibold">Længere faglige forløb med konsekvenser</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Worlds kan bruges til længere cases, simulationer, dilemmaforløb og tilbagevendende
              karakterer. Det handler ikke om points eller XP, men om faglig progression og
              konsekvenser, der påvirker næste episode.
            </p>
            <ol className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="Worlds-forløb">
              {[
                "World",
                "Episoder",
                "Lektioner og aktiviteter",
                "Elevsessioner",
                "Valg og svar",
                "Konsekvenser",
                "Næste episode",
              ].map((step, index) => (
                <li key={step} className="rounded-full border border-border bg-card px-3 py-2">
                  {step}
                  {index < 6 ? " →" : ""}
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-3">
            <ProductScreenshot
              src="/images/about/worlds.jpg"
              alt="Didaktiva Worlds med episoder, progression og world state"
              width={2040}
              height={1272}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-surface/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-6 md:grid-cols-2 sm:py-24">
          <div>
            <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-semibold">Privatliv fra starten</h2>
            <ul className="mt-5 space-y-3 text-muted-foreground">
              <li>Ingen elevkonto og intet krav om rigtigt navn</li>
              <li>Automatisk neutralt alias</li>
              <li>Ingen reklame- eller analytics-tracking</li>
              <li>Ingen automatisk AI-dataoverførsel</li>
            </ul>
            <nav
              className="mt-6 flex flex-wrap gap-4 text-sm"
              aria-label="Læs mere om data og vilkår"
            >
              <Link className="text-primary underline-offset-4 hover:underline" to="/privacy">
                Privatlivspolitik
              </Link>
              <Link className="text-primary underline-offset-4 hover:underline" to="/cookies">
                Cookiepolitik
              </Link>
              <Link className="text-primary underline-offset-4 hover:underline" to="/terms">
                Vilkår
              </Link>
            </nav>
          </div>
          <div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-warm text-accent-warm-foreground">
              <Sparkles aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-3xl font-semibold">Bygget til undervisning</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Digitale værktøjer skal hjælpe læreren med at skabe bedre undervisning – ikke skabe
              mere administration. Derfor skal Didaktiva være hurtigt, fleksibelt, enkelt for
              elever, transparent omkring data og konsekvent lærercentreret.
            </p>
            <p className="mt-5 font-display text-xl font-semibold">
              Det vigtigste er ikke teknologien. Det vigtigste er, hvad der sker i klasselokalet.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6 sm:py-24">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Gratis pilotversion
        </p>
        <h2 className="mt-3 text-4xl font-semibold">Vær med til at forme Didaktiva</h2>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          Didaktiva er under løbende udvikling med feedback fra lærere og tilbydes nu som gratis
          pilotversion.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/contact">Kontakt Didaktiva</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <a href="mailto:kontakt@didaktiva.dk">kontakt@didaktiva.dk</a>
          </Button>
        </div>
      </section>
    </PublicPage>
  );
}
