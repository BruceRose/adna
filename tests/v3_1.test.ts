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
