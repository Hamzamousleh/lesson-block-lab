import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/public/PublicLayout";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookiepolitik | Didaktiva" },
      {
        name: "description",
        content: "Læs om cookies og browserlagring i Didaktiva.",
      },
      { property: "og:title", content: "Cookiepolitik | Didaktiva" },
      {
        property: "og:description",
        content: "Teknisk nødvendige cookies og browserlagring i Didaktiva.",
      },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPage
      title="Cookiepolitik for Didaktiva"
      description="Didaktiva bruger i den nuværende version kun teknisk nødvendige og funktionelle teknologier."
    >
      <LegalSection number={1} title="Teknisk nødvendige og funktionelle teknologier">
        <p>
          Cookies og browserlagring bruges til at få login, navigation og elevdeltagelse til at
          fungere. De bruges ikke til annoncering eller til at opbygge marketingprofiler.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Cookien sidebar_state">
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-secondary/70">
              <tr>
                <th className="px-4 py-3 font-semibold">Navn</th>
                <th className="px-4 py-3 font-semibold">Formål</th>
                <th className="px-4 py-3 font-semibold">Varighed</th>
                <th className="px-4 py-3 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 font-mono text-sm">sidebar_state</td>
                <td className="px-4 py-3">Husker om sidepanelet er åbent eller lukket</td>
                <td className="px-4 py-3">Op til 7 dage</td>
                <td className="px-4 py-3">Funktionel/teknisk</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection number={3} title="localStorage">
        <p>Browserens localStorage kan indeholde:</p>
        <ul className="ml-5 list-disc space-y-2 marker:text-primary">
          <li>Supabase auth-session, så læreren kan forblive logget ind</li>
          <li>participant token, så eleven kan genoptage en bestemt session</li>
          <li>
            <span className="font-mono text-sm">didaktiva_design</span>, som husker
            designpræferencen
          </li>
          <li>
            Cockpit timer- eller UI-status, som understøtter den aktuelle undervisningsvisning
          </li>
        </ul>
        <p>
          Hvis disse data slettes, kan læreren blive logget ud, eleven kan miste muligheden for at
          genoptage sin deltagelse, og lokale visningsindstillinger kan blive nulstillet.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Ingen tracking">
        <p>
          Den nuværende version bruger ikke Google Analytics, Google Tag Manager, Meta Pixel,
          Hotjar, PostHog, Microsoft Clarity eller andre analytics- eller marketing-SDK&apos;er.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Tredjepartstjenester">
        <p>
          Supabase understøtter autentificering og platformens tekniske funktioner. Google-login
          aktiveres kun, når læreren selv vælger det. YouTube indlæses kun i forbindelse med en
          lærerindsat YouTube-ressource. Eksterne links kan føre til andre tjenester med egne vilkår
          og cookiepraksis.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Skrifttyper">
        <p>
          Didaktivas skrifttyper er self-hosted. Der foretages derfor ikke en automatisk Google
          Fonts-runtime request, når en side åbnes.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Cookiebanner">
        <p>
          Der vises som udgangspunkt ikke et traditionelt cookie-samtykkebanner, fordi den nuværende
          version ikke bruger ikke-nødvendige analytics- eller marketingcookies. Hvis den faktiske
          brug ændres, skal denne praksis og informationen på siden vurderes igen.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Sådan rydder du browserdata">
        <p>
          Du kan rydde cookies og webstedsdata i din browsers indstillinger. Det kan logge dig ud,
          nulstille visningspræferencer og fjerne elevens lokale adgang til at genoptage en session.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Ændringer">
        <p>
          Cookiepolitikken opdateres, hvis Didaktiva begynder at bruge andre cookies eller
          browserteknologier. Den aktuelle opdateringsdato står øverst på siden.
        </p>
      </LegalSection>

      <LegalSection number={10} title="Kontakt">
        <p>
          Spørgsmål kan sendes til{" "}
          <a className="text-primary underline" href="mailto:kontakt@didaktiva.dk">
            kontakt@didaktiva.dk
          </a>
          . Du kan også besøge{" "}
          <a className="text-primary underline" href="https://didaktiva.dk">
            https://didaktiva.dk
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
