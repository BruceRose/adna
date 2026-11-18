/**
 * Audience DNA questionnaire definition.
 *
 * This is the single source of truth for statements, dimensions, profiles and
 * form options. Scoring logic lives in ./scoring.ts; the personal report and
 * audience insights content lives in ./insights.ts.
 *
 * If you change statements or scoring in a way that would make old and new
 * results incomparable, bump QUESTIONNAIRE_VERSION. Each stored response
 * records the version it was answered against.
 */

export const QUESTIONNAIRE_VERSION = "2";

/** The eight poles, two per dimension. */
export type Pole =
  | "thinking"
  | "feeling"
  | "extrovert"
  | "introvert"
  | "judging"
  | "perceiving"
  | "sensing"
  | "intuition";

export type DimensionKey = "TF" | "EI" | "JP" | "SN";

export interface Dimension {
  key: DimensionKey;
  /** Formal name, e.g. "Thinking / Feeling". */
  label: string;
  /** Friendly name shown to respondents, e.g. "Decisions". */
  name: string;
  /** One-line explanation of what this pair is about. */
  about: string;
  /**
   * The pole that wins when the two scores are tied. Only reachable for
   * version 1 responses (4 statements per pair). Version 2 uses 5 statements
   * per pair, which makes a tie mathematically impossible.
   */
  tieWinner: Pole;
  poles: [Pole, Pole];
}

/** Order matches the letters of the profile code. */
export const DIMENSIONS: Dimension[] = [
  {
    key: "TF",
    label: "Thinking / Feeling",
    name: "Decisions",
    about: "How you weigh things up and make choices",
    poles: ["thinking", "feeling"],
    tieWinner: "thinking",
  },
  {
    key: "EI",
    label: "Extrovert / Introvert",
    name: "Energy",
    about: "Where you get your energy from",
    poles: ["extrovert", "introvert"],
    tieWinner: "extrovert",
  },
  {
    key: "JP",
    label: "Judging / Perceiving",
    name: "Approach",
    about: "How you like to organise your time",
    poles: ["judging", "perceiving"],
    tieWinner: "judging",
  },
  {
    key: "SN",
    label: "Sensing / Intuition",
    name: "Information",
    about: "What kind of information you trust and enjoy",
    poles: ["sensing", "intuition"],
    tieWinner: "sensing",
  },
];

export const POLE_INFO: Record<Pole, { label: string; friendly: string; letter: string; dimension: DimensionKey }> = {
  thinking: { label: "Thinking", friendly: "Logic", letter: "T", dimension: "TF" },
  feeling: { label: "Feeling", friendly: "Empathy", letter: "F", dimension: "TF" },
  extrovert: { label: "Extrovert", friendly: "Outgoing", letter: "E", dimension: "EI" },
  introvert: { label: "Introvert", friendly: "Reflective", letter: "I", dimension: "EI" },
  judging: { label: "Judging", friendly: "Planned", letter: "J", dimension: "JP" },
  perceiving: { label: "Perceiving", friendly: "Flexible", letter: "P", dimension: "JP" },
  sensing: { label: "Sensing", friendly: "Practical", letter: "S", dimension: "SN" },
  // Note: the original spreadsheet uses "I" for Intuition in the 4th position
  // (e.g. "TEJI"). Kept as-is so codes stay comparable with historical data.
  intuition: { label: "Intuition", friendly: "Big-picture", letter: "I", dimension: "SN" },
};

export function oppositePole(pole: Pole): Pole {
  const dim = DIMENSIONS.find((d) => d.poles.includes(pole))!;
  return dim.poles[0] === pole ? dim.poles[1] : dim.poles[0];
}

export interface Statement {
  id: string;
  text: string;
  /** Agreeing with the statement scores towards this pole. */
  agreePole: Pole;
}

/**
 * Version 2 statements (current).
 *
 * Design rules:
 * - 5 statements per pair, scored with odd weights (see VERSIONS below).
 *   Five odd numbers can never add up to zero, so a pair can never tie.
 * - Each pair is keyed both ways (3 one way, 2 the other), and across all
 *   20 statements exactly 10 lean towards each side of the code. This stops
 *   people who simply tend to agree from being pushed one way.
 * - One idea per statement, everyday behaviour, framed around work, events
 *   and communication where natural.
 * - Interleaved so consecutive statements cover different pairs.
 */
export const STATEMENTS: Statement[] = [
  { id: "s1", text: "When I make a decision, I trust facts and logic more than my gut feeling", agreePole: "thinking" },
  { id: "s2", text: "I come away from busy events feeling energised rather than drained", agreePole: "extrovert" },
  { id: "s3", text: "I like to know the plan and the agenda before I arrive", agreePole: "judging" },
  { id: "s4", text: "I'd rather hear practical examples than big-picture theories", agreePole: "sensing" },
  { id: "s5", text: "When someone is struggling, I'd rather listen than jump in with solutions", agreePole: "feeling" },
  { id: "s6", text: "After a day full of people, I need quiet time on my own to recharge", agreePole: "introvert" },
  { id: "s7", text: "I'm happy to go with the flow and see where the day takes me", agreePole: "perceiving" },
  { id: "s8", text: "I enjoy imagining what could be more than focusing on how things are now", agreePole: "intuition" },
  { id: "s9", text: "I'd rather get honest, direct feedback than have it softened for me", agreePole: "thinking" },
  { id: "s10", text: "I'm comfortable being the one who starts a conversation with a stranger", agreePole: "extrovert" },
  { id: "s11", text: "Unfinished tasks nag at me until they're done", agreePole: "judging" },
  { id: "s12", text: "The best way forward is usually to build on what has worked before", agreePole: "sensing" },
  { id: "s13", text: "I'd choose a slower option if the faster one would leave people unhappy", agreePole: "feeling" },
  { id: "s14", text: "I prefer a few deep conversations to lots of quick introductions", agreePole: "introvert" },
  { id: "s15", text: "A last-minute change of plan feels exciting rather than stressful", agreePole: "perceiving" },
  { id: "s16", text: "I often read between the lines and look for the hidden meaning", agreePole: "intuition" },
  { id: "s17", text: "A powerful personal story stays with me longer than a page of data", agreePole: "feeling" },
  { id: "s18", text: "I often work out what I think by talking it through out loud", agreePole: "extrovert" },
  { id: "s19", text: "I like to keep my options open rather than commit early", agreePole: "perceiving" },
  { id: "s20", text: "I notice and remember the specific details of a place or an experience", agreePole: "sensing" },
];

/** Version 1 statements (the original spreadsheet, columns B–Q). Kept to display older responses. */
export const V1_STATEMENTS: Statement[] = [
  { id: "q1", text: "When I decide on something, I focus on facts and clear thinking", agreePole: "thinking" },
  { id: "q2", text: "I feel more lively when I'm with other people", agreePole: "extrovert" },
  { id: "q3", text: "I like following set plans", agreePole: "judging" },
  { id: "q4", text: "It's important to know what an idea can achieve now, not its future possibility", agreePole: "sensing" },
  { id: "q5", text: "When things get tough for a friend or partner, I try to listen instead of providing answers", agreePole: "feeling" },
  { id: "q6", text: "I feel tired after spending too much time with people and need some alone time to feel better", agreePole: "introvert" },
  { id: "q7", text: "I love change and often keep my choices open instead of making a final decision", agreePole: "perceiving" },
  { id: "q8", text: "I like seeing the whole situation and thinking about possibilities rather than getting stuck in the moment", agreePole: "intuition" },
  { id: "q9", text: "Telling somebody the truth is more important than protecting their feelings", agreePole: "thinking" },
  { id: "q10", text: "I like being in the spotlight", agreePole: "extrovert" },
  { id: "q11", text: "Not having an organised plan for an activity makes me uncomfortable", agreePole: "judging" },
  { id: "q12", text: "The best way to do something is to improve on what's worked before", agreePole: "sensing" },
  { id: "q13", text: "I won't choose the most efficient solution if it impacts people in a negative way", agreePole: "feeling" },
  { id: "q14", text: "People think I'm a quiet person", agreePole: "introvert" },
  { id: "q15", text: "I love surprise parties", agreePole: "perceiving" },
  { id: "q16", text: "I like interpreting the end of books and films", agreePole: "intuition" },
];

export interface VersionDef {
  statements: Statement[];
  /**
   * Points for answers 1–6. Positive = towards the pole the statement leans
   * to; negative = towards the opposite pole.
   */
  weights: readonly [number, number, number, number, number, number];
}

export const VERSIONS: Record<string, VersionDef> = {
  /** The original spreadsheet: 3/2/1 either side. */
  "1": { statements: V1_STATEMENTS, weights: [-3, -2, -1, 1, 2, 3] },
  /**
   * Equal steps across the whole scale, including across the middle, and
   * every weight odd so a pair of 5 statements can never tie.
   */
  "2": { statements: STATEMENTS, weights: [-5, -3, -1, 1, 3, 5] },
};

export function versionDef(version: string = QUESTIONNAIRE_VERSION): VersionDef {
  return VERSIONS[version] ?? VERSIONS[QUESTIONNAIRE_VERSION];
}

export function statementsFor(version: string): Statement[] {
  return versionDef(version).statements;
}

/**
 * 6-point agreement scale. Only the two ends are labelled for respondents,
 * so the in-between options are left to their own interpretation.
 * Scoring: 1 = most disagree … 6 = most agree.
 */
export const SCALE_VALUES = [1, 2, 3, 4, 5, 6] as const;
export const SCALE_ENDS = { min: "Disagree", max: "Agree" } as const;

export interface Profile {
  code: string;
  name: string;
  /** A few words that sum the profile up. */
  tagline: string;
  /** Three one-word strengths. */
  strengths: [string, string, string];
  /** Short summary shown to respondents on their results page. */
  description: string;
}

/**
 * Code is built as [T|F][E|I][J|P][S|I].
 *
 * Names and descriptions follow "Full Profiles" (Full_Profiles_edit_1.docx).
 * Descriptions are condensed from each profile's "Main" section.
 *
 * Note: the original FinalADNA_Analysis.xlsx had TIPI = Pragmatist and
 * TIPS = Theorist. The profiles document has them the other way round
 * (TIPS = Pragmatist, the grounded/practical type; TIPI = Theorist, the
 * big-picture type). We follow the document.
 */
export const PROFILES: Profile[] = [
  {
    code: "TEJS",
    name: "Architect",
    tagline: "The organised doer",
    strengths: ["Decisive", "Organised", "Results-driven"],
    description:
      "Logical and objective, you bring clarity to complex problems, and your energy and communication skills make you a natural leader. Organised and practical, you turn ideas into real results.",
  },
  {
    code: "TEJI",
    name: "Strategist",
    tagline: "The visionary planner",
    strengths: ["Strategic", "Persuasive", "Big-picture"],
    description:
      "A clear, logical thinker and confident communicator, you inspire others and lead with purpose. You combine order and follow-through with a talent for seeing the big picture and spotting patterns.",
  },
  {
    code: "TEPS",
    name: "Explorer",
    tagline: "The hands-on adventurer",
    strengths: ["Adaptable", "Energetic", "Practical"],
    description:
      "Sharp, logical and sociable, you draw energy from people and think on your feet. You love freedom and spontaneity, seize opportunities as they come and stay grounded in what's real.",
  },
  {
    code: "TEPI",
    name: "Innovator",
    tagline: "The ideas generator",
    strengths: ["Inventive", "Enthusiastic", "Quick-thinking"],
    description:
      "Analytical and outgoing, you bring clarity and enthusiasm to every challenge. You thrive on freedom and change, and you're always looking ahead to big ideas and new possibilities.",
  },
  {
    code: "TIJS",
    name: "Analyst",
    tagline: "The steady problem-solver",
    strengths: ["Thorough", "Reliable", "Logical"],
    description:
      "Logical, objective and quietly thoughtful, you solve problems with remarkable clarity. Reliable and practical, you prefer order, follow through on commitments and trust what experience has proven.",
  },
  {
    code: "TIJI",
    name: "Scholar",
    tagline: "The deep thinker",
    strengths: ["Insightful", "Independent", "Strategic"],
    description:
      "A deep, independent thinker, you value logic and look beyond the surface to understand how things really work. Organised and reliable, you pair structure with a talent for big-picture thinking.",
  },
  {
    code: "TIPS",
    name: "Pragmatist",
    tagline: "The calm troubleshooter",
    strengths: ["Resourceful", "Level-headed", "Practical"],
    description:
      "Logical and independent, you think deeply and stay objective under pressure. Adaptable and down-to-earth, you enjoy freedom, seize opportunities and focus on what is rather than what could be.",
  },
  {
    code: "TIPI",
    name: "Theorist",
    tagline: "The curious mind",
    strengths: ["Original", "Analytical", "Open-minded"],
    description:
      "Analytical and introspective, you think deeply and see beyond the surface. Free-spirited and imaginative, you're drawn to big ideas, patterns and possibilities, and like to keep your options open.",
  },
  {
    code: "FEJS",
    name: "Coordinator",
    tagline: "The people organiser",
    strengths: ["Supportive", "Organised", "Sociable"],
    description:
      "Your empathy builds deep connections and earns lasting trust, and your sociable energy brings people together. Reliable and organised, you're grounded in what's practical and you get things done.",
  },
  {
    code: "FEJI",
    name: "Advocate",
    tagline: "The inspiring champion",
    strengths: ["Motivating", "Empathetic", "Visionary"],
    description:
      "You connect with people deeply and inspire trust, and your communication skills make you a natural leader. You value order and reliability, and you can see the big picture and spot new possibilities.",
  },
  {
    code: "FEPS",
    name: "Harmoniser",
    tagline: "The life of the room",
    strengths: ["Warm", "Spontaneous", "Easy-going"],
    description:
      "Empathetic and sociable, you build trust and loyalty wherever you go and bring warmth to any group. You thrive on spontaneity while staying grounded in the practical here and now.",
  },
  {
    code: "FEPI",
    name: "Inspirer",
    tagline: "The spark",
    strengths: ["Enthusiastic", "Imaginative", "Encouraging"],
    description:
      "A warm, enthusiastic communicator, you form deep connections and inspire the people around you. Spontaneous and imaginative, you're energised by new ideas and future possibilities.",
  },
  {
    code: "FIJS",
    name: "Counsellor",
    tagline: "The trusted listener",
    strengths: ["Caring", "Dependable", "Attentive"],
    description:
      "Deeply empathetic and quietly thoughtful, you understand people on a level others often miss. You value order and reliability, and stay grounded in what works in practice.",
  },
  {
    code: "FIJI",
    name: "Empath",
    tagline: "The quiet visionary",
    strengths: ["Compassionate", "Perceptive", "Principled"],
    description:
      "Compassionate and intuitive, you're a source of support and warmth, with a quiet ability to see beneath the surface. You follow through on commitments and bring big-picture thinking to everything you do.",
  },
  {
    code: "FIPS",
    name: "Nurturer",
    tagline: "The gentle supporter",
    strengths: ["Kind", "Adaptable", "Grounded"],
    description:
      "Warm, compassionate and quietly reflective, you're a natural source of support for those around you. You adapt easily, enjoy freedom and spontaneity, and draw on real experience to stay grounded.",
  },
  {
    code: "FIPI",
    name: "Dreamer",
    tagline: "The creative idealist",
    strengths: ["Imaginative", "Authentic", "Reflective"],
    description:
      "Compassionate and introspective, you see beneath the surface of people and situations. Free-spirited and imaginative, you're drawn to possibilities, big ideas and creative solutions.",
  },
];

export const OTHER_INDUSTRY = "Other";

/** Edit freely; "Other" always appears last with a free-text box. */
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
