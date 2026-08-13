import type { LessonBlock } from "./types";
import type { StudentBlockData } from "@/components/student/StudentBlock";
import { isInteractive } from "./results";

/* ------------------------------------------------------------------ *
 * Small, dependency-free helpers for the live Teacher Cockpit.
 * ------------------------------------------------------------------ */

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(Math.abs(totalSeconds)));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** "05:42 tilbage" / "00:00" / "+01:24 over tid" */
export function timerLabel(seconds: number): string {
  if (seconds > 0) return `${mmss(seconds)} tilbage`;
  if (seconds > -1) return "00:00";
  return `+${mmss(seconds)} over tid`;
}

/**
 * Converts a teacher-owned block into exactly the payload a student receives.
 * Teacher notes and the answer key are dropped here, so the cockpit preview
 * can never show something students cannot see.
 */
export function toPreviewBlock(b: LessonBlock): StudentBlockData {
  const content: Record<string, unknown> = { ...(b.content ?? {}) };
  if (b.type === "theory_test") {
    delete content["correct_option_index"];
    delete content["feedback"];
  }
  return {
    id: b.id,
    type: b.type,
    title: b.title,
    student_instructions: b.student_instructions,
    content,
    interactive: isInteractive(b.type),
  };
}

/** Lightweight, derived work-mode hint. No schema change, teacher-facing only. */
export function workMode(type: string): string {
  switch (type) {
    case "discussion":
      return "Makkerpar";
    case "case":
    case "compare":
    case "ranking":
      return "Gruppe";
    case "teacher_content":
    case "narrative":
    case "poll":
      return "Fælles";
    default:
      return "Individuelt";
  }
}

export function correctOptionIndex(b: LessonBlock | undefined): number | null {
  if (!b || b.type !== "theory_test") return null;
  const v = (b.content ?? {})["correct_option_index"];
  return typeof v === "number" ? v : null;
}
