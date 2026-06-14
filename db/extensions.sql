-- Extensions requises avant toute migration de schéma.
-- pgvector : stockage et recherche ANN des embeddings.
-- pg_trgm  : recherche trigramme (complément lexical éventuel).
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
