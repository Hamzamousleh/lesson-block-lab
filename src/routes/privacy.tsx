import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/public/PublicLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privatlivspolitik | Didaktiva" },
      {
        name: "description",
        content: "Læs hvordan Didaktiva behandler lærer- og elevoplysninger.",
      },
      { property: "og:title", content: "Privatlivspolitik | Didaktiva" },
      {
        property: "og:description",
        content: "Sådan behandler og beskytter Didaktiva oplysninger i platformen.",
      },
    ],
  }),
  component: PrivacyPage,
});

const List = ({ children }: { children: React.ReactNode }) => (
  <ul className="ml-5 list-disc space-y-2 marker:text-primary">{children}</ul>
);

function PrivacyPage() {
  return (
    <LegalPage
      title="Privatlivspolitik for Didaktiva"
      description="Her kan du læse, hvilke oplysninger Didaktiva behandler, hvorfor de bruges, og hvilke valgmuligheder du har."
    >
      <LegalSection number={1} title="Hvem er Didaktiva?">
        <p>
          Didaktiva er en digital undervisningsplatform, der hjælper lærere med at planlægge,
          strukturere og gennemføre aktiv undervisning.
        </p>
        <p>Didaktiva kan blandt andet bruges til:</p>
        <List>
          <li>planlægning af lektioner og undervisningsaktiviteter</li>
          <li>elevsessioner og elevsvar</li>
          <li>undervisningsmaterialer og genbrug af aktiviteter og lektioner</li>
          <li>Worlds</li>
          <li>klargøring af indhold til brug med ChatGPT</li>
        </List>
        <p>
          Kontakt: Didaktiva ·{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="mailto:kontakt@didaktiva.dk"
          >
            kontakt@didaktiva.dk
          </a>{" "}
          ·{" "}
          <a
            className="text-primary underline-offset-4 hover:underline"
            href="https://didaktiva.dk"
          >
            didaktiva.dk
          </a>
        </p>
      </LegalSection>

      <LegalSection number={2} title="Hvilke personoplysninger behandles?">
        <h3 className="text-lg font-semibold">Lærere</h3>
        <p>Afhængigt af hvordan platformen bruges, kan Didaktiva behandle:</p>
        <List>
          <li>navn eller display name, e-mail, bruger-ID og autentificeringsdata</li>
          <li>oplysninger fra Google, når Google-login aktivt vælges</li>
          <li>kontoaktivitet</li>
          <li>klasser, forløb, lektioner, aktiviteter, læringsmål og lærernoter</li>
          <li>Worlds, materialer, filer, sessioner og elevsvar</li>
        </List>
        <p>
          Fritekstfelter bør ikke bruges til unødvendige personoplysninger eller følsomme
          personoplysninger.
        </p>
        <h3 className="pt-2 text-lg font-semibold">Elever</h3>
        <p>
          Elever opretter ikke en elevkonto og afgiver ikke e-mail eller password. Ved deltagelse
          behandles et automatisk neutralt alias, et deltager-token, progression, elevsvar og
          tidsstempler.
        </p>
        <p>
          Elevsvar kan eksempelvis være afstemning, skala, rangering, multiple choice, kort
          fritekst, begrundelse eller exit ticket.
        </p>
        <p>
          Didaktiva gemmer ikke IP-adresse eller user agent i sin egen database som en del af en
          elevprofil.
        </p>
      </LegalSection>

      <LegalSection number={3} title="Formål med behandlingen">
        <p>Oplysningerne bruges til at:</p>
        <List>
          <li>oprette og beskytte lærerens konto og login</li>
          <li>gemme og vise undervisningsindhold</li>
          <li>afvikle sessioner og modtage elevsvar</li>
          <li>give læreren et relevant resultatoverblik</li>
          <li>lade elever genoptage en igangværende session</li>
          <li>håndhæve adgangskontrol og understøtte teknisk drift</li>
          <li>give mulighed for eksport og sletning</li>
        </List>
        <p>Didaktiva bruger ikke oplysninger til målrettet annoncering eller profilering.</p>
      </LegalSection>

      <LegalSection number={4} title="Elevdeltagelse">
        <p>
          Eleven deltager via en sessionskode og får et automatisk alias. Browseren gemmer et
          lokalt, session-specifikt participant token, så eleven kan genoptage deltagelsen. Der
          oprettes ikke en global elevprofil, og tokenet bruges ikke til tracking på tværs af
          sessioner.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Opbevaring">
        <p>
          Lærerdata gemmes, mens kontoen findes, eller indtil læreren selv sletter indholdet eller
          kontoen.
        </p>
        <p>
          Elevparticipant- og elevresponsdata er sat til at blive slettet 90 dage efter en afsluttet
          eller dokumenteret inaktiv session. Læreren kan slette elevdata tidligere fra en afsluttet
          session.
        </p>
        <p>
          Den automatiske cleanup afhænger af den aktive driftsopsætning. Hvis en scheduler ikke er
          aktiv i et miljø, kan elevdata fortsat slettes manuelt via platformens funktioner.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Materialer">
        <p>
          Uploadede materialer er private og kan være PDF, PPTX, DOCX, PNG, JPG eller WEBP. Adgang
          til en fil gives via en midlertidig signed URL. Filer uploades ikke automatisk til en
          AI-tjeneste.
        </p>
      </LegalSection>

      <LegalSection number={7} title="ChatGPT og AI">
        <p>
          Didaktiva bruger ikke OpenAI API eller Lovable AI som runtime i den nuværende version.
          Elevdata sendes ikke automatisk til ChatGPT, og materialefiler uploades ikke automatisk
          til ChatGPT.
        </p>
        <p>
          Læreren vælger selv, om en klargjort tekst kopieres, eller om en fil vedhæftes i en
          ekstern AI-tjeneste. Brug af en ekstern AI-tjeneste følger den pågældende tjenestes egne
          vilkår og privatlivspraksis.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Cookies og browserlagring">
        <p>
          Didaktiva bruger browserlagring til lærer-auth, session-specifikke participant tokens,
          designpræference og enkelte timer-/UI-statusser. Der bruges ikke analytics- eller
          marketingcookies i den nuværende version.
        </p>
        <p>
          Se den samlede beskrivelse i{" "}
          <Link className="text-primary underline" to="/cookies">
            cookiepolitikken
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection number={9} title="Tjenesteudbydere">
        <p>Didaktiva bruger eller kan bruge følgende tekniske tjenester:</p>
        <List>
          <li>Supabase til database, autentificering og fillagring</li>
          <li>Lovable til udvikling og publicering af applikationen</li>
          <li>Cloudflare som del af levering og drift af webapplikationen</li>
          <li>Google, når læreren aktivt vælger Google-login</li>
          <li>YouTube eller eksterne links, når en lærer har indsat det relevante indhold</li>
        </List>
        <p>
          Didaktiva self-hoster sine skrifttyper og sender derfor ikke automatisk alle besøgende til
          Google Fonts.
        </p>
      </LegalSection>

      <LegalSection number={10} title="Sikkerhed">
        <p>
          Lærerdata er knyttet til lærerens ejerskab og beskyttes med adgangspolitikker, herunder
          row-level security, hvor det er relevant. Elevflows går gennem serverfunktioner med
          session- og tokenvalidering. Følsomme servernøgler er ikke tiltænkt browseren.
        </p>
        <p>
          Ingen digital tjeneste kan love fuldstændig sikkerhed, men dataminimering og
          adgangskontrol indgår i platformens opbygning.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Dine rettigheder">
        <p>
          Afhængigt af situationen kan du have ret til indsigt, rettelse, sletning, begrænsning,
          indsigelse og dataportabilitet, hvor det er relevant. Skriv til{" "}
          <a className="text-primary underline" href="mailto:kontakt@didaktiva.dk">
            kontakt@didaktiva.dk
          </a>{" "}
          for at gøre brug af en rettighed eller stille spørgsmål.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Klage">
        <p>
          Hvis du er utilfreds med behandlingen af personoplysninger, kan du kontakte Didaktiva. Du
          kan også klage til Datatilsynet.
        </p>
      </LegalSection>

      <LegalSection number={13} title="Børn og unge">
        <p>
          Elevflowet er bygget med dataminimering: ingen elevkonto, ingen e-mail, intet krav om
          rigtigt navn, et automatisk alias og et session-specifikt token. Læreren bør tilrettelægge
          spørgsmål, så elever ikke bliver bedt om at dele unødvendige personoplysninger.
        </p>
      </LegalSection>

      <LegalSection number={14} title="Ændringer">
        <p>
          Privatlivspolitikken kan blive opdateret, når produktet eller den faktiske datahåndtering
          ændres. Den gældende version og opdateringsdato vil fremgå på denne side.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
