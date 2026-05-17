# ────────────────────────────────────────────────────────────────────────────
# PACS Mini — Frontend  |  Vite + React + Nginx
# BUILD CONTEXT: raiz do monorepo  (docker compose: context: .)
# Variáveis VITE_* são injetadas em build-time via ARG
# ────────────────────────────────────────────────────────────────────────────

# ── Estágio 1: build Vite ────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Build args para variáveis de ambiente do Vite
ARG VITE_DCM4CHEE_HOST
ARG VITE_DCM4CHEE_PORT=8080
ARG VITE_DCM4CHEE_AET=DCM4CHEE
ARG VITE_SERVER_URL=http://localhost:3500
ARG VITE_API_SECRET
ARG VITE_APP_NAME="PACS Mini"

# Exporta ARGs como ENV para que o Vite os capture durante o build
ENV VITE_DCM4CHEE_HOST=$VITE_DCM4CHEE_HOST \
    VITE_DCM4CHEE_PORT=$VITE_DCM4CHEE_PORT \
    VITE_DCM4CHEE_AET=$VITE_DCM4CHEE_AET \
    VITE_SERVER_URL=$VITE_SERVER_URL \
    VITE_API_SECRET=$VITE_API_SECRET \
    VITE_APP_NAME=$VITE_APP_NAME

# Copia estrutura do monorepo necessária para npm workspaces
COPY package.json package-lock.json ./
COPY packages/web/package.json ./packages/web/

# Instala apenas as dependências do workspace web (com lock file da raiz)
RUN npm ci --workspace=packages/web

COPY packages/web ./packages/web

# Compila o frontend
WORKDIR /app/packages/web
RUN npm run build

# ── Estágio 2: Nginx ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove config padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health.txt || exit 1

CMD ["nginx", "-g", "daemon off;"]
