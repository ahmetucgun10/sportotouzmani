export type Outcome = "1" | "X" | "2";
export const signs: Outcome[] = ["1", "X", "2"];
export const MAX_COLUMNS = 4096;
export function generate(selections: Outcome[][]): string[] {
  if (
    selections.length !== 15 ||
    selections.some(
      (s) =>
        !s.length ||
        s.length > 3 ||
        new Set(s).size !== s.length ||
        s.some((x) => !signs.includes(x)),
    )
  )
    throw new Error("Her maç için en az bir geçerli seçim yapın.");
  const count = selections.reduce((n, s) => n * s.length, 1);
  if (count > MAX_COLUMNS)
    throw new Error(
      `En fazla ${MAX_COLUMNS} kolon desteklenir; seçimleri azaltın.`,
    );
  return selections.reduce<string[]>(
    (rows, s) => rows.flatMap((row) => s.map((x) => row + x)),
    [""],
  );
}
export function hits(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < 15; i++) if (a[i] === b[i]) n++;
  return n;
}
export function covers(
  columns: string[],
  universe: string[],
  guarantee: number,
): boolean {
  if (guarantee === 15) {
    const saved = new Set(columns);
    return universe.every((c) => saved.has(c));
  }
  return universe.every((result) =>
    columns.some((column) => hits(column, result) >= guarantee),
  );
}
// Deterministic maximal packing: an uncovered outcome becomes a new column.
// Every skipped outcome is covered by an existing column; thus the entire universe is covered.
export function reduceSystem(universe: string[], guarantee: number): string[] {
  if (![12, 13, 14, 15].includes(guarantee))
    throw new Error("Geçersiz garanti.");
  if (
    !universe.length ||
    universe.length > MAX_COLUMNS ||
    universe.some((c) => !/^[1X2]{15}$/.test(c))
  )
    throw new Error("Geçersiz sistem.");
  if (guarantee === 15) return [...new Set(universe)];
  const reduced: string[] = [];
  for (const result of universe)
    if (!reduced.some((column) => hits(column, result) >= guarantee))
      reduced.push(result);
  if (!covers(reduced, universe, guarantee))
    throw new Error("Kapsama doğrulanamadı.");
  return reduced;
}
export function filterColumns(
  columns: string[],
  minDraws: number,
  maxDraws: number,
) {
  if (
    !Number.isInteger(minDraws) ||
    !Number.isInteger(maxDraws) ||
    minDraws < 0 ||
    maxDraws > 15 ||
    minDraws > maxDraws
  )
    throw new Error("Beraberlik aralığı 0–15 arasında olmalı.");
  return columns.filter((c) => {
    const n = [...c].filter((x) => x === "X").length;
    return n >= minDraws && n <= maxDraws;
  });
}
