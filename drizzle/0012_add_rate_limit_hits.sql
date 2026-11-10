CREATE TABLE "rate_limit_hits" (
	"key" varchar(300) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rate_limit_hits_expires_idx" ON "rate_limit_hits" USING btree ("expires_at");