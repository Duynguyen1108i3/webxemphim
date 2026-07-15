#!/bin/sh
set -e

npx prisma db push --skip-generate
exec node apps/backend/dist/server.js
