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
CREATE INDEX "audience_reports_created_at_idx" ON "audience_reports" USING btree ("created_at");