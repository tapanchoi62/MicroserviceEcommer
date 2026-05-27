#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database..."
node dist/prisma/seed.js || echo "⚠️  Seeding failed or already seeded, continuing..."

echo "Starting application..."
exec node dist/main
