-- Assets binaires par projet (logo, etc.) stockés en base.
-- Un seul asset par (projet, kind) → index unique. Additif (rien de supprimé).

CREATE TABLE "project_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text DEFAULT 'logo' NOT NULL,
	"mime" text NOT NULL,
	"bytes" bytea NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_assets" ADD CONSTRAINT "project_assets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_assets_project_kind_unique" ON "project_assets" USING btree ("project_id","kind");
