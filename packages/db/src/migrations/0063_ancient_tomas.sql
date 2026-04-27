DROP INDEX "issues_open_routine_execution_uq";--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "origin_fingerprint" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_runs" ADD COLUMN "dispatch_fingerprint" text;--> statement-breakpoint
CREATE INDEX "routine_runs_dispatch_fingerprint_idx" ON "routine_runs" USING btree ("routine_id","dispatch_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_open_routine_execution_uq" ON "issues" USING btree ("company_id","origin_kind","origin_id","origin_fingerprint") WHERE "issues"."origin_kind" = 'routine_execution'
          and "issues"."origin_id" is not null
          and "issues"."hidden_at" is null
          and "issues"."execution_run_id" is not null
          and "issues"."status" in ('backlog', 'todo', 'in_progress', 'in_review', 'blocked');