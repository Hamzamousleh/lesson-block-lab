import type { StateDraft, WorldType } from "./worlds";

/* Structure-only starter templates. They never contain content —
 * only sensible, academically meaningful state suggestions. */

export interface WorldTemplate {
  key: string;
  world_type: WorldType;
  label: string;
  subject: string;
  description: string;
  example: string;
  state: StateDraft[];
}

const num = (
  state_key: string,
  label: string,
  value: number,
  description: string,
  student_visible = true,
): StateDraft => ({
  state_key,
  label,
  value,
  value_type: "number",
  min_value: 0,
  max_value: 100,
  description,
  student_visible,
});

export const WORLD_TEMPLATES: WorldTemplate[] = [
  {
    key: "psychology_people",
    world_type: "people",
    label: "Psykologi — Personunivers",
    subject: "Psykologi",
    description: "En fast gruppe personer, som eleverne møder igen og igen.",
    example: "NOVA — en gruppe unge og voksne, hvis relationer udvikler sig over tid.",
    state: [
      num("group_trust", "Gruppetillid", 65, "Hvor meget personerne stoler på hinanden."),
      num("stress_level", "Stressniveau", 40, "Det samlede pres i gruppen."),
      num("relationship_quality", "Relationskvalitet", 60, "Kvaliteten af de nære relationer."),
      num("identity_conflict", "Identitetskonflikt", 45, "Graden af indre konflikt om identitet.", false),
    ],
  },
  {
    key: "social_studies_country",
    world_type: "society",
    label: "Samfundsfag — Land",
    subject: "Samfundsfag",
    description: "Et fiktivt demokratisk land med politiske og økonomiske spændinger.",
    example: "Nordania — et land, hvor eleverne træffer politiske beslutninger med konsekvenser.",
    state: [
      num("public_trust", "Offentlig tillid", 55, "Befolkningens tillid til institutionerne."),
      num("economic_pressure", "Budgetpres", 60, "Presset på de offentlige finanser."),
      num("inequality", "Ulighed", 45, "Forskellen mellem befolkningsgrupper."),
      num("government_support", "Regeringens opbakning", 52, "Opbakningen til den siddende regering."),
      {
        state_key: "international_position",
        label: "International position",
        value: "stabil",
        value_type: "enum",
        enum_options: ["svækket", "stabil", "styrket"],
        description: "Landets stilling i det internationale samarbejde.",
        student_visible: true,
      },
    ],
  },
  {
    key: "organization_company",
    world_type: "organization",
    label: "Organisation — Virksomhed",
    subject: "Virksomhedsøkonomi",
    description: "En fiktiv virksomhed med ledelse, kultur og forandring.",
    example: "Northstar Group — en virksomhed under omstrukturering.",
    state: [
      num("employee_trust", "Medarbejdertillid", 50, "Tilliden til ledelsen."),
      num("motivation", "Motivation", 60, "Medarbejdernes motivation."),
      num("conflict_level", "Konfliktniveau", 35, "Omfanget af interne konflikter."),
      num("performance", "Performance", 55, "Organisationens resultater."),
      num("turnover_risk", "Risiko for opsigelser", 45, "Risikoen for at medarbejdere forlader virksomheden.", false),
    ],
  },
  {
    key: "blank",
    world_type: "other",
    label: "Tomt World",
    subject: "",
    description: "Start fra bunden og definér selv 4–8 variabler.",
    example: "",
    state: [],
  },
];

export function templateFor(key: string): WorldTemplate | undefined {
  return WORLD_TEMPLATES.find((t) => t.key === key);
}
