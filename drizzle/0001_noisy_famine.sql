CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"rating" integer,
	"page_url" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_userId_idx" ON "feedback" USING btree ("user_id");