# Ask By la Wine Tech

> Une IA Souveraine pour répondre à toutes les questions des vignerons.

Chatbot IA pour la filière vin, fondé sur l'**API Mistral** (souveraineté
européenne) avec une architecture **RAG agentique** : les réponses
(réglementation, appellations, œnologie…) sont ancrées sur des documents
sources et citées. Conçu pour évoluer en continu (ajout de domaines et de
documents sans refonte).

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS 4
- **Mistral** via le Vercel AI SDK (`mistral-large` chat, `mistral-embed` 1024d)
- **PostgreSQL + pgvector** (comptes, historique, store vectoriel) via **Drizzle ORM**
- **Auth.js v5** (email/mot de passe, argon2id, sessions JWT)

## Démarrage local

### 1. Prérequis

- Node.js 20+
- Un PostgreSQL avec l'extension `pgvector`. Le plus simple :
  ```bash
  docker compose up -d db
  ```
  (image `pgvector/pgvector:pg16`, exposée sur `localhost:5432`)

### 2. Configuration

```bash
cp .env.example .env
# Renseigner au minimum MISTRAL_API_KEY et AUTH_SECRET
#   AUTH_SECRET : openssl rand -base64 32
```

### 3. Base de données

```bash
npm install
npm run db:migrate     # installe les extensions + applique les migrations
```

### 4. Lancer

```bash
npm run dev            # http://localhost:3000
```

L'app est utilisable immédiatement en mode invité (chat anonyme, sans
historique). Créez un compte pour conserver vos conversations.

## RAG — ingestion de documents

Déposez vos documents dans `corpus/` puis :

```bash
npm run ingest -- --path ./corpus --source upload --domain reglementaire
```

Voir [`corpus/README.md`](corpus/README.md) pour le détail et les sources
réglementaires suggérées (Légifrance, INAO, EUR-Lex).

Tant qu'aucun document n'est ingéré, l'assistant signale l'absence de source
fiable sur les questions factuelles plutôt que d'inventer.

## Scripts utiles

| Script | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` / `start` | build et lancement production |
| `npm run db:generate` | génère une migration depuis le schéma |
| `npm run db:migrate` | applique extensions + migrations |
| `npm run db:studio` | explorateur Drizzle |
| `npm run ingest` | pipeline d'ingestion RAG |
| `npm run llm:smoke` | smoke test Mistral (chat + embedding) |

## Architecture

```
app/            UI (App Router) + routes API (/api/chat, /api/register, …)
components/     UI chat, sidebar, auth
lib/llm/        provider Mistral, prompts, titres
lib/rag/        retrieval hybride (vectoriel + full-text FR), contexte, outils
lib/db/         schéma Drizzle + requêtes
lib/auth/       hash argon2, validation
scripts/ingest/ pipeline d'ingestion
```

Voir [`DEPLOY.md`](DEPLOY.md) pour la mise en production (VPS + Coolify).
