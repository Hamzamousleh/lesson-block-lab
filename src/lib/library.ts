import { supabase } from "@/integrations/supabase/client";
import { queryOptions } from "@tanstack/react-query";
import type { LessonBlock, LibraryItem, Lesson } from "./types";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du er ikke logget ind.");
  return data.user.id;
}

/** Snapshot of a block stored in the library — copied, never a pointer. */
export interface LibraryBlockData {
  type: string;
  title: string;
  duration_minutes: number;
  student_instructions: string | null;
  teacher_notes: string | null;
  content: Record<string, unknown>;
}

export interface LibraryLessonData {
  title: string;
  subject: string | null;
  duration_minutes: number;
  learning_goal: string | null;
  teacher_note: string | null;
  mode: string;
  blocks: (LibraryBlockData & { is_fallback: boolean })[];
}

export const libraryQuery = () =>
  queryOptions({
    queryKey: ["library"],
    queryFn: async (): Promise<LibraryItem[]> => {
      const { data, error } = await supabase
        .from("library_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LibraryItem[];
    },
  });

export async function saveBlockToLibrary(
  block: LessonBlock,
  opts: { title?: string; tags?: string[]; subject?: string | null } = {},
): Promise<void> {
  const teacher_id = await currentUserId();
  const data: LibraryBlockData = {
    type: block.type,
    title: block.title,
    duration_minutes: block.duration_minutes,
    student_instructions: block.student_instructions,
    teacher_notes: block.teacher_notes,
    content: block.content ?? {},
  };
  const { error } = await supabase.from("library_items").insert({
    teacher_id,
    item_type: "block",
    title: (opts.title ?? block.title).trim() || block.title,
    subject: opts.subject ?? null,
    block_type: block.type,
    duration_minutes: block.duration_minutes,
    tags: opts.tags ?? [],
    data: data as never,
  });
  if (error) throw new Error("Aktiviteten kunne ikke gemmes i biblioteket.");
}

export async function saveLessonToLibrary(
  lesson: Lesson,
  blocks: LessonBlock[],
  opts: { title?: string; tags?: string[] } = {},
): Promise<void> {
  const teacher_id = await currentUserId();
  const data: LibraryLessonData = {
    title: lesson.title,
    subject: lesson.subject,
    duration_minutes: lesson.duration_minutes,
    learning_goal: lesson.learning_goal,
    teacher_note: lesson.teacher_note,
    mode: lesson.mode,
    blocks: blocks.map((b) => ({
      type: b.type,
      title: b.title,
      duration_minutes: b.duration_minutes,
      student_instructions: b.student_instructions,
      teacher_notes: b.teacher_notes,
      content: b.content ?? {},
      is_fallback: !!b.is_fallback,
    })),
  };
  const { error } = await supabase.from("library_items").insert({
    teacher_id,
    item_type: "lesson",
    title: (opts.title ?? lesson.title).trim() || lesson.title,
    subject: lesson.subject,
    block_type: null,
    duration_minutes: blocks
      .filter((b) => !b.is_fallback)
      .reduce((s, b) => s + b.duration_minutes, 0),
    tags: opts.tags ?? [],
    data: data as never,
  });
  if (error) throw new Error("Lektionen kunne ikke gemmes som skabelon.");
}

export async function deleteLibraryItem(id: string): Promise<void> {
  const { error } = await supabase.from("library_items").delete().eq("id", id);
  if (error) throw new Error("Elementet kunne ikke slettes.");
}

export type Insertion = { kind: "top" } | { kind: "bottom" } | { kind: "after"; blockId: string };

/** Copy a saved library block into an existing lesson. */
export async function reuseLibraryBlock(
  item: LibraryItem,
  lessonId: string,
  insertion: Insertion,
): Promise<void> {
  const teacher_id = await currentUserId();
  const b = item.data as unknown as LibraryBlockData;

  const { data: existingData, error: readError } = await supabase
    .from("lesson_blocks")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("block_order", { ascending: true });
  if (readError) throw new Error("Aktiviteten kunne ikke indsættes.");
  const existing = ((existingData ?? []) as unknown as LessonBlock[]).filter((x) => !x.is_fallback);

  let index = existing.length;
  if (insertion.kind === "top") index = 0;
  if (insertion.kind === "after") {
    const at = existing.findIndex((x) => x.id === insertion.blockId);
    index = at < 0 ? existing.length : at + 1;
  }

  const { data: insertedData, error } = await supabase
    .from("lesson_blocks")
    .insert({
      lesson_id: lessonId,
      teacher_id,
      block_order: 10000,
      type: b.type,
      title: b.title,
      duration_minutes: b.duration_minutes,
      student_instructions: b.student_instructions ?? null,
      teacher_notes: b.teacher_notes ?? null,
      content: (b.content ?? {}) as never,
      is_fallback: false,
    })
    .select()
    .single();
  if (error || !insertedData) throw new Error("Aktiviteten kunne ikke indsættes.");
  const inserted = insertedData as unknown as LessonBlock;

  const orderedIds = [
    ...existing.slice(0, index).map((x) => x.id),
    inserted.id,
    ...existing.slice(index).map((x) => x.id),
  ];
  await Promise.all(
    orderedIds.map(async (id, i) => {
      await supabase.from("lesson_blocks").update({ block_order: i }).eq("id", id);
    }),
  );
}

/** Create a new lesson from a saved lesson template. */
export async function reuseLibraryLesson(
  item: LibraryItem,
  target: { classId: string; unitId?: string | null },
): Promise<string> {
  const teacher_id = await currentUserId();
  const t = item.data as unknown as LibraryLessonData;

  const { data: lessonData, error } = await supabase
    .from("lessons")
    .insert({
      teacher_id,
      class_id: target.classId,
      unit_id: target.unitId ?? null,
      title: t.title,
      subject: t.subject ?? null,
      duration_minutes: t.duration_minutes,
      learning_goal: t.learning_goal ?? null,
      teacher_note: t.teacher_note ?? null,
      status: "draft",
      mode: (t.mode === "rescue" ? "rescue" : "standard") as "rescue" | "standard",
    })
    .select()
    .single();
  if (error || !lessonData) throw new Error("Lektionen kunne ikke oprettes.");
  const lesson = lessonData as Lesson;

  if (t.blocks?.length) {
    const { error: blockError } = await supabase.from("lesson_blocks").insert(
      t.blocks.map((b, i) => ({
        lesson_id: lesson.id,
        teacher_id,
        block_order: i,
        type: b.type,
        title: b.title,
        duration_minutes: b.duration_minutes,
        student_instructions: b.student_instructions ?? null,
        teacher_notes: b.teacher_notes ?? null,
        content: (b.content ?? {}) as never,
        is_fallback: !!b.is_fallback,
      })),
    );
    if (blockError) {
      await supabase.from("lesson_blocks").delete().eq("lesson_id", lesson.id);
      await supabase.from("lessons").delete().eq("id", lesson.id);
      throw new Error("Lektionen kunne ikke oprettes.");
    }
  }
  return lesson.id;
}
