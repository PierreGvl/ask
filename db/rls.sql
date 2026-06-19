-- =============================================================================
-- RLS (Row-Level Security) Postgres — DURCISSEMENT OPT-IN, NON activé par défaut.
-- =============================================================================
--
-- L'isolation repose aujourd'hui sur la couche applicative (projectId requis
-- dans chaque requête). La RLS ajoute une défense en profondeur en base.
--
-- ⚠️ AVANT D'ACTIVER, à comprendre absolument :
--   1. La console admin lit volontairement PLUSIEURS tenants. Avec FORCE RLS,
--      ces lectures seraient bloquées. Il faut donc soit :
--        a) connecter l'app via un rôle dédié soumis à la RLS pour les requêtes
--           tenant (passant par lib/db/tenant-tx.ts → set_config app.project_id),
--           ET un rôle BYPASSRLS distinct pour la console admin ; soit
--        b) ajouter une policy d'exception pour un rôle admin.
--   2. Toute requête tenant doit passer par `withTenant(projectId, …)` afin que
--      `app.project_id` soit positionné, sinon les policies renvoient 0 ligne.
--
-- Activation manuelle délibérée (ne PAS mettre dans les migrations Drizzle) :
--   psql "$DATABASE_URL" -f db/rls.sql
-- =============================================================================

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
CREATE POLICY documents_tenant_isolation ON documents
  USING (project_id = current_setting('app.project_id', true)::uuid);

-- chunks
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks FORCE ROW LEVEL SECURITY;
CREATE POLICY chunks_tenant_isolation ON chunks
  USING (project_id = current_setting('app.project_id', true)::uuid);

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY conversations_tenant_isolation ON conversations
  USING (project_id = current_setting('app.project_id', true)::uuid);

-- messages (isolation via la conversation parente)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
CREATE POLICY messages_tenant_isolation ON messages
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE project_id = current_setting('app.project_id', true)::uuid
    )
  );
