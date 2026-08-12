import { BLOCK_TYPES } from "./blocks";

const TYPE_LIST = BLOCK_TYPES.map((b) => b.type).join(", ");

const SCHEMA_REFERENCE = `teacher_content: { "body": "..." }
narrative: { "text": "..." }
case: { "scenario": "...", "questions": ["...", "..."] }
theory_test: { "theory": "...", "scenario": "...", "question": "...", "options": ["...", "..."], "follow_up_questions": ["...", "..."] }
compare: { "item_a": "...", "item_b": "...", "questions": ["...", "..."] }
find_the_error: { "material": "...", "errors_to_find": 3, "follow_up_question": "..." }
discussion: { "prompt": "...", "follow_up_questions": ["...", "..."] }
dilemma: { "scenario": "...", "question": "...", "options": ["...", "..."], "require_justification": true }
position: { "statement": "...", "left_label": "Helt uenig", "right_label": "Helt enig", "follow_up_question": "..." }
poll: { "question": "...", "options": ["...", "..."] }
ranking: { "question": "...", "items": ["...", "..."] }
scale: { "question": "...", "min": 1, "max": 7, "left_label": "...", "right_label": "..." }
short_response: { "question": "...", "placeholder": "..." }
exit_ticket: { "questions": ["...", "..."] }`;

const COMMON = `Du genererer struktureret undervisningsindhold til CaseLab.

Returnér KUN ét gyldigt JSON-objekt. Ingen markdown-fences, ingen forklaring før eller efter.

Regler:
- "caselab_version" skal være "2.0".
- Brug kun disse aktivitetstyper: ${TYPE_LIST}.
- Følg de præcise indholdsskemaer for hver type.
- Hver aktivitet har felterne: type, title, duration_minutes, student_instructions, teacher_notes, content.
- Undervisningen er til dansk gymnasieundervisning (stx/hhx/htx).
- Skriv på dansk, medmindre andet er angivet.

Prioritér:
- høj elevaktivitet
- klare lærerinstruktioner
- realistisk timing
- teorianvendelse
- variation
- anvendelighed i klasserummet

Undgå:
- unødvendig forberedelse
- vage generiske aktiviteter
- aktiviteter der kræver ukendte eksterne ressourcer
- ikke-understøttede aktivitetstyper

Indholdsskemaer:
${SCHEMA_REFERENCE}`;

function materialSection(material: string): string {
  if (!material.trim()) return "";
  return `

Fagligt materiale (primær faglig kilde):
"""
${material.trim()}
"""
Behandl det leverede materiale som den primære faglige kilde. Brug dets terminologi, hvor det er relevant. Opfind ikke faglige påstande, der ikke er dækket. Du må gerne opdigte eksempler, cases og scenarier.`;
}

export interface LessonPromptInput {
  className?: string | undefined;
  subject?: string | undefined;
  unitTitle?: string | undefined;
  topic: string;
  duration: number;
  learningGoal?: string | undefined;
  priorKnowledge?: string | undefined;
  feels: string[];
  material: string;
}

export function buildLessonPrompt(i: LessonPromptInput): string {
  const lines = [
    i.className ? `Klasse: ${i.className}` : null,
    i.subject ? `Fag: ${i.subject}` : null,
    i.unitTitle ? `Forløb: ${i.unitTitle}` : null,
    `Emne: ${i.topic}`,
    `Varighed: ${i.duration} minutter`,
    i.learningGoal ? `Læringsmål: ${i.learningGoal}` : null,
    i.priorKnowledge ? `Elevernes forudsætninger: ${i.priorKnowledge}` : null,
    i.feels.length ? `Undervisningen skal føles: ${i.feels.join(", ")}` : null,
  ].filter(Boolean);

  return `${COMMON}

Opgave: Lav én samlet lektion.

${lines.join("\n")}${materialSection(i.material)}

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "lesson",
  "mode": "standard",
  "lesson": {
    "title": "...",
    "subject": "...",
    "duration_minutes": ${i.duration},
    "learning_goal": "...",
    "teacher_note": "...",
    "tags": ["..."],
    "blocks": [ ... ]
  }
}

Summen af aktiviteternes duration_minutes skal ramme ${i.duration} minutter ±5 minutter.
Brug varierede aktivitetstyper, hvor det giver pædagogisk mening. Tving ikke alle typer ind i lektionen.`;
}

export interface BlocksPromptInput {
  lessonTitle?: string | undefined;
  topic: string;
  minutes: number;
  needs: string[];
  material: string;
}

export function buildBlocksPrompt(i: BlocksPromptInput): string {
  const lines = [
    i.lessonTitle ? `Eksisterende lektion: ${i.lessonTitle}` : null,
    `Emne: ${i.topic}`,
    `Aktiviteterne skal fylde ca. ${i.minutes} minutter`,
    i.needs.length ? `Behov: ${i.needs.join(", ")}` : null,
  ].filter(Boolean);

  return `${COMMON}

Opgave: Lav en eller flere aktiviteter, der kan indsættes i en eksisterende lektion.

${lines.join("\n")}${materialSection(i.material)}

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "blocks",
  "blocks": [ ... ]
}

Summen af aktiviteternes duration_minutes skal ramme ca. ${i.minutes} minutter.`;
}

export function lessonToText(
  lesson: { title: string; subject?: string | null; duration_minutes: number; learning_goal?: string | null },
  blocks: { type: string; title: string; duration_minutes: number }[],
): string {
  const head = [
    `Lektion: ${lesson.title}`,
    lesson.subject ? `Fag: ${lesson.subject}` : null,
    `Varighed: ${lesson.duration_minutes} min`,
    lesson.learning_goal ? `Læringsmål: ${lesson.learning_goal}` : null,
  ].filter(Boolean);
  const body = blocks.map(
    (b, i) => `${String(i + 1).padStart(2, "0")}. [${b.type}] ${b.title} — ${b.duration_minutes} min`,
  );
  return `${head.join("\n")}\n\nAktiviteter:\n${body.join("\n")}`;
}

/* ---------------- Phase 3 prompt builders ---------------- */

export interface RescuePromptInput {
  className?: string | undefined;
  subject?: string | undefined;
  topic: string;
  duration: number;
  priorKnowledge?: string | undefined;
  material: string;
}

export function buildRescuePrompt(i: RescuePromptInput): string {
  const lines = [
    i.className ? `Klasse: ${i.className}` : null,
    i.subject ? `Fag: ${i.subject}` : null,
    `Emne: ${i.topic}`,
    `Varighed: ${i.duration} minutter`,
    i.priorKnowledge ? `Elevernes forudsætninger: ${i.priorKnowledge}` : null,
  ].filter(Boolean);

  return `${COMMON}

Opgave: Lav én nødlektion ("rescue"). Læreren har meget lidt tid til forberedelse og skal kunne undervise umiddelbart efter import.

${lines.join("\n")}${materialSection(i.material)}

Lektionen SKAL:
- kunne gennemføres stort set uden forberedelse
- ikke kræve print eller kopier
- ikke kræve ukendte eksterne hjemmesider eller apps
- fungere med projektor, tavle og elevernes egne noter
- have korte, konkrete lærerinstruktioner i teacher_notes
- prioritere elevaktivitet frem for langt lærerinput
- bruge varierede metoder
- have realistisk timing
- indeholde mindst én ekstra reserveaktivitet i "fallback_blocks"

Læreren må ikke skulle læse flere sider, før timen kan starte. Hold teacher_notes korte og praktiske (maks. 2 sætninger pr. aktivitet).

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "lesson",
  "mode": "rescue",
  "lesson": {
    "title": "...",
    "subject": "...",
    "duration_minutes": ${i.duration},
    "learning_goal": "...",
    "teacher_note": "...",
    "tags": ["..."],
    "blocks": [ ... ],
    "fallback_blocks": [ ... ]
  }
}

Summen af "blocks" skal ramme ${i.duration} minutter ±5 minutter. "fallback_blocks" tæller IKKE med i lektionens varighed og bruges kun, hvis der bliver tid tilovers.`;
}

export interface ExtraTimePromptInput {
  className?: string | undefined;
  subject?: string | undefined;
  lessonTitle?: string | undefined;
  learningGoal?: string | undefined;
  blockSummary?: string | undefined;
  topic?: string | undefined;
  minutes: number;
  want: string;
}

export function buildExtraTimePrompt(i: ExtraTimePromptInput): string {
  const lines = [
    i.className ? `Klasse: ${i.className}` : null,
    i.subject ? `Fag: ${i.subject}` : null,
    i.lessonTitle ? `Lektion: ${i.lessonTitle}` : null,
    i.learningGoal ? `Læringsmål: ${i.learningGoal}` : null,
    i.topic ? `Emne: ${i.topic}` : null,
    `Der mangler ca. ${i.minutes} minutters undervisning`,
    `Ønske: ${i.want}`,
  ].filter(Boolean);

  const summary = i.blockSummary
    ? `

Lektionens nuværende aktiviteter:
${i.blockSummary}`
    : "";

  return `${COMMON}

Opgave: Lav en eller flere aktiviteter, som læreren kan indsætte i en eksisterende lektion, fordi der er ${i.minutes} minutter tilovers.

${lines.join("\n")}${summary}${materialSection("")}

Aktiviteterne skal kunne gennemføres uden forberedelse og uden print. Undgå at gentage aktiviteter, der allerede findes i lektionen.

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "blocks",
  "blocks": [ ... ]
}

Summen af aktiviteternes duration_minutes skal ramme ca. ${i.minutes} minutter.`;
}

export interface ImprovePromptInput {
  className?: string | undefined;
  subject?: string | undefined;
  lessonTitle: string;
  duration: number;
  learningGoal?: string | undefined;
  blockDetail: string;
  wishes: string[];
  freeText: string;
}

export function buildImprovePrompt(i: ImprovePromptInput): string {
  const lines = [
    i.className ? `Klasse: ${i.className}` : null,
    i.subject ? `Fag: ${i.subject}` : null,
    `Lektion: ${i.lessonTitle}`,
    `Varighed: ${i.duration} minutter`,
    i.learningGoal ? `Læringsmål: ${i.learningGoal}` : null,
    i.wishes.length ? `Ønskede forbedringer: ${i.wishes.join(", ")}` : null,
    i.freeText.trim() ? `Lærerens egne ønsker: ${i.freeText.trim()}` : null,
  ].filter(Boolean);

  return `${COMMON}

Opgave: Forbedr en eksisterende lektion. Omskriv IKKE hele lektionen unødigt. Returnér i stedet nye eller erstattende aktiviteter, som læreren selv kan indsætte.

${lines.join("\n")}

Lektionens nuværende aktiviteter:
${i.blockDetail}

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "blocks",
  "placement_suggestion": {
    "action": "insert_after",
    "after_block_title": "titlen på den aktivitet, de nye aktiviteter skal ligge efter",
    "teacher_message": "kort forklaring til læreren om placering og eventuelle forkortelser"
  },
  "blocks": [ ... ]
}

"teacher_message" er den eneste plads til rådgivning til læreren — skriv ingen tekst uden for JSON. Foreslå gerne, at eksisterende aktiviteter forkortes, men slet eller erstat dem ikke selv.`;
}

export function lessonToDetailedText(
  blocks: { type: string; title: string; duration_minutes: number; content: Record<string, unknown> }[],
): string {
  return blocks
    .map((b, i) => {
      const summary = JSON.stringify(b.content ?? {}).slice(0, 400);
      return `${String(i + 1).padStart(2, "0")}. [${b.type}] ${b.title} — ${b.duration_minutes} min\n    ${summary}`;
    })
    .join("\n");
}

export interface MaterialPromptInput {
  className?: string | undefined;
  subject?: string | undefined;
  material: string;
  materialKind: string;
  purpose: string;
  duration: number;
  outputType: "lesson" | "blocks";
  feels: string[];
}

export function buildMaterialPrompt(i: MaterialPromptInput): string {
  const ctx = [
    i.className ? `Klasse: ${i.className}` : "",
    i.subject ? `Fag: ${i.subject}` : "",
    `Materialetype: ${i.materialKind}`,
    `Formål: ${i.purpose}`,
    `Varighed: ${i.duration} minutter`,
    i.feels.length ? `Ønsket karakter: ${i.feels.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const pkg =
    i.outputType === "lesson"
      ? `{
  "caselab_version": "2.0",
  "type": "lesson",
  "lesson": { "title": "...", "subject": "...", "duration_minutes": ${i.duration}, "learning_goal": "...", "teacher_note": "..." },
  "blocks": [ ... ]
}`
      : `{
  "caselab_version": "2.0",
  "type": "blocks",
  "blocks": [ ... ]
}`;

  return `${COMMON}

Opgave: Omsæt lærerens eget materiale til undervisning, eleverne kan arbejde med.

${ctx}
${materialSection(i.material)}

Krav:
- Brug materialet som eneste faglige kilde.
- Sørg for, at eleverne bearbejder materialet aktivt — ikke bare læser det.
- Fordel tiden, så den samlede varighed rammer ca. ${i.duration} minutter.

Returnér præcis denne struktur:
${pkg}`;
}

/* ---------------- Phase 5 prompt builders ---------------- */

export const FOLLOW_UP_INTENTS = [
  { id: "misconceptions", label: "Ret misforståelser", hint: "byg aktiviteter der adresserer de fejl, svarene viser" },
  { id: "deepen", label: "Gå i dybden", hint: "byg videre fagligt på det, eleverne allerede kan" },
  { id: "discuss", label: "Diskutér svarene", hint: "brug elevernes svar som afsæt for en klassediskussion" },
  { id: "apply", label: "Anvend i ny kontekst", hint: "overfør det lærte til en ny case" },
  { id: "differentiate", label: "Differentiér", hint: "lav niveaudelte varianter ud fra svarene" },
] as const;

export type FollowUpIntentId = (typeof FOLLOW_UP_INTENTS)[number]["id"];

export interface FollowUpPromptInput {
  className?: string | undefined;
  subject?: string | undefined;
  lessonTitle: string;
  learningGoal?: string | null | undefined;
  blockTitle: string;
  blockType: string;
  question: string;
  responseSummary: string;
  intent: FollowUpIntentId;
  minutes: number;
  anonymized: boolean;
}

export function buildFollowUpPrompt(i: FollowUpPromptInput): string {
  const intent = FOLLOW_UP_INTENTS.find((x) => x.id === i.intent) ?? FOLLOW_UP_INTENTS[0];
  const head = [
    i.className ? `Klasse: ${i.className}` : null,
    i.subject ? `Fag: ${i.subject}` : null,
    `Lektion: ${i.lessonTitle}`,
    i.learningGoal ? `Læringsmål: ${i.learningGoal}` : null,
    `Aktivitet: ${i.blockTitle} (${i.blockType})`,
    i.question ? `Spørgsmål til eleverne: ${i.question}` : null,
  ].filter(Boolean);

  return `${COMMON}

Opgave: Lav opfølgende aktiviteter ud fra elevernes faktiske svar. Fokus: ${intent.label} — ${intent.hint}.

${head.join("\n")}

Elevsvar (${i.anonymized ? "anonymiseret" : "med navne"}), opgjort af CaseLab:
"""
${i.responseSummary}
"""

Krav:
- Tag udgangspunkt i mønstrene i svarene ovenfor. Nævn konkret hvad du reagerer på i teacher_notes.
- Aktiviteterne skal kunne bruges i næste modul eller resten af timen.
- Samlet varighed ca. ${i.minutes} minutter.

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "blocks",
  "placement_suggestion": { "action": "insert_bottom", "teacher_message": "..." },
  "blocks": [ ... ]
}`;
}

export interface DifferentiatePromptInput {
  className?: string | undefined;
  subject?: string | undefined;
  lessonTitle?: string | undefined;
  levels: string[];
  sourceText: string;
  minutes: number;
  note?: string | undefined;
}

export function buildDifferentiatePrompt(i: DifferentiatePromptInput): string {
  const head = [
    i.className ? `Klasse: ${i.className}` : null,
    i.subject ? `Fag: ${i.subject}` : null,
    i.lessonTitle ? `Lektion: ${i.lessonTitle}` : null,
    `Niveauer der skal laves: ${i.levels.join(", ")}`,
    `Hver variant skal fylde ca. ${i.minutes} minutter`,
    i.note ? `Lærerens bemærkning: ${i.note}` : null,
  ].filter(Boolean);

  return `${COMMON}

Opgave: Lav niveaudelte varianter af den samme aktivitet, så alle elever arbejder med det samme faglige mål.

${head.join("\n")}

Aktivitet der skal differentieres:
"""
${i.sourceText.trim()}
"""

Krav:
- Lav én variant pr. niveau i samme rækkefølge som angivet.
- Alle varianter skal have samme "variant_group" (en kort tekst, fx "differentiering-1").
- Sæt "variant_label" til præcis niveaunavnet: ${i.levels.map((l) => `"${l}"`).join(", ")}.
- Brug neutrale, ikke-stemplende formuleringer i alt elevrettet tekst. Skriv aldrig niveauet til eleverne.
- Fagligt mål og udbytte skal være det samme på tværs af varianter — det er stilladseringen der ændrer sig.

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "blocks",
  "blocks": [
    { "type": "...", "title": "...", "duration_minutes": ${i.minutes}, "variant_group": "differentiering-1", "variant_label": "${i.levels[0] ?? "Standard"}", "student_instructions": "...", "teacher_notes": "...", "content": { ... } }
  ]
}`;
}

export interface ClassPlanningPromptInput {
  className: string;
  subject?: string | undefined;
  overview: string;
  notes: string;
  focus: string;
  duration: number;
}

export function buildClassPlanningPrompt(i: ClassPlanningPromptInput): string {
  return `${COMMON}

Opgave: Planlæg næste lektion for en konkret klasse ud fra klassens hidtidige data.

Klasse: ${i.className}
${i.subject ? `Fag: ${i.subject}\n` : ""}Varighed: ${i.duration} minutter
Lærerens fokus næste gang: ${i.focus || "ikke angivet"}

Fagligt overblik opgjort af CaseLab:
"""
${i.overview.trim()}
"""
${i.notes.trim() ? `\nLærerens faglige noter om klassen:\n"""\n${i.notes.trim()}\n"""\n` : ""}
Krav:
- Byg videre på det, data viser. Gentag ikke det klassen tydeligt mestrer.
- Skriv i teacher_note hvad lektionen bygger på fra overblikket.

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "lesson",
  "mode": "standard",
  "lesson": {
    "title": "...",
    "subject": "...",
    "duration_minutes": ${i.duration},
    "learning_goal": "...",
    "teacher_note": "...",
    "tags": ["..."],
    "blocks": [ ... ]
  }
}`;
}
