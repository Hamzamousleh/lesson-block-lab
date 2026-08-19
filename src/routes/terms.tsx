import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/public/PublicLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Vilkår for brug | Didaktiva" },
      { name: "description", content: "Læs vilkårene for brug af Didaktiva." },
      { property: "og:title", content: "Vilkår for brug | Didaktiva" },
      {
        property: "og:description",
        content: "Rammerne for lærer- og elevbrug af Didaktiva.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Vilkår for brug af Didaktiva"
      description="Vilkårene beskriver rammerne for at bruge Didaktiva som lærer eller elevdeltager."
    >
      <LegalSection number={1} title="Om Didaktiva">
        <p>
          Didaktiva er en digital undervisningsplatform, der hjælper lærere med at planlægge,
          strukturere, gennemføre og genbruge aktiv undervisning.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Hvem kan bruge Didaktiva?">
        <p>
          Lærere bruger Didaktiva med en lærerkonto. Elever deltager via en sessionskode og et
          automatisk alias uden at oprette en konto.
        </p>
      </LegalSection>

      <LegalSection number={3} title="Lærerkonto">
        <p>
          Læreren er ansvarlig for at give korrekte kontooplysninger, beskytte sin adgangskode og
          reagere, hvis kontoen mistænkes for at være kompromitteret. En konto må ikke deles på en
          måde, der giver uvedkommende adgang til undervisnings- eller elevdata.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Brug i undervisningen">
        <p>
          Didaktiva støtter lærerens arbejde, men erstatter ikke lærerens faglige, didaktiske eller
          pædagogiske vurdering. Læreren er ansvarlig for at gennemgå og tilpasse indhold, før det
          bruges i undervisningen.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Elevdeltagelse">
        <p>
          Eleven behøver ikke en konto og skal ikke oplyse sit rigtige navn. Læreren bør ikke bede
          elever om at skrive CPR-nummer, passwords, helbredsoplysninger, diagnoser eller andre
          unødvendige følsomme oplysninger i elevsvar.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Upload af materialer">
        <p>
          Læreren er ansvarlig for at have de nødvendige rettigheder til uploadet materiale.
          Ulovligt indhold, malware eller indhold, der krænker andres rettigheder, må ikke uploades.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Dit indhold">
        <p>
          Læreren beholder som udgangspunkt rettighederne til sit eget indhold. Didaktiva får alene
          den tekniske adgang, der er nødvendig for at lagre, behandle og vise indholdet som led i
          leveringen af tjenesten.
        </p>
      </LegalSection>

      <LegalSection number={8} title="ChatGPT og eksterne AI-tjenester">
        <p>
          Didaktiva overfører ikke automatisk elevdata eller filer til en AI-tjeneste. Læreren
          vælger selv, om klargjort indhold kopieres, eller materialer vedhæftes i en ekstern
          tjeneste. AI-genereret output bør altid gennemgås fagligt, før det bruges i
          undervisningen.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Forbudt brug">
        <p>Didaktiva må ikke bruges til:</p>
        <ul className="ml-5 list-disc space-y-2 marker:text-primary">
          <li>ulovlige formål eller rettighedskrænkelser</li>
          <li>uautoriseret adgang til konti, data eller systemer</li>
          <li>angreb, automatiseret misbrug eller omgåelse af sikkerhedsforanstaltninger</li>
          <li>distribution af malware eller skadeligt indhold</li>
          <li>at forstyrre platformens drift eller andre brugeres adgang</li>
        </ul>
      </LegalSection>

      <LegalSection number={10} title="Drift og tilgængelighed">
        <p>
          Didaktiva er under udvikling. Der kan forekomme vedligeholdelse, ændringer og fejl, og der
          gives ikke garanti for konstant eller fejlfri tilgængelighed. Vigtige undervisningsplaner
          bør derfor ikke være afhængige af én enkelt teknisk adgangsvej.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Ændringer i platformen">
        <p>
          Funktioner kan blive justeret, forbedret eller udfaset som led i produktets udvikling.
          Væsentlige ændringer søges kommunikeret på en rimelig og tydelig måde.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Betaling">
        <p>Didaktiva tilbydes i den nuværende version som en gratis pilotversion.</p>
        <p>
          Hvis der senere introduceres abonnementer eller andre betalingsprodukter, vil priser,
          betalingsbetingelser, opsigelse og eventuelle relevante rettigheder fremgå tydeligt, før
          brugeren indgår en betalingsaftale.
        </p>
        <p>
          Ingen bruger bliver betalingspligtig alene ved at have oprettet en konto i den nuværende
          gratis pilotversion.
        </p>
      </LegalSection>

      <LegalSection number={13} title="Kontosletning">
        <p>
          En lærer kan slette sin konto permanent. Kontosletning kan omfatte profil, klasser,
          forløb, lektioner, aktiviteter, lærerens noter, materialer, Worlds, sessioner og
          relaterede data. Læreren kan eksportere egne data, før kontoen slettes.
        </p>
      </LegalSection>

      <LegalSection number={14} title="Suspension og ophør">
        <p>
          Adgang kan begrænses eller ophøre ved væsentligt misbrug, sikkerhedsrisiko, ulovlig brug
          eller gentagne brud på vilkårene. Hvor det er praktisk og forsvarligt, søges brugeren
          informeret om årsagen.
        </p>
      </LegalSection>

      <LegalSection number={15} title="Ansvarsbegrænsning">
        <p>
          Didaktiva leveres som et arbejdsredskab under udvikling. Didaktiva er ikke ansvarlig for
          lærerens faglige valg, ekstern AI-output eller indhold på eksterne tjenester. Eventuelt
          ansvar vurderes efter gældende ret og de konkrete omstændigheder.
        </p>
        <p>Intet i disse vilkår begrænser rettigheder, som ikke lovligt kan fraviges.</p>
      </LegalSection>

      <LegalSection number={16} title="Eksterne tjenester og links">
        <p>
          Platformen kan indeholde links eller integrationer til eksterne tjenester. Disse tjenester
          har egne vilkår, data- og sikkerhedspraksisser, som Didaktiva ikke kontrollerer.
        </p>
      </LegalSection>

      <LegalSection number={17} title="Privatliv og cookies">
        <p>
          Læs{" "}
          <Link className="text-primary underline" to="/privacy">
            privatlivspolitikken
          </Link>{" "}
          og{" "}
          <Link className="text-primary underline" to="/cookies">
            cookiepolitikken
          </Link>{" "}
          for information om data og browserlagring.
        </p>
      </LegalSection>

      <LegalSection number={18} title="Ændringer i vilkårene">
        <p>
          Vilkårene kan blive opdateret, når platformen eller brugsvilkårene ændres. Den gældende
          version og dato fremgår på denne side.
        </p>
      </LegalSection>

      <LegalSection number={19} title="Lovvalg">
        <p>Vilkårene er underlagt dansk ret.</p>
      </LegalSection>

      <LegalSection number={20} title="Kontakt">
        <p>
          Kontakt Didaktiva på{" "}
          <a className="text-primary underline" href="mailto:kontakt@didaktiva.dk">
            kontakt@didaktiva.dk
          </a>{" "}
          eller via{" "}
          <a className="text-primary underline" href="https://didaktiva.dk">
            https://didaktiva.dk
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
