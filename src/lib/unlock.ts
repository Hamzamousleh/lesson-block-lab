import { formatStateValue } from "./consequences";
import {
  type UnlockCondition,
  type WorldEpisode,
  type WorldStateVar,
  updateEpisode,
} from "./worlds";

export interface UnlockResult {
  /** true when the condition is satisfied (or there is no condition). */
  unlocked: boolean;
  /** Danish explanation shown to the teacher on a locked episode. */
  reason: string;
  /** true when only the teacher can open it — never auto-unlocks. */
  manual: boolean;
}

const COMPARATOR_TEXT: Record<string, string> = {
  lt: "under",
  lte: "højst",
  gt: "over",
  gte: "mindst",
  eq: "præcis",
};

function compare(a: number, comparator: string, b: number): boolean {
  switch (comparator) {
    case "lt":
      return a < b;
    case "lte":
      return a <= b;
    case "gt":
      return a > b;
    case "gte":
      return a >= b;
    default:
      return a === b;
  }
}

export function describeUnlockCondition(
  condition: UnlockCondition | null,
  states: WorldStateVar[],
): string {
  if (!condition) return "Åben.";
  if (condition.kind === "teacher_unlock") return "Åbnes manuelt af læreren.";
  if (condition.kind === "previous_episode_completed")
    return "Åbnes, når den forrige episode er markeret som gennemført.";
  const label = states.find((s) => s.state_key === condition.state_key)?.label ?? condition.state_key;
  return `Åbnes, når ${label} er ${COMPARATOR_TEXT[condition.comparator] ?? condition.comparator} ${condition.value}.`;
}

/** Deterministic gate — no AI, no side effects. */
export function evaluateUnlock(
  episode: WorldEpisode,
  episodes: WorldEpisode[],
  states: WorldStateVar[],
): UnlockResult {
  const condition = episode.unlock_condition as UnlockCondition | null;
  if (!condition) return { unlocked: true, reason: "Åben.", manual: false };

  if (condition.kind === "teacher_unlock") {
    return {
      unlocked: false,
      reason: "Åbnes manuelt af læreren.",
      manual: true,
    };
  }

  const previousDone = () => {
    const previous = episodes
      .filter((e) => e.episode_number < episode.episode_number)
      .sort((a, b) => b.episode_number - a.episode_number)[0];
    return !previous || previous.status === "completed";
  };

  if (condition.kind === "previous_episode_completed") {
    return previousDone()
      ? { unlocked: true, reason: "Den forrige episode er gennemført.", manual: false }
      : {
          unlocked: false,
          reason: "Den forrige episode er ikke gennemført endnu.",
          manual: false,
        };
  }

  const variable = states.find((s) => s.state_key === condition.state_key);
  if (!variable) {
    return {
      unlocked: false,
      reason: `Variablen "${condition.state_key}" findes ikke i dette World.`,
      manual: true,
    };
  }
  const current = Number(variable.value);
  const ok = Number.isFinite(current) && compare(current, condition.comparator, condition.value);
  const needPrevious = condition.require_previous ? previousDone() : true;

  if (!needPrevious) {
    return {
      unlocked: false,
      reason: "Den forrige episode er ikke gennemført endnu.",
      manual: false,
    };
  }
  return {
    unlocked: ok,
    reason: ok
      ? `${variable.label} er ${formatStateValue(variable)} — betingelsen er opfyldt.`
      : `${variable.label} er ${formatStateValue(variable)}. Kræver ${
          COMPARATOR_TEXT[condition.comparator] ?? condition.comparator
        } ${condition.value}.`,
    manual: false,
  };
}

/**
 * Flips `locked` episodes to `available` when their condition is met.
 * Never locks an episode that the teacher already started or completed.
 */
export async function syncEpisodeLocks(
  episodes: WorldEpisode[],
  states: WorldStateVar[],
): Promise<number> {
  let changed = 0;
  for (const e of episodes) {
    if (e.status !== "locked") continue;
    const result = evaluateUnlock(e, episodes, states);
    if (result.unlocked && !result.manual) {
      await updateEpisode(e.id, { status: "available" });
      changed++;
    }
  }
  return changed;
}
