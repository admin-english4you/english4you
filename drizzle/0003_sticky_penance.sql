CREATE TYPE "public"."quiz_question_render_mode" AS ENUM('quiz_comprehensive', 'listening_choice');--> statement-breakpoint
CREATE TYPE "public"."quiz_question_section" AS ENUM('vocabulary', 'grammar', 'context', 'comprehension');--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"render_mode" "quiz_question_render_mode" NOT NULL,
	"section" "quiz_question_section",
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text,
	"review_status" "learning_item_review_status" DEFAULT 'APPROVED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_questions_lesson_idx" ON "quiz_questions" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "quiz_questions_lesson_mode_section_idx" ON "quiz_questions" USING btree ("lesson_id","render_mode","section");