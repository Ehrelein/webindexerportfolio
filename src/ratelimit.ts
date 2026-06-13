import { Request, Response, NextFunction } from "express";
import { REDIS_ENABLED } from "./config";

const RATE_LIMIT_WINDOW_MS: number = 60000;
const RATE_LIMIT_MAX: number = 100;
const RATE_LIMIT_SEARCH_MAX: number = 30;

const clients: Map<string, { start: number; count: number; searchCount: number }> = new Map();

let redisLimiter: any = null;
let redisSearchLimiter: any = null;

async function initRedisLimiters(): Promise<void> {
  if (!REDIS_ENABLED) return;
  try {
    const { RedisRateLimiter, isConnected } = require("./redis");
    if (!isConnected()) return;
    redisLimiter = new RedisRateLimiter("general", RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    redisSearchLimiter = new RedisRateLimiter("search", RATE_LIMIT_SEARCH_MAX, RATE_LIMIT_WINDOW_MS);
    console.log("[ratelimit] Redis distributed rate limiters active");
  } catch {}
}

setTimeout(initRedisLimiters, 1000);

function getClient(ip: string): { start: number; count: number; searchCount: number } {
  let c = clients.get(ip);
  const now: number = Date.now();
  if (!c || now - c.start > RATE_LIMIT_WINDOW_MS) {
    c = { start: now, count: 0, searchCount: 0 };
    clients.set(ip, c);
  }
  return c;
}

export async function rateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip: string = req.ip || (req as any).connection.remoteAddress || "unknown";

  if (redisLimiter) {
    try {
      const allowed: boolean = await redisLimiter.isAllowed(ip);
      if (!allowed) {
        res.setHeader("Retry-After", "60");
        res.status(429).json({ error: "Too many requests. Try again later." });
        return;
      }
      next();
      return;
    } catch {}
  }

  const c = getClient(ip);
  c.count++;
  if (c.count > RATE_LIMIT_MAX) {
    res.setHeader("Retry-After", Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - c.start)) / 1000));
    res.status(429).json({ error: "Too many requests. Try again later." });
    return;
  }
  next();
}

export async function searchRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip: string = req.ip || (req as any).connection.remoteAddress || "unknown";

  if (redisSearchLimiter) {
    try {
      const allowed: boolean = await redisSearchLimiter.isAllowed(ip);
      if (!allowed) {
        res.setHeader("Retry-After", "60");
        res.status(429).json({ error: "Search rate limit exceeded. Try again later." });
        return;
      }
      next();
      return;
    } catch {}
  }

  const c = getClient(ip);
  c.searchCount++;
  if (c.searchCount > RATE_LIMIT_SEARCH_MAX) {
    res.setHeader("Retry-After", Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - c.start)) / 1000));
    res.status(429).json({ error: "Search rate limit exceeded. Try again later." });
    return;
  }
  next();
}

function cleanupClients(): void {
  const now: number = Date.now();
  for (const [ip, c] of clients) {
    if (now - c.start > RATE_LIMIT_WINDOW_MS * 2) clients.delete(ip);
  }
}

setInterval(cleanupClients, RATE_LIMIT_WINDOW_MS);
