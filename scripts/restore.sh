#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PACS Mini — Restore Script
#
# Uso:
#   ./scripts/restore.sh ./backups/pacs-db_20240101_120000.db.gz
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BACKUP_FILE="${1:-}"
[ -z "$BACKUP_FILE" ] && { echo "Uso: $0 <arquivo-backup.db.gz>"; exit 1; }
[ -f "$BACKUP_FILE" ] || { echo "[ERRO] Arquivo não encontrado: $BACKUP_FILE"; exit 1; }

DB_VOLUME="pacs-mini_pacs-server-data"
log() { echo "[$(date +%H:%M:%S)] $*"; }

log "⚠  ATENÇÃO: Este script irá SUBSTITUIR o banco de dados atual."
read -rp "Digite 'SIM' para confirmar: " CONFIRM
[ "$CONFIRM" = "SIM" ] || { log "Cancelado."; exit 0; }

log "Parando pacs-server..."
docker compose stop pacs-server 2>/dev/null || true

log "Restaurando banco: ${BACKUP_FILE}"
gunzip -c "$BACKUP_FILE" | docker run --rm -i \
  -v "${DB_VOLUME}:/data" \
  alpine sh -c "cat > /data/pacs-mini.db"

log "Reiniciando pacs-server..."
docker compose start pacs-server

log "✓ Restore concluído"
