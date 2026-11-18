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
    description:
      "Logical and objective, you bring clarity to complex problems, and your energy and communication skills make you a natural leader. Organised and practical, you turn ideas into real results.",
  },
  {
    code: "TEJI",
    name: "Strategist",
    description:
      "A clear, logical thinker and confident communicator, you inspire others and lead with purpose. You combine order and follow-through with a talent for seeing the big picture and spotting patterns.",
  },
  {
    code: "TEPS",
    name: "Explorer",
    description:
      "Sharp, logical and sociable, you draw energy from people and think on your feet. You love freedom and spontaneity, seize opportunities as they come and stay grounded in what's real.",
  },
  {
    code: "TEPI",
    name: "Innovator",
    description:
      "Analytical and outgoing, you bring clarity and enthusiasm to every challenge. You thrive on freedom and change, and you're always looking ahead to big ideas and new possibilities.",
  },
  {
    code: "TIJS",
    name: "Analyst",
    description:
      "Logical, objective and quietly thoughtful, you solve problems with remarkable clarity. Reliable and practical, you prefer order, follow through on commitments and trust what experience has proven.",
  },
  {
    code: "TIJI",
    name: "Scholar",
    description:
      "A deep, independent thinker, you value logic and look beyond the surface to understand how things really work. Organised and reliable, you pair structure with a talent for big-picture thinking.",
  },
  {
    code: "TIPS",
    name: "Pragmatist",
    description:
      "Logical and independent, you think deeply and stay objective under pressure. Adaptable and down-to-earth, you enjoy freedom, seize opportunities and focus on what is rather than what could be.",
  },
  {
    code: "TIPI",
    name: "Theorist",
    description:
      "Analytical and introspective, you think deeply and see beyond the surface. Free-spirited and imaginative, you're drawn to big ideas, patterns and possibilities, and like to keep your options open.",
  },
  {
    code: "FEJS",
    name: "Coordinator",
    description:
      "Your empathy builds deep connections and earns lasting trust, and your sociable energy brings people together. Reliable and organised, you're grounded in what's practical and you get things done.",
  },
  {
    code: "FEJI",
    name: "Advocate",
    description:
      "You connect with people deeply and inspire trust, and your communication skills make you a natural leader. You value order and reliability, and you can see the big picture and spot new possibilities.",
  },
  {
    code: "FEPS",
    name: "Harmoniser",
    description:
      "Empathetic and sociable, you build trust and loyalty wherever you go and bring warmth to any group. You thrive on spontaneity while staying grounded in the practical here and now.",
  },
  {
    code: "FEPI",
    name: "Inspirer",
    description:
      "A warm, enthusiastic communicator, you form deep connections and inspire the people around you. Spontaneous and imaginative, you're energised by new ideas and future possibilities.",
  },
  {
    code: "FIJS",
    name: "Counsellor",
    description:
      "Deeply empathetic and quietly thoughtful, you understand people on a level others often miss. You value order and reliability, and stay grounded in what works in practice.",
  },
  {
    code: "FIJI",
    name: "Empath",
    description:
      "Compassionate and intuitive, you're a source of support and warmth, with a quiet ability to see beneath the surface. You follow through on commitments and bring big-picture thinking to everything you do.",
  },
  {
    code: "FIPS",
    name: "Nurturer",
    description:
      "Warm, compassionate and quietly reflective, you're a natural source of support for those around you. You adapt easily, enjoy freedom and spontaneity, and draw on real experience to stay grounded.",
  },
  {
    code: "FIPI",
    name: "Dreamer",
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
