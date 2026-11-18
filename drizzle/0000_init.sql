CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"industry" text NOT NULL,
	"industry_other" text,
	"consent_at" timestamp with time zone NOT NULL,
	"questionnaire_version" text NOT NULL,
	"answers" jsonb NOT NULL,
	"scores" jsonb NOT NULL,
	"code" text NOT NULL,
	"profile" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "responses_created_at_idx" ON "responses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "responses_email_idx" ON "responses" USING btree ("email");--> statement-breakpoint
CREATE INDEX "responses_profile_idx" ON "responses" USING btree ("profile");--> statement-breakpoint
CREATE INDEX "responses_industry_idx" ON "responses" USING btree ("industry");