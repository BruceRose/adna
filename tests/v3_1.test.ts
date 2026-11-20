/**
 * v3.1 tests. Uses an in-memory database (PGLITE_DATA_DIR=memory://) for the
 * retention and import tests.
 */
process.env.PGLITE_DATA_DIR = "memory://";

import { test } from "node:test";
import assert from "node:assert/strict";
import { CONSENT_VERSION, RETENTION_MONTHS } from "../src/lib/config";
import { CONSENT_BULLETS, CONSENT_CHECKBOX_LABEL, CONSENT_ERROR } from "../src/lib/consent";
import { retentionCutoff } from "../src/lib/retention";
import { buildWebResponse } from "../src/lib/v3/buildResponse";
import { FIXED_ORDER, TRAIT_ITEMS, type Preferences } from "../src/lib/v3/items";
import { submissionSchema } from "../src/lib/v3/validation";

const PREFS: Preferences = {
  P1: ["learn_ideas", "meet_new"],
  P2: { reception: 2, hosted_intros: 1, one_to_one: 0, roundtables: 2, app_matchmaking: 1, shared_activity: 0, seated_meal: 1 },
  P3: ["polls"],
  P4: ["data", "case_studies"],
  P5: "30_45",
  P6: 2,
  P7: "agenda",
  P8: "hourly",
};

export const VALID_SUBMISSION = {
  details: { name: "Sam Example", email: "Sam@Example.com", consent: true as const },
  context: { industry: "Technology" as const, role: "manager" as const, eventsAttended: "3_5" as const },
  answers: Object.fromEntries(TRAIT_ITEMS.map((i, k) => [i.id, (k % 5) + 1])),
  preferences: PREFS,
  meta: { presentedOrder: [...FIXED_ORDER] },
  event: "Summit 2027",
  aid: "AB123",
};

/* ---------- Consent ---------- */

test("consent: version and source are stored on web submissions", () => {
  const parsed = submissionSchema.parse(VALID_SUBMISSION);
  const row = buildWebResponse(parsed, Date.parse("2026-11-20T10:00:00Z"), "Mozilla/5.0 (iPhone)");
  assert.equal(row.consentVersion, CONSENT_VERSION);
  assert.equal(row.source, "web");
  assert.equal(row.email, "sam@example.com");
  assert.equal(row.event, "summit-2027");
  assert.equal(row.attendeeRef, "AB123");
  assert.equal(row.meta.userAgentClass, "mobile");
  assert.equal(row.consentAt.toISOString(), "2026-11-20T10:00:00.000Z");
});

test("consent: unticked box gives the spec's error message", () => {
  const r = submissionSchema.safeParse({ ...VALID_SUBMISSION, details: { ...VALID_SUBMISSION.details, consent: false } });
  assert.equal(r.success, false);
  assert.equal(r.error!.issues.find((i) => i.path.includes("consent"))!.message, CONSENT_ERROR);
  assert.equal(CONSENT_ERROR, "Please tick the box to agree before continuing.");
});

test("consent copy: app bullet only with ?aid=, controller named, retention stated, no em dashes", () => {
  assert.deepEqual(CONSENT_BULLETS.filter((b) => b.aidOnly).map((b) => b.key), ["aid"]);
  assert.equal(CONSENT_CHECKBOX_LABEL, "I agree to Live Group storing and using my details and answers as described above.");
  assert.match(CONSENT_BULLETS.find((b) => b.key === "keep")!.text, new RegExp(`after ${RETENTION_MONTHS} months`));
  for (const b of CONSENT_BULLETS) assert.ok(!b.text.includes("—") && !b.title.includes("—"));
});

/* ---------- Retention ---------- */

test("retention cutoff is RETENTION_MONTHS calendar months earlier", () => {
  assert.equal(RETENTION_MONTHS, 12);
  assert.equal(retentionCutoff(new Date("2026-11-20T03:17:00Z")).toISOString(), "2025-11-20T03:17:00.000Z");
  assert.equal(retentionCutoff(new Date("2026-03-31T00:00:00Z"), 1).toISOString(), "2026-03-03T00:00:00.000Z");
});

test("purge anonymises only expired rows, keeps industry and answers, and is idempotent", async () => {
  const { insertResponse, getResponse, purgeExpiredResponses, countExpiredResponses } = await import("../src/lib/responses");
  const parsed = submissionSchema.parse(VALID_SUBMISSION);
  const now = new Date("2026-11-20T03:17:00Z");
  const make = (createdAt: string) =>
    insertResponse({ ...buildWebResponse(parsed, Date.parse(createdAt), "x"), createdAt: new Date(createdAt), freeText: "Call me on 07700 900000" });
  const old = await make("2025-11-19T09:00:00Z"); // 1 day past 12 months
  const edge = await make("2025-11-20T03:17:00Z"); // exactly 12 months: not yet expired
  const fresh = await make("2026-06-01T09:00:00Z");

  assert.equal(await countExpiredResponses(now), 1);
  assert.equal(await purgeExpiredResponses(now), 1);
  assert.equal(await purgeExpiredResponses(now), 0, "second run changes nothing");

  const o = (await getResponse(old))!;
  assert.equal(o.name, "");
  assert.equal(o.email, "");
  assert.equal(o.attendeeRef, null);
  assert.equal(o.freeText, null);
  assert.equal(o.anonymisedAt?.toISOString(), now.toISOString());
  assert.equal(o.industry, "Technology", "industry is kept");
  assert.deepEqual(o.answers, parsed.answers, "de-identified answers are kept");
  assert.equal(o.style, (await getResponse(fresh))!.style);

  for (const id of [edge, fresh]) {
    const r = (await getResponse(id))!;
    assert.equal(r.name, "Sam Example");
    assert.equal(r.anonymisedAt, null);
  }
});

/* ---------- Style pages ---------- */

import { compareStyles } from "../src/lib/v3/compare";
import { emblemGeometry } from "../src/lib/v3/emblem";
import {
  GRID_ORDER,
  STYLES,
  STYLE_IDS,
  neighbouringStyles,
  positionOf,
  prevNextStyle,
  styleFromSlug,
  styleSlug,
} from "../src/lib/v3/styles";

test("every style has complete style-page content", () => {
  for (const id of STYLE_IDS) {
    const s = STYLES[id];
    assert.ok(s.about.trim().length > 0, `${id} about`);
    assert.equal(s.getMost.length, 3, `${id} getMost`);
    assert.equal(s.drains.length, 2, `${id} drains`);
    assert.ok(s.getMost.every((x) => x.trim()) && s.drains.every((x) => x.trim()));
    assert.ok(s.connect.trim() && s.design.trim(), `${id} connect/design`);
    for (const text of [s.about, ...s.getMost, ...s.drains, s.connect, s.design]) assert.ok(!text.includes("—"), `${id} em dash`);
  }
});

test("compareStyles covers all 72 ordered pairs and never claims compatibility", () => {
  let pairs = 0;
  for (const you of STYLE_IDS) {
    for (const them of STYLE_IDS) {
      if (you === them) continue;
      pairs++;
      const c = compareStyles(you, them);
      assert.equal(c.lines.length, 2);
      assert.equal(c.tip, `Tip: ${STYLES[them].connect}`);
      const all = [...c.lines, c.tip].join(" ").toLowerCase();
      for (const banned of ["click", "compatib", "chemistry"]) assert.ok(!all.includes(banned), `${you}->${them}: ${banned}`);
    }
  }
  assert.equal(pairs, 72);
  assert.deepEqual(compareStyles("analyst", "innovator").lines, [
    "Innovators are more Sociable than you on Connecting: they're likely to enjoy busier networking.",
    "Innovators are more Exploratory than you on Ideas: they're drawn to future-focused and experimental content.",
  ]);
  assert.deepEqual(compareStyles("explorer", "pragmatist").lines, [
    "You're both Adaptable on Connecting.",
    "Pragmatists are more Applied than you on Ideas: they prefer practical, proven content.",
  ]);
});

test("neighbouring styles share an edge on the grid (2-4 of them, symmetric)", () => {
  for (const id of STYLE_IDS) {
    const n = neighbouringStyles(id);
    assert.ok(n.length >= 2 && n.length <= 4, id);
    const a = positionOf(id);
    for (const other of n) {
      const b = positionOf(other);
      const diffs = (["connecting", "ideas"] as const).filter((k) => a[k] !== b[k]).length;
      assert.equal(diffs, 1, `${id} vs ${other}`);
      assert.ok(neighbouringStyles(other).includes(id), "symmetric");
    }
  }
  assert.deepEqual(neighbouringStyles("all_rounder").sort(), ["connector", "explorer", "observer", "pragmatist"]);
  assert.equal(neighbouringStyles("activator").length, 2);
});

test("style ids map to kebab-case slugs and back; grid order and prev/next", () => {
  assert.equal(styleSlug("all_rounder"), "all-rounder");
  assert.equal(styleFromSlug("all-rounder"), "all_rounder");
  assert.equal(styleFromSlug("all_rounder"), null, "snake case is not a valid URL");
  assert.equal(styleFromSlug("wizard"), null);
  for (const id of STYLE_IDS) assert.equal(styleFromSlug(styleSlug(id)), id);
  assert.deepEqual(GRID_ORDER, ["activator", "connector", "innovator", "pragmatist", "all_rounder", "explorer", "analyst", "observer", "scholar"]);
  assert.deepEqual(prevNextStyle("activator"), { prev: "scholar", next: "connector" });
});

test("emblems: node count follows Connecting, shape follows Ideas", () => {
  assert.equal(emblemGeometry("analyst").nodes.length, 2);
  assert.equal(emblemGeometry("pragmatist").nodes.length, 4);
  assert.equal(emblemGeometry("activator").nodes.length, 5);
  assert.match(emblemGeometry("analyst").nodes[0], /Q/); // rounded square
  assert.match(emblemGeometry("observer").nodes[0], /A/); // circle
  assert.doesNotMatch(emblemGeometry("scholar").nodes[0], /[AQ]/); // burst
  assert.deepEqual(emblemGeometry("explorer"), emblemGeometry("explorer"), "deterministic");
});

test("emblems: every node of every style is a full shape", () => {
  for (const id of STYLE_IDS) {
    for (const d of emblemGeometry(id).nodes) assert.ok(d.length > 40 && d.startsWith("M") && d.endsWith("Z"), `${id}: ${d.slice(0, 20)}`);
  }
  // Bursts are 8-pointed: 16 vertices.
  assert.equal((emblemGeometry("scholar").nodes[0].match(/[ML]/g) ?? []).length, 16);
});

/* ---------- Questionnaire flow helpers ---------- */

import { MILESTONES, buildSteps, milestoneFor, parseDraft, progressFor, secondsLeft, timeLeftLabel } from "../src/lib/v3/flow";

test("time remaining: 8s per statement, 15s per Part 3 question, rounded, hidden under a minute", () => {
  assert.equal(secondsLeft(22, 8), 22 * 8 + 8 * 15);
  assert.equal(timeLeftLabel(secondsLeft(22, 8)), "About 5 minutes left"); // 296s
  assert.equal(timeLeftLabel(secondsLeft(0, 4)), "About 1 minute left"); // 60s
  assert.equal(timeLeftLabel(secondsLeft(0, 3)), null); // 45s
  assert.equal(timeLeftLabel(89), "About 1 minute left");
  assert.equal(timeLeftLabel(90), "About 2 minutes left");
});

test("flow: steps, progress labels and milestones", () => {
  const steps = buildSteps([...FIXED_ORDER], false, "start");
  assert.deepEqual(
    steps.slice(0, 4).map((s) => s.kind),
    ["intro", "details", "interstitial", "part1"],
  );
  assert.equal(steps.filter((s) => s.kind === "interstitial").length, 3);
  const firstStatement = steps.findIndex((s) => s.kind === "trait");
  assert.equal(progressFor(steps, firstStatement + 6).label, "Part 2 of 3 · Statement 7 of 22");
  assert.equal(progressFor(steps, firstStatement + 6).announce, "Statement 7 of 22");
  const firstPref = steps.findIndex((s) => s.kind === "pref");
  assert.equal(progressFor(steps, firstPref + 2).label, "Part 3 of 3 · Question 3 of 8");
  assert.deepEqual(progressFor(steps, firstPref).segments, [1, 1, 0]);
  // Milestones
  assert.equal(milestoneFor(steps, firstStatement + 11), MILESTONES.halfway);
  assert.equal(milestoneFor(steps, firstStatement + 22), MILESTONES.statementsDone); // the Part 3 card
  assert.equal(milestoneFor(steps, steps.findIndex((s) => s.kind === "freeText")), MILESTONES.freeText);
  assert.equal(milestoneFor(steps, firstStatement + 5), null);
  // Pilot items count as statements in Part 2.
  const pilotSteps = buildSteps([...FIXED_ORDER], true, "start");
  assert.equal(progressFor(pilotSteps, pilotSteps.findIndex((s) => s.kind === "pilot")).label, "Part 2 of 3 · Statement 23 of 34");
});

test("draft: never restores name or email, rejects junk", () => {
  assert.equal(parseDraft(null), null);
  assert.equal(parseDraft("{not json"), null);
  assert.equal(parseDraft(JSON.stringify({ v: 2 })), null);
  const d = parseDraft(
    JSON.stringify({ v: 1, seed: 5, stepIndex: 7, answers: {}, pilotAnswers: {}, prefs: { P1: [], P2: {}, P3: [], P4: [] }, context: {}, timings: {}, detailsDone: true, details: { name: "X", email: "x@y.z" } }),
  )!;
  assert.equal(d.stepIndex, 7);
  assert.equal((d as unknown as Record<string, unknown>).details, undefined);
});

/* ---------- CSV import ---------- */

import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { IMPORT_COLUMNS, analyseImport, templateCsv } from "../src/lib/v3/importCsv";

const NOW = Date.parse("2026-11-20T12:00:00Z");
const EXAMPLE = readFileSync(new URL("../docs/import/audiencedna-import-example.csv", import.meta.url), "utf8");
const TEMPLATE = readFileSync(new URL("../docs/import/audiencedna-import-template.csv", import.meta.url), "utf8");
const exampleRows = () => Papa.parse<Record<string, string>>(EXAMPLE.replace(/^﻿/, ""), { header: true, skipEmptyLines: true }).data;
const toCsv = (rows: Record<string, string>[], columns = IMPORT_COLUMNS, delimiter = ",") =>
  "﻿" + Papa.unparse({ fields: columns, data: rows.map((r) => columns.map((c) => r[c] ?? "")) }, { newline: "\r\n", delimiter }) + "\r\n";

test("import: generated header matches both committed files byte for byte (ignoring the BOM)", () => {
  const header = (s: string) => s.replace(/^﻿/, "").split("\r\n")[0];
  assert.equal(header(templateCsv()), IMPORT_COLUMNS.join(","));
  assert.equal(header(TEMPLATE), header(templateCsv()));
  assert.equal(header(EXAMPLE), header(templateCsv()));
  assert.ok(TEMPLATE.startsWith("﻿") && EXAMPLE.startsWith("﻿"), "UTF-8 BOM");
  assert.ok(EXAMPLE.includes("\r\n") && !/[^\r]\n/.test(EXAMPLE), "CRLF line endings");
});

test("import: the example file gives the spec's expected results (5.5)", () => {
  const a = analyseImport(EXAMPLE, { now: NOW });
  assert.deepEqual(a.fileErrors, []);
  assert.deepEqual(a.errors, []);
  const got = a.valid.map((r) => ({
    row: r.row,
    name: r.name,
    style: r.score.style,
    c: r.score.axes.connecting.score,
    i: r.score.axes.ideas.score,
    nb: r.score.styleNeighbour,
    planning: r.score.badges.planning,
    ns: r.score.scaleScores.NS,
    motivation: r.score.badges.motivation,
    flags: r.score.qualityFlags,
  }));
  assert.deepEqual(got, [
    { row: 2, name: "Priya Example", style: "scholar", c: 2, i: 4.5, nb: null, planning: "planner", ns: 4.33, motivation: ["learn", "business"], flags: [] },
    { row: 3, name: "Tom Sample", style: "connector", c: 4.63, i: 3.25, nb: null, planning: "free_roamer", ns: 2.17, motivation: ["connect"], flags: [] },
    { row: 4, name: "Sam Placeholder", style: "explorer", c: 3.13, i: 4.13, nb: null, planning: "free_roamer", ns: 2, motivation: ["inspiration", "learn"], flags: [] },
  ]);
});

test("import: each deliberate error yields exactly the matching row error (5.6)", () => {
  const base = exampleRows()[0];
  const rows = [
    { ...base, email: "e1@example.com", SE1: "6" },
    { ...base, email: "e2@example.com", P4: "data" },
    { ...base, email: "e3@example.com", P2_roundtables: "" },
    { ...base, email: "e4@example.com", industry: "Other", industry_other: "" },
    { ...base, email: "e5@example.com", consent_at: "" },
    { ...base, email: "e6@example.com", submitted_at: "2027-01-01T09:00:00Z" },
  ];
  const a = analyseImport(toCsv(rows), { now: NOW });
  assert.equal(a.valid.length, 0);
  assert.deepEqual(
    a.errors.map((e) => [e.row, e.column]),
    [[2, "SE1"], [3, "P4"], [4, "P2_roundtables"], [5, "industry_other"], [6, "consent_at"], [7, "submitted_at"]],
  );
  // The error report has the original rows plus an "errors" column.
  assert.equal(a.errorRows.length, 6);
  assert.match(a.errorRows[0].errors, /^SE1: /);
});

test("import: a missing required column is a file-level error naming it", () => {
  const cols = IMPORT_COLUMNS.filter((c) => c !== "NS6");
  const a = analyseImport(toCsv(exampleRows(), cols), { now: NOW });
  assert.equal(a.fileErrors.length, 1);
  assert.match(a.fileErrors[0], /Missing required columns: NS6$/);
  assert.equal(a.valid.length, 0);
});

test("import: codes and labels are both accepted, case- and apostrophe-insensitive, with | for multiple values", () => {
  const base = exampleRows()[0];
  const labels = {
    ...base,
    email: "labels@example.com",
    industry: "  financial   SERVICES ",
    role: "team or project manager",
    events_attended: "6 or more",
    SE1: "Very like me",
    SE2: "somewhat unlike me",
    P1: "Learning new ideas or insights | meet_new",
    P2_reception: "It’s OK",
    P2_hosted_intros: "works well for me",
    P2_one_to_one: "Not for me",
    P3: "Answering live polls|I prefer to listen",
    P4: "Data and research|demo",
    P5: "Over an hour, if the content is in-depth",
    P6: "Leaning warm",
    P7: "The essentials plus the agenda",
    P8: "No preference",
  };
  const a = analyseImport(toCsv([labels]), { now: NOW });
  assert.deepEqual(a.errors, []);
  const r = a.valid[0];
  assert.equal(r.context.industry, "Financial Services");
  assert.equal(r.context.role, "manager");
  assert.equal(r.context.eventsAttended, "6_plus");
  assert.equal(r.answers.SE1, 5);
  assert.equal(r.answers.SE2, 2);
  assert.deepEqual(r.preferences.P1, ["learn_ideas", "meet_new"]);
  assert.equal(r.preferences.P2.reception, 1);
  assert.deepEqual(r.preferences.P3, ["polls", "listen"]);
  assert.deepEqual(r.preferences.P4, ["data", "demo"]);
  assert.equal(r.preferences.P5, "gt60");
  assert.equal(r.preferences.P6, 4);
  assert.equal(r.preferences.P8, "none");
  // Unknown labels are errors on that column.
  const bad = analyseImport(toCsv([{ ...base, email: "bad@example.com", role: "astronaut", P1: "learn_ideas|meet_new|change" }]), { now: NOW });
  assert.deepEqual(bad.errors.map((e) => e.column).sort(), ["P1", "role"]);
});

test("import: semicolon-delimited files, unknown columns and defaults", () => {
  const rows = exampleRows().map((r) => ({ ...r, consent_source: "", event: "" }));
  const cols = [...IMPORT_COLUMNS, "notes"];
  const a = analyseImport(toCsv(rows, cols, ";"), { now: NOW, defaultConsentSource: "Typeform", defaultEvent: "Spring Forum" });
  assert.deepEqual(a.errors, []);
  assert.equal(a.valid.length, 3);
  assert.deepEqual(a.warnings, ['Unknown column "notes" was ignored.']);
  assert.equal(a.valid[0].consentSource, "Typeform");
  assert.equal(a.valid[0].event, "spring-forum");
  // With no consent source and no default, the row is rejected.
  const none = analyseImport(toCsv(rows.slice(0, 1)), { now: NOW });
  assert.deepEqual(none.errors.map((e) => e.column), ["consent_source"]);
});

test("import: pilot markers are all-or-none", () => {
  const base = exampleRows()[0];
  const some = analyseImport(toCsv([{ ...base, M_E1: "3" }]), { now: NOW });
  assert.equal(some.valid.length, 0);
  assert.match(some.errors[0].message, /all 12/);
  const all = analyseImport(toCsv([{ ...base, ...Object.fromEntries(IMPORT_COLUMNS.filter((c) => c.startsWith("M_")).map((c) => [c, "4"])) }]), { now: NOW });
  assert.equal(all.valid[0].pilotAnswers?.M_C4, 4);
});

test("import: duplicates within a file are skipped unless 'Import anyway'", () => {
  const [row] = exampleRows();
  const twice = toCsv([row, { ...row, name: "Priya Again", email: "PRIYA@example.com" }]);
  const skip = analyseImport(twice, { now: NOW });
  assert.equal(skip.valid.length, 1);
  assert.deepEqual(skip.duplicates.map((d) => d.row), [3]);
  assert.equal(analyseImport(twice, { now: NOW, duplicates: "import" }).valid.length, 2);
  // Same email at a different event is not a duplicate.
  assert.equal(analyseImport(toCsv([row, { ...row, event: "Other Event" }]), { now: NOW }).valid.length, 2);
});

test("import: example imports, re-import skips 3 duplicates, undo removes exactly the batch", async () => {
  const { existingDuplicateKeys, insertImportBatch, undoImportBatch } = await import("../src/lib/imports");
  const { allResponses, getResponse } = await import("../src/lib/responses");
  const before = (await allResponses({})).length;

  const first = analyseImport(EXAMPLE, { now: NOW }, await existingDuplicateKeys());
  const res = await insertImportBatch(first, { fileName: "example.csv" }, NOW);
  assert.equal(res.imported, 3);
  const batchRows = await allResponses({ batch: res.batchId });
  assert.equal(batchRows.length, 3);
  const priya = batchRows.find((r) => r.name === "Priya Example")!;
  assert.equal(priya.style, "scholar");
  assert.equal(priya.source, "import");
  assert.equal(priya.consentVersion, "import");
  assert.equal(priya.consentSource, "Paper form, Leadership Summit 2026");
  assert.equal(priya.createdAt.toISOString(), "2026-11-12T10:15:00.000Z");
  assert.equal(priya.meta.userAgentClass, "unknown");
  assert.deepEqual(priya.meta.presentedOrder, []);
  const sam = batchRows.find((r) => r.name === "Sam Placeholder")!;
  assert.equal(sam.createdAt.toISOString(), new Date(NOW).toISOString(), "no submitted_at: import time");
  assert.equal(sam.industryOther, "Sports and live events");

  const again = analyseImport(EXAMPLE, { now: NOW }, await existingDuplicateKeys());
  assert.equal(again.valid.length, 0);
  assert.equal(again.duplicates.length, 3);

  const deleted = await undoImportBatch(res.batchId);
  assert.equal(deleted, 3);
  assert.equal((await allResponses({})).length, before, "only the batch's rows were removed");
  assert.equal(await getResponse(priya.id), null);
});

test("import: 5,000 rows validate in under 5s and import in under 15s", async () => {
  const { insertImportBatch, undoImportBatch } = await import("../src/lib/imports");
  const [row] = exampleRows();
  const rows = Array.from({ length: 5000 }, (_, i) => ({ ...row, email: `bulk${i}@example.com` }));
  const csv = toCsv(rows);
  let t = performance.now();
  const a = analyseImport(csv, { now: NOW });
  const validateMs = performance.now() - t;
  assert.equal(a.valid.length, 5000);
  assert.ok(validateMs < 5000, `validate took ${validateMs.toFixed(0)}ms`);
  t = performance.now();
  const res = await insertImportBatch(a, { fileName: "bulk.csv" }, NOW);
  const importMs = performance.now() - t;
  assert.equal(res.imported, 5000);
  assert.ok(importMs < 15000, `import took ${importMs.toFixed(0)}ms`);
  console.log(`# 5,000 rows: validate ${validateMs.toFixed(0)}ms, import ${importMs.toFixed(0)}ms`);
  await undoImportBatch(res.batchId);
  // Over the limit is a file-level error.
  const tooMany = analyseImport(toCsv(Array.from({ length: 5001 }, (_, i) => ({ ...row, email: `x${i}@example.com` }))), { now: NOW });
  assert.match(tooMany.fileErrors[0], /Too many rows/);
});
