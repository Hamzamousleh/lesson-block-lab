/**
 * Presentation-only: a calm, four-tone accent palette for block types used by
 * the Didaktiva V2 variant. No logic, no data — purely class names.
 */
export type BlockTone = "green" | "cool" | "sand" | "warm";

const TONES: Record<string, BlockTone> = {
  teacher_content: "green",
  narrative: "green",
  case: "cool",
  compare: "cool",
  find_the_error: "cool",
  theory_test: "cool",
  discussion: "sand",
  dilemma: "sand",
  position: "sand",
  poll: "warm",
  ranking: "warm",
  scale: "warm",
  short_response: "sand",
  exit_ticket: "green",
};

const TONE_CLASS: Record<BlockTone, string> = {
  green: "bg-accent text-accent-foreground",
  cool: "bg-accent-cool text-accent-cool-foreground",
  sand: "bg-accent-sand text-accent-sand-foreground",
  warm: "bg-accent-warm text-accent-warm-foreground",
};

export function blockTone(type: string): BlockTone {
  return TONES[type] ?? "green";
}

/** Background + foreground utility classes for a block-type badge/icon. */
export function blockToneClass(type: string): string {
  return TONE_CLASS[blockTone(type)];
}
