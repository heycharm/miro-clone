// apps/collab-service/src/config/redis.ts
import Redis from "ioredis";
import { env } from "./env";

/**
 * Why two Redis clients (publisher and subscriber)?
 *
 * Redis has a rule: once a client enters subscribe mode,
 * it can ONLY send subscribe/unsubscribe commands.
 * It cannot publish or run any other Redis commands.
 *
 * So if you use one client for everything:
 * client.subscribe('board:123')  ← now it's locked in subscribe mode
 * client.publish('board:123', data)  ← ERROR — not allowed
 *
 * Solution: two separate connections
 * publisher  → only publishes messages
 * subscriber → only subscribes and receives messages
 *
 * This is standard Redis pub/sub pattern
 */

export const publisher = new Redis(env.REDIS_URL);
export const subscriber = new Redis(env.REDIS_URL);

publisher.on("connect", () =>
  console.log("[collab] Redis publisher connected"),
);
subscriber.on("connect", () =>
  console.log("[collab] Redis subscriber connected"),
);
publisher.on("error", (err) =>
  console.error("[collab] Redis publisher error:", err),
);
subscriber.on("error", (err) =>
  console.error("[collab] Redis subscriber error:", err),
);

