import { Redis } from "ioredis";
import { env } from "../config/env.js";

let redisEnabled = true;

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  connectTimeout: 1000,
  lazyConnect: true
});

redis.on("error", (err) => {
  // Silent error, disable redis to prevent blocking requests
  redisEnabled = false;
});

export async function cacheJson<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  if (!redisEnabled) {
    return loader();
  }

  if (redis.status !== "ready" && redis.status !== "connecting") {
    try {
      await redis.connect();
    } catch {
      redisEnabled = false;
      return loader();
    }
  }

  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;
    const value = await loader();
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return value;
  } catch {
    redisEnabled = false;
    return loader();
  }
}
