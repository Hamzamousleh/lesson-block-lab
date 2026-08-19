const ADJECTIVES = [
  "Blå",
  "Grøn",
  "Rolig",
  "Rød",
  "Kvik",
  "Venlig",
  "Modig",
  "Gul",
  "Lilla",
  "Stille",
  "Glad",
  "Nysgerrig",
] as const;

const ANIMALS = [
  "Falk",
  "Ugle",
  "Panda",
  "Ræv",
  "Odder",
  "Delfin",
  "Grævling",
  "Hare",
  "Pingvin",
  "Sæl",
  "Bjørn",
  "Gepard",
] as const;

const ALIAS_PATTERN = new RegExp(
  `^(?:${ADJECTIVES.join("|")}) (?:${ANIMALS.join("|")})(?: \\d+)?$`,
  "u",
);

export function isGeneratedStudentAlias(value: string): boolean {
  return ALIAS_PATTERN.test(value.trim());
}

export function privacySafeStudentAlias(displayName: string, index: number): string {
  return isGeneratedStudentAlias(displayName) ? displayName : `Elev ${index + 1}`;
}

function secureRandom(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return (value[0] ?? 0) / 0x1_0000_0000;
}

/** Creates a neutral, session-only name. Existing names can be excluded. */
export function generateStudentAlias(
  existingNames: Iterable<string> = [],
  random: () => number = secureRandom,
): string {
  const existing = new Set(
    Array.from(existingNames, (name) => name.trim().toLocaleLowerCase("da")),
  );
  const combinations = ADJECTIVES.length * ANIMALS.length;
  const start = Math.floor(random() * combinations) % combinations;

  for (let offset = 0; offset < combinations; offset += 1) {
    const index = (start + offset) % combinations;
    const adjective = ADJECTIVES[Math.floor(index / ANIMALS.length)];
    const animal = ANIMALS[index % ANIMALS.length];
    const alias = `${adjective} ${animal}`;
    if (!existing.has(alias.toLocaleLowerCase("da"))) return alias;
  }

  // Extremely large sessions still get a readable, non-identifying alias.
  return `Blå Falk ${existing.size + 1}`;
}
