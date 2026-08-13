import { supabase } from "@/integrations/supabase/client";
import type { PackageBlock } from "./caselab-package";
import type { PackageEpisode, WorldEpisodePackage, WorldPackage } from "./world-package";
import {
  createConsequence,
  createEpisode,
  createWorld,
  deleteWorld,
  type World,
  type WorldEpisode,
} from "./worlds";

/* ---------------- pre-import inspection (Phase 6.1) ---------------- */

export interface PackageSummary {
  title: string;
  stateCount: number;
  episodeCount: number;
  lessonCount: number;
  blockCount: number;
  ruleCount: number;
  needsClass: boolean;
}

function summarizeEpisodes(episodes: PackageEpisode[]) {
  const lessons = episodes.filter((e) => !!e.lesson);
  return {
    lessonCount: lessons.length,
    blockCount: lessons.reduce((n, e) => n + (e.lesson?.blocks.length ?? 0), 0),
    ruleCount: episodes.reduce((n, e) => n + (e.consequence_rules?.length ?? 0), 0),
  };
}

export function summarizeWorldPackage(pkg: WorldPackage): PackageSummary {
  const s = summarizeEpisodes(pkg.world.episodes);
  return {
    title: pkg.world.title,
    stateCount: pkg.world.state.length,
    episodeCount: pkg.world.episodes.length,
    needsClass: s.lessonCount > 0,
    ...s,
  };
}

export function summarizeEpisodePackage(pkg: WorldEpisodePackage): PackageSummary {
  const s = summarizeEpisodes([pkg.episode]);
  return {
    title: pkg.episode.title,
    stateCount: 0,
    episodeCount: 1,
    needsClass: s.lessonCount > 0,
    ...s,
  };
}

const normTitle = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

/** Duplicate guard within one World: same normalized title, or same number+branch. */
export function episodeConflict(
  existing: WorldEpisode[],
  episode: PackageEpisode,
): string | null {
  const title = normTitle(episode.title);
  if (existing.some((e) => normTitle(e.title) === title))
    return `Denne World har allerede en episode med titlen "${episode.title.trim()}".`;
  if (
    episode.episode_number &&
    existing.some(
      (e) =>
        e.episode_number === episode.episode_number &&
        (e.branch_key ?? null) === (episode.branch_key ?? null),
    )
  )
    return `Denne World har allerede en episode med nummer ${episode.episode_number}.`;
  return null;
}

/** Reads the World's episodes straight from the database (never a stale cache). */
async function fetchWorldEpisodes(worldId: string): Promise<WorldEpisode[]> {
  const { data, error } = await supabase
    .from("world_episodes")
    .select("*")
    .eq("world_id", worldId);
  if (error) throw new Error("Episoderne i dette World kunne ikke hentes.");
  return (data ?? []) as WorldEpisode[];
}


async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Du er ikke logget ind.");
  return data.user.id;
}

function blockRow(b: PackageBlock, lessonId: string, teacherId: string, order: number) {
  return {
    lesson_id: lessonId,
    teacher_id: teacherId,
    block_order: order,
    type: b.type,
    title: b.title,
    duration_minutes: b.duration_minutes,
    student_instructions: b.student_instructions ?? null,
    teacher_notes: b.teacher_notes ?? null,
    content: b.content as never,
    variant_group: b.variant_group ?? null,
    variant_label: b.variant_label ?? null,
  };
}

/** Creates the Lesson + Blocks belonging to an episode, if the package has one. */
async function createEpisodeLesson(
  episode: PackageEpisode,
  teacher_id: string,
  classId: string | null,
  worldSubject: string,
): Promise<{ lessonId: string | null; blockIds: Record<string, string> }> {
  if (!episode.lesson) return { lessonId: null, blockIds: {} };
  if (!classId)
    throw new Error(
      "Dette World indeholder lektioner. Vælg en klasse, før du importerer Worldet.",
    );

  const { data: lesson, error } = await supabase
    .from("lessons")
    .insert({
      teacher_id,
      class_id: classId,
      title: episode.lesson.title,
      subject: episode.lesson.subject ?? worldSubject,
      duration_minutes: episode.lesson.duration_minutes,
      learning_goal: episode.lesson.learning_goal ?? episode.learning_goal ?? null,
      teacher_note: episode.lesson.teacher_note ?? null,
      status: "draft",
      mode: "standard",
    })
    .select()
    .single();
  if (error || !lesson) throw new Error("Episodens lektion kunne ikke oprettes.");

  const { data: blocks, error: bErr } = await supabase
    .from("lesson_blocks")
    .insert(episode.lesson.blocks.map((b, i) => blockRow(b, lesson.id, teacher_id, i)))
    .select("id,title");
  if (bErr) {
    await supabase.from("lessons").delete().eq("id", lesson.id);
    throw new Error("Episodens aktiviteter kunne ikke oprettes.");
  }
  const byTitle: Record<string, string> = {};
  for (const b of blocks ?? []) byTitle[b.title] = b.id;
  return { lessonId: lesson.id, blockIds: byTitle };
}

async function persistEpisode(
  worldId: string,
  worldSubject: string,
  classId: string | null,
  episode: PackageEpisode,
  teacher_id: string,
  fallbackNumber: number,
): Promise<string> {
  const { lessonId, blockIds } = await createEpisodeLesson(episode, teacher_id, classId, worldSubject);
  const created = await createEpisode({
    world_id: worldId,
    title: episode.title,
    description: episode.description ?? null,
    learning_goal: episode.learning_goal ?? null,
    academic_concepts: episode.academic_concepts ?? [],
    episode_number: episode.episode_number ?? fallbackNumber,
    branch_key: episode.branch_key ?? null,
    complexity_level: episode.complexity_level,
    lesson_id: lessonId,
  });

  for (const rule of episode.consequence_rules ?? []) {
    await createConsequence({
      world_id: worldId,
      episode_id: created.id,
      source_block_id: rule.source_block_title ? (blockIds[rule.source_block_title] ?? null) : null,
      title: rule.title,
      trigger_type: rule.trigger_type,
      trigger_config: rule.trigger_config,
      changes: rule.changes,
      reveal_timing: rule.reveal_timing,
      teacher_explanation: rule.teacher_explanation ?? null,
      student_explanation: rule.student_explanation ?? null,
      academic_rationale: rule.academic_rationale ?? null,
    });
  }
  return created.id;
}

export async function importWorldPackage(
  pkg: WorldPackage,
  target: { classId: string | null },
): Promise<World> {
  const teacher_id = await currentUserId();
  /* Never write anything if embedded lessons would be dropped. */
  if (summarizeWorldPackage(pkg).needsClass && !target.classId) {
    throw new Error("Dette World indeholder lektioner. Vælg en klasse, før du importerer Worldet.");
  }
  const world = await createWorld({
    title: pkg.world.title,
    subject: pkg.world.subject,
    class_id: target.classId,
    description: pkg.world.description ?? null,
    premise: pkg.world.premise,
    world_type: pkg.world.world_type ?? "other",
    academic_focus: pkg.world.academic_focus ?? null,
    status: "active",
    state: pkg.world.state.map((s) => ({
      state_key: s.key,
      label: s.label,
      value: s.value,
      value_type: s.value_type,
      min_value: s.min_value ?? null,
      max_value: s.max_value ?? null,
      enum_options: s.enum_options ?? [],
      description: s.description ?? null,
      student_visible: s.student_visible,
    })),
  });

  try {
    let i = 1;
    for (const ep of pkg.world.episodes) {
      await persistEpisode(world.id, world.subject, target.classId, ep, teacher_id, i);
      i += 1;
    }
  } catch (e) {
    await deleteWorld(world.id);
    throw e;
  }
  return world;
}

export async function importEpisodePackage(
  pkg: WorldEpisodePackage,
  world: World,
  episodeNumber: number,
  opts?: { asCopy?: boolean },
): Promise<string> {
  const teacher_id = await currentUserId();
  if (summarizeEpisodePackage(pkg).needsClass && !world.class_id) {
    throw new Error(
      "Episoden indeholder en lektion. Knyt dit World til en klasse, før du importerer.",
    );
  }

  /* Authoritative guard — the UI check can be stale or bypassed. */
  const existing = await fetchWorldEpisodes(world.id);
  const clash = episodeConflict(existing, pkg.episode);
  if (clash && !opts?.asCopy) throw new Error(clash);

  const nextNumber =
    existing.reduce((max, e) => Math.max(max, e.episode_number), 0) + 1 > episodeNumber
      ? existing.reduce((max, e) => Math.max(max, e.episode_number), 0) + 1
      : episodeNumber;

  let episode = pkg.episode;
  if (opts?.asCopy) {
    let title = pkg.episode.title.trim();
    if (existing.some((e) => normTitle(e.title) === normTitle(title))) title = `${title} (kopi)`;
    episode = { ...pkg.episode, title, episode_number: nextNumber };
  }

  return persistEpisode(
    world.id,
    world.subject,
    world.class_id,
    episode,
    teacher_id,
    nextNumber,
  );

}
