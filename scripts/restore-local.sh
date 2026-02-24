#!/usr/bin/env bash
# restore-local.sh — Restore a production dump to your local database.
# Usage: ./scripts/restore-local.sh <backup-file>
#
# Reads LOCAL_DATABASE_URL from .env or falls back to postgres://localhost/kid_chores_dev

set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./scripts/restore-local.sh <backup-file>" >&2
  echo "Example: ./scripts/restore-local.sh backups/backup-20240101-120000.sql" >&2
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

# Load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

LOCAL_DATABASE_URL="${LOCAL_DATABASE_URL:-postgres://localhost/kid_chores_dev}"

echo "================================================="
echo "  Kid Chore Tracker — Restore to Local DB"
echo "================================================="
echo "Backup file : $BACKUP_FILE"
echo "Target DB   : $LOCAL_DATABASE_URL"
echo ""
echo "Restoring ..."
psql "$LOCAL_DATABASE_URL" < "$BACKUP_FILE"
echo "Restore complete."
