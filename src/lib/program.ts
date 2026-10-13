import { z } from "zod";
export const matchSchema = z
  .object({
    matchNo: z.number().int().min(1).max(15),
    home: z.string().trim().min(1).max(100),
    away: z.string().trim().min(1).max(100),
    league: z.string().max(100).optional(),
    kickoff: z.string().datetime(),
    homeGoals: z.number().int().min(0).max(99).nullable().default(null),
    awayGoals: z.number().int().min(0).max(99).nullable().default(null),
    finished: z.boolean().default(false),
  })
  .refine(
    (m) => !m.finished || (m.homeGoals !== null && m.awayGoals !== null),
    "Bitmiş maçın skoru gereklidir.",
  );
export const weekSchema = z
  .object({
    season: z.string().regex(/^\d{4}\/\d{4}$/),
    number: z.number().int().min(1).max(60),
    matches: z.array(matchSchema).length(15),
  })
  .refine(
    (w) => new Set(w.matches.map((m) => m.matchNo)).size === 15,
    "Maç numaraları benzersiz olmalı.",
  );
export const feedSchema = z.object({
  weeks: z.array(weekSchema).min(1).max(60),
});
export type Match = z.infer<typeof matchSchema>;
export function isLocked(matches: Match[]) {
  return matches.some(
    (m) => m.finished || new Date(m.kickoff).getTime() <= Date.now(),
  );
}
export function resultOf(matches: Match[]): string | null {
  if (
    !matches.every(
      (m) => m.finished && m.homeGoals !== null && m.awayGoals !== null,
    )
  )
    return null;
  return [...matches]
    .sort((a, b) => a.matchNo - b.matchNo)
    .map((m) =>
      m.homeGoals! > m.awayGoals!
        ? "1"
        : m.homeGoals! === m.awayGoals!
          ? "X"
          : "2",
    )
    .join("");
}
