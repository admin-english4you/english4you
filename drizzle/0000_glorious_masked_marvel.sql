CREATE TYPE "public"."class_status" AS ENUM('ACTIVE', 'INACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('IN_PROGRESS', 'ACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'TEACHER', 'STUDENT');--> statement-breakpoint
CREATE TABLE "class_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"level" varchar(50) NOT NULL,
	"schedule" jsonb NOT NULL,
	"max_students" integer DEFAULT 12 NOT NULL,
	"teacher_id" uuid,
	"plan_id" uuid,
	"status" "class_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_group_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"teacher_id" uuid,
	"date" timestamp NOT NULL,
	"stream_video_url" varchar(500),
	"board_content" text,
	"completed" boolean DEFAULT false NOT NULL,
	"attendance" uuid[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"level" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"audio_url" varchar(500),
	"video_url" varchar(500),
	"status" "lesson_status" DEFAULT 'DISABLED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_lessons" (
	"plan_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "plan_lessons_plan_id_lesson_id_pk" PRIMARY KEY("plan_id","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" "plan_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'STUDENT' NOT NULL,
	"phone" varchar(50),
	"avatar_url" varchar(500),
	"status" varchar(50) DEFAULT 'Active' NOT NULL,
	"class_group_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_groups" ADD CONSTRAINT "class_groups_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_records" ADD CONSTRAINT "class_records_class_group_id_class_groups_id_fk" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_records" ADD CONSTRAINT "class_records_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_records" ADD CONSTRAINT "class_records_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_lessons" ADD CONSTRAINT "plan_lessons_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_lessons" ADD CONSTRAINT "plan_lessons_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "class_groups_teacher_idx" ON "class_groups" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "class_groups_plan_idx" ON "class_groups" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "class_groups_status_idx" ON "class_groups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "class_records_class_group_idx" ON "class_records" USING btree ("class_group_id");--> statement-breakpoint
CREATE INDEX "class_records_date_idx" ON "class_records" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "class_records_group_lesson_uq" ON "class_records" USING btree ("class_group_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lessons_status_idx" ON "lessons" USING btree ("status");--> statement-breakpoint
CREATE INDEX "plan_lessons_plan_order_idx" ON "plan_lessons" USING btree ("plan_id","order");--> statement-breakpoint
CREATE INDEX "plans_status_idx" ON "plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_class_group_id_idx" ON "users" USING btree ("class_group_id");