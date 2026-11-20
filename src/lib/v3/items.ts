/**
 * AudienceDNA v3 questionnaire content (spec section 4). Wording is final:
 * do not paraphrase. Item ids are stable and used as stored answer keys.
 */

export const QUESTIONNAIRE_VERSION = "3";

/* ------------------------------------------------------------------ */
/* Intro                                                               */
/* ------------------------------------------------------------------ */

export const INTRO = {
  title: "Discover your Audience DNA",
  body: "Welcome! You're about to answer some quick questions about how you like to experience events. There are no right or wrong answers. At the end you'll see your event style and what helps you get the most out of events.",
} as const;

export const SECTION_LABELS = {
  part1: "Part 1 of 3: About you",
  part2: "Part 2 of 3: How you are at events",
  part3: "Part 3 of 3: Your event preferences",
} as const;

/* ------------------------------------------------------------------ */
/* Part 1: About you                                                   */
/* ------------------------------------------------------------------ */

export const OTHER_INDUSTRY = "Other";

/** C1. "Other" always appears last, with a free-text box. */
export const INDUSTRIES = [
  "Automotive",
  "Charity & Non-profit",
  "Consumer Goods & Retail",
  "Education",
  "Energy & Utilities",
  "Financial Services",
  "Healthcare & Pharmaceuticals",
  "Hospitality, Travel & Leisure",
  "Manufacturing & Industrial",
  "Media & Entertainment",
  "Professional Services",
  "Property & Construction",
  "Public Sector & Government",
  "Technology",
  "Telecommunications",
  "Transport & Logistics",
] as const;

export interface Option<T extends string = string> {
  id: T;
  label: string;
}

export const C1_QUESTION = "Which industry do you work in?";

export const C2 = {
  question: "Which best describes your role?",
  options: [
    { id: "individual", label: "Individual contributor" },
    { id: "manager", label: "Team or project manager" },
    { id: "senior", label: "Senior manager or head of function" },
    { id: "director", label: "Director, partner or executive" },
    { id: "founder", label: "Founder or self-employed" },
    { id: "other", label: "Other" },
  ],
} as const satisfies { question: string; options: readonly Option[] };

export const C3 = {
  question:
    "Roughly how many work events (conferences, client events, summits, away-days) have you attended in the past 12 months?",
  options: [
    { id: "none", label: "None" },
    { id: "1_2", label: "1-2" },
    { id: "3_5", label: "3-5" },
    { id: "6_plus", label: "6 or more" },
  ],
} as const satisfies { question: string; options: readonly Option[] };

export type RoleId = (typeof C2.options)[number]["id"];
export type EventsAttendedId = (typeof C3.options)[number]["id"];

/* ------------------------------------------------------------------ */
/* Part 2: How you are at events                                       */
/* ------------------------------------------------------------------ */

export type ScaleId = "SE" | "SI" | "DP" | "NO" | "NS";

export const SCALES: Record<ScaleId, { name: string }> = {
  SE: { name: "Social energy" },
  SI: { name: "Social initiative" },
  DP: { name: "Depth of processing" },
  NO: { name: "Openness to new experiences" },
  NS: { name: "Need for structure" },
};

export const SCALE_IDS: ScaleId[] = ["SE", "SI", "DP", "NO", "NS"];

export interface TraitItem {
  id: string;
  scale: ScaleId;
  /** +1: agreeing scores high. -1: reverse-scored (6 - answer). */
  key: 1 | -1;
  text: string;
}

export const PART2_INSTRUCTION =
  "Think about how you usually are at work events such as conferences, client events and away-days. Describe yourself as you are now, not as you'd like to be. There are no right or wrong answers.";

/** The 5-point "like me" scale. Every point is labelled. */
export const LIKE_ME_SCALE = [
  { value: 1, label: "Very unlike me" },
  { value: 2, label: "Somewhat unlike me" },
  { value: 3, label: "Neither like nor unlike me" },
  { value: 4, label: "Somewhat like me" },
  { value: 5, label: "Very like me" },
] as const;

export const TRAIT_ITEMS: TraitItem[] = [
  { id: "SE1", scale: "SE", key: 1, text: "After a busy networking event, I usually feel energised." },
  { id: "SE2", scale: "SE", key: 1, text: "I enjoy meeting lots of new people at events." },
  { id: "SE3", scale: "SE", key: -1, text: "I'd rather have a few in-depth conversations than lots of quick introductions." },
  { id: "SE4", scale: "SE", key: -1, text: "At events, I need breaks away from people sooner than most attendees seem to." },
  { id: "SI1", scale: "SI", key: 1, text: "At events, I start conversations with people I don't know." },
  { id: "SI2", scale: "SI", key: 1, text: "I'm comfortable asking a question in front of a large audience." },
  { id: "SI3", scale: "SI", key: -1, text: "At networking sessions, I tend to wait for others to approach me." },
  { id: "SI4", scale: "SI", key: -1, text: "In group discussions, I hold back unless I'm invited to speak." },
  { id: "DP1", scale: "DP", key: 1, text: "I enjoy sessions that make me think hard about complex problems." },
  { id: "DP2", scale: "DP", key: 1, text: "I like to understand the detail of how and why something works." },
  { id: "DP3", scale: "DP", key: -1, text: "I'd rather have a short summary than a deep dive." },
  { id: "DP4", scale: "DP", key: -1, text: "I find long, technical discussions tedious." },
  { id: "NO1", scale: "NO", key: 1, text: "I'm drawn to event formats and venues I haven't experienced before." },
  { id: "NO2", scale: "NO", key: 1, text: "I enjoy sessions that explore where things could be heading in the future." },
  { id: "NO3", scale: "NO", key: -1, text: "I prefer event formats I know and trust over experimental ones." },
  { id: "NO4", scale: "NO", key: -1, text: "I prefer practical, here-and-now topics to speculative ones." },
  { id: "NS1", scale: "NS", key: 1, text: "I plan which sessions I'll attend before I arrive." },
  { id: "NS2", scale: "NS", key: 1, text: "Unexpected changes to an event schedule unsettle me." },
  { id: "NS3", scale: "NS", key: -1, text: "I enjoy an element of surprise in how an event unfolds." },
  { id: "NS4", scale: "NS", key: -1, text: "I'm comfortable deciding what to do at an event once I'm there." },
  { id: "NS5", scale: "NS", key: 1, text: "I like to know exactly what's happening, and when, at an event." },
  { id: "NS6", scale: "NS", key: -1, text: "I'd rather leave room for spontaneity than lock in a schedule." },
];

export const TRAIT_IDS = TRAIT_ITEMS.map((i) => i.id);
export const itemById = (id: string) => TRAIT_ITEMS.find((i) => i.id === id);

/** Used when no valid randomised order is found. No two neighbours share a scale. */
export const FIXED_ORDER = [
  "SE1", "DP1", "NS1", "SI1", "NO1", "SE3", "DP3", "NS3", "SI3", "NO3", "NS5",
  "SE2", "DP2", "NS2", "SI2", "NO2", "SE4", "DP4", "NS4", "SI4", "NO4", "NS6",
];

/** Small, fast, seedable PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function hasAdjacentSameScale(order: readonly string[]): boolean {
  for (let i = 1; i < order.length; i++) {
    if (itemById(order[i])!.scale === itemById(order[i - 1])!.scale) return true;
  }
  return false;
}

/**
 * Per-respondent order for Part 2: a seeded shuffle, retried until no two
 * consecutive statements share a scale. Falls back to FIXED_ORDER after 200
 * failed attempts.
 */
export function presentationOrder(seed: number, maxAttempts = 200): string[] {
  const random = seededRandom(seed);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const order = shuffle(TRAIT_IDS, random);
    if (!hasAdjacentSameScale(order)) return order;
  }
  return [...FIXED_ORDER];
}

/* ------------------------------------------------------------------ */
/* Part 3: Your event preferences                                      */
/* ------------------------------------------------------------------ */

export const P1 = {
  question: "What are your main reasons for attending work events? Choose up to two.",
  min: 1,
  max: 2,
  options: [
    { id: "learn_ideas", label: "Learning new ideas or insights" },
    { id: "learn_skills", label: "Picking up practical skills or tools" },
    { id: "meet_new", label: "Meeting new contacts" },
    { id: "catch_up", label: "Catching up with people I already know" },
    { id: "meet_specific", label: "Meeting specific people, such as clients, partners or suppliers" },
    { id: "inspiration", label: "Getting inspired or seeing things differently" },
    { id: "represent", label: "Representing my organisation or presenting" },
    { id: "change", label: "A change from day-to-day work" },
  ],
} as const;

export const P2 = {
  question: "How well do these ways of meeting people work for you?",
  columns: [
    { value: 0, label: "Not for me" },
    { value: 1, label: "It's OK" },
    { value: 2, label: "Works well for me" },
  ],
  /** Canonical row order. Rows are shown to respondents in random order. */
  rows: [
    { id: "reception", label: "Open drinks reception" },
    { id: "hosted_intros", label: "Introductions made by a host" },
    { id: "one_to_one", label: "Pre-booked one-to-one meetings" },
    { id: "roundtables", label: "Small-group roundtables on a topic" },
    { id: "app_matchmaking", label: "Matchmaking through the event app" },
    { id: "shared_activity", label: "A shared activity, such as a tour, workshop or game" },
    { id: "seated_meal", label: "A seated meal with a planned seating plan" },
  ],
} as const;

export const P3 = {
  question: "In sessions, how do you like to take part? Choose all that apply.",
  min: 1,
  max: 7,
  options: [
    { id: "ask_aloud", label: "Asking questions out loud" },
    { id: "app_named", label: "Submitting questions in the app with my name" },
    { id: "app_anon", label: "Submitting questions anonymously" },
    { id: "polls", label: "Answering live polls" },
    { id: "discuss_neighbours", label: "Discussing with the people around me" },
    { id: "small_group_task", label: "Working on a task in a small group" },
    { id: "listen", label: "I prefer to listen" },
  ],
} as const;

export const P4 = {
  question: "When a speaker is making a case, what convinces you most? Choose your top two.",
  min: 2,
  max: 2,
  options: [
    { id: "data", label: "Data and research" },
    { id: "case_studies", label: "Real-world case studies" },
    { id: "stories", label: "Personal stories and experiences" },
    { id: "demo", label: "A live demonstration" },
    { id: "expertise", label: "The speaker's expertise and track record" },
    { id: "peers", label: "What peers like me think" },
  ],
} as const;

export const P5 = {
  question: "What session length helps you stay most engaged?",
  options: [
    { id: "lt20", label: "Up to 20 minutes" },
    { id: "20_30", label: "20-30 minutes" },
    { id: "30_45", label: "30-45 minutes" },
    { id: "45_60", label: "45-60 minutes" },
    { id: "gt60", label: "Over an hour, if the content is in-depth" },
    { id: "none", label: "No preference" },
  ],
} as const;

export const P6 = {
  question: "Which style of event communication do you prefer?",
  points: [
    { value: 1, label: "Brief and to the point" },
    { value: 2, label: "Leaning brief" },
    { value: 3, label: "No preference" },
    { value: 4, label: "Leaning warm" },
    { value: 5, label: "Warm and conversational" },
  ],
} as const;

export const P7 = {
  question: "Before an event, how much information do you want?",
  options: [
    { id: "essentials", label: "Just the essentials (when, where, what to bring)" },
    { id: "agenda", label: "The essentials plus the agenda" },
    { id: "full", label: "Full detail, including speakers and session content" },
  ],
} as const;

export const P8 = {
  question: "On a full-day event, what pace suits you best?",
  options: [
    { id: "brisk", label: "Keep it moving, with short breaks" },
    { id: "hourly", label: "A break roughly every hour" },
    { id: "long_breaks", label: "Longer breaks for networking or time to myself" },
    { id: "none", label: "No preference" },
  ],
} as const;

export type P1Id = (typeof P1.options)[number]["id"];
export type P2RowId = (typeof P2.rows)[number]["id"];
export type P3Id = (typeof P3.options)[number]["id"];
export type P4Id = (typeof P4.options)[number]["id"];
export type P5Id = (typeof P5.options)[number]["id"];
export type P7Id = (typeof P7.options)[number]["id"];
export type P8Id = (typeof P8.options)[number]["id"];

export interface Preferences {
  P1: P1Id[];
  P2: Record<P2RowId, 0 | 1 | 2>;
  P3: P3Id[];
  P4: P4Id[];
  P5: P5Id;
  P6: 1 | 2 | 3 | 4 | 5;
  P7: P7Id;
  P8: P8Id;
}

export const P2_ROW_IDS = P2.rows.map((r) => r.id) as P2RowId[];

/** Random P2 row order for a respondent. */
export function p2RowOrder(seed: number): P2RowId[] {
  return shuffle(P2_ROW_IDS, seededRandom(seed ^ 0x9e3779b9));
}

export const labelFor = (options: readonly Option[], id: string) => options.find((o) => o.id === id)?.label ?? id;

/* ------------------------------------------------------------------ */
/* Free text                                                           */
/* ------------------------------------------------------------------ */

export const FREE_TEXT = {
  question: "Is there anything else that would help you get the most out of events?",
  helper:
    "Please don't include health or access details here. We'll ask about access and dietary needs separately when you register for an event.",
  maxLength: 1000,
} as const;

/* ------------------------------------------------------------------ */
/* Pilot mode marker items (?pilot=1)                                  */
/* ------------------------------------------------------------------ */

/**
 * Mini-IPIP markers (Donnellan et al., 2006), public domain via the IPIP.
 * Deliberately generic wording, not event-framed. The Intellect markers are
 * unbalanced (1+, 3-): that is the published key.
 * TODO before using pilot mode: verify wording against ipip.ori.org.
 */
export const PILOT_INSTRUCTION = "Describe yourself as you generally are now.";

export const PILOT_ITEMS = [
  { id: "M_E1", marker: "Extraversion", key: 1, text: "Am the life of the party." },
  { id: "M_E2", marker: "Extraversion", key: -1, text: "Don't talk a lot." },
  { id: "M_E3", marker: "Extraversion", key: 1, text: "Talk to a lot of different people at parties." },
  { id: "M_E4", marker: "Extraversion", key: -1, text: "Keep in the background." },
  { id: "M_I1", marker: "Intellect/Imagination", key: 1, text: "Have a vivid imagination." },
  { id: "M_I2", marker: "Intellect/Imagination", key: -1, text: "Am not interested in abstract ideas." },
  { id: "M_I3", marker: "Intellect/Imagination", key: -1, text: "Have difficulty understanding abstract ideas." },
  { id: "M_I4", marker: "Intellect/Imagination", key: -1, text: "Do not have a good imagination." },
  { id: "M_C1", marker: "Conscientiousness", key: 1, text: "Get chores done right away." },
  { id: "M_C2", marker: "Conscientiousness", key: -1, text: "Often forget to put things back in their proper place." },
  { id: "M_C3", marker: "Conscientiousness", key: 1, text: "Like order." },
  { id: "M_C4", marker: "Conscientiousness", key: -1, text: "Make a mess of things." },
] as const;

export const PILOT_IDS = PILOT_ITEMS.map((i) => i.id);
