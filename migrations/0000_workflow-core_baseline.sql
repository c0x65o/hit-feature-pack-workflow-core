-- hit:schema-only
-- Auto-generated from pack schema; app Drizzle migrations handle tables.

CREATE TYPE "public"."principal_type" AS ENUM('user', 'group', 'role', 'location', 'division', 'department');--> statement-breakpoint
CREATE TABLE "workflow_acls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"principal_type" "principal_type" NOT NULL,
	"principal_id" varchar(255) NOT NULL,
	"permissions" jsonb NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_acls_workflow_principal_unique" UNIQUE("workflow_id","principal_type","principal_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"t_ms" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"level" varchar(16) DEFAULT 'info' NOT NULL,
	"node_id" varchar(255),
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_run_events_run_seq_unique" UNIQUE("run_id","seq")
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"workflow_version_id" uuid NOT NULL,
	"status" varchar(32) DEFAULT 'queued' NOT NULL,
	"trigger" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" jsonb,
	"correlation_id" varchar(255),
	"idempotency_key" varchar(255),
	"created_by_user_id" varchar(255),
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"node_id" varchar(255) NOT NULL,
	"type" varchar(32) DEFAULT 'approval' NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"assigned_to" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prompt" jsonb,
	"decision" jsonb,
	"created_by_user_id" varchar(255),
	"decided_by_user_id" varchar(255),
	"decided_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_versions_workflow_version_unique" UNIQUE("workflow_id","version")
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"owner_user_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workflows_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "workflow_acls" ADD CONSTRAINT "workflow_acls_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run_events" ADD CONSTRAINT "workflow_run_events_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_version_id_workflow_versions_id_fk" FOREIGN KEY ("workflow_version_id") REFERENCES "public"."workflow_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_run_id_workflow_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_acls_workflow_idx" ON "workflow_acls" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_acls_principal_idx" ON "workflow_acls" USING btree ("principal_type","principal_id");--> statement-breakpoint
CREATE INDEX "workflow_run_events_run_id_idx" ON "workflow_run_events" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "workflow_run_events_run_time_idx" ON "workflow_run_events" USING btree ("run_id","t_ms");--> statement-breakpoint
CREATE INDEX "workflow_runs_workflow_id_idx" ON "workflow_runs" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_runs_workflow_status_idx" ON "workflow_runs" USING btree ("workflow_id","status");--> statement-breakpoint
CREATE INDEX "workflow_runs_created_at_idx" ON "workflow_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "workflow_runs_correlation_id_idx" ON "workflow_runs" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "workflow_runs_idempotency_key_idx" ON "workflow_runs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "workflow_tasks_run_id_idx" ON "workflow_tasks" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "workflow_tasks_status_idx" ON "workflow_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_tasks_run_status_idx" ON "workflow_tasks" USING btree ("run_id","status");--> statement-breakpoint
CREATE INDEX "workflow_versions_workflow_id_idx" ON "workflow_versions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_versions_workflow_status_idx" ON "workflow_versions" USING btree ("workflow_id","status");--> statement-breakpoint
CREATE INDEX "workflows_slug_idx" ON "workflows" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workflows_owner_user_id_idx" ON "workflows" USING btree ("owner_user_id");