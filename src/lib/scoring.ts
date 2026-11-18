import {
  DIMENSIONS,
  POLE_INFO,
  PROFILES,
  STATEMENTS,
  oppositePole,
  type DimensionKey,
  type Pole,
} from "./questionnaire";

/** Answers keyed by statement id, each 1–6. */
export type Answers = Record<string, number>;
export type PoleScores = Record<Pole, number>;

export interface DimensionResult {
  key: DimensionKey;
  winner: Pole;
  letter: string;
  scores: [{ pole: Pole; score: number }, { pole: Pole; score: number }];
  /** True when both poles scored equally and the tie-break rule decided. */
  tied: boolean;
}

export interface ScoreResult {
  scores: PoleScores;
  dimensions: DimensionResult[];
  code: string;
  profile: string;
}

/**
 * Points awarded for a single answer, matching the spreadsheet's IFS formulas:
 *   6 → 3, 5 → 2, 4 → 1 towards the pole the statement leans to
 *   3 → 1, 2 → 2, 1 → 3 towards the opposite pole
 */
export function pointsFor(answer: number): { towardsAgreePole: boolean; points: number } {
  if (!Number.isInteger(answer) || answer < 1 || answer > 6) {
    throw new RangeError(`Answer must be an integer 1–6, got ${answer}`);
  }
  return answer >= 4
    ? { towardsAgreePole: true, points: answer - 3 }
    : { towardsAgreePole: false, points: 4 - answer };
}

export function scoreAnswers(answers: Answers): ScoreResult {
  const scores: PoleScores = {
    thinking: 0,
    feeling: 0,
    extrovert: 0,
    introvert: 0,
    judging: 0,
    perceiving: 0,
    sensing: 0,
    intuition: 0,
  };

  for (const s of STATEMENTS) {
    const answer = answers[s.id];
    if (answer === undefined) throw new Error(`Missing answer for ${s.id}`);
    const { towardsAgreePole, points } = pointsFor(answer);
    scores[towardsAgreePole ? s.agreePole : oppositePole(s.agreePole)] += points;
  }

  const dimensions = dimensionsFromScores(scores);

  const code = dimensions.map((d) => d.letter).join("");
  const profile = PROFILES.find((p) => p.code === code);
  if (!profile) throw new Error(`No profile defined for code ${code}`);

  return { scores, dimensions, code, profile: profile.name };
}

/** Rebuild per-dimension detail from stored pole scores (for display). */
export function dimensionsFromScores(scores: PoleScores): DimensionResult[] {
  return DIMENSIONS.map((d) => {
    const [a, b] = d.poles;
    const tied = scores[a] === scores[b];
    const winner = tied ? d.tieWinner : scores[a] > scores[b] ? a : b;
    return {
      key: d.key,
      winner,
      letter: POLE_INFO[winner].letter,
      scores: [
        { pole: a, score: scores[a] },
        { pole: b, score: scores[b] },
      ],
      tied,
    };
  });
}
