#!/bin/sh
set -e

./node_modules/.bin/prisma migrate deploy
exec node apps/backend/dist/server.js
