/**
 * Personal recommendations (spec 8.3). Preferences come first; traits refine
 * them. Pure functions.
 */
import { P2, P2_ROW_IDS, P3, P4, P5, labelFor, type P2RowId, type P3Id, type Preferences } from "./items";
import type { AxisResult } from "./scoring";
import type { AxisId, Level, PlanningBadge } from "./styles";

export interface Recommendations {
  formats: { id: P2RowId; label: string }[];
  takePart: string[];
  convinces: string;
  communicate: string[];
  depth: string[];
  pace: string | null;
}

const AXIS_FORMATS: Record<Level, P2RowId[]> = {
  low: ["one_to_one", "roundtables"],
  high: ["reception", "shared_activity"],
  mid: ["roundtables", "hosted_intros"],
};

/** Up to 4 rows rated "Works well for me"; topped up from the Connecting level if fewer than 2. Never a row rated 0. */
export function recommendedFormats(p2: Preferences["P2"], connecting: Level): P2RowId[] {
  const out = P2_ROW_IDS.filter((id) => p2[id] === 2).slice(0, 4);
  if (out.length < 2) {
    for (const id of AXIS_FORMATS[connecting]) {
      if (out.length >= 4) break;
      if (!out.includes(id) && p2[id] !== 0) out.push(id);
    }
  }
  return out;
}

const TAKE_PART_PHRASES: Record<P3Id, string> = {
  ask_aloud: "asking questions out loud",
  app_named: "submitting questions in the app with your name",
  app_anon: "submitting questions anonymously",
  polls: "answering live polls",
  discuss_neighbours: "discussing with the people around you",
  small_group_task: "working on a task in a small group",
  listen: "listening",
};

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function takePartLines(p3: readonly P3Id[]): string[] {
  const ordered = P3.options.map((o) => o.id).filter((id) => p3.includes(id));
  const lines = [`You prefer ${joinList(ordered.map((id) => TAKE_PART_PHRASES[id]))}.`];
  if (p3.includes("listen")) lines.push("Organisers should avoid calling on you without warning.");
  return lines;
}

/** "Data and research, and real-world case studies". */
export function convincesLine(p4: Preferences["P4"]): string {
  const [a, b] = p4.map((id) => labelFor(P4.options, id));
  return b ? `${a}, and ${lowerFirst(b)}` : a;
}

const P7_LINES: Record<Preferences["P7"], string> = {
  essentials: "Just the essentials, please",
  agenda: "The essentials plus the agenda",
  full: "Full detail in advance",
};

export function communicateLines(p6: Preferences["P6"], p7: Preferences["P7"], planning: PlanningBadge | null): string[] {
  const lines: string[] = [];
  if (p6 <= 2) lines.push("Keep it brief and to the point.");
  if (p6 >= 4) lines.push("A warm, conversational tone works for you.");
  lines.push(`${P7_LINES[p7]}.`);
  if (planning === "planner") lines.push("Send the agenda early and flag any changes promptly.");
  return lines;
}

const DEPTH_LINES: Record<Level, string> = {
  high: "Deep dives, future-focused sessions and new formats.",
  mid: "A mix of big-picture and practical sessions.",
  low: "Practical, applied sessions with clear takeaways.",
};

export function depthLines(ideas: Level, p5: Preferences["P5"]): string[] {
  const lines = [DEPTH_LINES[ideas]];
  if (p5 !== "none") lines.push(`Session length: ${lowerFirst(labelFor(P5.options, p5))}.`);
  return lines;
}

const PACE_LINES: Record<Preferences["P8"], string | null> = {
  brisk: "Keep it moving",
  hourly: "Regular breaks",
  long_breaks: "Longer breaks to network or recharge",
  none: null,
};

export function buildRecommendations(
  prefs: Preferences,
  axes: Record<AxisId, AxisResult>,
  planning: PlanningBadge | null,
): Recommendations {
  return {
    formats: recommendedFormats(prefs.P2, axes.connecting.level).map((id) => ({ id, label: labelFor(P2.rows, id) })),
    takePart: takePartLines(prefs.P3),
    convinces: convincesLine(prefs.P4),
    communicate: communicateLines(prefs.P6, prefs.P7, planning),
    depth: depthLines(axes.ideas.level, prefs.P5),
    pace: PACE_LINES[prefs.P8],
  };
}
