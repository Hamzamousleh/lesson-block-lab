import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isInteractive, summarize, type ResultSummary } from "./results";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/* ------------------------------------------------------------------ *
 * Student-facing session logic.
 * Students have NO database access. Everything goes through these
 * helpers, which authenticate with an opaque participant_token and
 * return only sanitized, session-scoped content.
 * ------------------------------------------------------------------ */

export interface StudentBlockDTO {
  id: string;
  type: string;
  title: string;
  duration_minutes: number;
  student_instructions: string | null;
  content: JsonObject;
  interactive: boolean;
}

/** Sanitized World context — the ONLY World data an anonymous student ever receives. */
export interface WorldSessionContextDTO {
  world_title: string;
  episode_title: string;
  episode_number: number;
  learning_goal: string | null;
  visible_state: { label: string; display: string; value: number | null; max: number | null }[];
  visible_recent_events: { title: string; description: string | null; changes: string[] }[];
}

export interface StudentStateDTO {
  session: {
    id: string;
    mode: "live" | "self_paced";
    status: "draft" | "active" | "ended";
    reveal_results: boolean;
    reveal_answer_key: boolean;
    current_block_id: string | null;
  };
  lesson: {
    title: string;
    subject: string | null;
    learning_goal: string | null;
    duration_minutes: number;
    block_count: number;
  };
  participant: { id: string; display_name: string; progress_index: number; completed: boolean };
  /** live: only the active block (or null). self-paced: the full ordered list. */
  blocks: StudentBlockDTO[];
  currentBlockId: string | null;
  /** block_id -> saved response payload */
  responses: Record<string, JsonObject>;
  /** live results, only when the teacher has revealed them */
  revealed: null | { block_id: string; summary: ResultSummary };
  /**
   * Correct answer for the active block. ONLY populated after the teacher has
   * pressed "Vis facit" — before that the answer key never leaves the server.
   */
  answerKey: null | {
    block_id: string;
    correct_option_index: number;
    my_correct: boolean | null;
    message: string | null;
  };
  /** Countdown shared with students, only when the teacher enabled it. */
  timer: null | { ends_at: string | null; remaining_seconds: number | null };
  /** null unless the session was launched from a World episode */
  world: WorldSessionContextDTO | null;
}


/* ---------------- World context ---------------- */

function displayState(v: {
  value: unknown;
  value_type: string;
  max_value: number | null;
}): string {
  if (v.value === null || v.value === undefined) return "—";
  if (v.value_type === "boolean") return v.value ? "Ja" : "Nej";
  if (v.value_type === "number")
    return typeof v.max_value === "number" ? `${Number(v.value)} / ${v.max_value}` : String(Number(v.value));
  return String(v.value);
}

/**
 * Builds the student World header. Teacher-only state, consequence configs,
 * trigger configs, unlock/branch rules and teacher notes are never selected
 * from the database here — they cannot leak to the client.
 */
export async function loadWorldContext(
  episodeId: string | null,
): Promise<WorldSessionContextDTO | null> {
  if (!episodeId) return null;

  const { data: episode } = await supabaseAdmin
    .from("world_episodes")
    .select("id,world_id,title,learning_goal,episode_number")
    .eq("id", episodeId)
    .maybeSingle();
  if (!episode) return null;

  const { data: world } = await supabaseAdmin
    .from("worlds")
    .select("id,title")
    .eq("id", episode.world_id)
    .maybeSingle();
  if (!world) return null;

  const { data: stateRows } = await supabaseAdmin
    .from("world_state")
    .select("state_key,label,value,value_type,max_value,student_visible,sort_order")
    .eq("world_id", episode.world_id)
    .eq("student_visible", true)
    .order("sort_order", { ascending: true });

  const visibleKeys = new Set((stateRows ?? []).map((r) => r.state_key));

  const { data: eventRows } = await supabaseAdmin
    .from("world_events")
    .select("title,description,state_changes,student_visible,reverted_at,created_at")
    .eq("world_id", episode.world_id)
    .eq("student_visible", true)
    .is("reverted_at", null)
    .order("created_at", { ascending: false })
    .limit(4);

  return {
    world_title: world.title,
    episode_title: episode.title,
    episode_number: episode.episode_number,
    learning_goal: episode.learning_goal,
    visible_state: (stateRows ?? []).map((r) => ({
      label: r.label,
      display: displayState({
        value: r.value,
        value_type: String(r.value_type),
        max_value: r.max_value,
      }),
      value: r.value_type === "number" ? Number(r.value) : null,
      max: r.max_value,
    })),
    visible_recent_events: (eventRows ?? []).map((e) => ({
      title: e.title,
      description: e.description,
      changes: (Array.isArray(e.state_changes) ? e.state_changes : [])
        .map((raw) => (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null))
        .filter((c): c is Record<string, unknown> => !!c && visibleKeys.has(String(c["state_key"] ?? "")))
        .map((c) => `${String(c["label"])}: ${String(c["before"])} → ${String(c["after"])}`),

    })),
  };
}

/** Strip anything the student must never see. */
function sanitizeContent(type: string, content: JsonObject): JsonObject {
  const c: JsonObject = { ...(content ?? {}) };
  if (type === "theory_test") {
    delete c["correct_option_index"];
    delete c["feedback"];
  }
  return c;
}

function toStudentBlock(b: {
  id: string;
  type: string;
  title: string;
  duration_minutes: number;
  student_instructions: string | null;
  content: unknown;
}): StudentBlockDTO {
  return {
    id: b.id,
    type: b.type,
    title: b.title,
    duration_minutes: b.duration_minutes,
    student_instructions: b.student_instructions,
    content: sanitizeContent(b.type, (b.content ?? {}) as JsonObject),
    interactive: isInteractive(b.type),
  };
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function token(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

async function loadBlocks(lessonId: string, variantLabel?: string | null) {
  const { data, error } = await supabaseAdmin
    .from("lesson_blocks")
    .select(
      "id,type,title,duration_minutes,student_instructions,content,is_fallback,block_order,variant_group,variant_label",
    )
    .eq("lesson_id", lessonId)
    .order("block_order", { ascending: true });
  if (error) throw new Error(error.message);
  const blocks = (data ?? []).filter((b) => !b.is_fallback);

  /* Differentiation: a student only ever sees one variant per variant_group. */
  const seen = new Set<string>();
  return blocks.filter((b) => {
    const group = (b as { variant_group?: string | null }).variant_group;
    if (!group) return true;
    const label = (b as { variant_label?: string | null }).variant_label ?? null;
    const groupBlocks = blocks.filter(
      (x) => (x as { variant_group?: string | null }).variant_group === group,
    );
    const wanted = variantLabel ?? null;
    const match =
      groupBlocks.find((x) => (x as { variant_label?: string | null }).variant_label === wanted) ??
      groupBlocks[0];
    if (seen.has(group)) return false;
    if (match && match.id === b.id) {
      seen.add(group);
      return true;
    }
    void label;
    return false;
  });
}

async function participantByToken(participant_token: string) {
  const { data, error } = await supabaseAdmin
    .from("session_participants")
    .select("*")
    .eq("participant_token", participant_token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Din deltagelse kunne ikke genkendes. Deltag igen med koden.");
  return data;
}

async function sessionById(id: string) {
  const { data, error } = await supabaseAdmin.from("sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Aktiviteten findes ikke længere.");
  return data;
}

/* ---------------- join ---------------- */

export async function joinSessionByCode(input: {
  code: string;
  display_name: string;
  participant_token?: string | null | undefined;
}) {
  const code = normalizeCode(input.code);
  const name = input.display_name.trim().slice(0, 60);
  if (!code) throw new Error("Indtast koden fra din underviser.");
  if (!name) throw new Error("Skriv dit navn for at deltage.");

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("join_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!session) throw new Error("Koden findes ikke. Tjek den igen.");
  if (session.status === "ended") throw new Error("Aktiviteten er afsluttet.");

  // Re-join from the same device keeps the same participant row, so a refresh
  // or a lost tab never inflates the participant count.
  if (input.participant_token) {
    const { data: existing } = await supabaseAdmin
      .from("session_participants")
      .select("*")
      .eq("participant_token", input.participant_token)
      .eq("session_id", session.id)
      .maybeSingle();
    if (existing) {
      const { data: updated } = await supabaseAdmin
        .from("session_participants")
        .update({ display_name: name, last_seen_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      return {
        participant_token: input.participant_token,
        code: session.join_code,
        participant_id: existing.id,
        display_name: updated?.display_name ?? name,
      };
    }
  }

  const participant_token = token();
  const { data: participant, error: pErr } = await supabaseAdmin
    .from("session_participants")
    .insert({ session_id: session.id, display_name: name, participant_token })
    .select()
    .single();
  if (pErr) throw new Error(pErr.message);

  return {
    participant_token,
    code: session.join_code,
    participant_id: participant.id,
    display_name: participant.display_name,
  };
}

/** Public, no-token check so /join/:code can show the lesson before naming. */
export async function peekSessionByCode(code: string) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id,status,mode,lesson_id")
    .eq("join_code", normalizeCode(code))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { found: false as const };
  const { data: lesson } = await supabaseAdmin
    .from("lessons")
    .select("title,subject")
    .eq("id", data.lesson_id)
    .maybeSingle();
  return {
    found: true as const,
    status: data.status,
    mode: data.mode,
    title: lesson?.title ?? "Aktivitet",
    subject: lesson?.subject ?? null,
  };
}

/* ---------------- student state ---------------- */

export async function getStudentState(participant_token: string): Promise<StudentStateDTO> {
  const participant = await participantByToken(participant_token);
  const session = await sessionById(participant.session_id);

  void supabaseAdmin
    .from("session_participants")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", participant.id)
    .then(() => undefined);

  const { data: lesson } = await supabaseAdmin
    .from("lessons")
    .select("title,subject,learning_goal,duration_minutes")
    .eq("id", session.lesson_id)
    .maybeSingle();

  const all = await loadBlocks(session.lesson_id, (session as { variant_label?: string | null }).variant_label ?? null);
  const currentBlockId =
    session.mode === "live" ? session.current_block_id : (all[participant.progress_index]?.id ?? null);

  const visible =
    session.mode === "live"
      ? all.filter((b) => b.id === session.current_block_id)
      : all;

  const { data: myResponses } = await supabaseAdmin
    .from("session_responses")
    .select("block_id,response_data")
    .eq("participant_id", participant.id);

  const responses: Record<string, JsonObject> = {};
  for (const r of myResponses ?? []) responses[r.block_id] = (r.response_data ?? {}) as JsonObject;

  let revealed: StudentStateDTO["revealed"] = null;
  if (session.mode === "live" && session.reveal_results && session.current_block_id) {
    const block = all.find((b) => b.id === session.current_block_id);
    if (block) {
      const { data: rows } = await supabaseAdmin
        .from("session_responses")
        .select("response_data,participant_id")
        .eq("session_id", session.id)
        .eq("block_id", block.id);
      const summary = summarize(
        block.type,
        (block.content ?? {}) as Record<string, unknown>,
        (rows ?? []).map((r) => ({
          display_name: "",
          response_data: (r.response_data ?? {}) as Record<string, unknown>,
        })),
      );
      revealed = { block_id: block.id, summary };
    }
  }

  /* Answer key: never leaves the server before the teacher reveals it. */
  const sx = session as unknown as {
    reveal_answer_key?: boolean | null;
    timer_ends_at?: string | null;
    timer_remaining_seconds?: number | null;
    timer_show_students?: boolean | null;
  };
  let answerKey: StudentStateDTO["answerKey"] = null;
  const keyBlockId = session.mode === "live" ? session.current_block_id : currentBlockId;
  if (sx.reveal_answer_key === true && keyBlockId) {
    const block = all.find((b) => b.id === keyBlockId);
    const c = (block?.content ?? {}) as Record<string, unknown>;
    const idx = c["correct_option_index"];
    if (block && block.type === "theory_test" && typeof idx === "number") {
      const mine = responses[block.id]?.["selected_option_index"];
      const myCorrect = typeof mine === "number" ? mine === idx : null;
      const fb = (c["feedback"] ?? {}) as Record<string, unknown>;
      const raw = myCorrect === null ? null : myCorrect ? fb["correct"] : fb["incorrect"];
      answerKey = {
        block_id: block.id,
        correct_option_index: idx,
        my_correct: myCorrect,
        message: typeof raw === "string" && raw.trim() ? raw : null,
      };
    }
  }

  const timer =
    sx.timer_show_students === true
      ? {
          ends_at: sx.timer_ends_at ?? null,
          remaining_seconds:
            typeof sx.timer_remaining_seconds === "number" ? sx.timer_remaining_seconds : null,
        }
      : null;

  return {
    session: {
      id: session.id,
      mode: session.mode,
      status: session.status,
      reveal_results: session.reveal_results,
      reveal_answer_key: sx.reveal_answer_key === true,
      current_block_id: session.current_block_id,
    },

    lesson: {
      title: lesson?.title ?? "Aktivitet",
      subject: lesson?.subject ?? null,
      learning_goal: lesson?.learning_goal ?? null,
      duration_minutes: lesson?.duration_minutes ?? 0,
      block_count: all.length,
    },
    participant: {
      id: participant.id,
      display_name: participant.display_name,
      progress_index: participant.progress_index,
      completed: !!participant.completed_at,
    },
    blocks: visible.map(toStudentBlock),
    currentBlockId,
    responses,
    revealed,
    answerKey,
    timer,
    world: await loadWorldContext((session as { episode_id?: string | null }).episode_id ?? null),


  };
}

/* ---------------- submit ---------------- */

export async function submitStudentResponse(input: {
  participant_token: string;
  block_id: string;
  response_data: Record<string, unknown>;
}) {
  const participant = await participantByToken(input.participant_token);
  const session = await sessionById(participant.session_id);
  if (session.status === "ended") throw new Error("Aktiviteten er afsluttet. Dit svar kan ikke gemmes.");

  const { data: block, error: bErr } = await supabaseAdmin
    .from("lesson_blocks")
    .select("id,type,content,lesson_id")
    .eq("id", input.block_id)
    .maybeSingle();
  if (bErr) throw new Error(bErr.message);
  if (!block || block.lesson_id !== session.lesson_id) throw new Error("Aktiviteten hører ikke til denne session.");
  if (session.mode === "live" && session.current_block_id !== block.id)
    throw new Error("Aktiviteten er ikke længere aktiv.");

  const { error } = await supabaseAdmin
    .from("session_responses")
    .upsert(
      {
        session_id: session.id,
        participant_id: participant.id,
        block_id: block.id,
        response_type: block.type,
        response_data: input.response_data as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id,block_id" },
    );
  if (error) throw new Error(error.message);

  // Self-paced feedback for MCQ, computed server-side so the answer key never ships.
  let feedback: { correct: boolean; message: string } | null = null;
  if (session.mode === "self_paced" && block.type === "theory_test") {
    const c = (block.content ?? {}) as Record<string, unknown>;
    const key = c["correct_option_index"];
    if (typeof key === "number") {
      const picked = input.response_data["selected_option_index"];
      const correct = picked === key;
      const fb = (c["feedback"] ?? {}) as Record<string, unknown>;
      const custom = correct ? fb["correct"] : fb["incorrect"];
      feedback = {
        correct,
        message:
          typeof custom === "string" && custom.trim()
            ? custom
            : correct
              ? "Korrekt ✓"
              : "Prøv at se på teorien igen.",
      };
    }
  }
  return { ok: true as const, feedback };
}

export async function setStudentProgress(input: {
  participant_token: string;
  progress_index: number;
  completed?: boolean | undefined;
}) {
  const participant = await participantByToken(input.participant_token);
  const patch: Record<string, unknown> = {
    progress_index: Math.max(0, Math.floor(input.progress_index)),
    last_seen_at: new Date().toISOString(),
  };
  if (input.completed) patch["completed_at"] = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("session_participants")
    .update(patch as never)
    .eq("id", participant.id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}
