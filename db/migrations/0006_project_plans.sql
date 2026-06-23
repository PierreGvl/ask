-- Attributs projet (numéro, type, mode de livraison, modèle de facturation)
-- + paliers d'offre (project_plans, remplacent le tier) + palier par utilisateur.
-- Additif : la colonne projects.tier reste (dormante).

-- 1) Colonnes projet.
ALTER TABLE "projects" ADD COLUMN "number" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "type" text DEFAULT 'b2c' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "delivery_mode" text DEFAULT 'hosted' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "billing_model" text DEFAULT 'end_user' NOT NULL;--> statement-breakpoint

-- 2) Numéro par ordre de création (winetech = 1).
UPDATE "projects" p SET "number" = ord.n
	FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS n FROM "projects") ord
	WHERE ord.id = p.id;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_number_unique" UNIQUE("number");--> statement-breakpoint

-- 3) type dérivé de l'accès existant ; billing_model dérivé du type.
UPDATE "projects" SET "type" = CASE WHEN "access_mode" = 'private' THEN 'b2b' ELSE 'b2c' END;
--> statement-breakpoint
UPDATE "projects" SET "billing_model" = CASE WHEN "type" = 'b2b' THEN 'company' ELSE 'end_user' END;
--> statement-breakpoint

-- 4) Paliers d'offre.
CREATE TABLE "project_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"description" text,
	"features" jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_plans" ADD CONSTRAINT "project_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_plans_project_idx" ON "project_plans" USING btree ("project_id");--> statement-breakpoint

-- 5) Palier par utilisateur.
ALTER TABLE "users" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_plan_id_project_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."project_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- 6) Un palier défaut « Gratuit » par projet, features = ancien tier (+ override éventuel).
INSERT INTO "project_plans" ("project_id","name","price_cents","features","is_default","sort_order")
	SELECT p."id", 'Gratuit', 0,
		(CASE p."tier"
			WHEN 'domaine' THEN '{"customRag":true,"webSearch":true,"pdfGeneration":true,"widget":true}'::jsonb
			WHEN 'pro'     THEN '{"customRag":true,"webSearch":true,"pdfGeneration":false,"widget":true}'::jsonb
			ELSE                '{"customRag":false,"webSearch":true,"pdfGeneration":false,"widget":false}'::jsonb
		END) || COALESCE(p."features", '{}'::jsonb),
		true, 0
	FROM "projects" p;
--> statement-breakpoint

-- 7) Rattacher les utilisateurs existants au palier défaut de leur projet.
UPDATE "users" u SET "plan_id" = pp."id"
	FROM "project_plans" pp
	WHERE pp."project_id" = u."project_id" AND pp."is_default" = true;
