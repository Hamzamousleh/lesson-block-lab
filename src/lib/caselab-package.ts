import { z } from "zod";
import { BLOCK_TYPE_MAP, blockDef } from "./blocks";
import { normalizeResources, type BlockResource } from "./resources";

/* ---------------- types ---------------- */

export interface PackageBlock {
  type: string;
  title: string;
  duration_minutes: number;
  student_instructions?: string | null;
  teacher_notes?: string | null;
  content: Record<string, unknown>;
  /** Differentiation: activities in the same group are variants of one activity. */
  variant_group?: string | null;
  /** Neutral level label, e.g. "Støtte", "Standard", "Udfordring". */
  variant_label?: string | null;
  /** Optional external links (iBog chapter, article, video). */
  resources?: BlockResource[];
}

export interface LessonPackage {
  caselab_version: "2.0";
  package_type: "lesson";
  mode: "standard" | "rescue";
  lesson: {
    title: string;
    subject?: string | null;
    duration_minutes: number;
    learning_goal?: string | null;
    teacher_note?: string | null;
    tags?: string[];
    blocks: PackageBlock[];
    fallback_blocks?: PackageBlock[];
  };
}

export interface PlacementSuggestion {
  action: "insert_after" | "insert_top" | "insert_bottom" | "replace_suggestion";
  after_block_title?: string | null;
  teacher_message?: string | null;
}

export interface BlocksPackage {
  caselab_version: "2.0";
  package_type: "blocks";
  placement_suggestion?: PlacementSuggestion;
  blocks: PackageBlock[];
}

export type CaseLabPackage = LessonPackage | BlocksPackage;


/* ---------------- content schemas ---------------- */

const str = z.string();
const list = z.array(z.string());

export const CONTENT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  teacher_content: z.object({ body: str }),
  narrative: z.object({ text: str }),
  case: z.object({ scenario: str, questions: list }),
  theory_test: z.object({
    theory: str,
    scenario: str,
    question: str,
    options: list,
    follow_up_questions: list,
  }),
  compare: z.object({ item_a: str, item_b: str, questions: list }),
  find_the_error: z.object({
    material: str,
    errors_to_find: z.number(),
    follow_up_question: str,
  }),
  discussion: z.object({ prompt: str, follow_up_questions: list }),
  dilemma: z.object({
    scenario: str,
    question: str,
    options: list,
    require_justification: z.boolean(),
  }),
  position: z.object({
    statement: str,
    left_label: str,
    right_label: str,
    follow_up_question: str,
  }),
  poll: z.object({ question: str, options: list }),
  ranking: z.object({ question: str, items: list }),
  scale: z.object({
    question: str,
    min: z.number(),
    max: z.number(),
    left_label: str,
    right_label: str,
  }),
  short_response: z.object({ question: str, placeholder: str }),
  exit_ticket: z.object({ questions: list }),
};

/* ---------------- validation ---------------- */

export const WORLD_PACKAGE_HINT =
  "Dette er en World-pakke. Importér den under Worlds → Importér World.";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  data?: CaseLabPackage;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateBlock(raw: unknown, index: number, errors: string[]): PackageBlock | null {
  const nr = index + 1;
  if (!isRecord(raw)) {
    errors.push(`Aktivitet ${nr} har et ugyldigt format.`);
    return null;
  }
  const type = raw["type"];
  if (typeof type !== "string" || !type.trim()) {
    errors.push(`Aktivitet ${nr} mangler en type.`);
    return null;
  }
  if (!BLOCK_TYPE_MAP[type]) {
    errors.push(`Aktivitet ${nr} bruger typen '${type}', som Didaktiva ikke understøtter.`);
    return null;
  }
  const def = blockDef(type);
  const title = typeof raw["title"] === "string" ? raw["title"].trim() : "";
  if (!title) errors.push(`Aktivitet ${nr} (${def.label}) mangler en titel.`);

  const duration = raw["duration_minutes"];
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
    errors.push(`Aktivitet ${nr} har en ugyldig varighed.`);
  }

  const label = title ? `'${title}'` : `nr. ${nr}`;
  const content = isRecord(raw["content"]) ? raw["content"] : null;
  if (!content) {
    errors.push(`${def.label}-aktiviteten ${label} mangler indhold.`);
  } else {
    const parsed = CONTENT_SCHEMAS[type]!.safeParse(content);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join(".") || "indhold";
        if (issue.code === "invalid_type" && issue.received === "undefined") {
          errors.push(`${def.label}-aktiviteten ${label} mangler feltet '${field}'.`);
        } else {
          errors.push(`${def.label}-aktiviteten ${label} har et ugyldigt felt '${field}'.`);
        }
      }
    }
  }

  if (errors.length) return null;

  // Optional and backwards compatible: resources may sit on the block or in content.
  const resources = normalizeResources(
    Array.isArray(raw["resources"]) ? raw["resources"] : (content?.["resources"] ?? null),
  );

  return {
    type,
    title,
    duration_minutes: duration as number,
    student_instructions:
      typeof raw["student_instructions"] === "string" ? raw["student_instructions"] : null,
    teacher_notes: typeof raw["teacher_notes"] === "string" ? raw["teacher_notes"] : null,
    content: content as Record<string, unknown>,
    variant_group: typeof raw["variant_group"] === "string" ? raw["variant_group"].trim() || null : null,
    variant_label: typeof raw["variant_label"] === "string" ? raw["variant_label"].trim() || null : null,
    ...(resources.length ? { resources } : {}),
  };
}

export function validatePackage(input: string): ValidationResult {
  const text = input.trim();
  if (!text) return { ok: false, errors: ["Indsæt en Didaktiva-pakke for at fortsætte."] };

  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
  } catch {
    return {
      ok: false,
      errors: ["Teksten er ikke gyldig JSON. Kopiér hele svaret fra ChatGPT uden ekstra tekst."],
    };
  }

  const errors: string[] = [];
  if (!isRecord(raw)) return { ok: false, errors: ["Pakken skal være et JSON-objekt."] };

  if (raw["caselab_version"] !== "2.0") {
    errors.push("Pakken mangler 'caselab_version': \"2.0\".");
  }
  const type = raw["package_type"];
  if (type === "world" || type === "world_episode") {
    // World packages are validated by the Worlds module (Phase 6).
    return { ok: false, errors: [WORLD_PACKAGE_HINT] };
  }
  if (type !== "lesson" && type !== "blocks") {
    errors.push(
      "Pakken skal have 'package_type' sat til \"lesson\", \"blocks\", \"world\" eller \"world_episode\".",
    );
    return { ok: false, errors };
  }

  if (type === "blocks") {
    const blocks = raw["blocks"];
    if (!Array.isArray(blocks) || blocks.length === 0) {
      errors.push("Pakken indeholder ingen aktiviteter.");
      return { ok: false, errors };
    }
    const parsedBlocks = blocks.map((b, i) => validateBlock(b, i, errors));
    if (errors.length) return { ok: false, errors };
    const suggestion = parsePlacement(raw["placement_suggestion"]);
    return {
      ok: true,
      errors: [],
      data: {
        caselab_version: "2.0",
        package_type: "blocks",
        ...(suggestion ? { placement_suggestion: suggestion } : {}),
        blocks: parsedBlocks as PackageBlock[],
      },
    };
  }

  const mode = raw["mode"] === "rescue" ? "rescue" : "standard";
  const lesson = raw["lesson"];
  if (!isRecord(lesson)) {
    errors.push("Pakken mangler et 'lesson'-objekt.");
    return { ok: false, errors };
  }
  const title = typeof lesson["title"] === "string" ? lesson["title"].trim() : "";
  if (!title) errors.push("Lektionen mangler en titel.");
  const duration = lesson["duration_minutes"];
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
    errors.push("Lektionen har en ugyldig varighed.");
  }
  const blocks = lesson["blocks"];
  if (!Array.isArray(blocks) || blocks.length === 0) {
    errors.push("Lektionen indeholder ingen aktiviteter.");
    return { ok: false, errors };
  }
  const parsedBlocks = blocks.map((b, i) => validateBlock(b, i, errors));

  const rawFallback = lesson["fallback_blocks"];
  let parsedFallback: PackageBlock[] = [];
  if (Array.isArray(rawFallback) && rawFallback.length) {
    const fbErrors: string[] = [];
    const fb = rawFallback.map((b, i) => validateBlock(b, i, fbErrors));
    if (fbErrors.length) {
      errors.push(...fbErrors.map((e) => `Ekstra aktivitet: ${e}`));
    } else {
      parsedFallback = fb as PackageBlock[];
    }
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    data: {
      caselab_version: "2.0",
      package_type: "lesson",
      mode,
      lesson: {
        title,
        subject: typeof lesson["subject"] === "string" ? lesson["subject"] : null,
        duration_minutes: duration as number,
        learning_goal: typeof lesson["learning_goal"] === "string" ? lesson["learning_goal"] : null,
        teacher_note: typeof lesson["teacher_note"] === "string" ? lesson["teacher_note"] : null,
        tags: Array.isArray(lesson["tags"])
          ? lesson["tags"].filter((t): t is string => typeof t === "string")
          : [],
        blocks: parsedBlocks as PackageBlock[],
        fallback_blocks: parsedFallback,
      },
    },
  };
}

function parsePlacement(raw: unknown): PlacementSuggestion | undefined {
  if (!isRecord(raw)) return undefined;
  const action = raw["action"];
  const allowed = ["insert_after", "insert_top", "insert_bottom", "replace_suggestion"] as const;
  const parsedAction = (allowed as readonly string[]).includes(String(action))
    ? (action as PlacementSuggestion["action"])
    : "insert_bottom";
  return {
    action: parsedAction,
    after_block_title:
      typeof raw["after_block_title"] === "string" ? raw["after_block_title"] : null,
    teacher_message: typeof raw["teacher_message"] === "string" ? raw["teacher_message"] : null,
  };
}



export function totalDuration(blocks: PackageBlock[]): number {
  return blocks.reduce((sum, b) => sum + b.duration_minutes, 0);
}
