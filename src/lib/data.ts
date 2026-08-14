import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import type { Lesson, LessonBlock, TeacherClass, Unit } from "./types";
import { blockDef } from "./blocks";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du er ikke logget ind.");
  return data.user.id;
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------------- classes ---------------- */

export const classesQuery = () =>
  queryOptions({
    queryKey: ["classes"],
    queryFn: async (): Promise<TeacherClass[]> =>
      unwrap(await supabase.from("classes").select("*").order("created_at", { ascending: true })) as TeacherClass[],
  });

export const classQuery = (classId: string) =>
  queryOptions({
    queryKey: ["class", classId],
    queryFn: async (): Promise<TeacherClass> =>
      unwrap(await supabase.from("classes").select("*").eq("id", classId).single()) as TeacherClass,
  });

export async function createClass(input: {
  name: string;
  subject: string;
  school_year?: string | null;
  notes?: string | null;
}): Promise<TeacherClass> {
  const teacher_id = await currentUserId();
  return unwrap(
    await supabase
      .from("classes")
      .insert({ ...input, teacher_id })
      .select()
      .single(),
  ) as TeacherClass;
}

/* ---------------- units ---------------- */

export const unitsQuery = (classId?: string) =>
  queryOptions({
    queryKey: ["units", classId ?? "all"],
    queryFn: async (): Promise<Unit[]> => {
      let q = supabase.from("units").select("*").order("sort_order", { ascending: true });
      if (classId) q = q.eq("class_id", classId);
      return unwrap(await q) as Unit[];
    },
  });

export async function createUnit(input: {
  class_id: string;
  title: string;
  description?: string | null;
  status?: Unit["status"];
  sort_order?: number;
}): Promise<Unit> {
  const teacher_id = await currentUserId();
  return unwrap(
    await supabase
      .from("units")
      .insert({ ...input, teacher_id })
      .select()
      .single(),
  ) as Unit;
}

export async function updateUnit(id: string, patch: Partial<Unit>): Promise<Unit> {
  return unwrap(await supabase.from("units").update(patch).eq("id", id).select().single()) as Unit;
}

/* ---------------- lessons ---------------- */

export const lessonsQuery = (opts?: { classId?: string; limit?: number }) =>
  queryOptions({
    queryKey: ["lessons", opts?.classId ?? "all", opts?.limit ?? 0],
    queryFn: async (): Promise<Lesson[]> => {
      let q = supabase.from("lessons").select("*").order("updated_at", { ascending: false });
      if (opts?.classId) q = q.eq("class_id", opts.classId);
      if (opts?.limit) q = q.limit(opts.limit);
      return unwrap(await q) as Lesson[];
    },
  });

export const lessonQuery = (lessonId: string) =>
  queryOptions({
    queryKey: ["lesson", lessonId],
    queryFn: async (): Promise<Lesson> =>
      unwrap(await supabase.from("lessons").select("*").eq("id", lessonId).single()) as Lesson,
  });

export async function createLesson(input: {
  class_id: string;
  unit_id?: string | null;
  title: string;
  subject?: string | null;
  duration_minutes: number;
  learning_goal?: string | null;
  teacher_note?: string | null;
}): Promise<Lesson> {
  const teacher_id = await currentUserId();
  return unwrap(
    await supabase
      .from("lessons")
      .insert({ ...input, teacher_id })
      .select()
      .single(),
  ) as Lesson;
}

export async function updateLesson(id: string, patch: Partial<Lesson>): Promise<Lesson> {
  return unwrap(await supabase.from("lessons").update(patch).eq("id", id).select().single()) as Lesson;
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function duplicateLesson(lessonId: string): Promise<Lesson> {
  const teacher_id = await currentUserId();
  const original = unwrap(
    await supabase.from("lessons").select("*").eq("id", lessonId).single(),
  ) as Lesson;
  const blocks = (unwrap(
    await supabase.from("lesson_blocks").select("*").eq("lesson_id", lessonId).order("block_order"),
  ) ?? []) as LessonBlock[];

  const copy = unwrap(
    await supabase
      .from("lessons")
      .insert({
        teacher_id,
        class_id: original.class_id,
        unit_id: original.unit_id,
        title: `${original.title} – kopi`,
        subject: original.subject,
        duration_minutes: original.duration_minutes,
        learning_goal: original.learning_goal,
        teacher_note: original.teacher_note,
        status: "draft",
        mode: original.mode,
      })
      .select()
      .single(),
  ) as Lesson;

  if (blocks.length) {
    const { error } = await supabase.from("lesson_blocks").insert(
      blocks.map((b) => ({
        lesson_id: copy.id,
        teacher_id,
        block_order: b.block_order,
        type: b.type,
        title: b.title,
        duration_minutes: b.duration_minutes,
        student_instructions: b.student_instructions,
        teacher_notes: b.teacher_notes,
        content: b.content as never,
      })),
    );
    if (error) throw new Error(error.message);
  }
  return copy;
}

/* ---------------- blocks ---------------- */

export const blocksQuery = (lessonId: string) =>
  queryOptions({
    queryKey: ["blocks", lessonId],
    queryFn: async (): Promise<LessonBlock[]> =>
      (unwrap(
        await supabase
          .from("lesson_blocks")
          .select("*")
          .eq("lesson_id", lessonId)
          .order("block_order", { ascending: true }),
      ) ?? []) as LessonBlock[],
  });

export async function addBlock(lessonId: string, type: string, order: number): Promise<LessonBlock> {
  const teacher_id = await currentUserId();
  const def = blockDef(type);
  return unwrap(
    await supabase
      .from("lesson_blocks")
      .insert({
        lesson_id: lessonId,
        teacher_id,
        type,
        block_order: order,
        title: def.label,
        duration_minutes: def.defaultDuration,
        content: def.defaultContent as never,
      })
      .select()
      .single(),
  ) as LessonBlock;
}

export async function updateBlock(id: string, patch: Partial<LessonBlock>): Promise<LessonBlock> {
  return unwrap(
    await supabase.from("lesson_blocks").update(patch as never).eq("id", id).select().single(),
  ) as LessonBlock;
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from("lesson_blocks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function duplicateBlock(block: LessonBlock, allBlocks: LessonBlock[]): Promise<LessonBlock> {
  const teacher_id = await currentUserId();
  const copy = unwrap(
    await supabase
      .from("lesson_blocks")
      .insert({
        lesson_id: block.lesson_id,
        teacher_id,
        type: block.type,
        block_order: block.block_order + 1,
        title: `${block.title} – kopi`,
        duration_minutes: block.duration_minutes,
        student_instructions: block.student_instructions,
        teacher_notes: block.teacher_notes,
        content: block.content as never,
      })
      .select()
      .single(),
  ) as LessonBlock;

  const reordered = [
    ...allBlocks.slice(0, allBlocks.findIndex((b) => b.id === block.id) + 1),
    copy,
    ...allBlocks.slice(allBlocks.findIndex((b) => b.id === block.id) + 1),
  ];
  await persistOrder(reordered.map((b) => b.id));
  return copy;
}

export async function persistOrder(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("lesson_blocks")
        .update({ block_order: index })
        .eq("id", id)
        .then(({ error }) => {
          if (error) throw new Error(error.message);
        }),
    ),
  );
}
