import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreAnswers, pointsFor, maxNetFor } from "../src/lib/scoring";
import { DIMENSIONS, PROFILES, STATEMENTS, V1_STATEMENTS, VERSIONS } from "../src/lib/questionnaire";
import { buildAudienceReport, buildPersonalReport } from "../src/lib/insights";
import { eventSchema } from "../src/lib/validation";

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

const toV1Answers = (arr: number[]) => Object.fromEntries(V1_STATEMENTS.map((s, i) => [s.id, arr[i]]));

test("v1: matches every row of the original spreadsheet", () => {
  assert.equal(rows.length, 85);
  for (const row of rows) {
    const result = scoreAnswers(toV1Answers(row.answers), "1");
    assert.deepEqual(result.scores, row.scores, `scores for row ${row.id}`);
    assert.equal(result.code, row.code, `code for row ${row.id}`);
    assert.equal(result.profile, DOCUMENT_RENAMES[row.profile] ?? row.profile, `profile for row ${row.id}`);
  }
});

test("v1: points scale mirrors the IFS formulas", () => {
  assert.deepEqual([6, 5, 4, 3, 2, 1].map((a) => pointsFor(a, VERSIONS["1"].weights)), [
    { towardsAgreePole: true, points: 3 },
    { towardsAgreePole: true, points: 2 },
    { towardsAgreePole: true, points: 1 },
    { towardsAgreePole: false, points: 1 },
    { towardsAgreePole: false, points: 2 },
    { towardsAgreePole: false, points: 3 },
  ]);
  assert.deepEqual(
    [6, 5, 4, 3, 2, 1].map((a) => pointsFor(a).points),
    [5, 3, 1, 1, 3, 5],
    "v2 uses equal odd steps",
  );
  assert.equal(maxNetFor("1"), 12);
  assert.equal(maxNetFor("2"), 25);
  assert.throws(() => pointsFor(0));
  assert.throws(() => pointsFor(7));
  assert.throws(() => pointsFor(3.5));
});

test("v1: ties resolve to T, E, J, S like the spreadsheet", () => {
  // Answer 4 to everything: each pole in each pair gets 2 points.
  const result = scoreAnswers(Object.fromEntries(V1_STATEMENTS.map((s) => [s.id, 4])), "1");
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
  assert.throws(() => scoreAnswers({ s1: 6 }));
});

test("v2: 5 statements per pair, keyed both ways, 10 leaning each side of the code", () => {
  for (const d of DIMENSIONS) {
    const items = STATEMENTS.filter((s) => d.poles.includes(s.agreePole));
    assert.equal(items.length, 5, d.key);
    const first = items.filter((s) => s.agreePole === d.poles[0]).length;
    assert.ok(first === 2 || first === 3, `${d.key} keyed ${first}/5`);
  }
  const firstPoles = new Set(DIMENSIONS.map((d) => d.poles[0]));
  assert.equal(STATEMENTS.filter((s) => firstPoles.has(s.agreePole)).length, 10);
  assert.equal(new Set(STATEMENTS.map((s) => s.id)).size, STATEMENTS.length);
});

test("v2: a pair can never tie (exhaustive over all 6^5 answer combinations)", () => {
  const items = STATEMENTS.filter((s) => s.agreePole === "thinking" || s.agreePole === "feeling");
  const values = [1, 2, 3, 4, 5, 6];
  let checked = 0;
  const rec = (i: number, answers: Record<string, number>) => {
    if (i === items.length) {
      const full = { ...Object.fromEntries(STATEMENTS.map((s) => [s.id, 4])), ...answers };
      const r = scoreAnswers(full);
      assert.ok(r.dimensions.every((d) => !d.tied));
      checked++;
      return;
    }
    for (const v of values) rec(i + 1, { ...answers, [items[i].id]: v });
  };
  rec(0, {});
  assert.equal(checked, 7776);
});

test("v2: lean positions are symmetric and strengths sensible", () => {
  const allAgree = scoreAnswers(Object.fromEntries(STATEMENTS.map((s) => [s.id, 6])));
  // Strongly agreeing with everything cancels out to a slight lean on every pair.
  assert.ok(allAgree.dimensions.every((d) => d.strength === "slight"));
  const extreme = Object.fromEntries(STATEMENTS.map((s) => [s.id, ["thinking", "extrovert", "judging", "sensing"].includes(s.agreePole) ? 6 : 1]));
  const r = scoreAnswers(extreme);
  assert.equal(r.code, "TEJS");
  assert.ok(r.dimensions.every((d) => d.percent === 100 && d.position === 0 && d.strength === "strong"));
});

test("personal report: four distinct allies one letter away, and an opposite stretch", () => {
  for (const p of PROFILES) {
    const scores = { thinking: 0, feeling: 0, extrovert: 0, introvert: 0, judging: 0, perceiving: 0, sensing: 0, intuition: 0 };
    const [t, e, j, s] = p.code;
    scores[t === "T" ? "thinking" : "feeling"] = 9;
    scores[e === "E" ? "extrovert" : "introvert"] = 9;
    scores[j === "J" ? "judging" : "perceiving"] = 9;
    scores[s === "S" ? "sensing" : "intuition"] = 9;
    const report = buildPersonalReport(p.code, scores, 25);
    assert.equal(report.profile.code, p.code);
    assert.equal(new Set(report.allies.map((a) => a.profile.code)).size, 4);
    for (const a of report.allies) {
      const diff = [...a.profile.code].filter((ch, i) => ch !== p.code[i]).length;
      assert.equal(diff, 1, `${p.code} ally ${a.profile.code}`);
    }
    // The stretch connection differs on every pair. (Compare poles, since "I" appears in two positions.)
    assert.equal(report.stretch.profile.code.length, 4);
    assert.ok([...report.stretch.profile.code].every((ch, i) => ch !== p.code[i]));
    assert.ok(report.formats.length >= 4 && report.talkToMe.length === 4 && report.drains.length === 3);
  }
});

test("audience report summarises the spreadsheet audience", () => {
  const rows = rows85();
  const report = buildAudienceReport(rows)!;
  assert.equal(report.total, 85);
  for (const d of report.dimensions) assert.equal(d.share[0] + d.share[1], 100);
  // The original audience was heavily Thinking and Judging.
  assert.equal(report.dimensions.find((d) => d.key === "TF")!.lean, "first");
  assert.equal(report.recommendations.length, 4);
  assert.ok(PROFILES.some((p) => p.code === report.typicalCode));
});

test("event tags are normalised to safe slugs", () => {
  assert.equal(eventSchema.parse("Summit 2027!"), "summit-2027");
  assert.equal(eventSchema.parse("  "), undefined);
  assert.equal(eventSchema.parse(undefined), undefined);
  assert.equal(eventSchema.parse("x".repeat(100))!.length, 60);
});

function rows85() {
  return rows.map((r) => ({ scores: scoreAnswers(toV1Answers(r.answers), "1").scores, version: "1" }));
}
