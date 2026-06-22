-- Comptes utilisateurs cloisonnés par tenant (marque blanche).
-- users : identité globale (email unique) → identité par tenant (project_id, email).
-- Admins console séparés dans platform_admins. Suppression de project_users.
-- Migration en place : additif → backfill → verrouillage (style 0001).

-- 1) Admins console (identité globale séparée des tenants).
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
-- 2) Copie des admins plateforme existants (même id + hash → mot de passe conservé).
INSERT INTO "platform_admins" ("id","email","password_hash","name","created_at")
	SELECT "id","email","password_hash","name","created_at" FROM "users"
	WHERE "is_platform_admin" = true
	ON CONFLICT ("email") DO NOTHING;
--> statement-breakpoint
-- 3) users : nouvelles colonnes (nullable d'abord pour ne pas casser les lignes existantes).
ALTER TABLE "users" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'member';--> statement-breakpoint
-- 4) Backfill du rôle depuis project_users (membership existante), si présente.
UPDATE "users" u SET "role" = pu."role"
	FROM "project_users" pu WHERE pu."user_id" = u."id";
--> statement-breakpoint
-- 5) Backfill project_id : priorité à project_users, sinon projet le plus utilisé
--    dans les conversations de l'utilisateur. (Prod ≈ mono-tenant par compte :
--    pas de fan-out multi-projet nécessaire.)
UPDATE "users" u SET "project_id" = pu."project_id"
	FROM "project_users" pu WHERE pu."user_id" = u."id" AND u."project_id" IS NULL;
--> statement-breakpoint
UPDATE "users" u SET "project_id" = (
		SELECT c."project_id" FROM "conversations" c
		WHERE c."user_id" = u."id"
		GROUP BY c."project_id"
		ORDER BY count(*) DESC, c."project_id"
		LIMIT 1
	)
	WHERE u."project_id" IS NULL;
--> statement-breakpoint
-- 6) Lignes « fantômes » : un admin sans aucune trace tenant garde son identité
--    platform_admins mais pas de compte tenant. (invitedBy FK = set null → sûr.)
DELETE FROM "users" u
	WHERE u."is_platform_admin" = true AND u."project_id" IS NULL;
--> statement-breakpoint
-- 7) Backfill résiduel : tout compte restant sans projet → tenant par défaut (winetech).
UPDATE "users" SET "project_id" = '00000000-0000-0000-0000-000000000001'
	WHERE "project_id" IS NULL;
--> statement-breakpoint
UPDATE "users" SET "role" = 'member' WHERE "role" IS NULL;
--> statement-breakpoint
-- 8) Verrouillage : NOT NULL + FK.
ALTER TABLE "users" ALTER COLUMN "project_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_project_id_projects_id_fk"
	FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
	ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- 9) Unicité : email global → (project_id, email).
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_project_email_unique" ON "users" USING btree ("project_id","email");--> statement-breakpoint
CREATE INDEX "users_project_idx" ON "users" USING btree ("project_id");--> statement-breakpoint
-- 10) Nettoyage : colonne admin + table d'appartenance devenues inutiles (en dernier).
ALTER TABLE "users" DROP COLUMN "is_platform_admin";--> statement-breakpoint
DROP TABLE "project_users" CASCADE;
