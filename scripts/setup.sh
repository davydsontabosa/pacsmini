#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PACS Mini — Setup Script
# Configura o ambiente para instalação em produção
#
# Uso: sudo ./scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

log()  { echo -e "\033[32m[✓]\033[0m $*"; }
warn() { echo -e "\033[33m[!]\033[0m $*"; }
die()  { echo -e "\033[31m[✗]\033[0m $*" >&2; exit 1; }
step() { echo -e "\n\033[34m══ $* ══\033[0m"; }

step "Verificando pré-requisitos"

command -v docker  >/dev/null || die "Docker não encontrado. Instale: https://docs.docker.com/engine/install/"
command -v docker compose >/dev/null 2>&1 || die "Docker Compose V2 não encontrado."
command -v openssl >/dev/null || die "openssl não encontrado."

DOCKER_VERSION=$(docker --version | grep -oP '\d+\.\d+' | head -1)
log "Docker ${DOCKER_VERSION} encontrado"

step "Configurando arquivo .env"

if [ ! -f .env ]; then
  cp .env.example .env
  warn "Arquivo .env criado a partir de .env.example"

  # Gera segredos automaticamente
  API_SECRET=$(openssl rand -hex 32)
  PG_PASS=$(openssl rand -hex 20)

  sed -i "s|SUBSTITUA_POR_VALOR_SEGURO_MINIMO_32_CHARS|${API_SECRET}|g" .env
  sed -i "s|SUBSTITUA_POR_SENHA_FORTE|${PG_PASS}|g" .env

  log "API_SECRET gerado automaticamente"
  log "POSTGRES_PASSWORD gerada automaticamente"
  warn "EDITE o .env agora para configurar FRONTEND_URL, SMTP, etc."
  warn "Arquivo: $(realpath .env)"
else
  log ".env já existe — mantendo configuração atual"
fi

step "Criando diretórios necessários"
mkdir -p backups data/dcm4chee data/server
chmod 700 backups
log "Diretórios criados"

step "Criando cron de backup automático"
CRON_JOB="0 3 * * * cd $(realpath .) && ./scripts/backup.sh --db-only >> ./backups/backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v "pacs-mini/scripts/backup"; echo "$CRON_JOB" ) | crontab - || warn "Não foi possível adicionar cron — configure manualmente"
log "Backup diário agendado para 03:00"

step "Configurando permissões dos scripts"
chmod +x scripts/*.sh
log "Scripts executáveis"

step "Pull das imagens Docker"
docker compose pull --quiet 2>/dev/null || warn "Não foi possível fazer pull (sem internet?). Continuando..."

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Setup concluído!"
echo ""
echo "  Próximos passos:"
echo "  1. nano .env          — configure URLs e SMTP"
echo "  2. docker compose build"
echo "  3. docker compose up -d"
echo "  4. docker compose logs -f pacs-server"
echo "═══════════════════════════════════════════════════════"
