ALTER TABLE "meetings" ADD COLUMN "scheduled_at" timestamp;
--> statement-breakpoint
-- Backfill: scheduled meetings that had a startedAt (legacy) become scheduledAt.
UPDATE "meetings"
SET "scheduled_at" = "started_at",
    "started_at" = NULL
WHERE "status" = 'scheduled'
  AND "started_at" IS NOT NULL;