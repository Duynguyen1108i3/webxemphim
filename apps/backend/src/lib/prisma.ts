import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.PRISMA_LOG_QUERIES === "true" ? ["query", "warn", "error"] : ["error"]
});

let dbOfflineUntil = 0;

export function isDbCircuitOpen(): boolean {
  return Date.now() < dbOfflineUntil;
}

export function markDbOffline(cooldownMs = 30_000): void {
  dbOfflineUntil = Date.now() + cooldownMs;
}

