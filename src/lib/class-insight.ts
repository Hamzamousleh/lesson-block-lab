import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import type { LessonBlock } from "./types";
import type { SessionParticipant, SessionResponse, StudentSession } from "./sessions";
import { correctIndexOf } from "./response-insight";

export interface ClassInsightNote {
  id: string;
  teacher_id: string;
  class_id: string;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du er ikke logget ind.");
  return data.user.id;
}

export const classNotesQuery = (classId: string) =>
  queryOptions({
    queryKey: ["class-insight-notes", classId],
    queryFn: async (): Promise<ClassInsightNote[]> => {
      const { data, error } = await supabase
        .from("class_insight_notes")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ClassInsightNote[];
    },
  });

export async function createClassNote(input: {
  class_id: string;
  title?: string | null;
  body: string;
}): Promise<void> {
  const teacher_id = await currentUserId();
  const { error } = await supabase.from("class_insight_notes").insert({
    teacher_id,
    class_id: input.class_id,
    title: input.title?.trim() || null,
    body: input.body.trim(),
  } as never);
  if (error) throw new Error("Noten kunne ikke gemmes.");
}

export async function updateClassNote(id: string, patch: { title?: string | null; body?: string }): Promise<void> {
  const { error } = await supabase.from("class_insight_notes").update(patch as never).eq("id", id);
  if (error) throw new Error("Noten kunne ikke opdateres.");
}

export async function deleteClassNote(id: string): Promise<void> {
  const { error } = await supabase.from("class_insight_notes").delete().eq("id", id);
  if (error) throw new Error("Noten kunne ikke slettes.");
}

/* ---------------- deterministic session statistics ---------------- */

export interface SessionStats {
  sessionId: string;
  participants: number;
  completed: number;
  responses: number;
  gradedQuestions: number;
  gradedAnswers: number;
  correctAnswers: number;
  correctPercent: number | null;
}

export function computeSessionStats(
  session: StudentSession,
  participants: SessionParticipant[],
  responses: SessionResponse[],
  blocks: LessonBlock[],
): SessionStats {
  const graded = blocks.filter((b) => correctIndexOf(b) !== null);
  let gradedAnswers = 0;
  let correctAnswers = 0;
  for (const b of graded) {
    const idx = correctIndexOf(b);
    for (const r of responses.filter((r) => r.block_id === b.id)) {
      const sel = r.response_data?.["selected_option_index"];
      if (typeof sel === "number") {
        gradedAnswers += 1;
        if (sel === idx) correctAnswers += 1;
      }
    }
  }
  return {
    sessionId: session.id,
    participants: participants.length,
    completed: participants.filter((p) => p.completed_at).length,
    responses: responses.length,
    gradedQuestions: graded.length,
    gradedAnswers,
    correctAnswers,
    correctPercent: gradedAnswers ? Math.round((correctAnswers / gradedAnswers) * 100) : null,
  };
}

/** Bulk load participants + responses + blocks for a set of sessions in one round of queries. */
export const sessionStatsQuery = (sessions: StudentSession[]) =>
  queryOptions({
    queryKey: ["session-stats", sessions.map((s) => s.id).sort().join(",")],
    enabled: sessions.length > 0,
    queryFn: async (): Promise<Record<string, SessionStats>> => {
      const sessionIds = sessions.map((s) => s.id);
      const lessonIds = Array.from(new Set(sessions.map((s) => s.lesson_id)));
      const [p, r, b] = await Promise.all([
        supabase.from("session_participants").select("*").in("session_id", sessionIds),
        supabase.from("session_responses").select("*").in("session_id", sessionIds),
        supabase.from("lesson_blocks").select("*").in("lesson_id", lessonIds),
      ]);
      if (p.error || r.error || b.error) throw new Error("Overblikket kunne ikke hentes.");
      const parts = (p.data ?? []) as unknown as SessionParticipant[];
      const resps = (r.data ?? []) as unknown as SessionResponse[];
      const blocks = (b.data ?? []) as unknown as LessonBlock[];

      const out: Record<string, SessionStats> = {};
      for (const s of sessions) {
        out[s.id] = computeSessionStats(
          s,
          parts.filter((x) => x.session_id === s.id),
          resps.filter((x) => x.session_id === s.id),
          blocks.filter((x) => x.lesson_id === s.lesson_id),
        );
      }
      return out;
    },
  });
