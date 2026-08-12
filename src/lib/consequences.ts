import type { ResultSummary } from "./results";
import {
  logEvent,
  markEventReverted,
  updateConsequence,
  updateStateVar,
  type AppliedChange,
  type StateChange,
  type WorldConsequence,
  type WorldEvent,
  type WorldStateVar,
} from "./worlds";

/* ------------------------------------------------------------------ *
 * Deterministic consequence engine.
 * No AI. Every trigger is evaluated from stored responses, and no
 * state ever changes without the teacher confirming a preview.
 * ------------------------------------------------------------------ */

export function clampValue(v: number, s: WorldStateVar): number {
  let out = v;
  if (typeof s.min_value === "number") out = Math.max(s.min_value, out);
  if (typeof s.max_value === "number") out = Math.min(s.max_value, out);
  return Math.round(out * 100) / 100;
}

export function formatStateValue(s: WorldStateVar, value: unknown = s.value): string {
  if (value === null || value === undefined) return "—";
  if (s.value_type === "boolean") return value ? "Ja" : "Nej";
  if (s.value_type === "number") {
    const num = Number(value);
    return typeof s.max_value === "number" ? `${num} / ${s.max_value}` : String(num);
  }
  return String(value);
}

/** Applies changes to a copy of state and returns the before/after diff. */
export function previewChanges(
  states: WorldStateVar[],
  changes: StateChange[],
): { applied: AppliedChange[]; errors: string[] } {
  const applied: AppliedChange[] = [];
  const errors: string[] = [];
  const working = new Map(states.map((s) => [s.state_key, s.value] as const));

  for (const c of changes) {
    const s = states.find((x) => x.state_key === c.state_key);
    if (!s) {
      errors.push(`Variablen '${c.state_key}' findes ikke i dette World.`);
      continue;
    }
    const before = working.get(s.state_key);
    let after: unknown = before;

    if (c.operation === "boolean_toggle") {
      if (s.value_type !== "boolean") {
        errors.push(`'${s.label}' er ikke en ja/nej-variabel.`);
        continue;
      }
      after = !before;
    } else if (c.operation === "enum_change" || (c.operation === "set" && s.value_type !== "number")) {
      const v = c.value ?? "";
      if (s.value_type === "enum" && s.enum_options.length && !s.enum_options.includes(String(v))) {
        errors.push(`'${String(v)}' er ikke en gyldig værdi for '${s.label}'.`);
        continue;
      }
      after = s.value_type === "boolean" ? Boolean(v) : String(v);
    } else {
      if (s.value_type !== "number") {
        errors.push(`'${s.label}' er ikke en talvariabel og kan ikke øges eller sænkes.`);
        continue;
      }
      const base = Number(before ?? 0);
      const amount = Number(c.amount ?? c.value ?? 0);
      if (!Number.isFinite(amount)) {
        errors.push(`Ændringen for '${s.label}' mangler et tal.`);
        continue;
      }
      const raw =
        c.operation === "set" ? amount : c.operation === "increase" ? base + amount : base - amount;
      after = clampValue(raw, s);
    }

    working.set(s.state_key, after as never);
    const existing = applied.find((a) => a.state_key === s.state_key);
    if (existing) existing.after = after;
    else applied.push({ state_key: s.state_key, label: s.label, before, after });
  }

  return { applied, errors };
}

/* ---------------- triggers ---------------- */

export interface TriggerEvaluation {
  fires: boolean;
  /** Human readable Danish explanation of what the responses showed. */
  reason: string;
  /** null when the trigger needs response data that is not there yet. */
  detail: string | null;
}

export function evaluateTrigger(
  consequence: Pick<WorldConsequence, "trigger_type" | "trigger_config">,
  summary: ResultSummary | null,
): TriggerEvaluation {
  const cfg = consequence.trigger_config ?? {};

  if (consequence.trigger_type === "manual" || consequence.trigger_type === "teacher_selected") {
    return { fires: true, reason: "Læreren beslutter, om konsekvensen skal træde i kraft.", detail: null };
  }

  if (!summary || summary.total === 0) {
    return { fires: false, reason: "Der er endnu ingen elevsvar at basere konsekvensen på.", detail: null };
  }

  if (consequence.trigger_type === "majority_choice") {
    if (summary.kind !== "options") {
      return { fires: false, reason: "Aktiviteten har ikke svarmuligheder.", detail: null };
    }
    const wanted = Number(cfg["option_index"] ?? 0);
    const top = summary.counts.reduce(
      (best, n, i) => (n > (summary.counts[best] ?? -1) ? i : best),
      0,
    );
    const share = Math.round(((summary.counts[wanted] ?? 0) / summary.total) * 100);
    return {
      fires: top === wanted,
      reason:
        top === wanted
          ? `Flertallet valgte "${summary.labels[wanted] ?? wanted + 1}" (${share}% af ${summary.total} svar).`
          : `Flertallet valgte "${summary.labels[top] ?? top + 1}", ikke "${summary.labels[wanted] ?? wanted + 1}".`,
      detail: summary.labels
        .map((l, i) => `${l || `Mulighed ${i + 1}`}: ${summary.counts[i] ?? 0}`)
        .join(" · "),
    };
  }

  if (consequence.trigger_type === "response_distribution") {
    if (summary.kind !== "options") {
      return { fires: false, reason: "Aktiviteten har ikke svarmuligheder.", detail: null };
    }
    const wanted = Number(cfg["option_index"] ?? 0);
    const min = Number(cfg["min_share"] ?? 50);
    const share = Math.round(((summary.counts[wanted] ?? 0) / summary.total) * 100);
    return {
      fires: share >= min,
      reason: `${share}% valgte "${summary.labels[wanted] ?? wanted + 1}" (grænse: ${min}%).`,
      detail: summary.labels
        .map((l, i) => `${l || `Mulighed ${i + 1}`}: ${summary.counts[i] ?? 0}`)
        .join(" · "),
    };
  }

  if (consequence.trigger_type === "threshold") {
    if (summary.kind !== "scale") {
      return { fires: false, reason: "Aktiviteten giver ikke et gennemsnit.", detail: null };
    }
    const comparator = String(cfg["comparator"] ?? "gte");
    const value = Number(cfg["value"] ?? 0);
    const avg = summary.average;
    const fires =
      comparator === "lt"
        ? avg < value
        : comparator === "lte"
          ? avg <= value
          : comparator === "gt"
            ? avg > value
            : comparator === "eq"
              ? avg === value
              : avg >= value;
    return {
      fires,
      reason: `Gennemsnittet er ${avg} (grænse ${comparatorLabel(comparator)} ${value}).`,
      detail: `${summary.total} svar`,
    };
  }

  return { fires: false, reason: "Ukendt udløser.", detail: null };
}

export function comparatorLabel(c: string): string {
  return c === "lt" ? "<" : c === "lte" ? "≤" : c === "gt" ? ">" : c === "eq" ? "=" : "≥";
}

export function describeChange(s: WorldStateVar | undefined, c: StateChange): string {
  const label = s?.label ?? c.state_key;
  if (c.operation === "increase") return `${label} +${c.amount ?? 0}`;
  if (c.operation === "decrease") return `${label} −${c.amount ?? 0}`;
  if (c.operation === "boolean_toggle") return `${label} skifter`;
  if (c.operation === "enum_change") return `${label} → ${String(c.value ?? "")}`;
  return `${label} sættes til ${String(c.value ?? c.amount ?? "")}`;
}

/* ---------------- applying ---------------- */

async function writeState(states: WorldStateVar[], applied: AppliedChange[]) {
  for (const change of applied) {
    const s = states.find((x) => x.state_key === change.state_key);
    if (!s) continue;
    await updateStateVar(s.id, { value: change.after as never });
  }
}

export interface ApplyResult {
  applied: AppliedChange[];
  deferred: boolean;
}

/**
 * Applies a consequence after teacher confirmation.
 * `immediate`/`end_of_block`/`end_of_episode` write state now.
 * `next_episode` stores the computed changes and waits.
 */
export async function applyConsequence(opts: {
  consequence: WorldConsequence;
  states: WorldStateVar[];
  /** teacher may override the computed changes */
  changes: StateChange[];
  episodeTitle: string;
  reasonText: string;
}): Promise<ApplyResult> {
  const { consequence, states, changes } = opts;
  if (consequence.status === "applied") {
    throw new Error("Denne konsekvens er allerede anvendt.");
  }
  const { applied, errors } = previewChanges(states, changes);
  if (errors.length) throw new Error(errors[0]);
  if (!applied.length) throw new Error("Konsekvensen ændrer ingenting.");

  const deferred = consequence.reveal_timing === "next_episode";

  if (deferred) {
    await updateConsequence(consequence.id, {
      status: "pending",
      pending_changes: changes as never,
    });
    await logEvent({
      world_id: consequence.world_id,
      episode_id: consequence.episode_id,
      consequence_id: consequence.id,
      event_type: "consequence_scheduled",
      title: consequence.title || "Konsekvens planlagt",
      description: `${opts.reasonText} Effekten mærkes først i næste episode.`,
      academic_rationale: consequence.academic_rationale,
      state_changes: [],
      source: "teacher",
      student_visible: false,
    });
    return { applied, deferred: true };
  }

  await writeState(states, applied);
  await updateConsequence(consequence.id, {
    status: "applied",
    applied_at: new Date().toISOString(),
    pending_changes: null,
  });
  await logEvent({
    world_id: consequence.world_id,
    episode_id: consequence.episode_id,
    consequence_id: consequence.id,
    event_type: "consequence",
    title: consequence.title || "Konsekvens",
    description: [opts.reasonText, consequence.student_explanation].filter(Boolean).join(" "),
    academic_rationale: consequence.academic_rationale,
    state_changes: applied,
    source: "student_decision",
  });
  return { applied, deferred: false };
}

/** Runs every consequence that was scheduled for the next episode. */
export async function releasePendingConsequences(
  pending: WorldConsequence[],
  states: WorldStateVar[],
  episodeId: string,
): Promise<AppliedChange[]> {
  let working = states;
  const all: AppliedChange[] = [];
  for (const c of pending) {
    const changes = (c.pending_changes ?? c.consequence_config?.changes ?? []) as unknown;
    const list = Array.isArray(changes)
      ? (changes as (StateChange | AppliedChange)[]).map((x) =>
          "operation" in x ? (x as StateChange) : ({ state_key: x.state_key, operation: "set", value: x.after as never } as StateChange),
        )
      : [];
    const { applied, errors } = previewChanges(working, list);
    if (errors.length || !applied.length) continue;
    await writeState(working, applied);
    working = working.map((s) => {
      const hit = applied.find((a) => a.state_key === s.state_key);
      return hit ? { ...s, value: hit.after } : s;
    });
    await updateConsequence(c.id, {
      status: "applied",
      applied_at: new Date().toISOString(),
      pending_changes: null,
    });
    await logEvent({
      world_id: c.world_id,
      episode_id: episodeId,
      consequence_id: c.id,
      event_type: "delayed_consequence",
      title: c.title || "Forsinket konsekvens",
      description:
        c.student_explanation ??
        "En tidligere beslutning viser først sin virkning nu.",
      academic_rationale: c.academic_rationale,
      state_changes: applied,
      source: "student_decision",
    });
    all.push(...applied);
  }
  return all;
}

/** Reverses the newest non-reverted event that changed state. */
export async function rollbackEvent(event: WorldEvent, states: WorldStateVar[]): Promise<void> {
  if (!event.state_changes.length) throw new Error("Denne hændelse ændrede ikke World-tilstanden.");
  for (const change of event.state_changes) {
    const s = states.find((x) => x.state_key === change.state_key);
    if (!s) continue;
    await updateStateVar(s.id, { value: change.before as never });
  }
  await markEventReverted(event.id);
  if (event.consequence_id) {
    await updateConsequence(event.consequence_id, { status: "idle", applied_at: null });
  }
  await logEvent({
    world_id: event.world_id,
    episode_id: event.episode_id,
    event_type: "rollback",
    title: `Fortrudt: ${event.title}`,
    description: "Læreren fortrød den seneste ændring af World-tilstanden.",
    state_changes: event.state_changes.map((c) => ({
      state_key: c.state_key,
      label: c.label,
      before: c.after,
      after: c.before,
    })),
    source: "teacher",
    student_visible: false,
  });
}

/* ---------------- unlocking ---------------- */

export function isUnlocked(
  condition: unknown,
  ctx: { previousCompleted: boolean; states: WorldStateVar[] },
): { unlocked: boolean; reason: string } {
  if (!condition || typeof condition !== "object") {
    return { unlocked: true, reason: "Ingen betingelse." };
  }
  const c = condition as Record<string, unknown>;
  const kind = String(c["kind"] ?? "teacher_unlock");

  if (kind === "teacher_unlock") {
    return { unlocked: false, reason: "Låses op manuelt af læreren." };
  }
  if (kind === "previous_episode_completed") {
    return {
      unlocked: ctx.previousCompleted,
      reason: ctx.previousCompleted
        ? "Forrige episode er gennemført."
        : "Kræver at forrige episode er gennemført.",
    };
  }
  if (kind === "state_threshold") {
    const s = ctx.states.find((x) => x.state_key === c["state_key"]);
    if (!s) return { unlocked: false, reason: `Variablen '${String(c["state_key"])}' findes ikke.` };
    const comparator = String(c["comparator"] ?? "gte");
    const target = Number(c["value"] ?? 0);
    const current = Number(s.value ?? 0);
    const ok =
      comparator === "lt"
        ? current < target
        : comparator === "lte"
          ? current <= target
          : comparator === "gt"
            ? current > target
            : comparator === "eq"
              ? current === target
              : current >= target;
    const prevOk = c["require_previous"] ? ctx.previousCompleted : true;
    return {
      unlocked: ok && prevOk,
      reason: `${s.label} ${comparatorLabel(comparator)} ${target} (nu ${current})${
        c["require_previous"] ? " og forrige episode gennemført" : ""
      }.`,
    };
  }
  return { unlocked: true, reason: "Ingen betingelse." };
}
