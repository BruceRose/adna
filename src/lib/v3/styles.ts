/**
 * The nine event styles and axis-level copy (spec 6.3, 8.1, 8.2). Final copy:
 * do not paraphrase.
 */

export type Level = "low" | "mid" | "high";
export type AxisId = "connecting" | "ideas";

export type StyleId =
  | "activator"
  | "connector"
  | "innovator"
  | "pragmatist"
  | "all_rounder"
  | "explorer"
  | "analyst"
  | "observer"
  | "scholar";

export const LEVEL_NAMES: Record<AxisId, Record<Level, string>> = {
  connecting: { low: "Selective", mid: "Adaptable", high: "Sociable" },
  ideas: { low: "Applied", mid: "Balanced", high: "Exploratory" },
};

export const AXIS_NAMES: Record<AxisId, string> = { connecting: "Connecting", ideas: "Ideas" };

/** Rows: connecting high → low. Columns: ideas low → high. */
export const CONNECTING_ROWS: Level[] = ["high", "mid", "low"];
export const IDEAS_COLUMNS: Level[] = ["low", "mid", "high"];

export const GRID: Record<Level, Record<Level, StyleId>> = {
  high: { low: "activator", mid: "connector", high: "innovator" },
  mid: { low: "pragmatist", mid: "all_rounder", high: "explorer" },
  low: { low: "analyst", mid: "observer", high: "scholar" },
};

/** Style at a grid position: GRID[connecting][ideas]. */
export const styleAt = (connecting: Level, ideas: Level): StyleId => GRID[connecting][ideas];

export function positionOf(style: StyleId): { connecting: Level; ideas: Level } {
  for (const c of CONNECTING_ROWS) for (const i of IDEAS_COLUMNS) if (GRID[c][i] === style) return { connecting: c, ideas: i };
  throw new Error(`Unknown style ${style}`);
}

export interface Style {
  id: StyleId;
  name: string;
  tagline: string;
  strengths: [string, string, string];
  description: string;
}

export const STYLES: Record<StyleId, Style> = {
  activator: {
    id: "activator",
    name: "Activator",
    tagline: "Makes things happen through people",
    strengths: ["Energetic", "Practical", "Action-focused"],
    description:
      "You get energy from being in the mix, and you value content you can put to work straight away. You get the most from events that combine plenty of contact with practical, usable takeaways.",
  },
  connector: {
    id: "connector",
    name: "Connector",
    tagline: "Brings people and ideas together",
    strengths: ["Sociable", "Versatile", "Collaborative"],
    description:
      "You enjoy meeting people and you move comfortably between big ideas and practical detail. Events that make it easy to meet the right people, around content worth discussing, suit you best.",
  },
  innovator: {
    id: "innovator",
    name: "Innovator",
    tagline: "Sparks ideas with others",
    strengths: ["Curious", "Energising", "Imaginative"],
    description:
      "You're energised by people and by new possibilities. Co-creation, big-idea sessions and conversations about what's next are where you do your best thinking.",
  },
  pragmatist: {
    id: "pragmatist",
    name: "Pragmatist",
    tagline: "Gets value from any room",
    strengths: ["Grounded", "Adaptable", "Focused"],
    description:
      "You're comfortable in most social settings, and you look for content that is proven and usable. Clear, practical sessions and a mix of ways to meet people suit you.",
  },
  all_rounder: {
    id: "all_rounder",
    name: "All-Rounder",
    tagline: "Adapts to the room and the agenda",
    strengths: ["Flexible", "Balanced", "Open"],
    description:
      "You move easily between networking and quieter time, and between big ideas and practical detail. Variety suits you, and you can get value from almost any format.",
  },
  explorer: {
    id: "explorer",
    name: "Explorer",
    tagline: "Follows the most interesting ideas",
    strengths: ["Inquisitive", "Open-minded", "Adaptable"],
    description:
      "You're curious about what's next, and you join in when the topic is worth it. Sessions that stretch your thinking, and formats you haven't tried before, suit you.",
  },
  analyst: {
    id: "analyst",
    name: "Analyst",
    tagline: "Focused, practical and evidence-led",
    strengths: ["Focused", "Thorough", "Practical"],
    description:
      "You prefer purposeful conversations to working the room, and you value content that is practical and well evidenced. Pre-arranged meetings and focused, applied sessions suit you best.",
  },
  observer: {
    id: "observer",
    name: "Observer",
    tagline: "Takes it all in, connects one to one",
    strengths: ["Thoughtful", "Attentive", "Considered"],
    description:
      "You like time to absorb what you hear before joining in, and you connect best in smaller settings. A balance of content, with space to reflect and talk one to one, suits you.",
  },
  scholar: {
    id: "scholar",
    name: "Scholar",
    tagline: "Goes deep on big ideas",
    strengths: ["Deep-thinking", "Insightful", "Independent"],
    description:
      "You enjoy thinking hard about complex questions, and you prefer depth to breadth in conversation too. In-depth sessions, small-group discussion and pre-reading suit you best.",
  },
};

export const STYLE_IDS = Object.keys(STYLES) as StyleId[];

export interface AxisCopy {
  design: string;
  comms: string;
  present: string;
  /** Used when this level is held by a minority (>= 20%). */
  watchOut: string;
}

export const AXIS_COPY: Record<AxisId, Record<Level, AxisCopy>> = {
  connecting: {
    high: {
      design: "Build in structured networking, interactive sessions and live participation.",
      comms: "Show who else is coming and the chances to meet people.",
      present: "Get them involved early with polls or a quick chat with a neighbour.",
      watchOut: "Give them chances to talk and interact, not just listen.",
    },
    mid: {
      design: "Offer a mix of open networking and smaller settings.",
      comms: "Highlight both the people and the content.",
      present: "Mix participation with time to reflect.",
      watchOut: "Offer a range of ways to connect.",
    },
    low: {
      design: "Offer pre-booked one-to-ones, small roundtables and a quiet zone. Avoid forced icebreakers.",
      comms: "Share the attendee list and content in advance so people can plan who to meet.",
      present: "Give thinking time before asking for input, and offer anonymous ways to respond.",
      watchOut: "Don't rely only on big-room networking. Offer quieter ways to connect.",
    },
  },
  ideas: {
    high: {
      design: "Open with bold questions and future trends. Include experimental or immersive formats.",
      comms: "Lead with the big idea and where it could go.",
      present: "Paint the big picture first, then connect it to what it means for them.",
      watchOut: "Include some vision and new formats, not just the familiar.",
    },
    mid: {
      design: "Pair visionary sessions with practical case studies.",
      comms: "Sell the idea, then back it with concrete examples.",
      present: "Start with the why, then show a real example.",
      watchOut: "Balance vision with application.",
    },
    low: {
      design: "Use case studies, demos and tools people can use the next day. Keep formats proven and sessions focused.",
      comms: "Be concrete: outcomes, real examples, practical details.",
      present: "Use concrete examples and numbers people can picture.",
      watchOut: "Make sure there are practical takeaways, not just vision.",
    },
  },
};

export type PlanningBadge = "planner" | "free_roamer";

export const PLANNING_BADGES: Record<PlanningBadge, { label: string; copy: string }> = {
  planner: {
    label: "Planner",
    copy: "You like to know the plan. Early agendas, session pre-booking and prompt notice of any changes will help.",
  },
  free_roamer: {
    label: "Free-roamer",
    copy: "You like room to decide on the day. Drop-in sessions and flexible schedules suit you.",
  },
};

export type MotivationId = "learn" | "connect" | "business" | "inspiration";

/** "Here to learn" etc. The phrase after "Here" is used to combine two. */
export const MOTIVATIONS: Record<MotivationId, { label: string; phrase: string }> = {
  learn: { label: "Here to learn", phrase: "to learn" },
  connect: { label: "Here to connect", phrase: "to connect" },
  business: { label: "Here to do business", phrase: "to do business" },
  inspiration: { label: "Here for inspiration", phrase: "for inspiration" },
};

/** "Here to learn", or for two: "Here to learn and connect". */
export function motivationLabel(ids: MotivationId[]): string | null {
  if (ids.length === 0) return null;
  const [a, b] = ids.map((id) => MOTIVATIONS[id].phrase);
  if (!b) return `Here ${a}`;
  const second = a.startsWith("to ") && b.startsWith("to ") ? b.slice(3) : b;
  return `Here ${a} and ${second}`;
}

/** Results page note (spec 7.7). */
export const ABOUT_YOUR_STYLE =
  "Your style summarises how you described yourself today. Most people sit near the middle on at least one axis, and your style can shift with context. Use it as a starting point for conversation, not a fixed label.";
