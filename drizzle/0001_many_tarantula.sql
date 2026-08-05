CREATE TYPE "public"."learning_item_review_status" AS ENUM('PENDING', 'APPROVED');--> statement-breakpoint
CREATE TYPE "public"."learning_item_type" AS ENUM('VOCABULARY', 'STRUCTURE');--> statement-breakpoint
CREATE TABLE "learning_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"type" "learning_item_type" NOT NULL,
	"lemma" varchar(255) NOT NULL,
	"metadata" jsonb NOT NULL,
	"review_status" "learning_item_review_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "transcript" text;--> statement-breakpoint
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_items_lesson_idx" ON "learning_items" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "learning_items_lesson_status_idx" ON "learning_items" USING btree ("lesson_id","review_status");