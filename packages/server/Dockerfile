# ────────────────────────────────────────────────────────────────────────────
# PACS Mini — Backend  |  Node 22 Alpine  |  Multi-stage build
# BUILD CONTEXT: raiz do monorepo  (docker compose: context: .)
# node:sqlite (DatabaseSync) exige Node >= 22.5.0
# ────────────────────────────────────────────────────────────────────────────

# ── Estágio 1: build ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copia estrutura do monorepo necessária para npm workspaces
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/

# Instala apenas as dependências do workspace server (com lock file da raiz)
RUN npm ci --workspace=packages/server

COPY packages/server ./packages/server

# Compila TypeScript
WORKDIR /app/packages/server
RUN npm run build

# ── Estágio 2: runtime mínimo ─────────────────────────────────────────────────
FROM node:22-alpine

# tini para gerenciar processos filho e sinais Unix
RUN apk add --no-cache tini

WORKDIR /app

# Copia estrutura do monorepo para instalar dependências de prod
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/

# Apenas dependências de produção
RUN npm ci --workspace=packages/server --omit=dev && npm cache clean --force

# Artefatos do build
COPY --from=builder /app/packages/server/dist ./packages/server/dist

# Schema SQL precisa estar acessível em runtime
COPY packages/server/src/db/schema.sql ./packages/server/dist/db/schema.sql

# Usuário não-root por segurança
RUN addgroup -S pacs && adduser -S pacs -G pacs \
    && mkdir -p /data /storage \
    && chown -R pacs:pacs /app /data /storage
USER pacs

WORKDIR /app/packages/server

EXPOSE 3500

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3500/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
