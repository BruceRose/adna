/**
 * v3 submission validation (spec section 11). Every limit in the
 * questionnaire is enforced here too, on the server.
 */
import { z } from "zod";
import { CONSENT_ERROR } from "../consent";
import {
  C2,
  C3,
  FREE_TEXT,
  INDUSTRIES,
  OTHER_INDUSTRY,
  P1,
  P2,
  P3,
  P4,
  P5,
  P7,
  P8,
  P2_ROW_IDS,
  PILOT_IDS,
  TRAIT_IDS,
} from "./items";

const ids = <T extends { id: string }>(options: readonly T[]) => options.map((o) => o.id) as [T["id"], ...T["id"][]];

/* ---------- Details ---------- */

export const detailsSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(200),
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address")).pipe(z.string().max(320)),
  consent: z.literal(true, { error: CONSENT_ERROR }),
});

/* ---------- Part 1 ---------- */

export const contextSchema = z
  .object({
    industry: z.enum([...INDUSTRIES, OTHER_INDUSTRY], { error: "Please choose your industry" }),
    industryOther: z.string().trim().max(200).optional(),
    role: z.enum(ids(C2.options), { error: "Please choose your role" }),
    eventsAttended: z.enum(ids(C3.options), { error: "Please choose an answer" }),
  })
  .refine((c) => c.industry !== OTHER_INDUSTRY || (c.industryOther && c.industryOther.length > 0), {
    path: ["industryOther"],
    message: "Please tell us your industry",
  });

/* ---------- Part 2 and pilot markers ---------- */

const fivePoint = z.number().int().min(1).max(5);

export const answersSchema = z.strictObject(
  Object.fromEntries(TRAIT_IDS.map((id) => [id, fivePoint])) as Record<string, typeof fivePoint>,
);

export const pilotAnswersSchema = z
  .strictObject(Object.fromEntries(PILOT_IDS.map((id) => [id, fivePoint])) as Record<string, typeof fivePoint>)
  .optional();

/* ---------- Part 3 ---------- */

const multi = <T extends string>(values: [T, ...T[]], min: number, max: number, message: string) =>
  z
    .array(z.enum(values))
    .refine((xs) => new Set(xs).size === xs.length, "Duplicate choice")
    .refine((xs) => xs.length >= min && xs.length <= max, message);

const p2Value = z.union([z.literal(0), z.literal(1), z.literal(2)]);

export const preferencesSchema = z.object({
  P1: multi(ids(P1.options), P1.min, P1.max, "Choose one or two reasons"),
  P2: z.strictObject(Object.fromEntries(P2_ROW_IDS.map((id) => [id, p2Value])) as Record<(typeof P2_ROW_IDS)[number], typeof p2Value>),
  P3: multi(ids(P3.options), P3.min, P3.max, "Choose at least one"),
  P4: multi(ids(P4.options), P4.min, P4.max, "Choose exactly two"),
  P5: z.enum(ids(P5.options)),
  P6: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  P7: z.enum(ids(P7.options)),
  P8: z.enum(ids(P8.options)),
});

// Keep the P2 table and the schema in sync.
void P2;

/* ---------- Link parameters ---------- */

const slug = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      const s = (v ?? "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, max);
      return s || undefined;
    });

/** ?event= : lowercase slug. */
export const eventSchema = slug(60);
/** ?wave= : lowercase slug, e.g. "retest". */
export const waveSchema = slug(40);
/** ?aid= : external attendee id. Case is kept; unsafe characters become "-". */
export const aidSchema = z
  .string()
  .optional()
  .transform((v) => {
    const s = (v ?? "")
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return s || undefined;
  });

/* ---------- Meta ---------- */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Keep a client timestamp only if it is an ISO string within the last 24 hours. */
export function sanitiseTimestamp(value: unknown, now: number): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) return undefined;
  const t = Date.parse(value);
  if (!Number.isFinite(t) || t > now + 60_000 || t < now - DAY_MS) return undefined;
  return value;
}

const KNOWN_ORDER_IDS = new Set([...TRAIT_IDS, ...P2_ROW_IDS.map((r) => `P2.${r}`)]);

export const clientMetaSchema = z
  .object({
    presentedOrder: z.array(z.string()).max(60).optional(),
    startedAt: z.unknown().optional(),
    part2StartedAt: z.unknown().optional(),
    part2EndedAt: z.unknown().optional(),
  })
  .optional();

export function sanitiseMeta(meta: z.infer<typeof clientMetaSchema>, now: number) {
  return {
    presentedOrder: (meta?.presentedOrder ?? []).filter((id) => KNOWN_ORDER_IDS.has(id)),
    startedAt: sanitiseTimestamp(meta?.startedAt, now),
    part2StartedAt: sanitiseTimestamp(meta?.part2StartedAt, now),
    part2EndedAt: sanitiseTimestamp(meta?.part2EndedAt, now),
  };
}

/* ---------- Whole submission ---------- */

export const submissionSchema = z.object({
  details: detailsSchema,
  context: contextSchema,
  answers: answersSchema,
  pilotAnswers: pilotAnswersSchema,
  preferences: preferencesSchema,
  freeText: z
    .string()
    .max(FREE_TEXT.maxLength)
    .optional()
    .transform((v) => v?.trim() || undefined),
  meta: clientMetaSchema,
  event: eventSchema,
  wave: waveSchema,
  aid: aidSchema,
});

export type Submission = z.input<typeof submissionSchema>;
export type FieldErrorKey = "name" | "email" | "consent" | "industry" | "industryOther" | "role" | "eventsAttended";
export type FieldErrors = Partial<Record<FieldErrorKey, string>>;

/* ---------- CSV import ---------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** ISO date (2026-11-12) or date-time (2026-11-12T10:15:00Z), not in the future. */
export const isoDateNotFuture = (now: number) =>
  z
    .string()
    .trim()
    .refine((v) => ISO_DATE.test(v) && Number.isFinite(Date.parse(v)), "Use an ISO date, e.g. 2026-11-12 or 2026-11-12T10:15:00Z")
    .transform((v) => new Date(v))
    .refine((d) => d.getTime() <= now, "Can't be in the future");

/** Evidence of consent for imported rows. */
export const importConsentSchema = (now: number) =>
  z.object({
    consent_at: isoDateNotFuture(now),
    consent_source: z.string().trim().min(1, "Say where consent was given").max(200),
  });
