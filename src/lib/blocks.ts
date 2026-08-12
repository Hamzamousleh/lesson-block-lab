export type BlockFieldKind = "text" | "textarea" | "list" | "number" | "switch";

export interface BlockField {
  key: string;
  label: string;
  kind: BlockFieldKind;
  placeholder?: string;
  itemLabel?: string;
}

export type BlockGroupKey = "formidling" | "analyse" | "diskussion" | "interaktion" | "afrunding";

export interface BlockTypeDef {
  type: string;
  label: string;
  group: BlockGroupKey;
  description: string;
  icon: string;
  defaultDuration: number;
  defaultContent: Record<string, unknown>;
  fields: BlockField[];
}

export const BLOCK_GROUPS: { key: BlockGroupKey; label: string }[] = [
  { key: "formidling", label: "Formidling" },
  { key: "analyse", label: "Analyse" },
  { key: "diskussion", label: "Diskussion" },
  { key: "interaktion", label: "Interaktion" },
  { key: "afrunding", label: "Afrunding" },
];

export const BLOCK_TYPES: BlockTypeDef[] = [
  {
    type: "teacher_content",
    label: "Lærerinput",
    group: "formidling",
    description: "Præsentér det faglige stof for klassen.",
    icon: "📘",
    defaultDuration: 12,
    defaultContent: { body: "" },
    fields: [{ key: "body", label: "Indhold", kind: "textarea", placeholder: "Skriv dit lærerinput …" }],
  },
  {
    type: "narrative",
    label: "Fortælling",
    group: "formidling",
    description: "Fang klassen med en fortælling eller et eksempel.",
    icon: "📖",
    defaultDuration: 8,
    defaultContent: { text: "" },
    fields: [{ key: "text", label: "Fortælling", kind: "textarea", placeholder: "Fortællingen …" }],
  },
  {
    type: "case",
    label: "Case",
    group: "analyse",
    description: "Lad eleverne anvende stoffet på en konkret situation.",
    icon: "🧩",
    defaultDuration: 20,
    defaultContent: { scenario: "", questions: [""] },
    fields: [
      { key: "scenario", label: "Scenarie", kind: "textarea", placeholder: "Beskriv situationen …" },
      { key: "questions", label: "Spørgsmål", kind: "list", itemLabel: "Spørgsmål" },
    ],
  },
  {
    type: "theory_test",
    label: "Test teorien",
    group: "analyse",
    description: "Lad eleverne anvende en teori på en ny situation.",
    icon: "🔬",
    defaultDuration: 15,
    defaultContent: { theory: "", scenario: "", question: "", options: ["", ""], follow_up_questions: [""] },
    fields: [
      { key: "theory", label: "Teori", kind: "text", placeholder: "Fx Aschs konformitetsforsøg" },
      { key: "scenario", label: "Situation", kind: "textarea" },
      { key: "question", label: "Spørgsmål", kind: "text" },
      { key: "options", label: "Svarmuligheder", kind: "list", itemLabel: "Svarmulighed" },
      { key: "correct_option_index", label: "Korrekt svarmulighed (0 = første)", kind: "number" },
      { key: "follow_up_questions", label: "Opfølgende spørgsmål", kind: "list", itemLabel: "Spørgsmål" },
    ],
  },
  {
    type: "compare",
    label: "Sammenlign",
    group: "analyse",
    description: "Stil to begreber, cases eller teorier over for hinanden.",
    icon: "⚖️",
    defaultDuration: 15,
    defaultContent: { item_a: "", item_b: "", questions: [""] },
    fields: [
      { key: "item_a", label: "A", kind: "text" },
      { key: "item_b", label: "B", kind: "text" },
      { key: "questions", label: "Spørgsmål", kind: "list", itemLabel: "Spørgsmål" },
    ],
  },
  {
    type: "find_the_error",
    label: "Find fejlen",
    group: "analyse",
    description: "Eleverne finder de faglige fejl i et materiale.",
    icon: "🔍",
    defaultDuration: 12,
    defaultContent: { material: "", errors_to_find: 3, follow_up_question: "" },
    fields: [
      { key: "material", label: "Materiale", kind: "textarea" },
      { key: "errors_to_find", label: "Antal fejl", kind: "number" },
      { key: "follow_up_question", label: "Opfølgende spørgsmål", kind: "text" },
    ],
  },
  {
    type: "discussion",
    label: "Diskussion",
    group: "diskussion",
    description: "Sæt gang i en faglig samtale i klassen.",
    icon: "💬",
    defaultDuration: 15,
    defaultContent: { prompt: "", follow_up_questions: [""] },
    fields: [
      { key: "prompt", label: "Oplæg", kind: "textarea" },
      { key: "follow_up_questions", label: "Opfølgende spørgsmål", kind: "list", itemLabel: "Spørgsmål" },
    ],
  },
  {
    type: "dilemma",
    label: "Dilemma",
    group: "diskussion",
    description: "Lad eleverne tage stilling og begrunde deres valg.",
    icon: "⚡",
    defaultDuration: 10,
    defaultContent: { scenario: "", question: "", options: ["", ""], require_justification: true },
    fields: [
      { key: "scenario", label: "Scenarie", kind: "textarea" },
      { key: "question", label: "Spørgsmål", kind: "text" },
      { key: "options", label: "Valgmuligheder", kind: "list", itemLabel: "Valgmulighed" },
      { key: "require_justification", label: "Kræv begrundelse", kind: "switch" },
    ],
  },
  {
    type: "position",
    label: "Tag stilling",
    group: "diskussion",
    description: "Eleverne placerer sig på en holdningsakse.",
    icon: "🧭",
    defaultDuration: 10,
    defaultContent: {
      statement: "",
      left_label: "Helt uenig",
      right_label: "Helt enig",
      follow_up_question: "",
    },
    fields: [
      { key: "statement", label: "Udsagn", kind: "textarea" },
      { key: "left_label", label: "Venstre label", kind: "text" },
      { key: "right_label", label: "Højre label", kind: "text" },
      { key: "follow_up_question", label: "Opfølgende spørgsmål", kind: "text" },
    ],
  },
  {
    type: "poll",
    label: "Afstemning",
    group: "interaktion",
    description: "Tag temperaturen på klassen med et hurtigt valg.",
    icon: "📊",
    defaultDuration: 5,
    defaultContent: { question: "", options: ["", ""] },
    fields: [
      { key: "question", label: "Spørgsmål", kind: "text" },
      { key: "options", label: "Svarmuligheder", kind: "list", itemLabel: "Svarmulighed" },
      { key: "correct_option_index", label: "Korrekt svarmulighed (0 = første, lad stå tom hvis intet facit)", kind: "number" },
    ],
  },
  {
    type: "ranking",
    label: "Rangering",
    group: "interaktion",
    description: "Eleverne prioriterer og begrunder rækkefølgen.",
    icon: "🔢",
    defaultDuration: 10,
    defaultContent: { question: "", items: ["", ""] },
    fields: [
      { key: "question", label: "Spørgsmål", kind: "text" },
      { key: "items", label: "Elementer", kind: "list", itemLabel: "Element" },
    ],
  },
  {
    type: "scale",
    label: "Skala",
    group: "interaktion",
    description: "Lad eleverne vurdere noget på en skala.",
    icon: "📈",
    defaultDuration: 5,
    defaultContent: { question: "", min: 1, max: 7, left_label: "", right_label: "" },
    fields: [
      { key: "question", label: "Spørgsmål", kind: "text" },
      { key: "min", label: "Minimum", kind: "number" },
      { key: "max", label: "Maksimum", kind: "number" },
      { key: "left_label", label: "Venstre label", kind: "text" },
      { key: "right_label", label: "Højre label", kind: "text" },
    ],
  },
  {
    type: "short_response",
    label: "Kort svar",
    group: "interaktion",
    description: "Eleverne formulerer et kort skriftligt svar.",
    icon: "✏️",
    defaultDuration: 8,
    defaultContent: { question: "", placeholder: "" },
    fields: [
      { key: "question", label: "Spørgsmål", kind: "text" },
      { key: "placeholder", label: "Hjælpetekst", kind: "text" },
    ],
  },
  {
    type: "exit_ticket",
    label: "Exit ticket",
    group: "afrunding",
    description: "Saml op på timen og tjek elevernes udbytte.",
    icon: "🎫",
    defaultDuration: 5,
    defaultContent: { questions: [""] },
    fields: [{ key: "questions", label: "Spørgsmål", kind: "list", itemLabel: "Spørgsmål" }],
  },
];

export const BLOCK_TYPE_MAP: Record<string, BlockTypeDef> = Object.fromEntries(
  BLOCK_TYPES.map((b) => [b.type, b]),
);

export function blockDef(type: string): BlockTypeDef {
  return (
    BLOCK_TYPE_MAP[type] ?? {
      type,
      label: type,
      group: "formidling",
      description: "",
      icon: "▫️",
      defaultDuration: 10,
      defaultContent: {},
      fields: [],
    }
  );
}

export function formatMinutes(total: number): string {
  return String(total).padStart(2, "0");
}
