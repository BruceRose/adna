CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"file_name" text NOT NULL,
	"rows_read" integer NOT NULL,
	"imported_count" integer NOT NULL,
	"error_count" integer NOT NULL,
	"duplicate_count" integer NOT NULL,
	"default_event" text,
	"default_consent_source" text,
	"skipped" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "source" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "consent_source" text;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "consent_version" text;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "anonymised_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "responses_import_batch_id_idx" ON "responses" USING btree ("import_batch_id");