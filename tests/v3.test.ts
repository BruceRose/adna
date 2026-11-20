import { test } from "node:test";
import assert from "node:assert/strict";
import { NORMS, sem } from "../src/lib/norms";
import {
  FIXED_ORDER,
  TRAIT_ITEMS,
  hasAdjacentSameScale,
  presentationOrder,
  type P1Id,
  type ScaleId,
} from "../src/lib/v3/items";
import {
  axisScore,
  itemValue,
  levelFor,
  motivationBadge,
  neighbourFor,
  planningBadge,
  qualityFlags,
  scaleScore,
  scoreV3,
} from "../src/lib/v3/scoring";
import { GRID, STYLE_IDS, motivationLabel, type Level } from "../src/lib/v3/styles";

const all = (v: number) => Object.fromEntries(TRAIT_ITEMS.map((i) => [i.id, v]));

/** Answers that give each scale the requested value after reversal. */
function answersFor(values: Partial<Record<ScaleId, number>>, fallback = 3) {
  return Object.fromEntries(
    TRAIT_ITEMS.map((i) => {
      const v = values[i.scale] ?? fallback;
      return [i.id, i.key === 1 ? v : 6 - v];
    }),
  );
}

/* 1 */
test("v3 items: 22, unique ids, 11 positive and 11 reverse-keyed, every scale balanced", () => {
  assert.equal(TRAIT_ITEMS.length, 22);
  assert.equal(new Set(TRAIT_ITEMS.map((i) => i.id)).size, 22);
  assert.equal(TRAIT_ITEMS.filter((i) => i.key === 1).length, 11);
  assert.equal(TRAIT_ITEMS.filter((i) => i.key === -1).length, 11);
  const expected: Record<ScaleId, number> = { SE: 2, SI: 2, DP: 2, NO: 2, NS: 3 };
  for (const [scale, n] of Object.entries(expected)) {
    const items = TRAIT_ITEMS.filter((i) => i.scale === scale);
    assert.equal(items.filter((i) => i.key === 1).length, n, `${scale} positive`);
    assert.equal(items.filter((i) => i.key === -1).length, n, `${scale} negative`);
  }
});

/* 2 */
test("reverse scoring: 5 on a reverse-keyed item gives 1", () => {
  assert.equal(itemValue({ key: -1 }, 5), 1);
  assert.equal(itemValue({ key: -1 }, 1), 5);
  assert.equal(itemValue({ key: 1 }, 5), 5);
  assert.throws(() => itemValue({ key: 1 }, 6));
});

/* 3 */
test("all 3s: every scale 3.0, All-Rounder, no planning badge, straightline but not acquiescence", () => {
  const r = scoreV3(all(3), ["learn_ideas"]);
  assert.ok(Object.values(r.scaleScores).every((s) => s === 3));
  assert.equal(r.style, "all_rounder");
  assert.equal(r.styleNeighbour, null);
  assert.equal(r.badges.planning, null);
  assert.ok(r.qualityFlags.includes("straightline"));
  assert.ok(!r.qualityFlags.includes("acquiescence"));
  assert.ok(!r.qualityFlags.includes("contradiction"));
});

/* 4: the key regression test against the v2 acquiescence bug */
test("all 5s: every scale 3.0 (balanced keying), flagged straightline, acquiescence and contradiction", () => {
  const r = scoreV3(all(5), ["learn_ideas"]);
  assert.ok(Object.values(r.scaleScores).every((s) => s === 3), JSON.stringify(r.scaleScores));
  assert.equal(r.style, "all_rounder");
  for (const f of ["straightline", "acquiescence", "contradiction"] as const) assert.ok(r.qualityFlags.includes(f), f);
  // And all 1s likewise.
  const low = scoreV3(all(1), ["learn_ideas"]);
  assert.ok(Object.values(low.scaleScores).every((s) => s === 3));
  assert.ok(low.qualityFlags.includes("acquiescence"));
});

/* 5 */
test("constructed answers produce each of the 9 styles", () => {
  const value: Record<Level, number> = { low: 1, mid: 3, high: 5 };
  const seen = new Set<string>();
  for (const c of ["low", "mid", "high"] as Level[]) {
    for (const i of ["low", "mid", "high"] as Level[]) {
      const r = scoreV3(answersFor({ SE: value[c], SI: value[c], DP: value[i], NO: value[i] }), ["meet_new"]);
      assert.equal(r.style, GRID[c][i], `${c}/${i}`);
      seen.add(r.style);
    }
  }
  assert.deepEqual([...seen].sort(), [...STYLE_IDS].sort());
});

/* 6 */
test("neighbour: connecting 3.55 with mid ideas is an All-Rounder with a touch of Connector", () => {
  const n = neighbourFor({ connecting: { score: 3.55, level: "mid" }, ideas: { score: 3.1, level: "mid" } });
  assert.equal(n, "connector");
  // Far from every cut: no neighbour.
  assert.equal(neighbourFor({ connecting: { score: 3.1, level: "mid" }, ideas: { score: 3.1, level: "mid" } }), null);
  assert.equal(neighbourFor({ connecting: { score: 4.8, level: "high" }, ideas: { score: 1.2, level: "low" } }), null);
  // Below the lower cut, close to it: across is mid.
  assert.equal(neighbourFor({ connecting: { score: 2.5, level: "low" }, ideas: { score: 1.2, level: "low" } }), "pragmatist");
  // Both qualify: the closer one in SEM units wins.
  assert.equal(neighbourFor({ connecting: { score: 3.5, level: "mid" }, ideas: { score: 2.65, level: "mid" } }), "pragmatist");
  // End to end through the scorer (8-item mean of 3.5 is 0.1 below the cut).
  const r = scoreV3(answersFor({ SE: 4, SI: 3, DP: 3, NO: 3 }), ["learn_ideas"]);
  assert.equal(r.axes.connecting.score, 3.5);
  assert.equal(r.style, "all_rounder");
  assert.equal(r.styleNeighbour, "connector");
  assert.equal(Math.round(sem(NORMS.connecting) * 100) / 100, 0.31);
  assert.equal(Math.round(sem(NORMS.structure) * 100) / 100, 0.38);
});

/* 7 */
test("planning badge thresholds are inclusive at the cuts", () => {
  assert.equal(planningBadge(3.8), "planner");
  assert.equal(planningBadge(3.79), null);
  assert.equal(planningBadge(2.4), "free_roamer");
  assert.equal(planningBadge(2.41), null);
  assert.equal(planningBadge(5), "planner");
  assert.equal(planningBadge(1), "free_roamer");
});

/* 8 */
test("motivation: mapping, de-duplication and order of first selection", () => {
  assert.deepEqual(motivationBadge(["learn_ideas", "learn_skills"] as P1Id[]), ["learn"]);
  assert.deepEqual(motivationBadge(["meet_new", "learn_skills"] as P1Id[]), ["connect", "learn"]);
  assert.deepEqual(motivationBadge(["represent", "change"] as P1Id[]), ["business", "inspiration"]);
  assert.equal(motivationLabel(["learn", "connect"]), "Here to learn and connect");
  assert.equal(motivationLabel(["business"]), "Here to do business");
  assert.equal(motivationLabel(["learn", "inspiration"]), "Here to learn and for inspiration");
});

/* 9 */
test("quality flags trigger at their rule and not below it", () => {
  // straightline
  assert.ok(qualityFlags(all(4)).includes("straightline"));
  assert.ok(!qualityFlags({ ...all(4), NS6: 3 }).includes("straightline"));

  // contradiction: 2 antonym pairs needed
  const base = answersFor({}); // all scales 3, no contradictions
  assert.ok(!qualityFlags(base).includes("contradiction"));
  assert.ok(!qualityFlags({ ...base, NS1: 4, NS4: 4 }).includes("contradiction"));
  assert.ok(qualityFlags({ ...base, NS1: 4, NS4: 4, SI1: 2, SI3: 2 }).includes("contradiction"));

  // fast: under 60 seconds
  const t0 = "2026-11-20T10:00:00.000Z";
  assert.ok(qualityFlags(base, { part2StartedAt: t0, part2EndedAt: "2026-11-20T10:00:59.000Z" }).includes("fast"));
  assert.ok(!qualityFlags(base, { part2StartedAt: t0, part2EndedAt: "2026-11-20T10:01:00.000Z" }).includes("fast"));
  assert.ok(!qualityFlags(base).includes("fast"));

  // acquiescence: mean > 4.2 or < 1.8
  const mix = (high: number, a: number, b: number) =>
    Object.fromEntries(TRAIT_ITEMS.map((it, idx) => [it.id, idx < high ? b : a]));
  assert.ok(qualityFlags(mix(5, 4, 5)).includes("acquiescence")); // 93/22 = 4.23
  assert.ok(!qualityFlags(mix(4, 4, 5)).includes("acquiescence")); // 92/22 = 4.18
  assert.ok(qualityFlags(mix(17, 1, 2)).includes("acquiescence")); // 39/22 = 1.77
  assert.ok(!qualityFlags(mix(18, 1, 2)).includes("acquiescence")); // 40/22 = 1.82
});

/* 10 */
test("missing items: 3 of 4 still scores, 2 of 4 throws", () => {
  const a = answersFor({ SE: 4 });
  delete a.SE1;
  assert.equal(scaleScore(a, "SE"), 4);
  delete a.SE2;
  assert.throws(() => scaleScore(a, "SE"));
  // NS needs 5 of 6.
  const n = answersFor({ NS: 2 });
  delete n.NS1;
  assert.equal(scaleScore(n, "NS"), 2);
  delete n.NS2;
  assert.throws(() => scaleScore(n, "NS"));
  // Axes use item means over what's present.
  const b = answersFor({ SE: 5, SI: 1 });
  delete b.SE1;
  assert.equal(axisScore(b, "connecting"), (5 * 3 + 1 * 4) / 7);
});

/* 11 */
test("presentation order never puts two items from the same scale next to each other", () => {
  assert.ok(!hasAdjacentSameScale(FIXED_ORDER));
  assert.deepEqual([...FIXED_ORDER].sort(), TRAIT_ITEMS.map((i) => i.id).sort());
  const orders = new Set<string>();
  for (let seed = 0; seed < 1000; seed++) {
    const order = presentationOrder(seed);
    assert.equal(order.length, 22);
    assert.equal(new Set(order).size, 22);
    assert.ok(!hasAdjacentSameScale(order), `seed ${seed}`);
    orders.add(order.join(","));
  }
  assert.ok(orders.size > 900, "orders should vary by seed");
  // With no attempts allowed, it falls back to the fixed order.
  assert.deepEqual(presentationOrder(1, 0), FIXED_ORDER);
});

test("levels follow the cut points", () => {
  assert.equal(levelFor(2.59, [2.6, 3.6]), "low");
  assert.equal(levelFor(2.6, [2.6, 3.6]), "mid");
  assert.equal(levelFor(3.6, [2.6, 3.6]), "mid");
  assert.equal(levelFor(3.61, [2.6, 3.6]), "high");
});

/* ------------------------------------------------------------------ */
/* Milestones 4-6: recommendations, audience, validation, exports      */
/* ------------------------------------------------------------------ */

import { P2_ROW_IDS, type Preferences } from "../src/lib/v3/items";
import { recommendedFormats, buildRecommendations, takePartLines, convincesLine } from "../src/lib/v3/recommendations";
import { buildAudienceReport, headlineFor, marginOfError, type AudienceInputRow } from "../src/lib/v3/audience";
import { submissionSchema, preferencesSchema, aidSchema, eventSchema, waveSchema, sanitiseTimestamp } from "../src/lib/v3/validation";
import { v3Headers, v3Row, toCsv, researchId } from "../src/lib/v3/exportColumns";
import type { ResponseRow } from "../src/lib/db/schema";

const PREFS: Preferences = {
  P1: ["learn_ideas", "meet_new"],
  P2: { reception: 2, hosted_intros: 1, one_to_one: 0, roundtables: 2, app_matchmaking: 1, shared_activity: 0, seated_meal: 1 },
  P3: ["polls", "app_anon"],
  P4: ["data", "case_studies"],
  P5: "30_45",
  P6: 2,
  P7: "agenda",
  P8: "hourly",
};

/* 12 */
test("recommendations never include a P2 row rated 0", () => {
  const random = (() => {
    let s = 7;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();
  for (let trial = 0; trial < 2000; trial++) {
    const p2 = Object.fromEntries(P2_ROW_IDS.map((id) => [id, Math.floor(random() * 3)])) as Preferences["P2"];
    for (const level of ["low", "mid", "high"] as const) {
      const out = recommendedFormats(p2, level);
      assert.ok(out.length <= 4);
      for (const id of out) assert.notEqual(p2[id], 0, `${id} was rated 0`);
    }
  }
  // Fewer than 2 rated "works well": topped up from the Connecting level.
  const none = Object.fromEntries(P2_ROW_IDS.map((id) => [id, 1])) as Preferences["P2"];
  assert.deepEqual(recommendedFormats(none, "low"), ["one_to_one", "roundtables"]);
  assert.deepEqual(recommendedFormats({ ...none, one_to_one: 0 }, "low"), ["roundtables"]);
});

test("recommendation copy follows the spec", () => {
  assert.deepEqual(takePartLines(["app_anon", "polls"]), ["You prefer submitting questions anonymously and answering live polls."]);
  assert.deepEqual(takePartLines(["listen"]), ["You prefer listening.", "Organisers should avoid calling on you without warning."]);
  assert.equal(convincesLine(["data", "case_studies"]), "Data and research, and real-world case studies");
  const r = buildRecommendations(PREFS, { connecting: { score: 4, level: "high" }, ideas: { score: 2, level: "low" } }, "planner");
  assert.deepEqual(r.communicate, ["Keep it brief and to the point.", "The essentials plus the agenda.", "Send the agenda early and flag any changes promptly."]);
  assert.deepEqual(r.depth, ["Practical, applied sessions with clear takeaways.", "Session length: 30-45 minutes."]);
  assert.equal(r.pace, "Regular breaks");
  const neutral = buildRecommendations(
    { ...PREFS, P6: 3, P5: "none", P8: "none" },
    { connecting: { score: 3, level: "mid" }, ideas: { score: 3, level: "mid" } },
    null,
  );
  assert.equal(neutral.pace, null);
  assert.deepEqual(neutral.communicate, ["The essentials plus the agenda."]);
  assert.deepEqual(neutral.depth, ["A mix of big-picture and practical sessions."]);
});

/* 13 */
function audienceRow(over: Partial<AudienceInputRow> = {}, c: "low" | "mid" | "high" = "high", i: "low" | "mid" | "high" = "high"): AudienceInputRow {
  const score = { low: 2, mid: 3, high: 4 };
  return {
    axes: { connecting: { score: score[c], level: c }, ideas: { score: score[i], level: i } },
    style: GRID[c][i],
    badges: { planning: null, motivation: ["learn"] },
    preferences: PREFS,
    qualityFlags: [],
    version: "3",
    ...over,
  };
}

test("audience: fewer than 10 eligible responses is too small to report", () => {
  const nine = Array.from({ length: 9 }, () => audienceRow());
  assert.equal(buildAudienceReport(nine).state, "too_small");
  assert.equal(buildAudienceReport([...nine, audienceRow()]).state, "ok");
});

test("audience: flagged rows are excluded and counted; legacy rows are noted but not used", () => {
  const rows = [
    ...Array.from({ length: 10 }, () => audienceRow()),
    audienceRow({ qualityFlags: ["straightline"] }),
    audienceRow({ qualityFlags: ["fast", "acquiescence"] }),
    audienceRow({ version: "2" }),
  ];
  const r = buildAudienceReport(rows);
  assert.equal(r.state, "ok");
  if (r.state !== "ok") return;
  assert.equal(r.n, 10);
  assert.equal(r.excluded, 2);
  assert.equal(r.legacy, 1);
  assert.equal(r.indicative, true);
  // 9 clean + 2 flagged: the flagged ones don't count towards the minimum.
  const small = buildAudienceReport([...Array.from({ length: 9 }, () => audienceRow()), audienceRow({ qualityFlags: ["fast"] })]);
  assert.deepEqual(small, { state: "too_small", eligible: 9, excluded: 1, legacy: 0 });
});

test("audience: margin of error", () => {
  assert.equal(marginOfError(0.5, 100), 10);
  assert.equal(marginOfError(0, 50), 0);
  assert.equal(marginOfError(0.2, 400), 4);
});

test("audience: headline rules", () => {
  const make = (levels: ("low" | "mid" | "high")[], ideas: ("low" | "mid" | "high")[]) => {
    const r = buildAudienceReport(levels.map((c, k) => audienceRow({}, c, ideas[k])));
    assert.equal(r.state, "ok");
    return r.state === "ok" ? r : (null as never);
  };
  // 6 high, 2 mid, 2 low connecting; 5 high, 5 mid ideas (tie: mixed).
  const a = make(
    ["high", "high", "high", "high", "high", "high", "mid", "mid", "low", "low"],
    ["high", "high", "high", "high", "high", "mid", "mid", "mid", "mid", "mid"],
  );
  assert.equal(a.headline, "A Sociable audience with a mix of content preferences");
  // Both named.
  const b = make(Array(10).fill("low"), [...Array(8).fill("high"), "mid", "low"]);
  assert.equal(b.headline, "A Selective audience, leaning Exploratory");
  // 45% but leading by less than 10 points: mixed.
  const c = make(
    ["high", "high", "high", "high", "mid", "mid", "mid", "mid", "low", "low"],
    ["mid", "mid", "mid", "mid", "mid", "mid", "mid", "mid", "mid", "mid"],
  );
  assert.equal(c.headline, "A Balanced audience with a mix of networking preferences");
  assert.equal(
    headlineFor({ connecting: { ...a.axes.connecting, dominant: null }, ideas: { ...a.axes.ideas, dominant: null } }),
    "A mixed audience across both axes",
  );
  assert.equal(a.motivationLine, "Most are here to learn (100%)");
});

test("audience: playbook, avoid, don't forget and planning share", () => {
  const rows = [
    ...Array.from({ length: 7 }, () => audienceRow({ badges: { planning: "planner", motivation: ["learn"] } }, "low", "low")),
    ...Array.from({ length: 3 }, () => audienceRow({}, "high", "low")),
  ];
  const r = buildAudienceReport(rows);
  assert.equal(r.state, "ok");
  if (r.state !== "ok") return;
  assert.equal(r.playbook.planners.length, 2);
  assert.equal(r.playbook.planners[0].axis, "ideas"); // 100% Applied: strongest consensus first
  assert.ok(r.avoid.some((a) => a.id === "one_to_one" && a.notForMe.pct === 100));
  assert.deepEqual(r.dontForget.map((d) => `${d.axis}:${d.level}:${d.share.pct}`), ["connecting:high:30"]);
  assert.equal(r.planning.planner.pct, 70);
  assert.equal(r.planning.sendAgendasEarly, true);
});

/* 14 */
const VALID = {
  details: { name: "Sam", email: "sam@example.com", consent: true as const },
  context: { industry: "Technology" as const, role: "manager" as const, eventsAttended: "3_5" as const },
  answers: Object.fromEntries(TRAIT_ITEMS.map((i) => [i.id, 3])),
  preferences: PREFS,
  meta: { presentedOrder: [...FIXED_ORDER] },
};

test("validation rejects bad choice counts, a missing P2 row and an out-of-range answer", () => {
  assert.ok(submissionSchema.safeParse(VALID).success);
  assert.ok(!preferencesSchema.safeParse({ ...PREFS, P4: ["data"] }).success);
  assert.ok(!preferencesSchema.safeParse({ ...PREFS, P4: ["data", "demo", "peers"] }).success);
  const { reception: _omit, ...missingRow } = PREFS.P2;
  void _omit;
  assert.ok(!preferencesSchema.safeParse({ ...PREFS, P2: missingRow }).success);
  assert.ok(!submissionSchema.safeParse({ ...VALID, answers: { ...VALID.answers, SE1: 6 } }).success);
  assert.ok(!preferencesSchema.safeParse({ ...PREFS, P1: [] }).success);
  assert.ok(!preferencesSchema.safeParse({ ...PREFS, P1: ["learn_ideas", "meet_new", "change"] }).success);
  assert.ok(!preferencesSchema.safeParse({ ...PREFS, P3: [] }).success);
  assert.ok(!submissionSchema.safeParse({ ...VALID, freeText: "x".repeat(1001) }).success);
});

test("link parameters and timestamps are sanitised, not rejected", () => {
  assert.equal(eventSchema.parse("Summit 2027!"), "summit-2027");
  assert.equal(waveSchema.parse("Retest"), "retest");
  assert.equal(aidSchema.parse("AB-123_x.9"), "AB-123_x.9");
  assert.equal(aidSchema.parse("AB 123<script>"), "AB-123-script");
  const now = Date.parse("2026-11-20T12:00:00.000Z");
  assert.equal(sanitiseTimestamp("2026-11-20T11:00:00.000Z", now), "2026-11-20T11:00:00.000Z");
  assert.equal(sanitiseTimestamp("2026-11-18T11:00:00.000Z", now), undefined); // older than 24 hours
  assert.equal(sanitiseTimestamp("yesterday", now), undefined);
  assert.equal(sanitiseTimestamp(12345, now), undefined);
});

/* 15 */
function responseRow(): ResponseRow {
  const s = scoreV3(VALID.answers, PREFS.P1);
  return {
    id: "6b7d2a9e-1c1e-4c5f-9a0b-2f0c4a1d9e11",
    createdAt: new Date("2026-11-20T10:00:00.000Z"),
    name: "Sam Example",
    email: "sam@example.com",
    industry: "Technology",
    industryOther: null,
    event: "summit-2027",
    wave: null,
    attendeeRef: "A1",
    consentAt: new Date("2026-11-20T10:00:00.000Z"),
    questionnaireVersion: "3",
    normsVersion: s.normsVersion,
    context: { role: "manager", eventsAttended: "3_5" },
    answers: VALID.answers,
    preferences: PREFS,
    scaleScores: s.scaleScores,
    axes: s.axes,
    style: s.style,
    styleNeighbour: s.styleNeighbour,
    badges: s.badges,
    qualityFlags: s.qualityFlags,
    freeText: "More coffee",
    meta: {
      presentedOrder: [...FIXED_ORDER],
      part2StartedAt: "2026-11-20T09:55:00.000Z",
      part2EndedAt: "2026-11-20T09:57:30.000Z",
      submittedAt: "2026-11-20T10:00:00.000Z",
      userAgentClass: "desktop",
    },
    pilotAnswers: null,
    source: "web",
    importBatchId: null,
    consentSource: null,
    consentVersion: "2026-11-20",
    anonymisedAt: null,
  };
}

test("export headers match spec section 10 exactly", () => {
  const expected = [
    "#", "Response ID", "Submitted", "Name", "Email", "Industry", "Event", "Wave", "Attendee ref", "Version", "Norms version",
    "Source", "Import batch", "Consent source", "Consent version",
    "C2", "C3",
    "SE1", "SE2", "SE3", "SE4", "SI1", "SI2", "SI3", "SI4", "DP1", "DP2", "DP3", "DP4",
    "NO1", "NO2", "NO3", "NO4", "NS1", "NS2", "NS3", "NS4", "NS5", "NS6",
    "SE", "SI", "DP", "NO", "NS",
    "Connecting score", "Connecting level", "Ideas score", "Ideas level",
    "Style", "Neighbour", "Planning badge", "Motivation",
    "P1_learn_ideas", "P1_learn_skills", "P1_meet_new", "P1_catch_up", "P1_meet_specific", "P1_inspiration", "P1_represent", "P1_change",
    "P2_reception", "P2_hosted_intros", "P2_one_to_one", "P2_roundtables", "P2_app_matchmaking", "P2_shared_activity", "P2_seated_meal",
    "P3_ask_aloud", "P3_app_named", "P3_app_anon", "P3_polls", "P3_discuss_neighbours", "P3_small_group_task", "P3_listen",
    "P4_data", "P4_case_studies", "P4_stories", "P4_demo", "P4_expertise", "P4_peers",
    "P5", "P6", "P7", "P8",
    "Free text", "Flags", "Part 2 seconds", "Presented order",
    "M_E1", "M_E2", "M_E3", "M_E4", "M_I1", "M_I2", "M_I3", "M_I4", "M_C1", "M_C2", "M_C3", "M_C4",
  ];
  assert.deepEqual(v3Headers(), expected);
  const row = v3Row(responseRow(), 0);
  assert.equal(row.length, expected.length);
  const at = (h: string) => row[expected.indexOf(h)];
  assert.equal(at("Part 2 seconds"), 150);
  assert.equal(at("P1_learn_ideas"), 1);
  assert.equal(at("P1_change"), 0);
  assert.equal(at("P2_one_to_one"), 0);
  assert.equal(at("Style"), "All-Rounder");
  assert.equal(at("M_E1"), "");
});

test("research export has no names or emails, and hashes the response id", () => {
  const r = responseRow();
  const headers = v3Headers({ research: true });
  assert.ok(!headers.includes("Name") && !headers.includes("Email") && !headers.includes("Response ID"));
  const csv = toCsv([r], { research: true, secret: "s3cret" });
  assert.ok(!csv.includes("Sam Example") && !csv.includes("sam@example.com") && !csv.includes(r.id));
  assert.ok(csv.includes(researchId(r.id, "s3cret")));
  assert.match(researchId(r.id, "s3cret"), /^[0-9a-f]{64}$/);
  assert.throws(() => v3Row(r, 0, { research: true }));
});
