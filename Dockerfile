# syntax=docker/dockerfile:1

# --- deps : installe les dépendances ---
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build : compile l'app Next.js (sortie standalone) ---
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Variables factices pour permettre le build (validées au runtime).
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build \
    AUTH_SECRET=build-placeholder \
    MISTRAL_API_KEY=build-placeholder
RUN npm run build

# --- runner : image finale minimale ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Migrations + scripts pour l'étape de release
COPY --from=build /app/db ./db

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
