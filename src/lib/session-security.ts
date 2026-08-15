import { z } from "zod";

export const MAX_RESPONSE_PAYLOAD_BYTES = 16 * 1024;
export const MAX_RESPONSE_TEXT_LENGTH = 4_000;
const MAX_RESPONSE_ITEMS = 50;
const MAX_ITEM_LENGTH = 500;

export interface SessionOwnershipGraph {
  session: {
    teacher_id: string;
    lesson_id: string;
    class_id?: string | null;
    episode_id?: string | null;
  };
  lesson: { id: string; teacher_id: string } | null;
  teacherClass?: { id: string; teacher_id: string } | null;
  episode?: {
    id: string;
    teacher_id: string;
    world_id: string;
    lesson_id: string | null;
  } | null;
  world?: { id: string; teacher_id: string } | null;
}

export function isSessionOwnershipValid(graph: SessionOwnershipGraph): boolean {
  const { session, lesson, teacherClass, episode, world } = graph;
  if (!lesson || lesson.id !== session.lesson_id || lesson.teacher_id !== session.teacher_id)
    return false;

  if (
    session.class_id &&
    (!teacherClass ||
      teacherClass.id !== session.class_id ||
      teacherClass.teacher_id !== session.teacher_id)
  ) {
    return false;
  }

  if (!session.episode_id) return true;
  return !!(
    episode &&
    world &&
    episode.id === session.episode_id &&
    episode.teacher_id === session.teacher_id &&
    episode.lesson_id === session.lesson_id &&
    world.id === episode.world_id &&
    world.teacher_id === session.teacher_id
  );
}

export function assertSessionOwnership(graph: SessionOwnershipGraph): void {
  if (!isSessionOwnershipValid(graph)) {
    throw new Error("Aktiviteten er ikke tilgængelig.");
  }
}

export function sanitizeStudentContent(
  type: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized = { ...(content ?? {}) };
  if (type === "theory_test") {
    delete sanitized["correct_option_index"];
    delete sanitized["feedback"];
  }
  return sanitized;
}

export function sanitizeStudentBlock(
  block: {
    id: string;
    type: string;
    title: string;
    duration_minutes: number;
    student_instructions: string | null;
    content: Record<string, unknown>;
  },
  interactive: boolean,
) {
  return {
    id: block.id,
    type: block.type,
    title: block.title,
    duration_minutes: block.duration_minutes,
    student_instructions: block.student_instructions,
    content: sanitizeStudentContent(block.type, block.content),
    interactive,
  };
}

const responseText = z.string().max(MAX_RESPONSE_TEXT_LENGTH);
const responseItem = z.string().max(MAX_ITEM_LENGTH);
const justification = responseText.optional();

function configuredStrings(content: Record<string, unknown>, key: string): string[] {
  const value = content[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, MAX_RESPONSE_ITEMS)
    : [];
}

function jsonSize(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    return MAX_RESPONSE_PAYLOAD_BYTES + 1;
  }
}

function sameStringMultiset(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const counts = new Map<string, number>();
  for (const item of left) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of right) {
    const count = counts.get(item) ?? 0;
    if (count === 0) return false;
    if (count === 1) counts.delete(item);
    else counts.set(item, count - 1);
  }
  return counts.size === 0;
}

export function validateStudentResponse(
  blockType: string,
  content: Record<string, unknown>,
  payload: unknown,
): Record<string, unknown> {
  if (jsonSize(payload) > MAX_RESPONSE_PAYLOAD_BYTES) {
    throw new Error("Svaret er for stort. Forkort teksten og prøv igen.");
  }

  let result: z.SafeParseReturnType<unknown, Record<string, unknown>>;
  const options = configuredStrings(content, "options");

  switch (blockType) {
    case "poll":
    case "theory_test":
      result = z
        .object({
          selected_option_index: z
            .number()
            .int()
            .min(0)
            .max(Math.max(0, options.length - 1)),
        })
        .strict()
        .safeParse(payload);
      break;
    case "dilemma":
      result = z
        .object({
          selected_option_index: z
            .number()
            .int()
            .min(0)
            .max(Math.max(0, options.length - 1)),
          justification,
        })
        .strict()
        .safeParse(payload);
      break;
    case "scale": {
      const min = Number(content["min"] ?? 1);
      const max = Number(content["max"] ?? 7);
      result = z
        .object({
          value: z
            .number()
            .int()
            .min(Number.isFinite(min) ? min : 1)
            .max(Number.isFinite(max) ? max : 7),
        })
        .strict()
        .safeParse(payload);
      break;
    }
    case "position":
      result = z
        .object({ value: z.number().int().min(0).max(10), justification })
        .strict()
        .safeParse(payload);
      break;
    case "short_response":
      result = z.object({ text: responseText }).strict().safeParse(payload);
      break;
    case "find_the_error":
      result = z.object({ text: responseText, justification }).strict().safeParse(payload);
      break;
    case "case":
    case "compare":
    case "exit_ticket": {
      const questions = configuredStrings(content, "questions");
      const maxItems = Math.max(1, questions.length || MAX_RESPONSE_ITEMS);
      result = z
        .object({ answers: z.array(responseText).max(Math.min(MAX_RESPONSE_ITEMS, maxItems)) })
        .strict()
        .safeParse(payload);
      break;
    }
    case "ranking": {
      const items = configuredStrings(content, "items");
      result = z
        .object({ ordered_items: z.array(responseItem).max(MAX_RESPONSE_ITEMS) })
        .strict()
        .safeParse(payload);
      if (result.success && !sameStringMultiset(result.data["ordered_items"] as string[], items)) {
        throw new Error("Svaret har et ugyldigt format.");
      }
      break;
    }
    default:
      throw new Error("Denne aktivitet modtager ikke elevsvar.");
  }

  if (!result.success) throw new Error("Svaret har et ugyldigt format.");
  return result.data;
}
