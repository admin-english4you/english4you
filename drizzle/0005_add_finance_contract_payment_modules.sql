CREATE TYPE "public"."financial_entry_category" AS ENUM('TUITION', 'ENROLLMENT', 'MATERIAL', 'OTHER_INCOME', 'TEACHER_PAYOUT', 'RENT', 'SOFTWARE', 'MARKETING', 'TAX', 'OTHER_EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."financial_entry_type" AS ENUM('INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('PENDING_SIGNATURE', 'ACTIVE', 'CANCELED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."contract_target_role" AS ENUM('STUDENT', 'TEACHER');--> statement-breakpoint
CREATE TYPE "public"."subscription_cancel_reason" AS ENUM('CONTRACT_CANCELED', 'PACKAGE_CHANGED', 'CARD_REPLACED', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('PENDING', 'AUTHORIZED', 'PAYMENT_FAILED', 'PAUSED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"link" varchar(500),
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "processed_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "financial_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "financial_entry_type" NOT NULL,
	"category" "financial_entry_category" NOT NULL,
	"description" varchar(255) NOT NULL,
	"counterparty" varchar(255),
	"amount_cents" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"method" varchar(60),
	"notes" text,
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"duration_in_months" integer NOT NULL,
	"classes_per_week" integer NOT NULL,
	"installment_value_cents" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"target_role" "contract_target_role" NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" uuid,
	"status" "contract_status" DEFAULT 'PENDING_SIGNATURE' NOT NULL,
	"content_snapshot" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"signed_at" timestamp,
	"signed_name" varchar(255),
	"signed_by_ip" varchar(45),
	"document_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"mp_authorized_payment_id" varchar(64) NOT NULL,
	"mp_payment_id" varchar(64),
	"amount_cents" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"status_detail" varchar(100),
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"retry_attempt" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "student_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"mp_preapproval_id" varchar(64),
	"status" "subscription_status" DEFAULT 'PENDING' NOT NULL,
	"amount_cents" integer NOT NULL,
	"frequency_months" integer DEFAULT 1 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"next_payment_date" timestamp,
	"payment_method_id" varchar(50),
	"card_last_four" varchar(4),
	"init_point" varchar(500),
	"replaces_subscription_id" uuid,
	"canceled_at" timestamp,
	"cancel_reason" "subscription_cancel_reason",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "document" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_street" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_number" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_complement" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_district" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_city" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_state" varchar(2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address_zip_code" varchar(9);--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_student_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."student_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_subscriptions" ADD CONSTRAINT "student_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_subscriptions" ADD CONSTRAINT "student_subscriptions_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_subscriptions" ADD CONSTRAINT "student_subscriptions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_subscriptions" ADD CONSTRAINT "student_subscriptions_replaces_subscription_id_student_subscriptions_id_fk" FOREIGN KEY ("replaces_subscription_id") REFERENCES "public"."student_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "processed_webhook_events_provider_event_uq" ON "processed_webhook_events" USING btree ("provider","event_id");--> statement-breakpoint
CREATE INDEX "financial_entries_due_date_idx" ON "financial_entries" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "financial_entries_paid_at_idx" ON "financial_entries" USING btree ("paid_at");--> statement-breakpoint
CREATE INDEX "financial_entries_type_idx" ON "financial_entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "packages_is_active_idx" ON "packages" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "contract_templates_target_role_idx" ON "contract_templates" USING btree ("target_role");--> statement-breakpoint
CREATE UNIQUE INDEX "contract_templates_active_target_uq" ON "contract_templates" USING btree ("target_role") WHERE "contract_templates"."is_active";--> statement-breakpoint
CREATE INDEX "contracts_user_id_idx" ON "contracts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_subscription_id_idx" ON "payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_mp_authorized_payment_uq" ON "payments" USING btree ("mp_authorized_payment_id");--> statement-breakpoint
CREATE INDEX "student_subscriptions_user_id_idx" ON "student_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_subscriptions_status_idx" ON "student_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "student_subscriptions_contract_id_idx" ON "student_subscriptions" USING btree ("contract_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_subscriptions_mp_preapproval_uq" ON "student_subscriptions" USING btree ("mp_preapproval_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_uq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "class_records" DROP COLUMN "stream_video_url";--> statement-breakpoint
ALTER TABLE "class_records" ADD COLUMN "recording_urls" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "class_records" ADD COLUMN "call_started_at" timestamp;
