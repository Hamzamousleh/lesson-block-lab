import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { PublicPage } from "@/components/public/PublicLayout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Kontakt | Didaktiva" },
      {
        name: "description",
        content: "Kontakt Didaktiva med spørgsmål, feedback eller hjælp til platformen.",
      },
      { property: "og:title", content: "Kontakt | Didaktiva" },
      {
        property: "og:description",
        content: "Spørgsmål, feedback og hjælp til Didaktiva.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <PublicPage>
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">Kontakt</p>
          <h1 className="mt-3 font-display text-4xl font-semibold sm:text-5xl">
            Kontakt Didaktiva
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Har du spørgsmål, feedback eller brug for hjælp?
            <br />
            Du er altid velkommen til at kontakte Didaktiva.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <section className="surface-card p-6 sm:p-8" aria-labelledby="contact-details">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent text-primary">
              <Mail aria-hidden="true" />
            </div>
            <h2 id="contact-details" className="mt-5 text-2xl font-semibold">
              Skriv til Didaktiva
            </h2>
            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-sm text-muted-foreground">E-mail</dt>
                <dd className="mt-1">
                  <a
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href="mailto:kontakt@didaktiva.dk"
                  >
                    kontakt@didaktiva.dk
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Web</dt>
                <dd className="mt-1">
                  <a
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href="https://didaktiva.dk"
                  >
                    https://didaktiva.dk
                  </a>
                </dd>
              </div>
            </dl>
            <p className="mt-7 text-sm text-muted-foreground">
              Jeg bestræber mig på at svare så hurtigt som muligt.
            </p>
          </section>

          <section className="surface-quiet p-6 sm:p-8" aria-labelledby="contact-topics">
            <MessageCircle className="size-7 text-primary" aria-hidden="true" />
            <h2 id="contact-topics" className="mt-4 text-xl font-semibold">
              Du kan blandt andet skrive om
            </h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              <li>Spørgsmål til Didaktiva</li>
              <li>Fejl eller problemer</li>
              <li>Feedback og forslag</li>
              <li>Privatliv og data</li>
              <li>Eksport eller sletning af data</li>
              <li>Interesse i pilotbrug</li>
            </ul>
          </section>
        </div>

        <aside className="mt-8 flex items-start gap-4 rounded-2xl border border-primary/20 bg-accent/50 p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium">Gratis pilotversion</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Didaktiva er i øjeblikket en gratis pilotversion og er under løbende udvikling.
            </p>
          </div>
        </aside>

        <nav className="mt-10 flex flex-wrap gap-3" aria-label="Juridisk information">
          <Link
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
            to="/privacy"
          >
            Privatlivspolitik
          </Link>
          <Link
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
            to="/cookies"
          >
            Cookiepolitik
          </Link>
          <Link
            className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
            to="/terms"
          >
            Vilkår for brug
          </Link>
        </nav>
      </div>
    </PublicPage>
  );
}
