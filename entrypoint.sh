#!/bin/sh
set -e

# Export environment variables for use by cron jobs
printenv | sed 's/\(.*\)=\(.*\)/export \1="\2"/' > /app/.env.cron

echo "→ Starting cron daemon..."
crond -b -l 8

echo "→ Running database migrations..."
/app/packages/db/node_modules/.bin/prisma migrate deploy \
  --schema=/app/packages/db/prisma/schema.prisma

echo "→ Starting Next.js..."
cd /app/apps/web
exec /app/apps/web/node_modules/.bin/next start --port "${PORT:-3000}"
