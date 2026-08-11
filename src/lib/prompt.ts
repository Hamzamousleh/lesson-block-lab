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
  className?: string;
  subject?: string;
  unitTitle?: string;
  topic: string;
  duration: number;
  learningGoal?: string;
  priorKnowledge?: string;
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
  lessonTitle?: string;
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
