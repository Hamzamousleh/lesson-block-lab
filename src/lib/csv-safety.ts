/** Neutralize spreadsheet formulas before normal CSV quoting is applied. */
export function csvCell(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  const safe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${safe.replace(/"/g, '""')}"`;
}
