#!/usr/bin/env bash
# backup-prod.sh — Dump production PostgreSQL database to a local file.
# Usage: ./scripts/backup-prod.sh [heroku-app-name]

set -euo pipefail

APP_NAME="${1:-}"

echo "================================================="
echo "  Kid Chore Tracker — Production Backup"
echo "================================================="

if [ -z "$APP_NAME" ]; then
  read -rp "Enter your Heroku app name: " APP_NAME
fi

echo "Fetching DATABASE_URL from Heroku app: $APP_NAME ..."
DATABASE_URL=$(heroku config:get DATABASE_URL --app "$APP_NAME")

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: Could not retrieve DATABASE_URL from Heroku." >&2
  exit 1
fi

mkdir -p backups
FILENAME="backups/backup-$(date +%Y%m%d-%H%M%S).sql"

echo "Running pg_dump ..."
pg_dump \
  --format=plain \
  --no-owner \
  --no-acl \
  "$DATABASE_URL" > "$FILENAME"

echo "Backup saved to: $FILENAME"
