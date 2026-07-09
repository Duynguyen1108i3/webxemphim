import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  lazyConnect: true
});

export async function cacheJson<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  if (redis.status !== "ready") {
    try {
      await redis.connect();
    } catch {
      return loader();
    }
  }
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;
  const value = await loader();
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  return value;
}
