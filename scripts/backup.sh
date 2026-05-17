#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PACS Mini — Backup Script
# Faz backup do banco SQLite e dos dados do dcm4chee
#
# Uso:
#   ./scripts/backup.sh                    # backup completo
#   ./scripts/backup.sh --db-only          # apenas banco SQLite
#   BACKUP_KEEP_DAYS=14 ./scripts/backup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configurações ─────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
DB_VOLUME="pacs-mini_pacs-server-data"      # nome do volume Docker
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_ONLY="${1:-}"

log() { echo "[$(date +%H:%M:%S)] $*"; }
die() { echo "[ERRO] $*" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
log "Iniciando backup — ${TIMESTAMP}"

# ── Backup do banco SQLite via Docker volume ───────────────────────────────────
backup_db() {
  log "Fazendo backup do banco SQLite..."
  local out="${BACKUP_DIR}/pacs-db_${TIMESTAMP}.db.gz"
  docker run --rm \
    -v "${DB_VOLUME}:/data:ro" \
    alpine sh -c "sqlite3 /data/pacs-mini.db .dump 2>/dev/null || cat /data/pacs-mini.db" \
    | gzip > "$out"
  log "  → ${out} ($(du -sh "$out" | cut -f1))"
}

# ── Backup dos dados de storage DICOM ─────────────────────────────────────────
backup_storage() {
  log "Fazendo backup do storage DICOM (pode demorar)..."
  local out="${BACKUP_DIR}/pacs-storage_${TIMESTAMP}.tar.gz"
  docker run --rm \
    -v "pacs-mini_dcm4chee-storage:/storage:ro" \
    -v "$(realpath "$BACKUP_DIR"):/backup" \
    alpine tar czf "/backup/pacs-storage_${TIMESTAMP}.tar.gz" -C /storage . 2>/dev/null || true
  if [ -f "$out" ]; then
    log "  → ${out} ($(du -sh "$out" | cut -f1))"
  else
    log "  ⚠ Storage backup não disponível (volume não encontrado)"
  fi
}

backup_db

if [ "$DB_ONLY" != "--db-only" ]; then
  backup_storage
fi

# ── Rotação: remove backups mais antigos que KEEP_DAYS dias ───────────────────
log "Removendo backups com mais de ${KEEP_DAYS} dias..."
find "$BACKUP_DIR" -name "pacs-*.gz" -mtime "+${KEEP_DAYS}" -delete 2>/dev/null || true

log "✓ Backup concluído"
ls -lh "$BACKUP_DIR"
