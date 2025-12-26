#!/bin/bash
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Building Next.js..."
next build

echo "Build complete - skipping prisma migrate deploy due to Neon lock timeout"
