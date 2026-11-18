/**
 * Audience DNA questionnaire definition.
 *
 * This is the single source of truth for statements, dimensions, profiles and
 * form options. Scoring logic lives in ./scoring.ts.
 *
 * If you change statements or scoring in a way that would make old and new
 * results incomparable, bump QUESTIONNAIRE_VERSION. Each stored response
 * records the version it was answered against.
 */

export const QUESTIONNAIRE_VERSION = "1";

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
  label: string;
  /**
   * The pole that wins when the two scores are tied. This mirrors the
   * original spreadsheet formulas, e.g. =IF(R3>S3,"F","T") gives "T" on a tie.
   */
  tieWinner: Pole;
  poles: [Pole, Pole];
}

export const DIMENSIONS: Dimension[] = [
  { key: "TF", label: "Thinking / Feeling", poles: ["thinking", "feeling"], tieWinner: "thinking" },
  { key: "EI", label: "Extrovert / Introvert", poles: ["extrovert", "introvert"], tieWinner: "extrovert" },
  { key: "JP", label: "Judging / Perceiving", poles: ["judging", "perceiving"], tieWinner: "judging" },
  { key: "SN", label: "Sensing / Intuition", poles: ["sensing", "intuition"], tieWinner: "sensing" },
];

export const POLE_INFO: Record<Pole, { label: string; letter: string; dimension: DimensionKey }> = {
  thinking: { label: "Thinking", letter: "T", dimension: "TF" },
  feeling: { label: "Feeling", letter: "F", dimension: "TF" },
  extrovert: { label: "Extrovert", letter: "E", dimension: "EI" },
  introvert: { label: "Introvert", letter: "I", dimension: "EI" },
  judging: { label: "Judging", letter: "J", dimension: "JP" },
  perceiving: { label: "Perceiving", letter: "P", dimension: "JP" },
  sensing: { label: "Sensing", letter: "S", dimension: "SN" },
  // Note: the original spreadsheet uses "I" for Intuition in the 4th position
  // (e.g. "TEJI"). Kept as-is so codes stay comparable with historical data.
  intuition: { label: "Intuition", letter: "I", dimension: "SN" },
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

/** Order matches the original spreadsheet (columns B–Q). */
export const STATEMENTS: Statement[] = [
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

/** 6-point agreement scale: 1 = strongly disagree … 6 = strongly agree. */
export const SCALE = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Slightly disagree" },
  { value: 4, label: "Slightly agree" },
  { value: 5, label: "Agree" },
  { value: 6, label: "Strongly agree" },
] as const;

export interface Profile {
  code: string;
  name: string;
  /** Optional copy shown to respondents. Fill in when ready. */
  description?: string;
}

/** Code is built as [T|F][E|I][J|P][S|I]. */
export const PROFILES: Profile[] = [
  { code: "TEJS", name: "Architect" },
  { code: "TEJI", name: "Strategist" },
  { code: "TEPS", name: "Explorer" },
  { code: "TEPI", name: "Innovator" },
  { code: "TIJS", name: "Analyst" },
  { code: "TIJI", name: "Scholar" },
  { code: "TIPI", name: "Pragmatist" },
  { code: "TIPS", name: "Theorist" },
  { code: "FEJS", name: "Coordinator" },
  { code: "FEJI", name: "Advocate" },
  { code: "FEPS", name: "Harmoniser" },
  { code: "FEPI", name: "Inspirer" },
  { code: "FIJS", name: "Counsellor" },
  { code: "FIJI", name: "Empath" },
  { code: "FIPS", name: "Nurturer" },
  { code: "FIPI", name: "Dreamer" },
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
