-- AudienceDNA v3: replace the v1/v2 tables with the v3 schema.
-- WARNING: this permanently deletes all existing responses and audience reports
-- (agreed: the earlier models are not compatible with v3). Export first if you
-- want a copy.
DROP TABLE IF EXISTS "audience_reports";--> statement-breakpoint
DROP TABLE IF EXISTS "responses";--> statement-breakpoint
CREATE TABLE "audience_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"response_ids" jsonb NOT NULL,
	"share_token" text NOT NULL,
	CONSTRAINT "audience_reports_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"industry" text NOT NULL,
	"industry_other" text,
	"event" text,
	"wave" text,
	"attendee_ref" text,
	"consent_at" timestamp with time zone NOT NULL,
	"questionnaire_version" text NOT NULL,
	"norms_version" text NOT NULL,
	"context" jsonb NOT NULL,
	"answers" jsonb NOT NULL,
	"preferences" jsonb NOT NULL,
	"scale_scores" jsonb NOT NULL,
	"axes" jsonb NOT NULL,
	"style" text NOT NULL,
	"style_neighbour" text,
	"badges" jsonb NOT NULL,
	"quality_flags" jsonb NOT NULL,
	"free_text" text,
	"meta" jsonb NOT NULL,
	"pilot_answers" jsonb
);
--> statement-breakpoint
CREATE INDEX "audience_reports_created_at_idx" ON "audience_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "responses_created_at_idx" ON "responses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "responses_email_idx" ON "responses" USING btree ("email");--> statement-breakpoint
CREATE INDEX "responses_industry_idx" ON "responses" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "responses_event_idx" ON "responses" USING btree ("event");--> statement-breakpoint
CREATE INDEX "responses_style_idx" ON "responses" USING btree ("style");--> statement-breakpoint
CREATE INDEX "responses_attendee_ref_idx" ON "responses" USING btree ("attendee_ref");--> statement-breakpoint
CREATE INDEX "responses_wave_idx" ON "responses" USING btree ("wave");