# Ask By la Wine Tech — Présentation technique

> Assistant conversationnel de domaine (filière vin), architecture **RAG
> agentique** sur API **Mistral**, déployé en autohébergement (souveraineté).
> Document destiné à un lecteur technique.

---

## 1. Vue d'ensemble

```
Utilisateur (web / PWA)
        │  POST /api/chat (SSE, streaming)
        ▼
Next.js (App Router, runtime Node)
        │
        ├── Auth.js (sessions JWT, argon2id)        ── comptes / historique
        │
        └── streamText (Vercel AI SDK)              ── orchestration LLM
                │  outil "search_regulation"
                ▼
        Couche RAG (lib/rag)
                │  recherche hybride
                ▼
        PostgreSQL + pgvector  ◄── pipeline d'ingestion (scripts/ingest)
                                    (EUR-Lex → chunking → embeddings → upsert)
```

Le moteur est **agnostique au domaine** : tout ce qui « fait le vin » tient
dans 4 couches d'adaptation (corpus, prompt système, branding, outils
spécifiques). Le reste (~90 % du code) est réutilisable tel quel.

---

## 2. Stack

| Domaine | Choix | Pourquoi |
|---|---|---|
| Front + back | **Next.js 16** (App Router, TS, Tailwind 4) | SSR, API routes, streaming, build Docker standalone |
| LLM | **Mistral** via **Vercel AI SDK** (`ai`, `@ai-sdk/mistral`) | souveraineté EU ; SDK qui abstrait le fournisseur (chat + embeddings + tool-calling) |
| Modèles | `mistral-large-latest` (chat), `mistral-small-latest` (titres), `mistral-embed` (embeddings, 1024 dim) | qualité / coût |
| Base | **PostgreSQL + pgvector** via **Drizzle ORM** (`postgres.js`) | une seule base : comptes, historique **et** store vectoriel |
| Auth | **Auth.js v5** Credentials + **argon2id** | email/mot de passe, souverain ; sessions JWT |
| Déploiement | **Docker** (standalone) + **Coolify** sur **VPS Hetzner** | autohébergé, HTTPS auto (Traefik) |

> Runtime **Node.js** imposé pour les routes touchant DB/auth/embeddings
> (argon2 natif + driver Postgres + pgvector incompatibles Edge).

---

## 3. Le RAG en détail

### 3.1 Ingestion (`scripts/ingest/`)

Pipeline CLI idempotent :

1. **Acquisition** — fichiers HTML/PDF (corpus actuel : EUR-Lex, récupéré via
   `scripts/fetch-corpus-eu.sh`). Descripteur optionnel `<fichier>.meta.json`
   (titre, URL, référence) pour des citations propres.
2. **Parsing** — `unpdf` (PDF) / `cheerio` (HTML, suppression nav/footer),
   nettoyage (césures, espaces).
3. **Dédup** — `contentHash` SHA-256 → un document inchangé est ignoré ; un
   document modifié est purgé + ré-indexé.
4. **Chunking** — `RecursiveCharacterTextSplitter`, séparateurs orientés
   documents juridiques (`\nArticle `, `\nChapitre `, …), ~700 tokens/chunk,
   overlap ~90.
5. **Embeddings** — `mistral-embed` par lots (retry/backoff sur 429).
6. **Upsert** — insertion transactionnelle dans `chunks` (vecteur 1024 dim).

### 3.2 Schéma (`lib/db/schema.ts`)

- `users`, `conversations`, `messages` (auth + historique ; `messages.citations`
  en JSONB).
- `documents` (source, **domain**, title, url, reference, contentHash).
- `chunks` (content, **embedding `vector(1024)`**, domain, metadata) avec :
  - index **HNSW cosine** (`vector_cosine_ops`) — ANN rapide ;
  - index **GIN full-text français** (`to_tsvector('french', content)`).

Le champ `domain` permet le multi-domaines (filtrage au retrieval) sans
changement de schéma.

### 3.3 Récupération (`lib/rag/retrieve.ts`)

Recherche **hybride** en une requête SQL :

- **Branche vectorielle** : `embedding <=> $query` (distance cosine, HNSW).
- **Branche lexicale** : `ts_rank(to_tsvector('french', …), plainto_tsquery(…))`.
- **Fusion RRF** (Reciprocal Rank Fusion, k=60) des deux classements.
- **Garde-fou** : on écarte les chunks au-delà d'un **seuil de distance**
  (`RAG_MAX_DISTANCE`, défaut 0.70). Si plus rien ne passe → tableau vide →
  l'assistant signale l'absence de source.

Réglages via env : `RAG_TOP_K` (8), `RAG_MAX_DISTANCE` (0.70), `EMBED_MODEL`.

### 3.4 Orchestration agentique (`lib/rag/tools.ts`, `app/api/chat/route.ts`)

Le retrieval est exposé comme **outil** `search_regulation` (tool-calling). Le
modèle décide quand l'appeler. Pour la **fiabilité + la latence** :

- `stopWhen: stepCountIs(2)` — 1 tour de recherche, puis réponse.
- `prepareStep` force `toolChoice: "none"` au tour final → le modèle **répond
  toujours** (évite les réponses vides où il enchaînerait des recherches).
- `temperature: 0.2` (factuel).
- Reprises (`maxRetries`) sur erreurs transitoires (429).

### 3.5 Citations

`lib/rag/context.ts` numérote les extraits `[1]…[n]` et construit la liste de
citations (dédupliquée par document). La route collecte les citations
(`onStepFinish`), les attache au message (`messageMetadata`) et les persiste
(`messages.citations`). L'UI les affiche sous la réponse, avec lien EUR-Lex.

---

## 4. Flux de chat

- **Streaming SSE** : `result.toUIMessageStreamResponse()` ↔ hook `useChat`
  (`@ai-sdk/react`).
- **Anonyme** : autorisé, **aucune persistance** (id de conversation généré
  côté client), bandeau d'incitation à se connecter.
- **Connecté** : `auth()` → persistance (conversation + messages + citations),
  génération de titre via `mistral-small`, historique en sidebar.
- **Robustesse UI** : indicateur d'attente, affichage des erreurs + bouton
  « Réessayer » (pas d'échec silencieux).

---

## 5. Fiabilité (mécanismes)

1. **Réponses ancrées** — système prompt : répondre à partir des extraits, citer
   `[n]`, ne jamais inventer d'article/règlement.
2. **Seuil anti-bruit** — pas de source pertinente → l'assistant le dit.
3. **Réponse garantie** — `prepareStep` force une conclusion textuelle.
4. **Traçabilité** — citations cliquables vers les textes officiels.

---

## 6. Sécurité

- Mots de passe **argon2id** (`@node-rs/argon2`), jamais stockés en clair.
- Sessions **JWT** signées (`AUTH_SECRET`), cookies httpOnly/secure.
- Secrets en **variables d'environnement** (jamais commités ; `.env` gitignoré).
- Validation des entrées via **zod** (env, payloads API, formulaires).
- DB exposée **uniquement** temporairement pour les migrations/ingestion, sinon
  réseau interne Docker.

---

## 7. Déploiement & exploitation

- **Dockerfile** multi-stage (`node:22-slim`, sortie Next standalone) →
  image minimale ; `HOSTNAME=0.0.0.0` pour le reverse-proxy.
- **Coolify** : build depuis GitHub (déploiement auto au push), HTTPS via
  Traefik, base PostgreSQL **PGVector** managée.
- **VPS** : **swap** ajouté (le build Next est gourmand en RAM).
- **Migrations** : `drizzle-kit` (extensions `vector`/`pg_trgm` + schéma).

> Détails opérationnels : `DEPLOY.md`.

---

## 8. Performance & limites connues

- **Latence** dominée par `mistral-large` ; mitigée par 1 seul tour de recherche
  + streaming (l'utilisateur voit la réponse s'écrire).
- **Rate limit Mistral** : le RAG agentique fait plusieurs appels par question →
  nécessite un palier API adapté (le plan « Scale » suffit largement).
- Versions de règlements **de base** (non consolidées) pour l'instant → cible :
  versions consolidées + ré-ingestion programmée.

---

## 9. Scalabilité & multi-domaines

- **Moteur unique, instances spécialisées** : un même code, **un déploiement par
  domaine/entité** (corpus, prompt, branding, outils propres ; bases isolées).
- **Fournisseur LLM au choix par déploiement** : le SDK abstrait le modèle → une
  verticale non-souveraine pourrait utiliser un autre fournisseur (ex. Claude)
  pour le **chat**. Les **embeddings** restent une couche indépendante (Mistral,
  Voyage…), cohérente par corpus (dimension = colonne `vector(N)`).
- **Outils spécifiques par domaine** : architecture agentique modulaire (ajout
  d'un outil dans `lib/rag/tools.ts` sans toucher au cœur).

---

## 10. Roadmap technique

- **Mise à jour automatique du corpus** (cron : re-fetch consolidé + ré-index).
- **Auto-migrations** au déploiement (plus d'exposition manuelle de la base).
- **API Légifrance (PISTE)** pour le droit national auto-actualisé.
- **Feedback 👍/👎** (table dédiée) → pilotage de l'enrichissement.
- **Facturation** (Stripe, paliers, quotas) — cf. `MODELE-ECONOMIQUE.md`.
- **Reranking** optionnel, recherche par domaine, tests de non-régression RAG.

> Backlog complet : `ROADMAP.md`.

---

## Arborescence (repères)

```
app/            UI (App Router) + routes API (/api/chat, /api/register…)
components/     chat, sidebar, auth, ui
lib/llm/        provider Mistral, prompts, titres
lib/rag/        retrieve (hybride RRF), context (citations), tools (agentique)
lib/db/         schéma Drizzle + requêtes
lib/auth/       argon2, validation
scripts/ingest/ pipeline d'ingestion
```
