import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Blocks,
  BookOpenCheck,
  BrainCircuit,
  FileText,
  Library,
  MessagesSquare,
  Radio,
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

function Shot({
  src,
  alt,
  width,
  height,
  caption,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string | undefined;
  priority?: boolean | undefined;
  className?: string;
}) {
  return (
    <figure className={className}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="block h-auto w-full rounded-xl border border-border/70 bg-card shadow-[0_1px_3px_color-mix(in_oklab,var(--foreground)_8%,transparent)]"
      />
      {caption ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

function Row({
  eyebrow,
  title,
  icon: Icon,
  shot,
  reverse = false,
  wide = false,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: typeof Sparkles;
  shot: React.ReactNode;
  reverse?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const textCols = wide ? "md:col-span-4" : "md:col-span-5";
  const shotCols = wide ? "md:col-span-8" : "md:col-span-7";
  return (
    <section className="grid items-center gap-6 py-8 md:grid-cols-12 md:gap-10 md:py-12">
      <div className={`${textCols} ${reverse ? "md:order-2" : ""}`}>
        <div className="flex size-10 items-center justify-center rounded-2xl bg-accent text-primary">
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h2>
        <div className="mt-3 space-y-3 leading-7 text-muted-foreground">{children}</div>
      </div>
      <div className={`${shotCols} ${reverse ? "md:order-1" : ""}`}>{shot}</div>
    </section>
  );
}

function AboutPage() {
  return (
    <PublicPage>
      <section className="mx-auto max-w-5xl px-5 py-12 text-center sm:px-6 sm:py-20">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
          Om Didaktiva
        </p>
        <h1 className="mx-auto mt-4 max-w-4xl font-display text-4xl font-semibold text-balance sm:text-6xl">
          Fra fagligt stof til aktiv undervisning
        </h1>
        <div className="mx-auto mt-6 max-w-3xl space-y-3 text-lg leading-8 text-muted-foreground">
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
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <Row
            eyebrow="Fra idé til undervisning"
            title="Start dér, hvor dit faglige arbejde allerede er"
            icon={Sparkles}
            shot={
              <Shot
                src="/images/about/home-actions.jpg"
                alt="Didaktiva Hjem med genveje til Planlæg undervisning, Brug mit materiale, Red mig og Kør undervisning"
                width={1891}
                height={915}
                caption="Fire tydelige indgange til dagens undervisningsarbejde."
                priority
              />
            }
          >
            <p>
              En lektion begynder sjældent i et tomt system. Den begynder med en PowerPoint, en
              tekst, et dokument, et emne, en case, et tidligere forløb eller en idé. Didaktiva gør
              disse udgangspunkter til konkrete næste skridt.
            </p>
          </Row>

          <Row
            eyebrow="Lærerens arbejdsrum"
            title="Fortsæt undervisningen, og genbrug det du har bygget"
            icon={Library}
            reverse
            shot={
              <Shot
                src="/images/about/home-continue.jpg"
                alt="Didaktiva Hjem med Fortsæt undervisningen, lektioner med Kør lektion og Redigér samt værktøjer"
                width={1887}
                height={811}
                caption="Seneste lektioner og værktøjer samlet ét sted."
              />
            }
          >
            <p>
              Seneste lektioner ligger fremme og kan køres eller redigeres med ét klik. Værktøjerne
              – Fyld lektionen ud, Gør den mere aktiv, Mit bibliotek, Worlds og Differentiér – tager
              udgangspunkt i det, du allerede har lavet.
            </p>
          </Row>

          <Row
            eyebrow="Planlæg undervisning"
            title="Byg et tydeligt og varieret undervisningsflow"
            icon={BookOpenCheck}
            shot={
              <Shot
                src="/images/about/plan-chatgpt.jpg"
                alt="Planlæg med ChatGPT i Didaktiva med valg af hel lektion eller aktiviteter, klasse, forløb, emne og varighed"
                width={1887}
                height={1002}
                caption="Vælg lektion eller enkeltaktiviteter, klasse, emne og varighed."
              />
            }
          >
            <p>
              Angiv fag, varighed og læringsmål, og arbejd videre med konkrete aktiviteter.
              Didaktiva understøtter kombinationen af digitalt arbejde, mundtlighed, makkerarbejde
              og plenum. Målet er ikke at digitalisere alt.
            </p>
          </Row>

          <Row
            eyebrow="Brug mit materiale"
            title="Lad dit eget faglige materiale være udgangspunktet"
            icon={FileText}
            reverse
            shot={
              <Shot
                src="/images/about/materialer.jpg"
                alt="Brug mit materiale i Didaktiva med materialeinput, klasse, materialetype, formål, varighed og uploadede filer"
                width={1881}
                height={1011}
                caption="Tekst, noter og egne filer som fagligt grundlag."
              />
            }
          >
            <p>
              Organisér egne PDF-, PPTX- og DOCX-filer samt billeder i Didaktiva. De kan bruges som
              grundlag for en ChatGPT-prompt, men filerne sendes ikke automatisk til AI.
            </p>
          </Row>

          <section className="mx-auto my-6 max-w-3xl rounded-3xl border border-accent-warm/60 bg-accent-warm/35 p-6 sm:p-8">
            <Zap className="size-6 text-accent-warm-foreground" aria-hidden="true" />
            <p className="mt-3 text-xs font-semibold tracking-[0.14em] text-accent-warm-foreground uppercase">
              Red mig
            </p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              Find hurtigt en brugbar vej videre
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Når der er mere tid end planlagt, eller undervisningen har brug for en ny vinkel,
              tager Red mig udgangspunkt i den eksisterende lektion og hjælper læreren med næste
              aktivitet.
            </p>
          </section>

          <Row
            eyebrow="Lektionseditor"
            title="Blocks er selve byggestenene i Didaktiva"
            icon={Blocks}
            wide
            shot={
              <Shot
                src="/images/about/lesson-editor.jpg"
                alt="Didaktiva Lesson Editor med lektionstitel, læringsmål, varighed, Start elevsession og undervisningssekvens med blocks"
                width={1894}
                height={1008}
                caption="Læringsmål, varighed og en undervisningssekvens af flytbare blocks."
              />
            }
          >
            <p>
              En lektion består af små, flytbare undervisningselementer, som kan kombineres og
              genbruges uden at låse læreren til én arbejdsform.
            </p>
            <ul
              className="flex flex-wrap gap-1.5 pt-1 text-xs"
              aria-label="Didaktivas 14 aktivitetstyper"
            >
              {activityTypes.map((type) => (
                <li
                  key={type}
                  className="rounded-full border border-border bg-card px-2.5 py-1 font-medium text-foreground/80"
                >
                  {type}
                </li>
              ))}
            </ul>
          </Row>

          <Row
            eyebrow="Live"
            title="Start sessionen – eleverne deltager med kode"
            icon={Radio}
            reverse
            shot={
              <Shot
                src="/images/about/live-session.jpg"
                alt="Didaktiva sessionstart med Start session, Åbn lærercockpit, join-kode, elevlink og antal deltagere"
                width={1889}
                height={1001}
                caption="Kode og link deles med klassen; læreren åbner cockpittet."
              />
            }
          >
            <p>
              Læreren starter sessionen, eleverne får en kode eller et link, og læreren kan åbne
              lærercockpittet. Eleverne deltager uden konto.
            </p>
          </Row>

          <section className="py-8 md:py-12">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-accent text-primary">
                <Workflow aria-hidden="true" className="size-5" />
              </div>
              <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                Kør undervisning
              </p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                Bevar overblikket i Teacher Cockpit
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Cockpittet samler student preview, aktivitetsnavigation, timer, svarantal,
                fordelinger, fritekstsvar, facit, noter og progression, så læreren kan styre
                undervisningen fra ét roligt overblik.
              </p>
            </div>
            <Shot
              className="mt-6"
              src="/images/about/teacher-cockpit.jpg"
              alt="Teacher Cockpit med nuværende aktivitet, timer, det eleverne ser, progression, lærernote og næste aktivitet"
              width={1885}
              height={1001}
              caption="Styr aktivitet, tid og elevrespons fra samme overblik."
            />
          </section>

          <Row
            eyebrow="Eleverne deltager"
            title="Lav adgangstærskel, tydeligt fagligt fokus"
            icon={Users}
            shot={
              <Shot
                className="mx-auto max-w-xs sm:max-w-sm"
                src="/images/about/elev-alias.jpg"
                alt="Elevens join-visning i Didaktiva med automatisk alias Gul Delfin og knappen Deltag"
                width={725}
                height={851}
                caption="Eleven deltager med et automatisk alias – uden konto og uden rigtigt navn."
              />
            }
          >
            <p>
              Elever deltager med sessionskode og automatisk alias uden konto. De kan tage stilling,
              stemme, rangere, anvende teori, analysere, begrunde og skrive korte svar. Den digitale
              deltagelse skal understøtte samtalen – ikke erstatte den.
            </p>
          </Row>

          <Row
            eyebrow="Fra elevsvar til lærerhandling"
            title="Se det, der er vigtigt for næste faglige greb"
            icon={MessagesSquare}
            reverse
            shot={
              <Shot
                src="/images/about/follow-up.jpg"
                alt="Didaktiva Arbejd videre med svarene med valg af aktivitet, opfølgningsmål, tid og anonymisering af elevnavne"
                width={1819}
                height={939}
                caption="Vælg aktivitet, opfølgning, tid – og anonymisér elevernes navne før eksport."
              />
            }
          >
            <p>
              Fordelinger og fritekstsvar kan synliggøre forskellige forståelser, argumenter,
              misforståelser og uenighed, så læreren kan følge op i plenum. I Worlds kan svarene
              også ændre forløbets tilstand.
            </p>
            <p className="font-medium text-foreground">
              Målet er ikke mere data for dataens skyld. Målet er bedre beslutninger i
              undervisningen.
            </p>
          </Row>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="surface-card p-6 sm:p-8">
            <Library className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Genbrug det, der virker</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Biblioteket samler aktiviteter, lektioner og relevante svareksempler. Over tid bliver
              det lærerens egen samling af undervisning, som kan tilpasses og bruges igen.
            </p>
          </article>
          <article className="surface-card p-6 sm:p-8">
            <BrainCircuit className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
              ChatGPT som værktøj – Didaktiva som arbejdsrum
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              ChatGPT kan være den genererende motor, mens Didaktiva strukturerer undervisningen.
              Læreren kontrollerer copy/paste. Elevdata og filer sendes ikke automatisk til AI.
            </p>
          </article>
        </div>

        <div className="mt-10">
          <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Worlds</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
            Længere faglige forløb med konsekvenser
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            Worlds kan bruges til længere cases, simulationer, dilemmaforløb og tilbagevendende
            karakterer. Det handler ikke om points eller XP, men om faglig progression og
            konsekvenser, der påvirker næste episode.
          </p>
          <ol className="mt-5 flex flex-wrap gap-2 text-sm" aria-label="Worlds-forløb">
            {[
              "World",
              "Episoder",
              "Lektioner",
              "Elevvalg",
              "Konsekvenser",
              "Opdateret World",
            ].map((step, index, all) => (
              <li key={step} className="rounded-full border border-border bg-card px-3 py-2">
                {step}
                {index < all.length - 1 ? " →" : ""}
              </li>
            ))}
          </ol>
          <Shot
            className="mt-6"
            src="/images/about/worlds.jpg"
            alt="Didaktiva Worlds med world-tilstand og variable som gruppepres, identitetskonflikt, belastning, konfliktniveau og psykologisk tryghed"
            width={1889}
            height={1009}
            caption="World-tilstanden viser, hvordan elevernes valg påvirker det videre forløb."
          />
        </div>
      </section>

      <section className="border-y border-border/70 bg-surface/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-6 sm:py-20 md:grid-cols-2">
          <div>
            <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Privatliv fra starten</h2>
            <ul className="mt-4 space-y-3 text-muted-foreground">
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
            <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-warm text-accent-warm-foreground">
              <Sparkles aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Bygget til undervisning</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Digitale værktøjer skal hjælpe læreren med at skabe bedre undervisning – ikke skabe
              mere administration. Derfor skal Didaktiva være hurtigt, fleksibelt, enkelt for
              elever, transparent omkring data og konsekvent lærercentreret.
            </p>
            <p className="mt-4 font-display text-xl font-semibold">
              Det vigtigste er ikke teknologien. Det vigtigste er, hvad der sker i klasselokalet.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14 text-center sm:px-6 sm:py-20">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          Gratis pilotversion
        </p>
        <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Vær med til at forme Didaktiva</h2>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Didaktiva er under løbende udvikling med feedback fra lærere og tilbydes nu som gratis
          pilotversion.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
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
