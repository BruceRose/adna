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
  /** Second person, for the respondent's results page. */
  description: string;
  /** Third person, for the public style page. */
  about: string;
  /** "At events they get the most from" (3 bullets). */
  getMost: [string, string, string];
  /** "What can drain them" (2 bullets). */
  drains: [string, string];
  /** For fellow attendees: how to connect with this style. */
  connect: string;
  /** For organisers: designing for this style. */
  design: string;
}

export const STYLES: Record<StyleId, Style> = {
  activator: {
    id: "activator",
    name: "Activator",
    tagline: "Makes things happen through people",
    strengths: ["Energetic", "Practical", "Action-focused"],
    description:
      "You get energy from being in the mix, and you value content you can put to work straight away. You get the most from events that combine plenty of contact with practical, usable takeaways.",
    about:
      "Activators get their energy from being in the mix and want content they can put to work straight away. They are often the ones starting conversations and turning ideas into next steps.",
    getMost: ["Busy networking with a clear purpose", "Practical sessions with takeaways they can use the next day", "Demos, case studies and hands-on workshops"],
    drains: ["Long, theoretical sessions with no practical point", "Hours of listening with no chance to talk"],
    connect: "Be direct and practical. Suggest a concrete next step, such as a follow-up call or an introduction.",
    design: "Give them plenty of structured networking and applied content, and make the practical takeaways explicit.",
  },
  connector: {
    id: "connector",
    name: "Connector",
    tagline: "Brings people and ideas together",
    strengths: ["Sociable", "Versatile", "Collaborative"],
    description:
      "You enjoy meeting people and you move comfortably between big ideas and practical detail. Events that make it easy to meet the right people, around content worth discussing, suit you best.",
    about:
      "Connectors enjoy meeting people and move comfortably between big ideas and practical detail. They often bring people together around content worth discussing.",
    getMost: ["Hosted introductions and networking around a theme", "Sessions that mix vision with real examples", "Discussion formats where people share views"],
    drains: ["Events with little time to meet people", "Content that is all vision or all detail"],
    connect: "Introduce them to someone they should meet, or ask what they've found most useful so far.",
    design: "Build networking around the content, for example topic tables straight after a keynote.",
  },
  innovator: {
    id: "innovator",
    name: "Innovator",
    tagline: "Sparks ideas with others",
    strengths: ["Curious", "Energising", "Imaginative"],
    description:
      "You're energised by people and by new possibilities. Co-creation, big-idea sessions and conversations about what's next are where you do your best thinking.",
    about:
      "Innovators are energised by people and by new possibilities. They often do their best thinking out loud, with others, about what's next.",
    getMost: ["Co-creation and ideas sessions", "Future-focused keynotes and bold questions", "Unusual formats and venues"],
    drains: ["Rigidly familiar formats", "Content focused only on how things are done today"],
    connect: "Ask a big question about where things are heading, and build on their ideas.",
    design: "Include experimental formats and live participation, and leave room for discussion after big-idea sessions.",
  },
  pragmatist: {
    id: "pragmatist",
    name: "Pragmatist",
    tagline: "Gets value from any room",
    strengths: ["Grounded", "Adaptable", "Focused"],
    description:
      "You're comfortable in most social settings, and you look for content that is proven and usable. Clear, practical sessions and a mix of ways to meet people suit you.",
    about:
      "Pragmatists are comfortable in most social settings and look for content that is proven and usable. They judge an event by what they can take away from it.",
    getMost: ["Clear, practical sessions with real examples", "A mix of ways to meet people", "Well-run agendas that respect their time"],
    drains: ["Speculation without application", "Sessions that don't deliver what was promised"],
    connect: "Talk about what's working in practice, and share something useful.",
    design: "Make session descriptions accurate, and lead with outcomes and evidence.",
  },
  all_rounder: {
    id: "all_rounder",
    name: "All-Rounder",
    tagline: "Adapts to the room and the agenda",
    strengths: ["Flexible", "Balanced", "Open"],
    description:
      "You move easily between networking and quieter time, and between big ideas and practical detail. Variety suits you, and you can get value from almost any format.",
    about:
      "All-Rounders move easily between networking and quieter time, and between big ideas and practical detail. They can get value from almost any format.",
    getMost: ["Variety across the day", "A choice of formats and ways to take part", "Content that links the big picture to practice"],
    drains: ["Days built around a single format", "Too little choice in how to take part"],
    connect: "Most approaches work. Ask what they're hoping to get from the event.",
    design: "Offer variety and choice. All-Rounders tend to adapt to what the room needs.",
  },
  explorer: {
    id: "explorer",
    name: "Explorer",
    tagline: "Follows the most interesting ideas",
    strengths: ["Inquisitive", "Open-minded", "Adaptable"],
    description:
      "You're curious about what's next, and you join in when the topic is worth it. Sessions that stretch your thinking, and formats you haven't tried before, suit you.",
    about:
      "Explorers are curious about what's next and join in when the topic is worth it. They are drawn to sessions that stretch their thinking.",
    getMost: ["Future-focused and in-depth sessions", "Formats they haven't tried before", "Conversations about emerging ideas"],
    drains: ["Repetitive or predictable content", "Networking without a topic to talk about"],
    connect: "Share an idea or trend you've found interesting and ask what they think.",
    design: "Signpost what's new and unexpected in the programme, and leave space for questions.",
  },
  analyst: {
    id: "analyst",
    name: "Analyst",
    tagline: "Focused, practical and evidence-led",
    strengths: ["Focused", "Thorough", "Practical"],
    description:
      "You prefer purposeful conversations to working the room, and you value content that is practical and well evidenced. Pre-arranged meetings and focused, applied sessions suit you best.",
    about:
      "Analysts prefer purposeful conversations to working the room, and they value content that is practical and well evidenced.",
    getMost: ["Pre-arranged one-to-one meetings", "Focused, applied sessions with data and case studies", "Clear agendas and session detail in advance"],
    drains: ["Large, unstructured networking", "Claims without evidence"],
    connect: "Arrange a meeting in advance with a clear purpose, and bring evidence.",
    design: "Offer pre-booked meetings and roundtables, and publish detailed session content early.",
  },
  observer: {
    id: "observer",
    name: "Observer",
    tagline: "Takes it all in, connects one to one",
    strengths: ["Thoughtful", "Attentive", "Considered"],
    description:
      "You like time to absorb what you hear before joining in, and you connect best in smaller settings. A balance of content, with space to reflect and talk one to one, suits you.",
    about:
      "Observers like time to absorb what they hear before joining in, and they connect best in smaller settings.",
    getMost: ["Small-group discussion and one-to-one conversations", "A balance of big-picture and practical content", "Space to reflect between sessions"],
    drains: ["Being put on the spot in front of a large audience", "Back-to-back sessions with no time to think"],
    connect: "Start a one-to-one conversation in a quieter moment, and give them time to respond.",
    design: "Offer anonymous Q&A and quiet spaces, and build in breaks for reflection.",
  },
  scholar: {
    id: "scholar",
    name: "Scholar",
    tagline: "Goes deep on big ideas",
    strengths: ["Deep-thinking", "Insightful", "Independent"],
    description:
      "You enjoy thinking hard about complex questions, and you prefer depth to breadth in conversation too. In-depth sessions, small-group discussion and pre-reading suit you best.",
    about:
      "Scholars enjoy thinking hard about complex questions and prefer depth to breadth, in content and in conversation.",
    getMost: ["In-depth sessions and pre-reading", "Small-group discussion with expert voices", "Time to explore an idea properly"],
    drains: ["Surface-level content", "Large, noisy networking"],
    connect: "Ask a thoughtful question about a session, and be ready for a deep conversation.",
    design: "Provide deep-dive tracks, reading lists and small, expert-led discussions.",
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

/* ---------- Style pages: URLs, order and neighbours ---------- */

/** URL slug for a style: kebab-case, e.g. all_rounder → all-rounder. */
export const styleSlug = (id: StyleId) => id.replace(/_/g, "-");

/** StyleId from a URL slug, or null if it isn't one. */
export function styleFromSlug(slug: string): StyleId | null {
  const id = slug.replace(/-/g, "_");
  return (STYLE_IDS as string[]).includes(id) && styleSlug(id as StyleId) === slug ? (id as StyleId) : null;
}

export const isStyleId = (x: string | null | undefined): x is StyleId => !!x && (STYLE_IDS as string[]).includes(x);

/** Grid order, row by row: Sociable row first, Applied column first. */
export const GRID_ORDER: StyleId[] = CONNECTING_ROWS.flatMap((c) => IDEAS_COLUMNS.map((i) => GRID[c][i]));

/** Previous and next styles in grid order (wrapping round). */
export function prevNextStyle(id: StyleId): { prev: StyleId; next: StyleId } {
  const i = GRID_ORDER.indexOf(id);
  return { prev: GRID_ORDER[(i + 8) % 9], next: GRID_ORDER[(i + 1) % 9] };
}

/** Styles in cells sharing an edge with this one (2-4 of them). */
export function neighbouringStyles(id: StyleId): StyleId[] {
  const rows = CONNECTING_ROWS;
  const cols = IDEAS_COLUMNS;
  const { connecting, ideas } = positionOf(id);
  const r = rows.indexOf(connecting);
  const c = cols.indexOf(ideas);
  return [
    [r - 1, c],
    [r, c - 1],
    [r, c + 1],
    [r + 1, c],
  ]
    .filter(([y, x]) => y >= 0 && y < 3 && x >= 0 && x < 3)
    .map(([y, x]) => GRID[rows[y]][cols[x]]);
}

/** Plural for page copy, e.g. "Analysts", "All-Rounders". */
export const stylePlural = (id: StyleId) => `${STYLES[id].name}s`;
