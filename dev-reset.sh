#!/usr/bin/env bash
set -euo pipefail

echo "=== TactiHub Dev Reset ==="
echo "This will DELETE all database data and rebuild from scratch."
echo ""
read -p "Are you sure? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
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
echo "--- Generating migrations ---"
pnpm db:generate

echo ""
echo "--- Applying migrations ---"
pnpm db:migrate

echo ""
echo "--- Seeding database ---"
pnpm db:seed

echo ""
echo "=== Dev reset complete! ==="
echo "Run 'pnpm dev' to start developing."
