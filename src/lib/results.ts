export const INTERACTIVE_TYPES = [
  "poll",
  "theory_test",
  "scale",
  "short_response",
  "ranking",
  "dilemma",
  "position",
  "case",
  "compare",
  "find_the_error",
  "exit_ticket",
] as const;

/** Blocks that render fine for a student but need no submission. */
export const READABLE_TYPES = ["teacher_content", "narrative", "discussion"] as const;

export function isInteractive(type: string): boolean {
  return (INTERACTIVE_TYPES as readonly string[]).includes(type);
}

export function isStudentReadable(type: string): boolean {
  return (READABLE_TYPES as readonly string[]).includes(type);
}

/** A block works in a self-paced session if a student can either read or answer it. */
export function worksSelfPaced(type: string): boolean {
  return isInteractive(type) || isStudentReadable(type);
}

export interface ReadinessSummary {
  total: number;
  digital: number;
  teacherLed: number;
  teacherLedTitles: string[];
}

export function readiness(blocks: { type: string; title: string }[]): ReadinessSummary {
  const digital = blocks.filter((b) => isInteractive(b.type));
  const teacherLed = blocks.filter((b) => !isInteractive(b.type));
  return {
    total: blocks.length,
    digital: digital.length,
    teacherLed: teacherLed.length,
    teacherLedTitles: teacherLed.map((b) => b.title),
  };
}

/* ---------------- response summaries (shared teacher + student) ---------------- */

export type ResultSummary =
  | { kind: "options"; total: number; labels: string[]; counts: number[] }
  | { kind: "scale"; total: number; average: number; min: number; max: number; counts: number[] }
  | { kind: "text"; total: number; items: { name: string; text: string }[] }
  | { kind: "none"; total: number };

export function summarize(
  type: string,
  content: Record<string, unknown>,
  rows: { display_name: string; response_data: Record<string, unknown> }[],
): ResultSummary {
  const total = rows.length;
  const optionsOf = (key: string) => {
    const v = content?.[key];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  };

  if (type === "poll" || type === "theory_test" || type === "dilemma") {
    const labels = optionsOf("options");
    const counts = labels.map(() => 0);
    for (const r of rows) {
      const i = r.response_data?.["selected_option_index"];
      if (typeof i === "number" && counts[i] !== undefined) counts[i] = (counts[i] ?? 0) + 1;
    }
    return { kind: "options", total, labels, counts };
  }

  if (type === "scale" || type === "position") {
    const min = type === "scale" ? Number(content?.["min"] ?? 1) : 0;
    const max = type === "scale" ? Number(content?.["max"] ?? 7) : 10;
    const span = Math.max(1, max - min + 1);
    const counts = Array.from({ length: span }, () => 0);
    let sum = 0;
    let n = 0;
    for (const r of rows) {
      const v = r.response_data?.["value"];
      if (typeof v === "number") {
        sum += v;
        n += 1;
        const idx = Math.round(v) - min;
        if (counts[idx] !== undefined) counts[idx] = (counts[idx] ?? 0) + 1;
      }
    }
    return {
      kind: "scale",
      total,
      average: n ? Math.round((sum / n) * 10) / 10 : 0,
      min,
      max,
      counts,
    };
  }

  const texts: { name: string; text: string }[] = [];
  for (const r of rows) {
    const d = r.response_data ?? {};
    let text = "";
    if (typeof d["text"] === "string") text = d["text"];
    else if (Array.isArray(d["answers"]))
      text = (d["answers"] as unknown[]).filter((x) => typeof x === "string").join("\n\n");
    else if (Array.isArray(d["ordered_items"])) text = (d["ordered_items"] as unknown[]).join(" → ");
    if (typeof d["justification"] === "string" && d["justification"].trim())
      text = `${text ? text + "\n" : ""}${d["justification"]}`;
    if (text.trim()) texts.push({ name: r.display_name, text });
  }
  if (texts.length) return { kind: "text", total, items: texts };
  return { kind: "none", total };
}
