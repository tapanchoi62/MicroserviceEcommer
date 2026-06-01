#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npm run prisma:seed || echo "Seed completed or already seeded"

echo "Starting Product Service..."
exec node dist/main.js
