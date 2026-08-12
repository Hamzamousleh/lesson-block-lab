import type { LessonBlock } from "./types";
import type { SessionParticipant, SessionResponse } from "./sessions";

/* ------------------------------------------------------------------ *
 * Deterministic response summaries. No AI, no interpretation.
 * ------------------------------------------------------------------ */

export interface TextResponseItem {
  responseId: string;
  participantId: string;
  realName: string;
  alias: string;
  text: string;
  submittedAt: string;
}

export type BlockInsight =
  | {
      kind: "options";
      total: number;
      labels: string[];
      counts: number[];
      percents: number[];
      correctIndex: number | null;
      correctCount: number | null;
      correctPercent: number | null;
    }
  | {
      kind: "scale";
      total: number;
      average: number;
      median: number;
      min: number;
      max: number;
      distribution: { value: number; count: number }[];
    }
  | {
      kind: "ranking";
      total: number;
      items: { label: string; averagePosition: number; firstPlaceCount: number }[];
      mostPlacedFirst: string | null;
    }
  | { kind: "text"; total: number; items: TextResponseItem[] }
  | { kind: "none"; total: number };

function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 100) : 0;
}

/** Stable anonymous aliases: "Elev 1", "Elev 2" … by join order. */
export function aliasMap(participants: SessionParticipant[]): Map<string, string> {
  const sorted = [...participants].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  return new Map(sorted.map((p, i) => [p.id, `Elev ${i + 1}`]));
}

export function nameMap(participants: SessionParticipant[]): Map<string, string> {
  return new Map(participants.map((p) => [p.id, p.display_name]));
}

function textOf(data: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof data["text"] === "string" && data["text"].trim()) parts.push(data["text"].trim());
  if (Array.isArray(data["answers"])) {
    const answers = (data["answers"] as unknown[]).filter((x): x is string => typeof x === "string");
    if (answers.length) parts.push(answers.filter((a) => a.trim()).join("\n"));
  }
  if (Array.isArray(data["ordered_items"]))
    parts.push((data["ordered_items"] as unknown[]).map(String).join(" → "));
  if (typeof data["justification"] === "string" && data["justification"].trim())
    parts.push(data["justification"].trim());
  return parts.filter(Boolean).join("\n");
}

export function correctIndexOf(block: { content: Record<string, unknown> }): number | null {
  const v = block.content?.["correct_option_index"];
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

export function blockInsight(
  block: Pick<LessonBlock, "type" | "content">,
  responses: SessionResponse[],
  participants: SessionParticipant[],
): BlockInsight {
  const content = (block.content ?? {}) as Record<string, unknown>;
  const total = responses.length;
  const names = nameMap(participants);
  const aliases = aliasMap(participants);

  const stringList = (key: string): string[] => {
    const v = content[key];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  };

  if (block.type === "poll" || block.type === "theory_test" || block.type === "dilemma") {
    const labels = stringList("options");
    const counts = labels.map(() => 0);
    for (const r of responses) {
      const i = r.response_data?.["selected_option_index"];
      if (typeof i === "number" && counts[i] !== undefined) counts[i] = (counts[i] ?? 0) + 1;
    }
    const correctIndex = correctIndexOf({ content });
    const correctCount =
      correctIndex !== null && counts[correctIndex] !== undefined ? (counts[correctIndex] ?? 0) : null;
    return {
      kind: "options",
      total,
      labels,
      counts,
      percents: counts.map((c) => pct(c, total)),
      correctIndex,
      correctCount,
      correctPercent: correctCount === null ? null : pct(correctCount, total),
    };
  }

  if (block.type === "scale" || block.type === "position") {
    const lo = block.type === "scale" ? Number(content["min"] ?? 1) : 0;
    const hi = block.type === "scale" ? Number(content["max"] ?? 7) : 10;
    const values: number[] = [];
    for (const r of responses) {
      const v = r.response_data?.["value"];
      if (typeof v === "number" && Number.isFinite(v)) values.push(v);
    }
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length
      ? sorted.length % 2
        ? (sorted[mid] ?? 0)
        : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : 0;
    const distribution = Array.from({ length: Math.max(1, hi - lo + 1) }, (_, i) => ({
      value: lo + i,
      count: values.filter((v) => Math.round(v) === lo + i).length,
    }));
    return {
      kind: "scale",
      total,
      average: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0,
      median: Math.round(median * 10) / 10,
      min: values.length ? Math.min(...values) : lo,
      max: values.length ? Math.max(...values) : hi,
      distribution,
    };
  }

  if (block.type === "ranking") {
    const items = stringList("items");
    const positions = new Map<string, number[]>(items.map((i) => [i, []]));
    for (const r of responses) {
      const ordered = r.response_data?.["ordered_items"];
      if (!Array.isArray(ordered)) continue;
      ordered.forEach((raw, idx) => {
        const label = String(raw);
        const arr = positions.get(label);
        if (arr) arr.push(idx + 1);
      });
    }
    const rows = items.map((label) => {
      const arr = positions.get(label) ?? [];
      return {
        label,
        averagePosition: arr.length
          ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
          : 0,
        firstPlaceCount: arr.filter((p) => p === 1).length,
      };
    });
    const best = [...rows].sort((a, b) => b.firstPlaceCount - a.firstPlaceCount)[0];
    return {
      kind: "ranking",
      total,
      items: rows,
      mostPlacedFirst: best && best.firstPlaceCount > 0 ? best.label : null,
    };
  }

  const items: TextResponseItem[] = [];
  for (const r of responses) {
    const text = textOf(r.response_data ?? {});
    if (!text.trim()) continue;
    items.push({
      responseId: r.id,
      participantId: r.participant_id,
      realName: names.get(r.participant_id) ?? "Ukendt",
      alias: aliases.get(r.participant_id) ?? "Elev",
      text,
      submittedAt: r.submitted_at,
    });
  }
  if (items.length) return { kind: "text", total, items };
  return { kind: "none", total };
}

/* ---------------- prompt context (deterministic text) ---------------- */

export function questionOf(block: Pick<LessonBlock, "type" | "content">): string {
  const c = (block.content ?? {}) as Record<string, unknown>;
  for (const key of ["question", "prompt", "statement", "scenario"]) {
    if (typeof c[key] === "string" && c[key]) return c[key] as string;
  }
  return "";
}

export function insightToText(insight: BlockInsight, opts?: { includeText?: TextResponseItem[]; useNames?: boolean }): string {
  if (insight.kind === "options") {
    const lines = insight.labels.map(
      (l, i) =>
        `${String.fromCharCode(65 + i)}. ${l} — ${insight.counts[i] ?? 0} svar (${insight.percents[i] ?? 0}%)${
          insight.correctIndex === i ? " [korrekt svar]" : ""
        }`,
    );
    if (insight.correctPercent !== null)
      lines.push(`Andel korrekte svar: ${insight.correctPercent}%`);
    return `${insight.total} svar\n${lines.join("\n")}`;
  }
  if (insight.kind === "scale") {
    return `${insight.total} svar\nGennemsnit: ${insight.average}\nMedian: ${insight.median}\nSpænd: ${insight.min}–${insight.max}\nFordeling: ${insight.distribution
      .map((d) => `${d.value}: ${d.count}`)
      .join(", ")}`;
  }
  if (insight.kind === "ranking") {
    return `${insight.total} svar\n${insight.items
      .map((i) => `${i.label} — gennemsnitlig placering ${i.averagePosition}, placeret som nr. 1 af ${i.firstPlaceCount}`)
      .join("\n")}`;
  }
  if (insight.kind === "text") {
    const chosen = opts?.includeText ?? insight.items;
    if (!chosen.length) return `${insight.total} svar (ingen svar udvalgt)`;
    return `${insight.total} svar i alt, ${chosen.length} udvalgt:\n${chosen
      .map((t) => `${opts?.useNames ? t.realName : t.alias}:\n"${t.text}"`)
      .join("\n\n")}`;
  }
  return `${insight.total} svar`;
}
