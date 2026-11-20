/**
 * Questionnaire flow (v3.1 spec 4.2): the order of screens, progress, time
 * remaining, milestone messages and the saved draft. Pure, so it can be
 * tested; the Questionnaire component renders it.
 */
import { PILOT_ITEMS, type P2RowId } from "./items";

export type PrefKey = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8";
export const PREF_ORDER: PrefKey[] = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"];

export type Step =
  | { kind: "intro" }
  | { kind: "details" }
  | { kind: "interstitial"; part: 1 | 2 | 3 }
  | { kind: "part1" }
  | { kind: "trait"; id: string; index: number }
  | { kind: "pilot"; id: string; index: number }
  | { kind: "pref"; key: PrefKey; index: number }
  | { kind: "freeText" };

/** Copy for the cards before each Part (final, spec 4.2.2). */
export const PART_CARDS: Record<1 | 2 | 3, { title: string; body: string }> = {
  1: { title: "Part 1 of 3: About you", body: "Three quick questions about your work and the events you go to." },
  2: {
    title: "Part 2 of 3: How you are at events",
    body: "22 short statements. There are no right or wrong answers, so go with what's usually true for you.",
  },
  3: {
    title: "Part 3 of 3: Your event preferences",
    body: "Eight questions about what works for you at events. These shape most of your recommendations.",
  },
};

export const MILESTONES = {
  halfway: "Halfway through this part.",
  statementsDone: "That's the statements done. Nearly there.",
  freeText: "Last one, and it's optional.",
} as const;

export function buildSteps(order: string[], pilot: boolean, detailsPosition: "start" | "end"): Step[] {
  const s: Step[] = [{ kind: "intro" }];
  if (detailsPosition === "start") s.push({ kind: "details" });
  s.push({ kind: "interstitial", part: 1 }, { kind: "part1" }, { kind: "interstitial", part: 2 });
  order.forEach((id, index) => s.push({ kind: "trait", id, index }));
  if (pilot) PILOT_ITEMS.forEach((item, index) => s.push({ kind: "pilot", id: item.id, index }));
  s.push({ kind: "interstitial", part: 3 });
  PREF_ORDER.forEach((key, index) => s.push({ kind: "pref", key, index }));
  s.push({ kind: "freeText" });
  if (detailsPosition === "end") s.push({ kind: "details" });
  return s;
}

/** Which Part a step belongs to (for the three-part map), or null. */
export function partOf(step: Step): 1 | 2 | 3 | null {
  switch (step.kind) {
    case "interstitial":
      return step.part;
    case "part1":
      return 1;
    case "trait":
    case "pilot":
      return 2;
    case "pref":
    case "freeText":
      return 3;
    default:
      return null;
  }
}

export const SECONDS_PER_STATEMENT = 8;
export const SECONDS_PER_PART3_QUESTION = 15;

/** Estimated seconds left: 8 per statement and 15 per Part 3 question still to come (including the current one). */
export function secondsLeft(statementsLeft: number, part3Left: number): number {
  return statementsLeft * SECONDS_PER_STATEMENT + part3Left * SECONDS_PER_PART3_QUESTION;
}

/** "About 3 minutes left", rounded to whole minutes; null under a minute. */
export function timeLeftLabel(seconds: number): string | null {
  if (seconds < 60) return null;
  const m = Math.round(seconds / 60);
  return `About ${m} minute${m === 1 ? "" : "s"} left`;
}

export interface Progress {
  /** Fill of each Part's segment, 0-1. */
  segments: [number, number, number];
  /** The Part currently in progress, or null. */
  current: 1 | 2 | 3 | null;
  /** e.g. "Part 2 of 3 · Statement 7 of 22". */
  label: string | null;
  /** Short form for screen-reader announcements, e.g. "Statement 7 of 22". */
  announce: string | null;
  timeLeft: string | null;
}

export function progressFor(steps: Step[], index: number): Progress {
  const step = steps[index];
  const statements = steps.filter((s) => s.kind === "trait" || s.kind === "pilot");
  const prefs = steps.filter((s) => s.kind === "pref");
  const part1Index = steps.findIndex((s) => s.kind === "part1");
  const before = (pred: (s: Step) => boolean) => steps.slice(0, index).filter(pred).length;
  const statementsDone = before((s) => s.kind === "trait" || s.kind === "pilot");
  const prefsDone = before((s) => s.kind === "pref");
  const pastAll = step.kind === "freeText" || (step.kind === "details" && index > part1Index);

  const segments: [number, number, number] = [
    index > part1Index ? 1 : 0,
    pastAll ? 1 : statementsDone / statements.length,
    pastAll ? 1 : prefsDone / prefs.length,
  ];

  let label: string | null = null;
  let announce: string | null = null;
  if (step.kind === "part1") {
    label = "Part 1 of 3 · About you";
    announce = "Part 1 of 3";
  } else if (step.kind === "trait" || step.kind === "pilot") {
    const n = statementsDone + 1;
    announce = `Statement ${n} of ${statements.length}`;
    label = `Part 2 of 3 · ${announce}`;
  } else if (step.kind === "pref") {
    announce = `Question ${step.index + 1} of ${prefs.length}`;
    label = `Part 3 of 3 · ${announce}`;
  } else if (step.kind === "freeText") {
    label = "Part 3 of 3 · Optional";
    announce = "Last question, optional";
  } else if (step.kind === "interstitial") {
    announce = PART_CARDS[step.part].title;
  }

  const stLeft = statements.length - statementsDone;
  const pLeft = prefs.length - prefsDone;
  const showTime = step.kind !== "intro" && step.kind !== "details" && !pastAll;
  return {
    segments,
    current: partOf(step),
    label,
    announce,
    timeLeft: showTime ? timeLeftLabel(secondsLeft(stLeft, pLeft)) : null,
  };
}

/** Milestone message for the eyebrow, shown for one screen only. */
export function milestoneFor(steps: Step[], index: number): string | null {
  const step = steps[index];
  if (step.kind === "trait" && step.index === 11) return MILESTONES.halfway; // after statement 11 of 22
  const prev = steps[index - 1];
  if (prev?.kind === "trait" && prev.index === steps.filter((s) => s.kind === "trait").length - 1) return MILESTONES.statementsDone;
  if (step.kind === "freeText") return MILESTONES.freeText;
  return null;
}

/* ---------- Draft (sessionStorage) ---------- */

export const DRAFT_KEY = "adna-draft-v3";

/** In-progress answers. Never includes name or email (only whether details were completed). */
export interface Draft {
  v: 1;
  seed: number;
  stepIndex: number;
  answers: Record<string, number>;
  pilotAnswers: Record<string, number>;
  prefs: {
    P1: string[];
    P2: Partial<Record<P2RowId, 0 | 1 | 2>>;
    P3: string[];
    P4: string[];
    P5?: string;
    P6?: number;
    P7?: string;
    P8?: string;
  };
  context: { industry: string; industryOther: string; role: string; eventsAttended: string };
  timings: { startedAt?: string; part2StartedAt?: string; part2EndedAt?: string };
  detailsDone: boolean;
}

export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Draft;
    if (d?.v !== 1 || typeof d.seed !== "number" || typeof d.stepIndex !== "number" || d.stepIndex < 1) return null;
    // Defensive: never restore personal details even if something stored them.
    delete (d as unknown as Record<string, unknown>).details;
    return d;
  } catch {
    return null;
  }
}
