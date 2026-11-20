/**
 * v3 scoring (spec 6.2). Pure functions only: no I/O, no randomness.
 * Always run on the server; never trust scores sent by the browser.
 */
import { NORMS, sem } from "../norms";
import { SCALE_IDS, TRAIT_ITEMS, type P1Id, type ScaleId, type TraitItem } from "./items";
import { styleAt, type AxisId, type Level, type MotivationId, type PlanningBadge, type StyleId } from "./styles";

export type TraitAnswers = Record<string, number>;

export type QualityFlag = "straightline" | "contradiction" | "fast" | "acquiescence";

export interface AxisResult {
  score: number;
  level: Level;
}

export interface V3Score {
  scaleScores: Record<ScaleId, number>;
  axes: Record<AxisId, AxisResult>;
  style: StyleId;
  styleNeighbour: StyleId | null;
  badges: { planning: PlanningBadge | null; motivation: MotivationId[] };
  qualityFlags: QualityFlag[];
  normsVersion: string;
}

export interface Timings {
  part2StartedAt?: string;
  part2EndedAt?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Item value after reversal: key +1 → answer, key -1 → 6 - answer. */
export function itemValue(item: Pick<TraitItem, "key">, answer: number): number {
  if (!Number.isInteger(answer) || answer < 1 || answer > 5) throw new RangeError(`Answer must be 1-5, got ${answer}`);
  return item.key === 1 ? answer : 6 - answer;
}

function presentValues(answers: TraitAnswers, items: TraitItem[]): number[] {
  return items.filter((i) => answers[i.id] !== undefined).map((i) => itemValue(i, answers[i.id]));
}

/** Mean of a scale's items. Needs at least 75% of the scale's items, otherwise throws. */
export function scaleScore(answers: TraitAnswers, scale: ScaleId): number {
  const items = TRAIT_ITEMS.filter((i) => i.scale === scale);
  const values = presentValues(answers, items);
  if (values.length < Math.ceil(items.length * 0.75)) {
    throw new Error(`Not enough answers to score ${scale}: ${values.length} of ${items.length}`);
  }
  return mean(values);
}

const AXIS_SCALES: Record<AxisId, ScaleId[]> = { connecting: ["SE", "SI"], ideas: ["DP", "NO"] };

/** Axis score: the mean of all present items on its two scales (not the mean of the scale scores). */
export function axisScore(answers: TraitAnswers, axis: AxisId): number {
  return mean(presentValues(answers, TRAIT_ITEMS.filter((i) => AXIS_SCALES[axis].includes(i.scale))));
}

export function levelFor(score: number, cuts: readonly [number, number]): Level {
  if (score < cuts[0]) return "low";
  if (score > cuts[1]) return "high";
  return "mid";
}

/**
 * Neighbouring style: if an axis score is within one SEM of its nearest cut,
 * the neighbour is the cell across that cut. If both axes qualify, use the
 * one closer in SEM units. Otherwise null.
 */
export function neighbourFor(axes: Record<AxisId, AxisResult>): StyleId | null {
  const candidates = (["connecting", "ideas"] as AxisId[])
    .map((axis) => {
      const { cuts } = NORMS[axis];
      const { score, level } = axes[axis];
      const d0 = Math.abs(score - cuts[0]);
      const d1 = Math.abs(score - cuts[1]);
      const nearLower = d0 <= d1;
      const distance = nearLower ? d0 : d1;
      // The level on the other side of that cut.
      const across: Level = nearLower ? (level === "low" ? "mid" : "low") : level === "high" ? "mid" : "high";
      return { axis, ratio: distance / sem(NORMS[axis]), within: distance < sem(NORMS[axis]), across };
    })
    .filter((c) => c.within)
    .sort((a, b) => a.ratio - b.ratio);

  const best = candidates[0];
  if (!best) return null;
  const connecting = best.axis === "connecting" ? best.across : axes.connecting.level;
  const ideas = best.axis === "ideas" ? best.across : axes.ideas.level;
  return styleAt(connecting, ideas);
}

/** Planner at or above the upper cut, free-roamer at or below the lower cut (inclusive). */
export function planningBadge(ns: number): PlanningBadge | null {
  const [lower, upper] = NORMS.structure.cuts;
  if (ns >= upper) return "planner";
  if (ns <= lower) return "free_roamer";
  return null;
}

const MOTIVATION_OF: Record<P1Id, MotivationId> = {
  learn_ideas: "learn",
  learn_skills: "learn",
  meet_new: "connect",
  catch_up: "connect",
  meet_specific: "business",
  represent: "business",
  inspiration: "inspiration",
  change: "inspiration",
};

/** P1 → motivation categories, de-duplicated, in order of first selection, max 2. */
export function motivationBadge(p1: readonly P1Id[]): MotivationId[] {
  const out: MotivationId[] = [];
  for (const id of p1) {
    const m = MOTIVATION_OF[id];
    if (m && !out.includes(m)) out.push(m);
  }
  return out.slice(0, 2);
}

export const CONTRADICTION_PAIRS: [string, string][] = [
  ["NS1", "NS4"],
  ["NS5", "NS6"],
  ["SI1", "SI3"],
  ["DP1", "DP3"],
  ["NO1", "NO3"],
  ["SE2", "SE3"],
];

export function qualityFlags(answers: TraitAnswers, timings: Timings = {}): QualityFlag[] {
  const raw = TRAIT_ITEMS.map((i) => answers[i.id]).filter((v): v is number => v !== undefined);
  const flags: QualityFlag[] = [];

  if (raw.length === TRAIT_ITEMS.length && raw.every((v) => v === raw[0])) flags.push("straightline");

  const contradictions = CONTRADICTION_PAIRS.filter(([a, b]) => {
    const x = answers[a];
    const y = answers[b];
    if (x === undefined || y === undefined) return false;
    return (x >= 4 && y >= 4) || (x <= 2 && y <= 2);
  }).length;
  if (contradictions >= 2) flags.push("contradiction");

  if (timings.part2StartedAt && timings.part2EndedAt) {
    const ms = Date.parse(timings.part2EndedAt) - Date.parse(timings.part2StartedAt);
    if (Number.isFinite(ms) && ms < 60_000) flags.push("fast");
  }

  if (raw.length > 0) {
    const m = mean(raw);
    if (m > 4.2 || m < 1.8) flags.push("acquiescence");
  }
  return flags;
}

export function scoreV3(answers: TraitAnswers, p1: readonly P1Id[], timings: Timings = {}): V3Score {
  const scaleScores = Object.fromEntries(SCALE_IDS.map((s) => [s, round2(scaleScore(answers, s))])) as Record<ScaleId, number>;

  const axes = {} as Record<AxisId, AxisResult>;
  for (const axis of ["connecting", "ideas"] as AxisId[]) {
    const score = round2(axisScore(answers, axis));
    axes[axis] = { score, level: levelFor(score, NORMS[axis].cuts) };
  }

  return {
    scaleScores,
    axes,
    style: styleAt(axes.connecting.level, axes.ideas.level),
    styleNeighbour: neighbourFor(axes),
    badges: { planning: planningBadge(scaleScores.NS), motivation: motivationBadge(p1) },
    qualityFlags: qualityFlags(answers, timings),
    normsVersion: NORMS.version,
  };
}
