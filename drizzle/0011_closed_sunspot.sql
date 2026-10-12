CREATE TYPE "public"."listening_clip_source" AS ENUM('AI', 'UPLOAD');--> statement-breakpoint
CREATE TABLE "listening_clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"source" "listening_clip_source" NOT NULL,
	"audio_url" varchar(500) NOT NULL,
	"transcript" text NOT NULL,
	"target_seconds" integer,
	"question_count" integer DEFAULT 1 NOT NULL,
	"voice" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "clip_id" uuid;--> statement-breakpoint
ALTER TABLE "listening_clips" ADD CONSTRAINT "listening_clips_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listening_clips_lesson_idx" ON "listening_clips" USING btree ("lesson_id");--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_clip_id_listening_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."listening_clips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_questions_clip_idx" ON "quiz_questions" USING btree ("clip_id");