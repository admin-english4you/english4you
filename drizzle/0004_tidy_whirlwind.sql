CREATE TABLE "practice_day_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"day_index" integer NOT NULL,
	"render_mode" varchar(32) NOT NULL,
	"xp_earned" integer DEFAULT 0 NOT NULL,
	"redo_count" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"last_played_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_day_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"day_index" integer NOT NULL,
	"xp_spent" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "practice_day_completions" ADD CONSTRAINT "practice_day_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_day_completions" ADD CONSTRAINT "practice_day_completions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_day_unlocks" ADD CONSTRAINT "practice_day_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_day_unlocks" ADD CONSTRAINT "practice_day_unlocks_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "practice_day_completions_uq" ON "practice_day_completions" USING btree ("user_id","lesson_id","day_index");--> statement-breakpoint
CREATE INDEX "practice_day_completions_user_idx" ON "practice_day_completions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "practice_day_completions_user_date_idx" ON "practice_day_completions" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_day_unlocks_uq" ON "practice_day_unlocks" USING btree ("user_id","lesson_id","day_index");--> statement-breakpoint
CREATE INDEX "practice_day_unlocks_user_idx" ON "practice_day_unlocks" USING btree ("user_id");