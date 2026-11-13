ALTER TABLE "meetings" ADD COLUMN "summary_email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "summary_emails_enabled" boolean DEFAULT true NOT NULL;