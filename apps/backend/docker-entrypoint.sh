#!/bin/sh
set -e

echo "🚀 Starting Flotilla Backend..."

# Navigate to backend directory
cd /app/apps/backend

# Run database migrations
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

# Optionally run database seed (will skip if env vars not set)
echo "🌱 Running database seed..."
npx prisma db seed || true

# Start the application
echo "✅ Starting NestJS application..."
exec node dist/src/main.js
