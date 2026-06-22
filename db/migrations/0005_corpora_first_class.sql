-- Corpus first-class : documents/chunks/data_sources passent de project_id → corpus_id.
-- Un corpus est partagé (owner_project_id NULL) ou privé d'un tenant (owner = tenant).
-- Migration en place : DDL additif → backfill (jointure par slug) → DDL final.

-- 1) Nouvelles tables.
CREATE TABLE "corpora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corpora_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_corpora" (
	"project_id" uuid NOT NULL,
	"corpus_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_corpora_project_id_corpus_id_pk" PRIMARY KEY("project_id","corpus_id")
);
--> statement-breakpoint
ALTER TABLE "corpora" ADD CONSTRAINT "corpora_owner_project_id_projects_id_fk" FOREIGN KEY ("owner_project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_corpora" ADD CONSTRAINT "project_corpora_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_corpora" ADD CONSTRAINT "project_corpora_corpus_id_corpora_id_fk" FOREIGN KEY ("corpus_id") REFERENCES "public"."corpora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 2) Colonnes corpus_id (nullable) + description.
ALTER TABLE "documents" ADD COLUMN "corpus_id" uuid;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "corpus_id" uuid;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "corpus_id" uuid;--> statement-breakpoint
ALTER TABLE "data_sources" ADD COLUMN "description" text;--> statement-breakpoint

-- 3) Un corpus par projet (slug repris du projet). Bibliothèque (projet suspended)
--    → corpus PARTAGÉ (owner NULL) ; tenant actif → corpus PRIVÉ (owner = tenant).
INSERT INTO "corpora" ("slug","name","owner_project_id")
	SELECT p."slug", p."name",
	       CASE WHEN p."status" = 'suspended' THEN NULL ELSE p."id" END
	FROM "projects" p;
--> statement-breakpoint

-- 4) Re-clé documents/chunks/data_sources vers le corpus de leur projet (via slug).
UPDATE "documents" d SET "corpus_id" = c."id"
	FROM "projects" p JOIN "corpora" c ON c."slug" = p."slug"
	WHERE p."id" = d."project_id";
--> statement-breakpoint
UPDATE "chunks" ch SET "corpus_id" = c."id"
	FROM "projects" p JOIN "corpora" c ON c."slug" = p."slug"
	WHERE p."id" = ch."project_id";
--> statement-breakpoint
UPDATE "data_sources" ds SET "corpus_id" = c."id"
	FROM "projects" p JOIN "corpora" c ON c."slug" = p."slug"
	WHERE p."id" = ds."project_id";
--> statement-breakpoint

-- 5) project_corpora : chaque tenant lit son corpus privé…
INSERT INTO "project_corpora" ("project_id","corpus_id")
	SELECT c."owner_project_id", c."id" FROM "corpora" c
	WHERE c."owner_project_id" IS NOT NULL
	ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- …et les corpus partagés auxquels il était abonné (anciens project_corpus_sources).
INSERT INTO "project_corpora" ("project_id","corpus_id")
	SELECT pcs."project_id", c."id"
	FROM "project_corpus_sources" pcs
	JOIN "projects" lib ON lib."id" = pcs."source_project_id"
	JOIN "corpora" c ON c."slug" = lib."slug"
	ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- 6) Verrouillage : corpus_id NOT NULL + FK, drop des anciennes colonnes project_id.
ALTER TABLE "documents" ALTER COLUMN "corpus_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ALTER COLUMN "corpus_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "data_sources" ALTER COLUMN "corpus_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_corpus_id_corpora_id_fk" FOREIGN KEY ("corpus_id") REFERENCES "public"."corpora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_corpus_id_corpora_id_fk" FOREIGN KEY ("corpus_id") REFERENCES "public"."corpora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_corpus_id_corpora_id_fk" FOREIGN KEY ("corpus_id") REFERENCES "public"."corpora"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "documents_project_id_projects_id_fk";--> statement-breakpoint
ALTER TABLE "chunks" DROP CONSTRAINT IF EXISTS "chunks_project_id_projects_id_fk";--> statement-breakpoint
ALTER TABLE "data_sources" DROP CONSTRAINT IF EXISTS "data_sources_project_id_projects_id_fk";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "chunks" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "data_sources" DROP COLUMN "project_id";--> statement-breakpoint
CREATE INDEX "documents_corpus_domain_idx" ON "documents" USING btree ("corpus_id","domain");--> statement-breakpoint
CREATE INDEX "chunks_corpus_domain_idx" ON "chunks" USING btree ("corpus_id","domain");--> statement-breakpoint
CREATE INDEX "data_sources_corpus_idx" ON "data_sources" USING btree ("corpus_id");--> statement-breakpoint

-- 7) Nettoyage : ancien partage + faux projets « bibliothèque » (données déjà re-clées).
DROP TABLE "project_corpus_sources";--> statement-breakpoint
DELETE FROM "projects" WHERE "status" = 'suspended';
