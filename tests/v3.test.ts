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
