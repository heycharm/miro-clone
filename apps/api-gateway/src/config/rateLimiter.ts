// apps/api-gateway/src/config/rateLimiter.ts
import rateLimit from "express-rate-limit";

/**
 * Rate limiting — controls how many requests a single IP
 * can make in a given time window
 *
 * Why it matters:
 * Without this, one bad actor can spam your API with thousands
 * of requests per second, either to brute-force passwords,
 * scrape data, or just take your server down (DoS attack)
 *
 * We have two limiters:
 * 1. globalLimiter  — applies to every route (generous limit)
 * 2. authLimiter    — applies only to /auth routes (strict limit)
 *    because login/register are the most common brute-force targets
 */

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15min per IP
  standardHeaders: true, // adds RateLimit headers to response
  legacyHeaders: false,
  message: {
    message: "Too many requests, please try again later",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // only 20 login attempts per 15min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many auth attempts, please try again later",
  },
});
