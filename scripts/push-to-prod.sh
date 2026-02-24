#!/usr/bin/env bash
# push-to-prod.sh — Push local database to Heroku production.
#
# ⚠️  WARNING: This OVERWRITES all production data. Use with extreme caution.
#
# Usage: ./scripts/push-to-prod.sh --confirm [heroku-app-name]
#
# Requirements:
#   - Heroku CLI installed and authenticated
#   - LOCAL_DATABASE_URL set in .env (or defaults to kid_chores_dev)

set -euo pipefail

CONFIRM_FLAG="${1:-}"
APP_NAME="${2:-}"

# Require explicit --confirm flag to prevent accidents
if [ "$CONFIRM_FLAG" != "--confirm" ]; then
  echo ""
  echo -e "\033[1;31m⚠️  WARNING: This script OVERWRITES all production data on Heroku.\033[0m"
  echo ""
  echo "To proceed, run:"
  echo "  ./scripts/push-to-prod.sh --confirm [heroku-app-name]"
  echo ""
  exit 1
fi

if [ -z "$APP_NAME" ]; then
  read -rp "Enter your Heroku app name: " APP_NAME
fi

# Load .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

LOCAL_DB="${LOCAL_DATABASE_URL:-kid_chores_dev}"

echo "================================================="
echo "  Kid Chore Tracker — Push Local DB to Production"
echo "================================================="
echo -e "\033[1;31mThis will OVERWRITE all data in $APP_NAME with local data from $LOCAL_DB.\033[0m"
read -rp "Are you absolutely sure? Type YES to continue: " CONFIRM_INPUT

if [ "$CONFIRM_INPUT" != "YES" ]; then
  echo "Aborted."
  exit 1
fi

echo "Pushing $LOCAL_DB to $APP_NAME ..."
heroku pg:push "$LOCAL_DB" DATABASE_URL --app "$APP_NAME"
echo "Push complete."
