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
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    questionnaireVersion: text("questionnaire_version").notNull(),
    /** Raw answers keyed by statement id (q1..q16), each 1–6. */
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
  ],
);

export type ResponseRow = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;
