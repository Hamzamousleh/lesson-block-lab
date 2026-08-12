import { BLOCK_TYPES } from "./blocks";

const TYPE_LIST = BLOCK_TYPES.map((b) => b.type).join(", ");

/** Shared block content schemas — the single source of truth for every prompt builder. */
export const CASELAB_V2_BLOCK_SCHEMAS = `teacher_content: { "body": "..." }
narrative: { "text": "..." }
case: { "scenario": "...", "questions": ["...", "..."] }
theory_test: { "theory": "...", "scenario": "...", "question": "...", "options": ["...", "..."], "follow_up_questions": ["...", "..."] }
  — valgfrit (bruges til quiz/MCQ med facit): "correct_option_index": 0, "feedback": { "correct": "...", "incorrect": "..." }
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

const SCHEMA_REFERENCE = CASELAB_V2_BLOCK_SCHEMAS;

/** Canonical Lesson Package contract. Blocks ALWAYS live in lesson.blocks. */
export function CASELAB_V2_LESSON_OUTPUT_CONTRACT(opts: {
  duration: number;
  mode?: "standard" | "rescue";
  subject?: string | undefined;
  tags?: string[] | undefined;
  fallbackBlocks?: boolean | undefined;
}): string {
  const tags = opts.tags?.length ? opts.tags.map((t) => `"${t}"`).join(", ") : `"..."`;
  return `{
  "caselab_version": "2.0",
  "package_type": "lesson",
  "mode": "${opts.mode ?? "standard"}",
  "lesson": {
    "title": "...",
    "subject": "${opts.subject ?? "..."}",
    "duration_minutes": ${opts.duration},
    "learning_goal": "...",
    "teacher_note": "...",
    "tags": [${tags}],
    "blocks": [ ... ]${opts.fallbackBlocks ? `,\n    "fallback_blocks": [ ... ]` : ""}
  }
}`;
}

/** Canonical Blocks Package contract. */
export const CASELAB_V2_BLOCK_OUTPUT_CONTRACT = `${CASELAB_V2_BLOCK_OUTPUT_CONTRACT}`;

export const CASELAB_V2_COMMON_RULES = `Du genererer struktureret undervisningsindhold til CaseLab.

Returnér KUN ét gyldigt JSON-objekt. Ingen markdown-fences, ingen forklaring før eller efter.

Regler:
- "caselab_version" skal være "2.0".
- Brug altid "package_type" — aldrig "type" — på øverste niveau.
- I en lektionspakke ligger aktiviteterne ALTID i "lesson.blocks", aldrig i toppen af objektet.
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

const COMMON = CASELAB_V2_COMMON_RULES;

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
${CASELAB_V2_LESSON_OUTPUT_CONTRACT({ duration: i.duration })}

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
${CASELAB_V2_BLOCK_OUTPUT_CONTRACT}

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
${CASELAB_V2_LESSON_OUTPUT_CONTRACT({ duration: i.duration, mode: "rescue", fallbackBlocks: true })}

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
${CASELAB_V2_BLOCK_OUTPUT_CONTRACT}

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
${CASELAB_V2_LESSON_OUTPUT_CONTRACT({ duration: i.duration })}`;
}

/* ================= Phase 6 — Worlds ================= */

const WORLD_COMMON = `Du hjælper med at bygge et CaseLab World — et vedvarende fiktivt læringsunivers til dansk gymnasieundervisning.

Et World er IKKE et spil. Det er en ramme, hvor eleverne gentagne gange anvender fagteori på de samme personer, institutioner eller organisationer, træffer beslutninger og møder konsekvenser.

Krav:
- Hver beslutning skal kunne besvares med "hvad siger teorien?" — ikke "hvad lyder sjovt?".
- Konsekvenser skal indeholde faglige afvejninger (trade-offs), ikke ét objektivt rigtigt svar.
- Ingen point, badges, XP, levels eller belønninger.
- Skriv på dansk.
- Returnér KUN ét gyldigt JSON-objekt uden markdown-fences.`;

const WORLD_STATE_RULES = `World-tilstand:
- 4–8 variabler i alt. Ikke flere.
- Hver variabel skal være fagligt meningsfuld og forståelig på et sekund.
- Talvariabler bruger min_value 0 og max_value 100.
- "student_visible": true for variabler eleverne må se; false for lærer-variabler.
- "key" skrives med små bogstaver og understreg, fx public_trust.`;

const CONSEQUENCE_RULES = `Konsekvensregler (consequence_rules):
- "trigger_type": "majority_choice" | "threshold" | "response_distribution" | "teacher_selected" | "manual".
- majority_choice og response_distribution bruger trigger_config: { "option_index": 0 } (og "min_share": 50 ved response_distribution).
- threshold bruger trigger_config: { "comparator": "gte", "value": 5 }.
- "changes": [{ "state_key": "...", "operation": "increase" | "decrease" | "set" | "enum_change" | "boolean_toggle", "amount": 8 }].
- "reveal_timing": "immediate" | "end_of_block" | "end_of_episode" | "next_episode".
- "academic_rationale" er PÅKRÆVET og skal forklare fagligt, hvorfor konsekvensen giver mening.
- "source_block_title" skal matche titlen på den aktivitet i lektionen, som konsekvensen bygger på.`;

export interface WorldPromptInput {
  title: string;
  subject: string;
  worldTypeLabel: string;
  academicFocus: string;
  premiseIdea: string;
  className?: string | undefined;
}

export function buildWorldPrompt(i: WorldPromptInput): string {
  return `${WORLD_COMMON}

Opgave: Lav grundstrukturen til et nyt World.

Titel: ${i.title}
Fag: ${i.subject}
Type: ${i.worldTypeLabel}
Fagligt fokus: ${i.academicFocus}${i.className ? `\nKlasse: ${i.className}` : ""}
Lærerens idé til grundsituation: ${i.premiseIdea || "(ingen — foreslå selv en)"}

${WORLD_STATE_RULES}

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "world",
  "world": {
    "title": "${i.title}",
    "subject": "${i.subject}",
    "premise": "...",
    "description": "...",
    "academic_focus": "${i.academicFocus}",
    "state": [
      { "key": "...", "label": "...", "value": 55, "value_type": "number", "min_value": 0, "max_value": 100, "description": "...", "student_visible": true }
    ],
    "episodes": []
  }
}

Beskriv i "premise" de gennemgående personer eller institutioner, eleverne vil møde igen og igen. Lad "episodes" være tom.`;
}

export interface NextEpisodePromptInput {
  worldTitle: string;
  subject: string;
  premise: string;
  academicFocus: string;
  stateLines: string[];
  historyLines: string[];
  previousEpisodes: { number: number; title: string; complexity: string; goal: string }[];
  complexityLabel: string;
  intention: string;
  concepts: string;
  duration: number;
  episodeNumber: number;
  /** Deterministically extracted from the premise — never AI-extracted. */
  recurringCharacters?: string[];
}

export function buildNextEpisodePrompt(i: NextEpisodePromptInput): string {
  const history = i.historyLines.length
    ? i.historyLines.map((l) => `- ${l}`).join("\n")
    : "- (ingen konsekvenser endnu)";
  const prev = i.previousEpisodes.length
    ? i.previousEpisodes
        .map((e) => `- Episode ${e.number}: ${e.title} (${e.complexity})${e.goal ? ` — mål: ${e.goal}` : ""}`)
        .join("\n")
    : "- (ingen tidligere episoder)";

  return `${WORLD_COMMON}

Opgave: Lav næste episode i et eksisterende World.

World: ${i.worldTitle}
Fag: ${i.subject}
Fagligt fokus: ${i.academicFocus}

Grundsituation:
"""
${i.premise}
"""

Nuværende World-tilstand (må IKKE ændres af dig — kun bruges som udgangspunkt):
${i.stateLines.map((l) => `- ${l}`).join("\n")}

Hvad der er sket indtil nu (World-hukommelse):
${history}

Tidligere episoder:
${prev}

Den nye episode:
- Episodenummer: ${i.episodeNumber}
- Fagligt kompleksitetsniveau: ${i.complexityLabel}
- Lærerens hensigt: ${i.intention}
- Faglige begreber: ${i.concepts}
- Varighed: ${i.duration} minutter

${
    i.recurringCharacters && i.recurringCharacters.length
      ? `Gennemgående personer (brug dem — opfind ikke nye, hvis en af disse kan bære situationen):\n${i.recurringCharacters
          .map((c) => `- ${c}`)
          .join("\n")}\n`
      : ""
  }
Kontinuitetskrav (vigtigst):
- Genbrug eksisterende gennemgående personer og institutioner, når det er fagligt relevant.
- Introducér kun en ny person, hvis ingen eksisterende kan bære situationen.
- Referér til mindst én konkret tidligere begivenhed fra World-hukommelsen.
- Lad den nuværende World-tilstand få reel betydning for, hvad der kan ske.
- Nulstil ikke relationer, konflikter eller vilkår mellem episoder.
- Genintroducér kort personer, der ikke har været med længe.
- Fasthold faktuel kontinuitet: navne, roller, steder og tidligere valg.
- Hæv den faglige kompleksitet svarende til niveauet "${i.complexityLabel}".

Vigtige krav:
- Opfind IKKE tidligere begivenheder. Brug kun det, der står ovenfor.
- Respektér den nuværende World-tilstand.
- Gør konsekvenser fagligt meningsfulde med reelle afvejninger.
- Nævn ingen rigtige elevnavne.

${CONSEQUENCE_RULES}

${SCHEMA_REFERENCE}

Returnér præcis denne struktur:
{
  "caselab_version": "2.0",
  "package_type": "world_episode",
  "world_reference": "${i.worldTitle}",
  "episode": {
    "title": "...",
    "description": "...",
    "learning_goal": "...",
    "academic_concepts": ["..."],
    "episode_number": ${i.episodeNumber},
    "complexity_level": "...",
    "lesson": {
      "title": "...",
      "subject": "${i.subject}",
      "duration_minutes": ${i.duration},
      "learning_goal": "...",
      "teacher_note": "...",
      "blocks": [ ... ]
    },
    "consequence_rules": [ ... ]
  }
}

Brug "dilemma" eller "poll" til elevernes beslutning, så konsekvensmotoren kan aflæse svarene.
Summen af aktiviteternes duration_minutes skal ramme ${i.duration} minutter ±5.`;
}

export interface WorldReflectionPromptInput {
  worldTitle: string;
  subject: string;
  premise: string;
  startLines: string[];
  endLines: string[];
  decisionLines: string[];
  duration: number;
}

export function buildWorldReflectionPrompt(i: WorldReflectionPromptInput): string {
  return `${WORLD_COMMON}

Opgave: Lav en afsluttende refleksionslektion til et World, eleverne nu har gennemført.

World: ${i.worldTitle}
Fag: ${i.subject}

Grundsituation:
"""
${i.premise}
"""

Starttilstand:
${i.startLines.map((l) => `- ${l}`).join("\n")}

Sluttilstand:
${i.endLines.map((l) => `- ${l}`).join("\n")}

Vigtigste beslutninger og konsekvenser:
${(i.decisionLines.length ? i.decisionLines : ["(ingen registreret)"]).map((l) => `- ${l}`).join("\n")}

Lektionen skal få eleverne til at svare på:
- Hvad ændrede sig mest, og hvorfor?
- Hvilken beslutning fik størst konsekvens?
- Hvilken teori forklarer udviklingen bedst?
- Hvilken tidlig beslutning ville I træffe anderledes i dag?
- Hvad forenklede vores World i forhold til virkeligheden?

Det sidste spørgsmål er vigtigt: eleverne skal forholde sig kritisk til modellen som model.

${SCHEMA_REFERENCE}

Returnér præcis denne struktur:
${CASELAB_V2_LESSON_OUTPUT_CONTRACT({ duration: i.duration, subject: i.subject, tags: ["world", "refleksion"] })}`;
}


/* ---------------- Phase 6.1: reflect on an applied consequence ---------------- */

export interface ConsequenceReflectionInput {
  worldTitle: string;
  subject: string;
  episodeTitle: string;
  learningGoal: string;
  decision: string;
  distribution: string;
  changeLines: string[];
  academicRationale: string;
  duration: number;
}

export function buildConsequenceReflectionPrompt(i: ConsequenceReflectionInput): string {
  return `Du hjælper en dansk gymnasielærer i faget ${i.subject}.

Opgave: Lav 1–2 aktiviteter (blocks), hvor eleverne bruger fagteori til at fortolke konsekvensen af deres egen beslutning.

World: ${i.worldTitle}
Episode: ${i.episodeTitle}
Læringsmål: ${i.learningGoal}

Elevernes beslutning:
${i.decision}

Svarfordeling:
${i.distribution}

Konsekvens i World-tilstanden:
${i.changeLines.map((l) => `- ${l}`).join("\n")}

Lærerens faglige begrundelse:
"""
${i.academicRationale}
"""

Krav:
- Brug kun blocktyperne "discussion", "short_response" eller "theory_test".
- Eleverne skal forklare konsekvensen med fagbegreber — ikke bare vurdere den moralsk.
- Mindst ét spørgsmål skal bede eleverne overveje, hvad modellen forenkler.
- Samlet varighed ca. ${i.duration} minutter.
- Skriv på dansk. Ingen elevnavne.

${SCHEMA_REFERENCE}

Returnér præcis denne struktur:
${CASELAB_V2_BLOCK_OUTPUT_CONTRACT}`;
}

/** Deterministic recurring-character extraction from a World premise. No AI. */
export function extractRecurringCharacters(premise: string | null): string[] {
  if (!premise) return [];
  const stop = new Set([
    "Eleverne", "Klassen", "Danmark", "Gruppen", "De", "Der", "Det", "Den", "En", "Et",
    "Hun", "Han", "Man", "Nu", "Her", "I", "Du", "Vi", "Efter", "Da", "Når", "Men", "Og",
  ]);
  const counts = new Map<string, number>();
  const matches = premise.match(/(?<![.!?]\s)(?<!^)\b[A-ZÆØÅ][a-zæøå]{2,}\b/gm) ?? [];
  for (const m of matches) {
    if (stop.has(m)) continue;
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);
}
