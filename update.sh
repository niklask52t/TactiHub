#!/usr/bin/env bash
set -euo pipefail

# Resolve project root (works even when called via symlink from /usr/local/bin)
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$SCRIPT_DIR"

# Prompt that only accepts y or n
ask_yn() {
  local prompt="$1"
  while true; do
    read -p "$prompt (y/n) " answer
    case "$answer" in
      y|Y) return 0 ;;
      n|N) return 1 ;;
      *) echo "Please enter y or n." ;;
    esac
  done
}

echo "=== TactiHub Update ==="
echo ""
echo "Select mode:"
echo "  [1] dev  — Full reset: delete ALL data, rebuild from scratch"
echo "  [2] prod — Update only: pull, install, migrate, rebuild (keeps data)"
echo ""

while true; do
  read -p "Enter mode (1 or 2): " mode
  case "$mode" in
    1) MODE="dev"; break ;;
    2) MODE="prod"; break ;;
    *) echo "Please enter 1 or 2." ;;
  esac
done

echo ""

if [ "$MODE" = "dev" ]; then
  echo "=== DEV RESET ==="
  echo "This will DELETE all database data (users, battleplans, everything)"
  echo "and rebuild the entire project from scratch."
  echo ""

  if ! ask_yn "Are you sure?"; then
    echo "Aborted."
    exit 0
  fi

  echo ""

  if ! ask_yn "Are you REALLY sure? All data will be permanently lost."; then
    echo "Aborted."
    exit 0
  fi

  echo ""
  echo "--- Pulling latest dev branch ---"
  git checkout dev
  git pull origin dev

  echo ""
  echo "--- Installing dependencies ---"
  pnpm install

  echo ""
  echo "--- Stopping containers & deleting volumes ---"
  docker compose down -v

  echo ""
  echo "--- Starting PostgreSQL + Redis ---"
  docker compose up -d

  echo ""
  echo "--- Waiting for PostgreSQL to be ready ---"
  until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
  done
  echo "PostgreSQL is ready."

  echo ""
  echo "--- Building shared package ---"
  pnpm --filter @tactihub/shared build

  echo ""
  echo "--- Cleaning old migration files ---"
  rm -rf packages/server/drizzle/*

  echo ""
  echo "--- Generating migrations ---"
  pnpm db:generate

  echo ""
  echo "--- Applying migrations ---"
  pnpm db:migrate

  echo ""
  echo "--- Seeding database ---"
  pnpm db:seed

  echo ""
  echo "--- Building all packages ---"
  pnpm build

  echo ""
  echo "=== Dev reset complete! ==="
  echo "Run 'pnpm dev' to start developing."

elif [ "$MODE" = "prod" ]; then
  echo "=== PRODUCTION UPDATE ==="
  echo "This will pull the latest changes, install dependencies,"
  echo "apply database migrations, and rebuild the project."
  echo "Your existing data will be preserved."
  echo ""

  if ! ask_yn "Continue with production update?"; then
    echo "Aborted."
    exit 0
  fi

  echo ""
  echo "--- Pulling latest main branch ---"
  git checkout main
  git pull origin main

  echo ""
  echo "--- Installing dependencies ---"
  pnpm install

  echo ""
  echo "--- Building shared package ---"
  pnpm --filter @tactihub/shared build

  echo ""
  echo "--- Generating migrations ---"
  pnpm db:generate

  echo ""
  echo "--- Applying migrations ---"
  pnpm db:migrate

  echo ""
  echo "--- Building all packages ---"
  pnpm build

  echo ""
  echo "=== Production update complete! ==="
  echo "Restart the server to apply changes:"
  echo "  sudo systemctl restart tactihub"
fi
