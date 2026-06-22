CREATE TABLE "project_corpus_sources" (
	"project_id" uuid NOT NULL,
	"source_project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_corpus_sources_project_id_source_project_id_pk" PRIMARY KEY("project_id","source_project_id")
);
--> statement-breakpoint
ALTER TABLE "project_corpus_sources" ADD CONSTRAINT "project_corpus_sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_corpus_sources" ADD CONSTRAINT "project_corpus_sources_source_project_id_projects_id_fk" FOREIGN KEY ("source_project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;