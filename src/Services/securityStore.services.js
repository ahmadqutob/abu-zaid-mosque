import { createClient } from "redis";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

// An empty URL selects local rate counters and MongoDB session revocation.
const url = process.env.REDIS_URL?.trim();
export const securityRedis = url ? createClient({ url, disableOfflineQueue: true }) : null;
securityRedis?.on("error", error => console.error("Security Redis connection error", error.code || error.name));

export function createRateLimiter(name, windowMs, max) {
  const store = securityRedis ? new RedisStore({
    prefix: `mosque:limit:${name}:`,
    sendCommand: (...args) => securityRedis.sendCommand(args),
  }) : undefined;

  return rateLimit({ windowMs, max, store, passOnStoreError: false });
}
