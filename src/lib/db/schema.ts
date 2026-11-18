import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Answers, PoleScores } from "../scoring";

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    industry: text("industry").notNull(),
    /** Free text when industry = "Other". */
    industryOther: text("industry_other"),
    /** Optional event tag from the questionnaire link, e.g. ?event=summit-2027. */
    event: text("event"),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    questionnaireVersion: text("questionnaire_version").notNull(),
    /** Raw answers keyed by statement id (ids depend on questionnaire_version), each 1–6. */
    answers: jsonb("answers").$type<Answers>().notNull(),
    /** Points per pole, as computed at submission time. */
    scores: jsonb("scores").$type<PoleScores>().notNull(),
    code: text("code").notNull(),
    profile: text("profile").notNull(),
  },
  (t) => [
    index("responses_created_at_idx").on(t.createdAt),
    index("responses_email_idx").on(t.email),
    index("responses_profile_idx").on(t.profile),
    index("responses_industry_idx").on(t.industry),
    index("responses_event_idx").on(t.event),
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
