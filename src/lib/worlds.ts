import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";

/* ------------------------------------------------------------------ *
 * Worlds — persistent learning universes.
 * A World organises existing Lessons/Blocks/Sessions; it is not a
 * second lesson system.
 * ------------------------------------------------------------------ */

export type WorldStatus = "draft" | "active" | "completed" | "archived";
export type EpisodeStatus = "locked" | "available" | "active" | "completed";
export type StateValueType = "number" | "boolean" | "text" | "enum";
export type ConsequenceStatus = "idle" | "pending" | "applied" | "skipped";
export type WorldType = "people" | "society" | "organization" | "other";

export const WORLD_STATUS_LABEL: Record<WorldStatus, string> = {
  draft: "Kladde",
  active: "Aktivt",
  completed: "Afsluttet",
  archived: "Arkiveret",
};

export const EPISODE_STATUS_LABEL: Record<EpisodeStatus, string> = {
  locked: "Låst",
  available: "Klar",
  active: "I gang",
  completed: "Gennemført",
};

export const WORLD_TYPE_LABEL: Record<WorldType, string> = {
  people: "Personer og relationer",
  society: "Samfund / land",
  organization: "Organisation / virksomhed",
  other: "Andet",
};

export const COMPLEXITY_LEVELS = [
  { key: "introduktion", label: "Introduktion", hint: "Eleverne møder og forstår situationen." },
  { key: "anvendelse", label: "Anvendelse", hint: "Eleverne anvender teori på situationen." },
  { key: "analyse", label: "Analyse", hint: "Eleverne sammenligner perspektiver og årsager." },
  { key: "vurdering", label: "Vurdering", hint: "Eleverne vurderer konsekvenser og afvejninger." },
  { key: "syntese", label: "Syntese", hint: "Eleverne træffer valg under usikkerhed og revurderer." },
] as const;

export type ComplexityLevel = (typeof COMPLEXITY_LEVELS)[number]["key"];

export function complexityLabel(key: string): string {
  return COMPLEXITY_LEVELS.find((c) => c.key === key)?.label ?? key;
}

export function complexityIndex(key: string): number {
  const i = COMPLEXITY_LEVELS.findIndex((c) => c.key === key);
  return i < 0 ? 1 : i;
}

/* ---------------- types ---------------- */

export interface World {
  id: string;
  teacher_id: string;
  class_id: string | null;
  title: string;
  subject: string;
  description: string | null;
  premise: string | null;
  world_type: string;
  academic_focus: string | null;
  visual_theme: string | null;
  status: WorldStatus;
  completed_summary: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WorldEpisode {
  id: string;
  world_id: string;
  teacher_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  learning_goal: string | null;
  academic_concepts: string[];
  episode_number: number;
  branch_key: string | null;
  complexity_level: string;
  status: EpisodeStatus;
  unlock_condition: UnlockCondition | null;
  completion_condition: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type UnlockCondition =
  | { kind: "teacher_unlock" }
  | { kind: "previous_episode_completed" }
  | {
      kind: "state_threshold";
      state_key: string;
      comparator: "lt" | "lte" | "gt" | "gte" | "eq";
      value: number;
      require_previous?: boolean;
    };

export interface WorldStateVar {
  id: string;
  world_id: string;
  teacher_id: string;
  state_key: string;
  label: string;
  value: unknown;
  initial_value: unknown;
  value_type: StateValueType;
  min_value: number | null;
  max_value: number | null;
  enum_options: string[];
  description: string | null;
  student_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type StateOperation = "set" | "increase" | "decrease" | "enum_change" | "boolean_toggle";

export interface StateChange {
  state_key: string;
  operation: StateOperation;
  amount?: number;
  value?: string | number | boolean;
}

export type TriggerType =
  | "manual"
  | "teacher_selected"
  | "majority_choice"
  | "threshold"
  | "response_distribution";

export type RevealTiming = "immediate" | "end_of_block" | "end_of_episode" | "next_episode";

export const REVEAL_LABEL: Record<RevealTiming, string> = {
  immediate: "Med det samme",
  end_of_block: "Efter aktiviteten",
  end_of_episode: "Ved episodens afslutning",
  next_episode: "Først i næste episode",
};

export const TRIGGER_LABEL: Record<TriggerType, string> = {
  manual: "Manuel (læreren beslutter)",
  teacher_selected: "Læreren vælger udfald",
  majority_choice: "Flertallets valg",
  threshold: "Gennemsnit over/under grænse",
  response_distribution: "Andel der vælger en mulighed",
};

export interface WorldConsequence {
  id: string;
  world_id: string;
  teacher_id: string;
  episode_id: string | null;
  source_block_id: string | null;
  title: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  consequence_config: { changes: StateChange[] };
  reveal_timing: RevealTiming;
  teacher_explanation: string | null;
  student_explanation: string | null;
  academic_rationale: string | null;
  status: ConsequenceStatus;
  pending_changes: StateChange[] | AppliedChange[] | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppliedChange {
  state_key: string;
  label: string;
  before: unknown;
  after: unknown;
}

export interface WorldEvent {
  id: string;
  world_id: string;
  teacher_id: string;
  episode_id: string | null;
  consequence_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  academic_rationale: string | null;
  state_changes: AppliedChange[];
  source: string;
  student_visible: boolean;
  reverted_at: string | null;
  created_at: string;
}

/* ---------------- helpers ---------------- */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du er ikke logget ind.");
  return data.user.id;
}

const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

/* ---------------- queries ---------------- */

export const worldsQuery = () =>
  queryOptions({
    queryKey: ["worlds"],
    queryFn: async (): Promise<World[]> =>
      (unwrap(await db.from("worlds").select("*").order("updated_at", { ascending: false })) ??
        []) as World[],
  });

export const worldQuery = (worldId: string) =>
  queryOptions({
    queryKey: ["world", worldId],
    queryFn: async (): Promise<World> =>
      unwrap(await db.from("worlds").select("*").eq("id", worldId).single()) as World,
  });

export const episodesQuery = (worldId: string) =>
  queryOptions({
    queryKey: ["world-episodes", worldId],
    queryFn: async (): Promise<WorldEpisode[]> =>
      (unwrap(
        await db
          .from("world_episodes")
          .select("*")
          .eq("world_id", worldId)
          .order("episode_number", { ascending: true })
          .order("branch_key", { ascending: true }),
      ) ?? []) as WorldEpisode[],
  });

export const worldStateQuery = (worldId: string) =>
  queryOptions({
    queryKey: ["world-state", worldId],
    queryFn: async (): Promise<WorldStateVar[]> =>
      (unwrap(
        await db
          .from("world_state")
          .select("*")
          .eq("world_id", worldId)
          .order("sort_order", { ascending: true }),
      ) ?? []) as WorldStateVar[],
  });

export const worldEventsQuery = (worldId: string) =>
  queryOptions({
    queryKey: ["world-events", worldId],
    queryFn: async (): Promise<WorldEvent[]> =>
      (unwrap(
        await db
          .from("world_events")
          .select("*")
          .eq("world_id", worldId)
          .order("created_at", { ascending: false }),
      ) ?? []) as WorldEvent[],
  });

export const consequencesQuery = (worldId: string, episodeId?: string) =>
  queryOptions({
    queryKey: ["world-consequences", worldId, episodeId ?? "all"],
    queryFn: async (): Promise<WorldConsequence[]> => {
      let q = db.from("world_consequences").select("*").eq("world_id", worldId);
      if (episodeId) q = q.eq("episode_id", episodeId);
      return ((unwrap(await q.order("created_at", { ascending: true })) ??
        []) as WorldConsequence[]);
    },
  });

/* ---------------- mutations ---------------- */

export interface StateDraft {
  state_key: string;
  label: string;
  value: unknown;
  value_type: StateValueType;
  min_value?: number | null;
  max_value?: number | null;
  enum_options?: string[];
  description?: string | null;
  student_visible?: boolean;
}

export async function createWorld(input: {
  title: string;
  subject: string;
  class_id?: string | null;
  description?: string | null;
  premise?: string | null;
  world_type?: string;
  academic_focus?: string | null;
  status?: WorldStatus;
  state: StateDraft[];
}): Promise<World> {
  const teacher_id = await currentUserId();
  const world = unwrap(
    await db
      .from("worlds")
      .insert({
        teacher_id,
        title: input.title,
        subject: input.subject,
        class_id: input.class_id ?? null,
        description: input.description ?? null,
        premise: input.premise ?? null,
        world_type: input.world_type ?? "other",
        academic_focus: input.academic_focus ?? null,
        status: input.status ?? "active",
      })
      .select()
      .single(),
  ) as World;

  if (input.state.length) {
    const { error } = await db.from("world_state").insert(
      input.state.map((s, i) => ({
        world_id: world.id,
        teacher_id,
        state_key: s.state_key,
        label: s.label,
        value: s.value ?? null,
        initial_value: s.value ?? null,
        value_type: s.value_type,
        min_value: s.min_value ?? null,
        max_value: s.max_value ?? null,
        enum_options: s.enum_options ?? [],
        description: s.description ?? null,
        student_visible: s.student_visible ?? true,
        sort_order: i,
      })),
    );
    if (error) {
      await db.from("worlds").delete().eq("id", world.id);
      throw new Error(
        error.message.includes("world_state_world_id_state_key_key")
          ? "To variabler har samme nøgle. Hver variabel skal have en unik nøgle."
          : error.message,
      );
    }
  }
  return world;
}

export async function updateWorld(id: string, patch: Partial<World>): Promise<World> {
  return unwrap(await db.from("worlds").update(patch).eq("id", id).select().single()) as World;
}

export async function deleteWorld(id: string): Promise<void> {
  const { error } = await db.from("worlds").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addStateVar(worldId: string, draft: StateDraft, sortOrder: number) {
  const teacher_id = await currentUserId();
  const res = await db
    .from("world_state")
    .insert({
      world_id: worldId,
      teacher_id,
      state_key: draft.state_key,
      label: draft.label,
      value: draft.value ?? null,
      initial_value: draft.value ?? null,
      value_type: draft.value_type,
      min_value: draft.min_value ?? null,
      max_value: draft.max_value ?? null,
      enum_options: draft.enum_options ?? [],
      description: draft.description ?? null,
      student_visible: draft.student_visible ?? true,
      sort_order: sortOrder,
    })
    .select()
    .single();
  if (res.error) {
    throw new Error(
      String(res.error.message).includes("world_state_world_id_state_key_key")
        ? `Nøglen '${draft.state_key}' findes allerede i dette World.`
        : res.error.message,
    );
  }
  return res.data as WorldStateVar;
}

export async function updateStateVar(id: string, patch: Partial<WorldStateVar>) {
  return unwrap(await db.from("world_state").update(patch).eq("id", id).select().single()) as WorldStateVar;
}

export async function deleteStateVar(id: string): Promise<void> {
  const { error } = await db.from("world_state").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createEpisode(input: {
  world_id: string;
  title: string;
  description?: string | null;
  learning_goal?: string | null;
  academic_concepts?: string[];
  episode_number: number;
  branch_key?: string | null;
  complexity_level: string;
  lesson_id?: string | null;
  unlock_condition?: UnlockCondition | null;
  status?: EpisodeStatus;
}): Promise<WorldEpisode> {
  const teacher_id = await currentUserId();
  return unwrap(
    await db
      .from("world_episodes")
      .insert({
        teacher_id,
        world_id: input.world_id,
        title: input.title,
        description: input.description ?? null,
        learning_goal: input.learning_goal ?? null,
        academic_concepts: input.academic_concepts ?? [],
        episode_number: input.episode_number,
        branch_key: input.branch_key ?? null,
        complexity_level: input.complexity_level,
        lesson_id: input.lesson_id ?? null,
        unlock_condition: input.unlock_condition ?? null,
        status: input.status ?? "available",
      })
      .select()
      .single(),
  ) as WorldEpisode;
}

export async function updateEpisode(id: string, patch: Partial<WorldEpisode>): Promise<WorldEpisode> {
  return unwrap(
    await db.from("world_episodes").update(patch).eq("id", id).select().single(),
  ) as WorldEpisode;
}

export async function deleteEpisode(id: string): Promise<void> {
  const { error } = await db.from("world_episodes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createConsequence(input: {
  world_id: string;
  episode_id: string;
  source_block_id?: string | null;
  title: string;
  trigger_type: TriggerType;
  trigger_config?: Record<string, unknown>;
  changes: StateChange[];
  reveal_timing: RevealTiming;
  teacher_explanation?: string | null;
  student_explanation?: string | null;
  academic_rationale?: string | null;
}): Promise<WorldConsequence> {
  const teacher_id = await currentUserId();
  return unwrap(
    await db
      .from("world_consequences")
      .insert({
        teacher_id,
        world_id: input.world_id,
        episode_id: input.episode_id,
        source_block_id: input.source_block_id ?? null,
        title: input.title,
        trigger_type: input.trigger_type,
        trigger_config: input.trigger_config ?? {},
        consequence_config: { changes: input.changes },
        reveal_timing: input.reveal_timing,
        teacher_explanation: input.teacher_explanation ?? null,
        student_explanation: input.student_explanation ?? null,
        academic_rationale: input.academic_rationale ?? null,
      })
      .select()
      .single(),
  ) as WorldConsequence;
}

export async function updateConsequence(
  id: string,
  patch: Partial<WorldConsequence>,
): Promise<WorldConsequence> {
  return unwrap(
    await db.from("world_consequences").update(patch).eq("id", id).select().single(),
  ) as WorldConsequence;
}

export async function deleteConsequence(id: string): Promise<void> {
  const { error } = await db.from("world_consequences").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function logEvent(input: {
  world_id: string;
  episode_id?: string | null;
  consequence_id?: string | null;
  event_type: string;
  title: string;
  description?: string | null;
  academic_rationale?: string | null;
  state_changes?: AppliedChange[];
  source: string;
  student_visible?: boolean;
}): Promise<WorldEvent> {
  const teacher_id = await currentUserId();
  return unwrap(
    await db
      .from("world_events")
      .insert({
        teacher_id,
        world_id: input.world_id,
        episode_id: input.episode_id ?? null,
        consequence_id: input.consequence_id ?? null,
        event_type: input.event_type,
        title: input.title,
        description: input.description ?? null,
        academic_rationale: input.academic_rationale ?? null,
        state_changes: input.state_changes ?? [],
        source: input.source,
        student_visible: input.student_visible ?? true,
      })
      .select()
      .single(),
  ) as WorldEvent;
}

export async function markEventReverted(id: string): Promise<void> {
  const { error } = await db
    .from("world_events")
    .update({ reverted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export interface WorldTransactionResult {
  duplicate: boolean;
  deferred?: boolean;
  applied?: AppliedChange[];
  consequence?: WorldConsequence | null;
  consequences?: WorldConsequence[];
  event?: WorldEvent | null;
  events?: WorldEvent[];
  reverted_event?: WorldEvent;
  state: WorldStateVar[];
}

export async function applyWorldConsequence(input: {
  consequenceId: string;
  changes: StateChange[];
  reasonText: string;
}): Promise<WorldTransactionResult> {
  return unwrap(
    await db.rpc("world_apply_consequence", {
      p_consequence_id: input.consequenceId,
      p_changes: input.changes,
      p_reason_text: input.reasonText,
    }),
  ) as WorldTransactionResult;
}

export async function releaseWorldConsequences(
  consequenceIds: string[],
  episodeId: string,
): Promise<WorldTransactionResult> {
  return unwrap(
    await db.rpc("world_release_consequences", {
      p_consequence_ids: consequenceIds,
      p_episode_id: episodeId,
    }),
  ) as WorldTransactionResult;
}

export async function rollbackWorldEvent(eventId: string): Promise<WorldTransactionResult> {
  return unwrap(
    await db.rpc("world_rollback_event", { p_event_id: eventId }),
  ) as WorldTransactionResult;
}

/* ------------------------------------------------------------------ *
 * Phase 6.1 — episode ↔ session integration, branching, completion.
 * ------------------------------------------------------------------ */

import { summarize, type ResultSummary } from "./results";

export interface EpisodeSessionStats {
  sessionId: string | null;
  status: string | null;
  mode: string | null;
  joinCode: string | null;
  participants: number;
  responses: number;
}

/** Latest student session launched from an episode, with live counts. */
export const episodeStatsQuery = (episodeId: string) =>
  queryOptions({
    queryKey: ["episode-stats", episodeId],
    queryFn: async (): Promise<EpisodeSessionStats> => {
      const sessions = (unwrap(
        await db
          .from("sessions")
          .select("id,status,mode,join_code,created_at")
          .eq("episode_id", episodeId)
          .order("created_at", { ascending: false }),
      ) ?? []) as {
        id: string;
        status: string;
        mode: string;
        join_code: string;
      }[];
      const latest = sessions[0];
      if (!latest)
        return { sessionId: null, status: null, mode: null, joinCode: null, participants: 0, responses: 0 };
      const participants = (unwrap(
        await db.from("session_participants").select("id").eq("session_id", latest.id),
      ) ?? []) as { id: string }[];
      const responses = (unwrap(
        await db.from("session_responses").select("id").eq("session_id", latest.id),
      ) ?? []) as { id: string }[];
      return {
        sessionId: latest.id,
        status: latest.status,
        mode: latest.mode,
        joinCode: latest.join_code,
        participants: participants.length,
        responses: responses.length,
      };
    },
  });

export interface DecisionData {
  summary: ResultSummary | null;
  blockTitle: string | null;
  total: number;
}

/**
 * Reuses the Phase 4/5 response summarizer to build the decision basis for a
 * consequence: all responses to its source block across sessions for the episode.
 */
export const decisionQuery = (episodeId: string, blockId: string | null) =>
  queryOptions({
    queryKey: ["world-decision", episodeId, blockId ?? "none"],
    enabled: !!blockId,
    refetchInterval: 6000,
    queryFn: async (): Promise<DecisionData> => {
      if (!blockId) return { summary: null, blockTitle: null, total: 0 };
      const block = unwrap(
        await db.from("lesson_blocks").select("id,type,title,content").eq("id", blockId).maybeSingle(),
      ) as { id: string; type: string; title: string; content: Record<string, unknown> } | null;
      if (!block) return { summary: null, blockTitle: null, total: 0 };

      const sessions = (unwrap(
        await db.from("sessions").select("id").eq("episode_id", episodeId),
      ) ?? []) as { id: string }[];
      if (!sessions.length) return { summary: null, blockTitle: block.title, total: 0 };

      const rows = (unwrap(
        await db
          .from("session_responses")
          .select("response_data,session_id")
          .eq("block_id", blockId)
          .in(
            "session_id",
            sessions.map((s) => s.id),
          ),
      ) ?? []) as { response_data: Record<string, unknown> }[];

      const summary = summarize(
        block.type,
        block.content ?? {},
        rows.map((r) => ({ display_name: "", response_data: r.response_data ?? {} })),
      );
      return { summary, blockTitle: block.title, total: rows.length };
    },
  });

/* ---------------- branching ---------------- */

export interface BranchCondition {
  kind: "state_threshold";
  state_key: string;
  comparator: "lt" | "lte" | "gt" | "gte" | "eq";
  value: number;
}

/** An episode is a branch when it has a branch_key. */
export function isBranch(e: WorldEpisode): boolean {
  return !!e.branch_key;
}

/* ---------------- completion ---------------- */

export interface WorldSummary {
  episodes_completed: number;
  episodes_total: number;
  start_state: { label: string; value: string }[];
  final_state: { label: string; value: string }[];
  major_events: { title: string; changes: string }[];
}

export function buildWorldSummary(
  episodes: WorldEpisode[],
  states: WorldStateVar[],
  events: WorldEvent[],
): WorldSummary {
  const fmt = (v: unknown) => (v === null || v === undefined ? "—" : String(v));
  return {
    episodes_completed: episodes.filter((e) => e.status === "completed").length,
    episodes_total: episodes.length,
    start_state: states.map((s) => ({ label: s.label, value: fmt(s.initial_value) })),
    final_state: states.map((s) => ({ label: s.label, value: fmt(s.value) })),
    major_events: events
      .filter((e) => !e.reverted_at && e.state_changes.length > 0)
      .slice(0, 12)
      .map((e) => ({
        title: e.title,
        changes: e.state_changes.map((c) => `${c.label}: ${fmt(c.before)} → ${fmt(c.after)}`).join(" · "),
      })),
  };
}

export async function completeWorld(world: World, summary: WorldSummary): Promise<World> {
  return updateWorld(world.id, {
    status: "completed",
    completed_summary: summary as unknown as Record<string, unknown>,
  });
}

/* ---------------- duplication ---------------- */

/**
 * Copies a World for a new class: metadata, state (reset to initial values),
 * episodes with their lessons/blocks and consequence rules.
 * Sessions, participants, responses, history and applied status are NOT copied.
 */
export async function duplicateWorld(worldId: string, classId: string | null): Promise<World> {
  const teacher_id = await currentUserId();
  const source = unwrap(await db.from("worlds").select("*").eq("id", worldId).single()) as World;
  const states = (unwrap(
    await db.from("world_state").select("*").eq("world_id", worldId).order("sort_order"),
  ) ?? []) as WorldStateVar[];
  const episodes = (unwrap(
    await db.from("world_episodes").select("*").eq("world_id", worldId).order("episode_number"),
  ) ?? []) as WorldEpisode[];
  const consequences = (unwrap(
    await db.from("world_consequences").select("*").eq("world_id", worldId),
  ) ?? []) as WorldConsequence[];

  const copy = await createWorld({
    title: `${source.title} (kopi)`,
    subject: source.subject,
    class_id: classId,
    description: source.description,
    premise: source.premise,
    world_type: source.world_type,
    academic_focus: source.academic_focus,
    status: "active",
    state: states.map((s) => ({
      state_key: s.state_key,
      label: s.label,
      value: s.initial_value ?? s.value,
      value_type: s.value_type,
      min_value: s.min_value,
      max_value: s.max_value,
      enum_options: s.enum_options,
      description: s.description,
      student_visible: s.student_visible,
    })),
  });

  try {
    for (const ep of episodes) {
      let newLessonId: string | null = null;
      const blockMap: Record<string, string> = {};

      if (ep.lesson_id) {
        const lesson = unwrap(
          await db.from("lessons").select("*").eq("id", ep.lesson_id).maybeSingle(),
        ) as Record<string, unknown> | null;
        if (lesson) {
          const created = unwrap(
            await db
              .from("lessons")
              .insert({
                teacher_id,
                class_id: classId ?? (lesson["class_id"] as string),
                unit_id: null,
                title: lesson["title"],
                subject: lesson["subject"],
                duration_minutes: lesson["duration_minutes"],
                learning_goal: lesson["learning_goal"],
                teacher_note: lesson["teacher_note"],
                status: "draft",
                mode: lesson["mode"],
              })
              .select()
              .single(),
          ) as { id: string };
          newLessonId = created.id;

          const blocks = (unwrap(
            await db.from("lesson_blocks").select("*").eq("lesson_id", ep.lesson_id).order("block_order"),
          ) ?? []) as Record<string, unknown>[];
          for (const b of blocks) {
            const nb = unwrap(
              await db
                .from("lesson_blocks")
                .insert({
                  lesson_id: newLessonId,
                  teacher_id,
                  block_order: b["block_order"],
                  type: b["type"],
                  title: b["title"],
                  duration_minutes: b["duration_minutes"],
                  student_instructions: b["student_instructions"],
                  teacher_notes: b["teacher_notes"],
                  content: b["content"],
                  is_fallback: b["is_fallback"],
                  variant_group: b["variant_group"],
                  variant_label: b["variant_label"],
                })
                .select("id")
                .single(),
            ) as { id: string };
            blockMap[b["id"] as string] = nb.id;
          }
        }
      }

      const newEp = await createEpisode({
        world_id: copy.id,
        title: ep.title,
        description: ep.description,
        learning_goal: ep.learning_goal,
        academic_concepts: ep.academic_concepts,
        episode_number: ep.episode_number,
        branch_key: ep.branch_key,
        complexity_level: ep.complexity_level,
        lesson_id: newLessonId,
        unlock_condition: ep.unlock_condition,
        status: ep.unlock_condition ? "locked" : "available",
      });

      for (const c of consequences.filter((x) => x.episode_id === ep.id)) {
        await createConsequence({
          world_id: copy.id,
          episode_id: newEp.id,
          source_block_id: c.source_block_id ? (blockMap[c.source_block_id] ?? null) : null,
          title: c.title,
          trigger_type: c.trigger_type,
          trigger_config: c.trigger_config,
          changes: c.consequence_config?.changes ?? [],
          reveal_timing: c.reveal_timing,
          teacher_explanation: c.teacher_explanation,
          student_explanation: c.student_explanation,
          academic_rationale: c.academic_rationale,
        });
      }
    }
  } catch (e) {
    await deleteWorld(copy.id);
    throw e;
  }
  return copy;
}
