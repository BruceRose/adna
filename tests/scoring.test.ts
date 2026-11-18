import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreAnswers, pointsFor } from "../src/lib/scoring";
import { PROFILES, STATEMENTS } from "../src/lib/questionnaire";

interface FixtureRow {
  id: number;
  answers: number[];
  scores: Record<string, number>;
  code: string;
  profile: string;
}

// The 85 rows from FinalADNA_Analysis.xlsx, with Excel's computed values.
const rows: FixtureRow[] = JSON.parse(
  readFileSync(new URL("./fixtures/spreadsheet-rows.json", import.meta.url), "utf8"),
);

// The spreadsheet had these two names swapped relative to the profiles document,
// which the app follows. Codes are unaffected.
const DOCUMENT_RENAMES: Record<string, string> = { Pragmatist: "Theorist", Theorist: "Pragmatist" };

const toAnswers = (arr: number[]) => Object.fromEntries(STATEMENTS.map((s, i) => [s.id, arr[i]]));

test("matches every row of the original spreadsheet", () => {
  assert.equal(rows.length, 85);
  for (const row of rows) {
    const result = scoreAnswers(toAnswers(row.answers));
    assert.deepEqual(result.scores, row.scores, `scores for row ${row.id}`);
    assert.equal(result.code, row.code, `code for row ${row.id}`);
    assert.equal(result.profile, DOCUMENT_RENAMES[row.profile] ?? row.profile, `profile for row ${row.id}`);
  }
});

test("points scale mirrors the IFS formulas", () => {
  assert.deepEqual([6, 5, 4, 3, 2, 1].map(pointsFor), [
    { towardsAgreePole: true, points: 3 },
    { towardsAgreePole: true, points: 2 },
    { towardsAgreePole: true, points: 1 },
    { towardsAgreePole: false, points: 1 },
    { towardsAgreePole: false, points: 2 },
    { towardsAgreePole: false, points: 3 },
  ]);
  assert.throws(() => pointsFor(0));
  assert.throws(() => pointsFor(7));
  assert.throws(() => pointsFor(3.5));
});

test("ties resolve to T, E, J, S like the spreadsheet", () => {
  // Answer 4 to everything: each pole in each pair gets 2 points.
  const result = scoreAnswers(Object.fromEntries(STATEMENTS.map((s) => [s.id, 4])));
  assert.equal(result.code, "TEJS");
  assert.ok(result.dimensions.every((d) => d.tied));
});

test("every possible code maps to a profile", () => {
  const codes = new Set(PROFILES.map((p) => p.code));
  assert.equal(codes.size, 16);
  for (const a of "TF") for (const b of "EI") for (const c of "JP") for (const d of "SI") assert.ok(codes.has(a + b + c + d));
});

test("TIPS is Pragmatist and TIPI is Theorist, per the profiles document", () => {
  assert.equal(PROFILES.find((p) => p.code === "TIPS")?.name, "Pragmatist");
  assert.equal(PROFILES.find((p) => p.code === "TIPI")?.name, "Theorist");
});

test("every profile has a short description", () => {
  for (const p of PROFILES) {
    const words = p.description.trim().split(/\s+/).length;
    assert.ok(words >= 10 && words <= 45, `${p.name} description is ${words} words`);
  }
});

test("rejects missing answers", () => {
  assert.throws(() => scoreAnswers({ q1: 6 }));
});
