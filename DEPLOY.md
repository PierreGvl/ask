# Déploiement — VPS + Coolify

L'application se déploie en Docker. Le `Dockerfile` produit une image Next.js
**standalone** minimale ; `docker-compose.yml` fournit le service PostgreSQL
(`pgvector`).

## 1. Base de données

Dans Coolify, créez un service **PostgreSQL avec pgvector** (image
`pgvector/pgvector:pg16`). Notez l'URL de connexion interne.

> Alternative : utiliser le service `db` de `docker-compose.yml`.

## 2. Application

Créez une ressource **Dockerfile** (ou Docker Compose) pointant sur ce dépôt.
Coolify build l'image et gère le reverse-proxy + HTTPS (Traefik).

### Variables d'environnement (UI Coolify)

| Variable | Exemple / note |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@db:5432/askwinetech` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://ask.votre-domaine.fr` |
| `MISTRAL_API_KEY` | clé La Plateforme Mistral |
| `CHAT_MODEL` | `mistral-large-latest` |
| `TITLE_MODEL` | `mistral-small-latest` |
| `EMBED_MODEL` | `mistral-embed` |
| `RAG_MAX_DISTANCE` | `0.70` |
| `RAG_TOP_K` | `8` |

## 3. Migrations

Les migrations installent l'extension `vector` puis créent le schéma. Elles
doivent être jouées **une fois après chaque changement de schéma**, avant que
le nouveau conteneur ne serve du trafic.

Deux options :

**a) Depuis votre machine (simple, recommandé pour démarrer)**

```bash
DATABASE_URL="postgresql://user:pass@HOTE_PUBLIC:5432/askwinetech" npm run db:migrate
```

(Nécessite que la base soit joignable, ex. via un tunnel SSH vers le VPS.)

**b) Commande pre-deploy Coolify**

Configurez une commande exécutée avant le démarrage, à partir d'une image
contenant les devDependencies (cible `build` du Dockerfile) :

```bash
npm run db:migrate
```

## 4. Ingestion du corpus

Une fois en production, ingérez les documents (depuis une machine ayant accès
à `DATABASE_URL` et `MISTRAL_API_KEY`) :

```bash
npm run ingest -- --path ./corpus --source upload --domain reglementaire
```

## 5. Vérification

- `https://ask.votre-domaine.fr` répond, HTTPS actif.
- Chat invité fonctionnel (streaming).
- Inscription / connexion OK, l'historique persiste après rafraîchissement.
- Une question couverte par le corpus renvoie une réponse **citée** ; une
  question hors corpus renvoie « pas de source fiable » (pas d'hallucination).
