import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import type { LessonBlock } from "./types";
import { isSessionOwnershipValid } from "./session-security";

export type SessionMode = "live" | "self_paced";
export type SessionStatus = "draft" | "active" | "ended";

export interface StudentSession {
  id: string;
  teacher_id: string;
  lesson_id: string;
  class_id: string | null;
  mode: SessionMode;
  status: SessionStatus;
  join_code: string;
  current_block_id: string | null;
  reveal_results: boolean;
  reveal_answer_key: boolean;
  timer_ends_at: string | null;
  timer_remaining_seconds: number | null;
  timer_show_students: boolean;
  allow_anonymous: boolean;

  variant_label: string | null;
  episode_id: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  display_name: string;
  progress_index: number;
  completed_at: string | null;
  joined_at: string;
  last_seen_at: string;
}

export interface SessionResponse {
  id: string;
  session_id: string;
  participant_id: string;
  block_id: string;
  response_type: string;
  response_data: Record<string, unknown>;
  submitted_at: string;
  updated_at: string;
}

export const SESSION_MODE_LABEL: Record<SessionMode, string> = {
  live: "Live",
  self_paced: "Selvstændig",
};

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  draft: "Klar til start",
  active: "I gang",
  ended: "Afsluttet",
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  return Array.from(
    { length: 6 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("");
}

/* ---------------- queries ---------------- */

export const sessionsQuery = (opts?: { classId?: string; lessonId?: string }) =>
  queryOptions({
    queryKey: ["sessions", opts?.classId ?? "all", opts?.lessonId ?? "all"],
    queryFn: async (): Promise<StudentSession[]> => {
      let q = supabase.from("sessions").select("*").order("created_at", { ascending: false });
      if (opts?.classId) q = q.eq("class_id", opts.classId);
      if (opts?.lessonId) q = q.eq("lesson_id", opts.lessonId);
      return (unwrap(await q) ?? []) as StudentSession[];
    },
  });

/** All sessions launched from a specific World episode. */
export const episodeSessionsQuery = (episodeId: string | null) =>
  queryOptions({
    queryKey: ["episode-sessions", episodeId ?? "none"],
    enabled: !!episodeId,
    queryFn: async (): Promise<StudentSession[]> =>
      episodeId
        ? ((unwrap(
            await supabase
              .from("sessions")
              .select("*")
              .eq("episode_id", episodeId)
              .order("created_at", { ascending: false }),
          ) ?? []) as StudentSession[])
        : [],
  });

export const sessionQuery = (sessionId: string) =>
  queryOptions({
    queryKey: ["session", sessionId],
    queryFn: async (): Promise<StudentSession> =>
      unwrap(
        await supabase.from("sessions").select("*").eq("id", sessionId).single(),
      ) as StudentSession,
  });

export const participantsQuery = (sessionId: string, poll = false) =>
  queryOptions({
    queryKey: ["session-participants", sessionId],
    refetchInterval: poll ? 4000 : false,
    queryFn: async (): Promise<SessionParticipant[]> =>
      (unwrap(
        await supabase
          .from("session_participants")
          .select("*")
          .eq("session_id", sessionId)
          .order("joined_at", { ascending: true }),
      ) ?? []) as SessionParticipant[],
  });

export const responsesQuery = (sessionId: string, poll = false) =>
  queryOptions({
    queryKey: ["session-responses", sessionId],
    refetchInterval: poll ? 4000 : false,
    queryFn: async (): Promise<SessionResponse[]> =>
      (unwrap(
        await supabase
          .from("session_responses")
          .select("*")
          .eq("session_id", sessionId)
          .order("submitted_at", { ascending: true }),
      ) ?? []) as SessionResponse[],
  });

/* ---------------- mutations ---------------- */

export async function createSession(input: {
  lesson_id: string;
  class_id: string | null;
  mode: SessionMode;
  variant_label?: string | null;
  episode_id?: string | null;
}): Promise<StudentSession> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Du er ikke logget ind.");

  const [lessonResult, classResult, episodeResult] = await Promise.all([
    supabase.from("lessons").select("id,teacher_id").eq("id", input.lesson_id).maybeSingle(),
    input.class_id
      ? supabase.from("classes").select("id,teacher_id").eq("id", input.class_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.episode_id
      ? supabase
          .from("world_episodes")
          .select("id,teacher_id,world_id,lesson_id")
          .eq("id", input.episode_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const worldResult = episodeResult.data
    ? await supabase
        .from("worlds")
        .select("id,teacher_id")
        .eq("id", episodeResult.data.world_id)
        .maybeSingle()
    : { data: null, error: null };

  if (
    lessonResult.error ||
    classResult.error ||
    episodeResult.error ||
    worldResult.error ||
    !isSessionOwnershipValid({
      session: {
        teacher_id: auth.user.id,
        lesson_id: input.lesson_id,
        class_id: input.class_id,
        episode_id: input.episode_id ?? null,
      },
      lesson: lessonResult.data,
      teacherClass: classResult.data,
      episode: episodeResult.data,
      world: worldResult.data,
    })
  ) {
    throw new Error("Sessionen kan kun oprettes fra din egen lektion og dit eget World.");
  }

  let lastError = "Sessionen kunne ikke oprettes.";
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        teacher_id: auth.user.id,
        lesson_id: input.lesson_id,
        class_id: input.class_id,
        mode: input.mode,
        status: "draft",
        join_code: randomCode(),
        variant_label: input.variant_label ?? null,
        episode_id: input.episode_id ?? null,
      } as never)
      .select()
      .single();
    if (!error) return data as StudentSession;
    lastError = error.message;
    if (!error.message.toLowerCase().includes("duplicate")) break;
  }
  throw new Error(lastError);
}

export async function updateSession(
  id: string,
  patch: Partial<
    Pick<
      StudentSession,
      | "status"
      | "current_block_id"
      | "reveal_results"
      | "reveal_answer_key"
      | "timer_ends_at"
      | "timer_remaining_seconds"
      | "timer_show_students"
      | "started_at"
      | "ended_at"
    >
  >,
): Promise<StudentSession> {
  if (patch.current_block_id) {
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("lesson_id,teacher_id")
      .eq("id", id)
      .maybeSingle();
    const { data: block, error: blockError } = await supabase
      .from("lesson_blocks")
      .select("id,lesson_id,teacher_id")
      .eq("id", patch.current_block_id)
      .maybeSingle();
    if (
      sessionError ||
      blockError ||
      !session ||
      !block ||
      block.lesson_id !== session.lesson_id ||
      block.teacher_id !== session.teacher_id
    ) {
      throw new Error("Aktiviteten hører ikke til denne session.");
    }
  }

  return unwrap(
    await supabase
      .from("sessions")
      .update(patch as never)
      .eq("id", id)
      .select()
      .single(),
  ) as StudentSession;
}

export async function startSession(
  id: string,
  firstBlockId: string | null,
): Promise<StudentSession> {
  return updateSession(id, {
    status: "active",
    started_at: new Date().toISOString(),
    current_block_id: firstBlockId,
  });
}

export async function endSession(id: string): Promise<StudentSession> {
  return updateSession(id, { status: "ended", ended_at: new Date().toISOString() });
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- helpers ---------------- */

export function joinUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/join/${code}`;
}

export function responseCount(responses: SessionResponse[], blockId: string | null): number {
  if (!blockId) return 0;
  return responses.filter((r) => r.block_id === blockId).length;
}

export function activeSessionLabel(
  session: StudentSession,
  participants: number,
  completed: number,
): string {
  if (session.mode === "live") return `Live · ${participants} deltagere`;
  return `Selvstændig · ${completed}/${participants} færdige`;
}

export function blockById(blocks: LessonBlock[], id: string | null): LessonBlock | undefined {
  return blocks.find((b) => b.id === id);
}

/* ---------------- participant hygiene ---------------- */

/**
 * A participant counts as present when their client has talked to the server
 * recently. Students poll while their screen is open, so this quietly drops
 * abandoned tabs and stale test joins without any tracking.
 */
export const PARTICIPANT_ACTIVE_WINDOW_MS = 15 * 60 * 1000;

export function activeParticipants(
  list: SessionParticipant[],
  session?: Pick<StudentSession, "status"> | null,
): SessionParticipant[] {
  if (session?.status === "ended") return list;
  const cutoff = Date.now() - PARTICIPANT_ACTIVE_WINDOW_MS;
  const fresh = list.filter((p) => {
    const t = new Date(p.last_seen_at ?? p.joined_at).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
  return fresh;
}
