import { supabase } from "@/integrations/supabase/client";
import type { BlocksPackage, LessonPackage, PackageBlock } from "./caselab-package";
import type { Lesson, LessonBlock } from "./types";
import { withResources } from "./resources";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du er ikke logget ind.");
  return data.user.id;
}

function blockRow(
  b: PackageBlock,
  lessonId: string,
  teacherId: string,
  order: number,
  isFallback = false,
) {
  return {
    lesson_id: lessonId,
    teacher_id: teacherId,
    block_order: order,
    type: b.type,
    title: b.title,
    duration_minutes: b.duration_minutes,
    student_instructions: b.student_instructions ?? null,
    teacher_notes: b.teacher_notes ?? null,
    content: withResources(b.content, b.resources ?? []) as never,
    is_fallback: isFallback,
    variant_group: b.variant_group ?? null,
    variant_label: b.variant_label ?? null,
  };
}

export async function importLessonPackage(
  pkg: LessonPackage,
  target: { classId: string; unitId?: string | null },
): Promise<string> {
  const teacher_id = await currentUserId();
  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({
      teacher_id,
      class_id: target.classId,
      unit_id: target.unitId ?? null,
      title: pkg.lesson.title,
      subject: pkg.lesson.subject ?? null,
      duration_minutes: pkg.lesson.duration_minutes,
      learning_goal: pkg.lesson.learning_goal ?? null,
      teacher_note: pkg.lesson.teacher_note ?? null,
      status: "draft",
      mode: pkg.mode,
    })
    .select()
    .single();
  if (error || !lesson) throw new Error("Lektionen kunne ikke importeres.");

  const created = lesson as Lesson;
  const fallback = pkg.lesson.fallback_blocks ?? [];
  const rows = [
    ...pkg.lesson.blocks.map((b, i) => blockRow(b, created.id, teacher_id, i, false)),
    ...fallback.map((b, i) =>
      blockRow(b, created.id, teacher_id, pkg.lesson.blocks.length + i, true),
    ),
  ];
  const { error: blockError } = await supabase.from("lesson_blocks").insert(rows);

  if (blockError) {
    // compensating cleanup so we never leave a half-imported lesson behind
    await supabase.from("lesson_blocks").delete().eq("lesson_id", created.id);
    await supabase.from("lessons").delete().eq("id", created.id);
    throw new Error("Lektionen kunne ikke importeres.");
  }

  return created.id;
}


export type InsertionPoint = { kind: "top" } | { kind: "bottom" } | { kind: "after"; blockId: string };

export async function importBlocksPackage(
  pkg: BlocksPackage,
  lessonId: string,
  insertion: InsertionPoint,
  selectedIndices?: number[],
): Promise<string[]> {
  const teacher_id = await currentUserId();
  const chosen = selectedIndices?.length
    ? pkg.blocks.filter((_, i) => selectedIndices.includes(i))
    : pkg.blocks;
  if (!chosen.length) throw new Error("Vælg mindst én aktivitet.");

  const { data: existingData, error: readError } = await supabase
    .from("lesson_blocks")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("block_order", { ascending: true });
  if (readError) throw new Error("Aktiviteterne kunne ikke tilføjes.");
  const existing = ((existingData ?? []) as LessonBlock[]).filter((b) => !b.is_fallback);

  let index = existing.length;
  if (insertion.kind === "top") index = 0;
  if (insertion.kind === "after") {
    const at = existing.findIndex((b) => b.id === insertion.blockId);
    index = at < 0 ? existing.length : at + 1;
  }

  const { data: insertedData, error: insertError } = await supabase
    .from("lesson_blocks")
    .insert(chosen.map((b, i) => blockRow(b, lessonId, teacher_id, existing.length + 1000 + i)))
    .select();
  if (insertError || !insertedData) throw new Error("Aktiviteterne kunne ikke tilføjes.");
  const inserted = insertedData as LessonBlock[];

  const orderedIds = [
    ...existing.slice(0, index).map((b) => b.id),
    ...inserted.map((b) => b.id),
    ...existing.slice(index).map((b) => b.id),
  ];

  try {
    await Promise.all(
      orderedIds.map(async (id, i) => {
        const { error } = await supabase.from("lesson_blocks").update({ block_order: i }).eq("id", id);
        if (error) throw new Error(error.message);
      }),
    );
  } catch {
    await supabase
      .from("lesson_blocks")
      .delete()
      .in(
        "id",
        inserted.map((b) => b.id),
      );
    throw new Error("Aktiviteterne kunne ikke tilføjes.");
  }

  return inserted.map((b) => b.id);
}
