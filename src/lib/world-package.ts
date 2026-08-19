import { validateBlock, type PackageBlock } from "./caselab-package";
import type { StateChange, StateValueType, RevealTiming, TriggerType } from "./worlds";

/* ------------------------------------------------------------------ *
 * CaseLab transport format 2.0 — World extensions.
 * package_type: "world" | "world_episode"
 * Existing "lesson" and "blocks" packages remain untouched and valid.
 * ------------------------------------------------------------------ */

export interface PackageStateVar {
  key: string;
  label: string;
  value: string | number | boolean;
  value_type: StateValueType;
  min_value?: number | null;
  max_value?: number | null;
  enum_options?: string[];
  description?: string | null;
  student_visible: boolean;
}

export interface PackageConsequenceRule {
  title: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  changes: StateChange[];
  reveal_timing: RevealTiming;
  teacher_explanation?: string | null;
  student_explanation?: string | null;
  academic_rationale?: string | null;
  source_block_title?: string | null;
}

export interface PackageEpisode {
  title: string;
  description?: string | null;
  learning_goal?: string | null;
  academic_concepts?: string[];
  episode_number?: number;
  complexity_level: string;
  branch_key?: string | null;
  lesson?: {
    title: string;
    subject?: string | null;
    duration_minutes: number;
    learning_goal?: string | null;
    teacher_note?: string | null;
    blocks: PackageBlock[];
  } | null;
  consequence_rules?: PackageConsequenceRule[];
}

export interface WorldPackage {
  caselab_version: "2.0";
  package_type: "world";
  world: {
    title: string;
    subject: string;
    premise: string;
    description?: string | null;
    world_type?: string;
    academic_focus?: string | null;
    state: PackageStateVar[];
    episodes: PackageEpisode[];
  };
}

export interface WorldEpisodePackage {
  caselab_version: "2.0";
  package_type: "world_episode";
  world_id?: string | null;
  world_reference?: string | null;
  episode: PackageEpisode;
}

export type AnyWorldPackage = WorldPackage | WorldEpisodePackage;

export interface WorldValidationResult {
  ok: boolean;
  errors: string[];
  data?: AnyWorldPackage;
}

const COMPLEXITY = ["introduktion", "anvendelse", "analyse", "vurdering", "syntese"];
const VALUE_TYPES: StateValueType[] = ["number", "boolean", "text", "enum"];
const OPERATIONS = ["set", "increase", "decrease", "enum_change", "boolean_toggle"];
const TRIGGERS = ["manual", "teacher_selected", "majority_choice", "threshold", "response_distribution"];
const REVEALS = ["immediate", "end_of_block", "end_of_episode", "next_episode"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseState(raw: unknown, errors: string[]): PackageStateVar[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push("Pakken mangler 'state' med mindst én World-variabel.");
    return [];
  }
  if (raw.length > 12) {
    errors.push("Et World bør have 4–8 variabler. Pakken indeholder for mange (over 12).");
  }
  const seen = new Set<string>();
  const out: PackageStateVar[] = [];
  raw.forEach((item, i) => {
    const nr = i + 1;
    if (!isRecord(item)) {
      errors.push(`Variabel ${nr} har et ugyldigt format.`);
      return;
    }
    const key = str(item["key"]);
    if (!key) {
      errors.push(`Variabel ${nr} mangler en nøgle ('key').`);
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      errors.push(`Nøglen '${key}' må kun indeholde små bogstaver, tal og understreg.`);
    }
    if (seen.has(key)) {
      errors.push(`Nøglen '${key}' bruges mere end én gang. Nøgler skal være unikke.`);
      return;
    }
    seen.add(key);

    const label = str(item["label"]) || key;
    const rawType = str(item["value_type"]) || "number";
    if (!VALUE_TYPES.includes(rawType as StateValueType)) {
      errors.push(`Variablen '${label}' har en ukendt type '${rawType}'.`);
      return;
    }
    const value_type = rawType as StateValueType;
    const value = item["value"];
    const min = typeof item["min_value"] === "number" ? item["min_value"] : null;
    const max = typeof item["max_value"] === "number" ? item["max_value"] : null;

    if (value_type === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`Variablen '${label}' skal have en talværdi.`);
        return;
      }
      if (min !== null && max !== null && min >= max) {
        errors.push(`Variablen '${label}' har et ugyldigt interval.`);
      }
      if (min !== null && value < min) {
        errors.push(`Startværdien for '${label}' (${value}) er under minimum ${min}.`);
      }
      if (max !== null && value > max) {
        errors.push(`Startværdien for '${label}' (${value}) er over maksimum ${max}.`);
      }
    } else if (value_type === "boolean") {
      if (typeof value !== "boolean") {
        errors.push(`Variablen '${label}' skal være true eller false.`);
        return;
      }
    } else if (typeof value !== "string" || !value.trim()) {
      errors.push(`Variablen '${label}' skal have en tekstværdi.`);
      return;
    }

    const enum_options = Array.isArray(item["enum_options"])
      ? item["enum_options"].filter((x): x is string => typeof x === "string")
      : [];
    if (value_type === "enum") {
      if (enum_options.length < 2) {
        errors.push(`Variablen '${label}' skal have mindst to mulige værdier.`);
      } else if (!enum_options.includes(String(value))) {
        errors.push(`Startværdien for '${label}' er ikke blandt de mulige værdier.`);
      }
    }

    out.push({
      key,
      label,
      value: value as string | number | boolean,
      value_type,
      min_value: min,
      max_value: max,
      enum_options,
      description: typeof item["description"] === "string" ? item["description"] : null,
      student_visible: item["student_visible"] !== false,
    });
  });
  return out;
}

function parseRules(raw: unknown, errors: string[], stateKeys: string[]): PackageConsequenceRule[] {
  if (!Array.isArray(raw)) return [];
  const out: PackageConsequenceRule[] = [];
  raw.forEach((item, i) => {
    const nr = i + 1;
    if (!isRecord(item)) {
      errors.push(`Konsekvensregel ${nr} har et ugyldigt format.`);
      return;
    }
    const title = str(item["title"]) || `Konsekvens ${nr}`;
    const trigger_type = (str(item["trigger_type"]) || "manual") as TriggerType;
    if (!TRIGGERS.includes(trigger_type)) {
      errors.push(`Konsekvensen '${title}' bruger en ukendt udløser '${trigger_type}'.`);
      return;
    }
    const reveal_timing = (str(item["reveal_timing"]) || "immediate") as RevealTiming;
    if (!REVEALS.includes(reveal_timing)) {
      errors.push(`Konsekvensen '${title}' har et ukendt tidspunkt '${reveal_timing}'.`);
      return;
    }
    const cfg = isRecord(item["consequence_config"]) ? item["consequence_config"] : item;
    const rawChanges = cfg["changes"];
    if (!Array.isArray(rawChanges) || !rawChanges.length) {
      errors.push(`Konsekvensen '${title}' ændrer ingen World-variabler.`);
      return;
    }
    const changes: StateChange[] = [];
    for (const c of rawChanges) {
      if (!isRecord(c)) {
        errors.push(`Konsekvensen '${title}' har en ugyldig ændring.`);
        continue;
      }
      const state_key = str(c["state_key"]);
      const operation = str(c["operation"]) || "increase";
      if (!state_key) {
        errors.push(`En ændring i '${title}' mangler 'state_key'.`);
        continue;
      }
      if (stateKeys.length && !stateKeys.includes(state_key)) {
        errors.push(`Konsekvensen '${title}' henviser til variablen '${state_key}', som ikke findes.`);
        continue;
      }
      if (!OPERATIONS.includes(operation)) {
        errors.push(`Konsekvensen '${title}' bruger en ukendt handling '${operation}'.`);
        continue;
      }
      const amount = typeof c["amount"] === "number" ? c["amount"] : undefined;
      if ((operation === "increase" || operation === "decrease") && amount === undefined) {
        errors.push(`Ændringen af '${state_key}' i '${title}' mangler et tal.`);
        continue;
      }
      changes.push({
        state_key,
        operation: operation as StateChange["operation"],
        ...(amount !== undefined ? { amount } : {}),
        ...(c["value"] !== undefined ? { value: c["value"] as string | number | boolean } : {}),
      });
    }
    if (!changes.length) return;
    if (!str(item["academic_rationale"])) {
      errors.push(`Konsekvensen '${title}' mangler en faglig begrundelse ('academic_rationale').`);
      return;
    }
    out.push({
      title,
      trigger_type,
      trigger_config: isRecord(item["trigger_config"]) ? item["trigger_config"] : {},
      changes,
      reveal_timing,
      teacher_explanation: typeof item["teacher_explanation"] === "string" ? item["teacher_explanation"] : null,
      student_explanation: typeof item["student_explanation"] === "string" ? item["student_explanation"] : null,
      academic_rationale: str(item["academic_rationale"]),
      source_block_title:
        typeof item["source_block_title"] === "string" ? item["source_block_title"] : null,
    });
  });
  return out;
}

function parseEpisode(
  raw: unknown,
  index: number,
  errors: string[],
  stateKeys: string[],
): PackageEpisode | null {
  const nr = index + 1;
  if (!isRecord(raw)) {
    errors.push(`Episode ${nr} har et ugyldigt format.`);
    return null;
  }
  const title = str(raw["title"]);
  if (!title) errors.push(`Episode ${nr} mangler en titel.`);
  const complexity = str(raw["complexity_level"]) || "anvendelse";
  if (!COMPLEXITY.includes(complexity)) {
    errors.push(
      `Episoden '${title || nr}' har niveauet '${complexity}'. Brug introduktion, anvendelse, analyse, vurdering eller syntese.`,
    );
  }
  const learning_goal = str(raw["learning_goal"]);
  if (!learning_goal) errors.push(`Episoden '${title || nr}' mangler et læringsmål.`);

  const episode_number =
    typeof raw["episode_number"] === "number" && raw["episode_number"] > 0
      ? Math.round(raw["episode_number"])
      : index + 1;

  let lesson: PackageEpisode["lesson"] = null;
  const rawLesson = raw["lesson"];
  if (isRecord(rawLesson)) {
    const lessonTitle = str(rawLesson["title"]) || title;
    const duration = rawLesson["duration_minutes"];
    if (typeof duration !== "number" || duration <= 0) {
      errors.push(`Lektionen i episoden '${title || nr}' har en ugyldig varighed.`);
    }
    const blocks = rawLesson["blocks"];
    if (!Array.isArray(blocks) || !blocks.length) {
      errors.push(`Lektionen i episoden '${title || nr}' indeholder ingen aktiviteter.`);
    } else {
      const blockErrors: string[] = [];
      const parsed = blocks.map((b, i) => validateBlock(b, i, blockErrors));
      if (blockErrors.length) {
        errors.push(...blockErrors.map((e) => `Episode '${title || nr}': ${e}`));
      } else {
        lesson = {
          title: lessonTitle,
          subject: typeof rawLesson["subject"] === "string" ? rawLesson["subject"] : null,
          duration_minutes: duration as number,
          learning_goal:
            typeof rawLesson["learning_goal"] === "string" ? rawLesson["learning_goal"] : learning_goal,
          teacher_note: typeof rawLesson["teacher_note"] === "string" ? rawLesson["teacher_note"] : null,
          blocks: parsed as PackageBlock[],
        };
      }
    }
  }

  const rules = parseRules(raw["consequence_rules"], errors, stateKeys);

  return {
    title,
    description: typeof raw["description"] === "string" ? raw["description"] : null,
    learning_goal,
    academic_concepts: Array.isArray(raw["academic_concepts"])
      ? raw["academic_concepts"].filter((x): x is string => typeof x === "string")
      : [],
    episode_number,
    complexity_level: complexity,
    branch_key: typeof raw["branch_key"] === "string" ? raw["branch_key"] : null,
    lesson,
    consequence_rules: rules,
  };
}

export function validateWorldPackage(input: string): WorldValidationResult {
  const text = input.trim();
  if (!text) return { ok: false, errors: ["Indsæt en Didaktiva World-pakke for at fortsætte."] };

  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
  } catch {
    return {
      ok: false,
      errors: ["Teksten er ikke gyldig JSON. Kopiér hele svaret fra ChatGPT uden ekstra tekst."],
    };
  }
  if (!isRecord(raw)) return { ok: false, errors: ["Pakken skal være et JSON-objekt."] };

  const errors: string[] = [];
  if (raw["caselab_version"] !== "2.0") errors.push("Pakken mangler 'caselab_version': \"2.0\".");

  const type = raw["package_type"];
  if (type !== "world" && type !== "world_episode") {
    return {
      ok: false,
      errors: [
        "Pakken er ikke en World-pakke. Brug 'package_type': \"world\" eller \"world_episode\" — almindelige lektioner importeres under Importér.",
      ],
    };
  }

  if (type === "world_episode") {
    const episode = parseEpisode(raw["episode"], 0, errors, []);
    if (errors.length || !episode) return { ok: false, errors };
    return {
      ok: true,
      errors: [],
      data: {
        caselab_version: "2.0",
        package_type: "world_episode",
        world_id: typeof raw["world_id"] === "string" ? raw["world_id"] : null,
        world_reference: typeof raw["world_reference"] === "string" ? raw["world_reference"] : null,
        episode,
      },
    };
  }

  const world = raw["world"];
  if (!isRecord(world)) return { ok: false, errors: ["Pakken mangler et 'world'-objekt."] };

  const title = str(world["title"]);
  if (!title) errors.push("World mangler en titel.");
  const subject = str(world["subject"]);
  if (!subject) errors.push("World mangler et fag.");
  const premise = str(world["premise"]);
  if (!premise) errors.push("World mangler en grundsituation ('premise').");

  const state = parseState(world["state"], errors);
  const stateKeys = state.map((s) => s.key);

  const rawEpisodes = Array.isArray(world["episodes"]) ? world["episodes"] : [];
  const episodes = rawEpisodes
    .map((e, i) => parseEpisode(e, i, errors, stateKeys))
    .filter((e): e is PackageEpisode => !!e);

  const numbers = new Set<string>();
  for (const e of episodes) {
    const key = `${e.episode_number}${e.branch_key ?? ""}`;
    if (numbers.has(key)) {
      errors.push(`Der er to episoder med nummer ${e.episode_number}. Numre skal være unikke.`);
    }
    numbers.add(key);
  }
  const titles = new Set<string>();
  for (const e of episodes) {
    const t = e.title.toLowerCase();
    if (titles.has(t)) errors.push(`Der er to episoder med titlen '${e.title}'.`);
    titles.add(t);
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    data: {
      caselab_version: "2.0",
      package_type: "world",
      world: {
        title,
        subject,
        premise,
        description: typeof world["description"] === "string" ? world["description"] : null,
        world_type: str(world["world_type"]) || "other",
        academic_focus: typeof world["academic_focus"] === "string" ? world["academic_focus"] : null,
        state,
        episodes,
      },
    },
  };
}
