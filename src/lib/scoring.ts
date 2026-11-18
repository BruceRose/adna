import {
  DIMENSIONS,
  POLE_INFO,
  PROFILES,
  QUESTIONNAIRE_VERSION,
  oppositePole,
  versionDef,
  type DimensionKey,
  type Pole,
  type VersionDef,
} from "./questionnaire";

/** Answers keyed by statement id, each 1–6. */
export type Answers = Record<string, number>;
export type PoleScores = Record<Pole, number>;

export type Strength = "slight" | "moderate" | "strong";

export interface DimensionResult {
  key: DimensionKey;
  winner: Pole;
  letter: string;
  scores: [{ pole: Pole; score: number }, { pole: Pole; score: number }];
  /** True when both poles scored equally and the tie-break rule decided (version 1 only). */
  tied: boolean;
  /**
   * Position on the spectrum from the first pole (0) to the second pole (100).
   * 50 = dead centre.
   */
  position: number;
  /** How far towards the winning side, as a percentage (50–100). */
  percent: number;
  strength: Strength;
}

export interface ScoreResult {
  scores: PoleScores;
  dimensions: DimensionResult[];
  code: string;
  profile: string;
}

/**
 * Points awarded for a single answer under a version's weights.
 * Version 1 (the spreadsheet): 6 → 3, 5 → 2, 4 → 1 towards the pole the
 * statement leans to; 3 → 1, 2 → 2, 1 → 3 towards the opposite pole.
 * Version 2: the same shape with 5/3/1.
 */
export function pointsFor(
  answer: number,
  weights: VersionDef["weights"] = versionDef().weights,
): { towardsAgreePole: boolean; points: number } {
  if (!Number.isInteger(answer) || answer < 1 || answer > 6) {
    throw new RangeError(`Answer must be an integer 1–6, got ${answer}`);
  }
  const w = weights[answer - 1];
  return { towardsAgreePole: w > 0, points: Math.abs(w) };
}

const emptyScores = (): PoleScores => ({
  thinking: 0,
  feeling: 0,
  extrovert: 0,
  introvert: 0,
  judging: 0,
  perceiving: 0,
  sensing: 0,
  intuition: 0,
});

export function scoreAnswers(answers: Answers, version: string = QUESTIONNAIRE_VERSION): ScoreResult {
  const def = versionDef(version);
  const scores = emptyScores();
  for (const s of def.statements) {
    const answer = answers[s.id];
    if (answer === undefined) throw new Error(`Missing answer for ${s.id}`);
    const { towardsAgreePole, points } = pointsFor(answer, def.weights);
    scores[towardsAgreePole ? s.agreePole : oppositePole(s.agreePole)] += points;
  }

  const dimensions = dimensionsFromScores(scores, maxNetFor(version));
  const code = dimensions.map((d) => d.letter).join("");
  const profile = PROFILES.find((p) => p.code === code);
  if (!profile) throw new Error(`No profile defined for code ${code}`);

  return { scores, dimensions, code, profile: profile.name };
}

/** The most one pole can outscore the other on a pair, for a questionnaire version. */
export function maxNetFor(version: string): number {
  const def = versionDef(version);
  const perPair = def.statements.length / DIMENSIONS.length;
  return perPair * Math.max(...def.weights.map(Math.abs));
}

export function strengthFor(percent: number): Strength {
  if (percent < 63) return "slight";
  if (percent < 80) return "moderate";
  return "strong";
}

/**
 * Per-dimension detail from pole scores.
 * @param maxNet the largest possible margin on one pair (see maxNetFor).
 */
export function dimensionsFromScores(scores: PoleScores, maxNet: number): DimensionResult[] {
  return DIMENSIONS.map((d) => {
    const [a, b] = d.poles;
    const tied = scores[a] === scores[b];
    const winner = tied ? d.tieWinner : scores[a] > scores[b] ? a : b;
    const net = Math.max(-maxNet, Math.min(maxNet, scores[b] - scores[a]));
    const position = Math.round(50 + (50 * net) / maxNet);
    const percent = Math.max(position, 100 - position);
    return {
      key: d.key,
      winner,
      letter: POLE_INFO[winner].letter,
      scores: [
        { pole: a, score: scores[a] },
        { pole: b, score: scores[b] },
      ],
      tied,
      position,
      percent,
      strength: strengthFor(percent),
    };
  });
}
