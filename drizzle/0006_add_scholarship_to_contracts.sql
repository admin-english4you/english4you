CREATE TYPE "public"."contract_billing_mode" AS ENUM('MERCADO_PAGO', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."contract_template_kind" AS ENUM('STANDARD', 'SCHOLARSHIP');--> statement-breakpoint
DROP INDEX "contract_templates_active_target_uq";--> statement-breakpoint
ALTER TABLE "contract_templates" ADD COLUMN "kind" "contract_template_kind" DEFAULT 'STANDARD' NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "scholarship_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "billing_mode" "contract_billing_mode" DEFAULT 'MERCADO_PAGO' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_templates_active_target_uq" ON "contract_templates" USING btree ("target_role","kind") WHERE "contract_templates"."is_active";--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_scholarship_percent_range" CHECK ("contracts"."scholarship_percent" between 0 and 100);--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_full_scholarship_is_manual" CHECK ("contracts"."scholarship_percent" < 100 or "contracts"."billing_mode" = 'MANUAL');