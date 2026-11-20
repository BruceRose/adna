import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { EventsAttendedId, Preferences, RoleId, ScaleId } from "../v3/items";
import type { AxisResult, QualityFlag, TraitAnswers } from "../v3/scoring";
import type { AxisId, MotivationId, PlanningBadge, StyleId } from "../v3/styles";

export interface ResponseContext {
  role: RoleId;
  eventsAttended: EventsAttendedId;
}

export interface ResponseMeta {
  /** Part 2 item ids in the order shown, then P2 rows as "P2.<row>". */
  presentedOrder: string[];
  startedAt?: string;
  part2StartedAt?: string;
  part2EndedAt?: string;
  submittedAt: string;
  userAgentClass: "mobile" | "desktop" | "unknown";
  preferencesEditedAt?: string;
  /** Number of times preferences have been edited (rate-limited). */
  preferencesEditCount?: number;
}

/** v3 responses (QUESTIONNAIRE_VERSION "3"). */
export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** C1. */
    industry: text("industry").notNull(),
    /** Free text when industry = "Other". */
    industryOther: text("industry_other"),
    /** Optional event tag from the questionnaire link, e.g. ?event=summit-2027. */
    event: text("event"),
    /** From ?wave=, e.g. "retest". */
    wave: text("wave"),
    /** From ?aid=: an external attendee id for linking behavioural data. */
    attendeeRef: text("attendee_ref"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    questionnaireVersion: text("questionnaire_version").notNull(),
    normsVersion: text("norms_version").notNull(),
    /** C2 and C3. */
    context: jsonb("context").$type<ResponseContext>().notNull(),
    /** The 22 Part 2 trait answers, keyed by item id, each 1-5. */
    answers: jsonb("answers").$type<TraitAnswers>().notNull(),
    /** P1-P8. */
    preferences: jsonb("preferences").$type<Preferences>().notNull(),
    /** Scale means on 1-5, 2 dp. */
    scaleScores: jsonb("scale_scores").$type<Record<ScaleId, number>>().notNull(),
    axes: jsonb("axes").$type<Record<AxisId, AxisResult>>().notNull(),
    style: text("style").$type<StyleId>().notNull(),
    styleNeighbour: text("style_neighbour").$type<StyleId>(),
    badges: jsonb("badges").$type<{ planning: PlanningBadge | null; motivation: MotivationId[] }>().notNull(),
    qualityFlags: jsonb("quality_flags").$type<QualityFlag[]>().notNull(),
    freeText: text("free_text"),
    meta: jsonb("meta").$type<ResponseMeta>().notNull(),
    /** Mini-IPIP marker answers when the link had ?pilot=1. */
    pilotAnswers: jsonb("pilot_answers").$type<Record<string, number>>(),
    /** "web" or "import". */
    source: text("source").$type<"web" | "import">().notNull().default("web"),
    importBatchId: uuid("import_batch_id"),
    /** Imports only: where consent was given, e.g. "Paper form, Leadership Summit 2026". */
    consentSource: text("consent_source"),
    /** Web: CONSENT_VERSION at submission. Imports: "import". */
    consentVersion: text("consent_version"),
    /** Set when the retention job deleted this response's personal details. */
    anonymisedAt: timestamp("anonymised_at", { withTimezone: true }),
  },
  (t) => [
    index("responses_created_at_idx").on(t.createdAt),
    index("responses_email_idx").on(t.email),
    index("responses_industry_idx").on(t.industry),
    index("responses_event_idx").on(t.event),
    index("responses_style_idx").on(t.style),
    index("responses_attendee_ref_idx").on(t.attendeeRef),
    index("responses_wave_idx").on(t.wave),
    index("responses_import_batch_id_idx").on(t.importBatchId),
  ],
);

export type ResponseRow = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;

/** A saved selection of responses, viewed as one audience. */
export const audienceReports = pgTable(
  "audience_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    name: text("name").notNull(),
    /** Optional context shown on the report, e.g. "Leadership offsite, March 2027". */
    note: text("note"),
    /** The responses in this audience. Deleted responses simply drop out. */
    responseIds: jsonb("response_ids").$type<string[]>().notNull(),
    /** Secret for the read-only client link (/r/<token>). */
    shareToken: text("share_token").notNull().unique(),
  },
  (t) => [index("audience_reports_created_at_idx").on(t.createdAt)],
);

export type AudienceReportRow = typeof audienceReports.$inferSelect;

/** One CSV import (admin > Import). */
export const importBatches = pgTable("import_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  fileName: text("file_name").notNull(),
  rowsRead: integer("rows_read").notNull(),
  importedCount: integer("imported_count").notNull(),
  errorCount: integer("error_count").notNull(),
  duplicateCount: integer("duplicate_count").notNull(),
  defaultEvent: text("default_event"),
  defaultConsentSource: text("default_consent_source"),
  /** Rows not imported: up to 5,000 entries of { row, reason }. */
  skipped: jsonb("skipped").$type<{ row: number; reason: string }[]>().notNull(),
});

export type ImportBatchRow = typeof importBatches.$inferSelect;
