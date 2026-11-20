/**
 * v3 audience reports (spec section 9). Pure functions over v3 rows.
 */
import { NORMS } from "../norms";
import { P2, P3, P4, P5, P7, P8, type Option, type Preferences } from "./items";
import type { AxisResult, QualityFlag } from "./scoring";
import {
  AXIS_COPY,
  AXIS_NAMES,
  CONNECTING_ROWS,
  IDEAS_COLUMNS,
  LEVEL_NAMES,
  MOTIVATIONS,
  STYLE_IDS,
  positionOf,
  type AxisId,
  type Level,
  type MotivationId,
  type PlanningBadge,
  type StyleId,
} from "./styles";

export interface AudienceInputRow {
  axes: Record<AxisId, AxisResult>;
  style: StyleId;
  badges: { planning: PlanningBadge | null; motivation: MotivationId[] };
  preferences: Preferences;
  qualityFlags: QualityFlag[];
  /** questionnaire_version; anything other than "3" is excluded. */
  version: string;
}

export interface Share {
  n: number;
  pct: number;
  /** 95% margin of error in percentage points. */
  moe: number;
}

export interface AxisSummary {
  axis: AxisId;
  name: string;
  scores: number[];
  mean: number;
  ciLow: number;
  ciHigh: number;
  cuts: readonly [number, number];
  levels: Record<Level, Share>;
  /** The named dominant level, or null when the axis is mixed. */
  dominant: Level | null;
  /** Level used for advice: the dominant level, or "mid" when mixed. */
  effective: Level;
  /** Share held by the most common level (strength of consensus). */
  topShare: number;
}

export interface AudienceTooSmall {
  state: "too_small";
  eligible: number;
  excluded: number;
  legacy: number;
}

export interface AudienceReady {
  state: "ok";
  n: number;
  excluded: number;
  legacy: number;
  indicative: boolean;
  headline: string;
  motivationLine: string | null;
  styleMap: {
    cells: Record<StyleId, Share>;
    rowTotals: Record<Level, Share>;
    colTotals: Record<Level, Share>;
  };
  axes: Record<AxisId, AxisSummary>;
  wants: {
    p2: { id: string; label: string; worksWell: Share; notForMe: Share; net: number }[];
    p3: ({ id: string; label: string } & Share)[];
    p4: ({ id: string; label: string } & Share)[];
    p5: ({ id: string; label: string } & Share)[];
    p7: ({ id: string; label: string } & Share)[];
    p8: ({ id: string; label: string } & Share)[];
  };
  playbook: {
    planners: { axis: AxisId; text: string }[];
    content: { axis: AxisId; text: string }[];
    presenters: { axis: AxisId; text: string }[];
  };
  avoid: { id: string; label: string; notForMe: Share }[];
  dontForget: { axis: AxisId; level: Level; label: string; share: Share; text: string }[];
  planning: { planner: Share; freeRoamer: Share; sendAgendasEarly: boolean };
}

export type AudienceReport = AudienceTooSmall | AudienceReady;

/** ± round(196 * sqrt(p(1-p)/n)) percentage points. */
export function marginOfError(p: number, n: number): number {
  if (n <= 0) return 0;
  return Math.round(196 * Math.sqrt((p * (1 - p)) / n));
}

export function share(count: number, n: number): Share {
  const p = n > 0 ? count / n : 0;
  return { n: count, pct: Math.round(p * 100), moe: marginOfError(p, n) };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round2 = (x: number) => Math.round(x * 100) / 100;
const LEVELS: Level[] = ["low", "mid", "high"];

function summariseAxis(rows: AudienceInputRow[], axis: AxisId): AxisSummary {
  const n = rows.length;
  const scores = rows.map((r) => r.axes[axis].score);
  const m = mean(scores);
  const sd = n > 1 ? Math.sqrt(scores.reduce((a, s) => a + (s - m) ** 2, 0) / (n - 1)) : 0;
  const half = (1.96 * sd) / Math.sqrt(n);
  const levels = Object.fromEntries(
    LEVELS.map((l) => [l, share(rows.filter((r) => r.axes[axis].level === l).length, n)]),
  ) as Record<Level, Share>;

  // Named only if the most common level holds >= 45% and leads the next by >= 10 points.
  const ranked = [...LEVELS].sort((a, b) => levels[b].n - levels[a].n);
  const top = levels[ranked[0]].n / n;
  const second = levels[ranked[1]].n / n;
  const dominant = top >= 0.45 && top - second >= 0.1 ? ranked[0] : null;

  return {
    axis,
    name: AXIS_NAMES[axis],
    scores,
    mean: round2(m),
    ciLow: round2(m - half),
    ciHigh: round2(m + half),
    cuts: NORMS[axis].cuts,
    levels,
    dominant,
    effective: dominant ?? "mid",
    topShare: Math.round(top * 100),
  };
}

const article = (word: string) => (/^[AEIOU]/i.test(word) ? "An" : "A");

export function headlineFor(axes: Record<AxisId, AxisSummary>): string {
  const c = axes.connecting.dominant && LEVEL_NAMES.connecting[axes.connecting.dominant];
  const i = axes.ideas.dominant && LEVEL_NAMES.ideas[axes.ideas.dominant];
  if (c && i) return `${article(c)} ${c} audience, leaning ${i}`;
  if (c) return `${article(c)} ${c} audience with a mix of content preferences`;
  if (i) return `${article(i)} ${i} audience with a mix of networking preferences`;
  return "A mixed audience across both axes";
}

function motivationLine(rows: AudienceInputRow[]): string | null {
  const n = rows.length;
  const counts = (Object.keys(MOTIVATIONS) as MotivationId[])
    .map((id) => ({ id, n: rows.filter((r) => r.badges.motivation.includes(id)).length }))
    .sort((a, b) => b.n - a.n);
  const top = counts[0];
  if (!top || top.n === 0) return null;
  const pct = Math.round((top.n / n) * 100);
  const phrase = `here ${MOTIVATIONS[top.id].phrase}`;
  return pct > 50 ? `Most are ${phrase} (${pct}%)` : `The largest group is ${phrase} (${pct}%)`;
}

function optionShares(
  rows: AudienceInputRow[],
  options: readonly Option[],
  chosen: (p: Preferences, id: string) => boolean,
  sort: boolean,
) {
  const out = options.map((o) => ({ id: o.id, label: o.label, ...share(rows.filter((r) => chosen(r.preferences, o.id)).length, rows.length) }));
  return sort ? out.sort((a, b) => b.n - a.n) : out;
}

export function buildAudienceReport(all: AudienceInputRow[]): AudienceReport {
  const legacy = all.filter((r) => r.version !== "3").length;
  const v3 = all.filter((r) => r.version === "3");
  const rows = v3.filter((r) => r.qualityFlags.length === 0);
  const excluded = v3.length - rows.length;
  const n = rows.length;

  if (n < NORMS.minAudienceN) return { state: "too_small", eligible: n, excluded, legacy };

  const axes = { connecting: summariseAxis(rows, "connecting"), ideas: summariseAxis(rows, "ideas") };

  const cells = Object.fromEntries(STYLE_IDS.map((s) => [s, share(rows.filter((r) => r.style === s).length, n)])) as Record<StyleId, Share>;
  const rowTotals = Object.fromEntries(
    CONNECTING_ROWS.map((l) => [l, share(rows.filter((r) => positionOf(r.style).connecting === l).length, n)]),
  ) as Record<Level, Share>;
  const colTotals = Object.fromEntries(
    IDEAS_COLUMNS.map((l) => [l, share(rows.filter((r) => positionOf(r.style).ideas === l).length, n)]),
  ) as Record<Level, Share>;

  const p2 = P2.rows
    .map((row) => {
      const worksWell = share(rows.filter((r) => r.preferences.P2[row.id] === 2).length, n);
      const notForMe = share(rows.filter((r) => r.preferences.P2[row.id] === 0).length, n);
      return { id: row.id, label: row.label, worksWell, notForMe, net: worksWell.pct - notForMe.pct };
    })
    .sort((a, b) => b.net - a.net);

  const byConsensus = (["connecting", "ideas"] as AxisId[]).sort((a, b) => axes[b].topShare - axes[a].topShare);
  const playbookFor = (field: "design" | "comms" | "present") =>
    byConsensus.map((axis) => ({ axis, text: AXIS_COPY[axis][axes[axis].effective][field] }));

  const dontForget = (["connecting", "ideas"] as AxisId[]).flatMap((axis) =>
    LEVELS.filter((l) => l !== axes[axis].effective && axes[axis].levels[l].pct >= 20).map((l) => ({
      axis,
      level: l,
      label: LEVEL_NAMES[axis][l],
      share: axes[axis].levels[l],
      text: AXIS_COPY[axis][l].watchOut,
    })),
  ).sort((a, b) => b.share.n - a.share.n);

  const planner = share(rows.filter((r) => r.badges.planning === "planner").length, n);
  const freeRoamer = share(rows.filter((r) => r.badges.planning === "free_roamer").length, n);

  return {
    state: "ok",
    n,
    excluded,
    legacy,
    indicative: n < NORMS.indicativeBelowN,
    headline: headlineFor(axes),
    motivationLine: motivationLine(rows),
    styleMap: { cells, rowTotals, colTotals },
    axes,
    wants: {
      p2,
      p3: optionShares(rows, P3.options, (p, id) => (p.P3 as string[]).includes(id), true),
      p4: optionShares(rows, P4.options, (p, id) => (p.P4 as string[]).includes(id), true),
      p5: optionShares(rows, P5.options, (p, id) => p.P5 === id, false),
      p7: optionShares(rows, P7.options, (p, id) => p.P7 === id, false),
      p8: optionShares(rows, P8.options, (p, id) => p.P8 === id, false),
    },
    playbook: { planners: playbookFor("design"), content: playbookFor("comms"), presenters: playbookFor("present") },
    avoid: p2.filter((r) => r.notForMe.pct >= 30).map((r) => ({ id: r.id, label: r.label, notForMe: r.notForMe })),
    dontForget,
    planning: { planner, freeRoamer, sendAgendasEarly: planner.pct >= 30 },
  };
}

/* Copy shown on report views (spec 9.1). */
export const AUDIENCE_COPY = {
  tooSmall: "This audience is too small to report. At least 10 responses are needed.",
  indicative: "Indicative only: with fewer than 30 responses, percentages can be out by 15-20 points.",
  excluded: (n: number) => `${n} ${n === 1 ? "response" : "responses"} excluded for data quality`,
  legacy: (n: number) =>
    `${n} earlier ${n === 1 ? "response uses" : "responses use"} the previous model and ${n === 1 ? "is" : "are"} not included here.`,
};
