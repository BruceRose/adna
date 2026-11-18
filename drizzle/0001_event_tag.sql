ALTER TABLE "responses" ADD COLUMN "event" text;--> statement-breakpoint
CREATE INDEX "responses_event_idx" ON "responses" USING btree ("event");