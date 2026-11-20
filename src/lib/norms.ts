/**
 * Norms for v3 scoring (spec 6.1). PROVISIONAL.
 *
 * Replace after the pilot (n >= 500): cuts become the 25th and 75th
 * percentiles, and sd and reliability come from the pilot data. Change
 * `version` whenever any value changes: every response records the norms
 * version it was scored with.
 */
export const NORMS = {
  version: "provisional-2026-11",
  connecting: { cuts: [2.6, 3.6], sd: 0.7, reliability: 0.8 },
  ideas: { cuts: [2.6, 3.6], sd: 0.7, reliability: 0.8 },
  structure: { cuts: [2.4, 3.8], sd: 0.75, reliability: 0.75 },
  minAudienceN: 10,
  indicativeBelowN: 30,
} as const;

export type NormScale = { cuts: readonly [number, number]; sd: number; reliability: number };

/** Standard error of measurement: sd * sqrt(1 - reliability). */
export function sem(scale: NormScale): number {
  return scale.sd * Math.sqrt(1 - scale.reliability);
}
