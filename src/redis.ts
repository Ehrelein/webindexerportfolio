import Redis from "ioredis";

let client: Redis | null = null;
let subscriber: Redis | null = null;

export function getRedis(): Redis {
  if (client) return client;
  client = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
  client.on("error", (err: Error) => {
    console.error("[redis] error:", err.message);
  });
  return client;
}

export async function connectRedis(): Promise<boolean> {
  const r = getRedis();
  try {
    await r.connect();
    console.log("[redis] connected to", r.options.host + ":" + r.options.port);
    return true;
  } catch (e: any) {
    console.warn("[redis] connection failed, falling back to in-memory:", e.message);
    return false;
  }
}

export function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = getRedis().duplicate();
  }
  return subscriber;
}

export function isConnected(): boolean {
  return !!client && client.status === "ready";
}

// Distributed rate limiter using Redis sliding window
export class RedisRateLimiter {
  name: string;
  maxRequests: number;
  windowMs: number;
  localFallback: Map<string, { count: number; windowStart: number }>;

  constructor(name: string, maxRequests: number, windowMs: number) {
    this.name = name;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.localFallback = new Map();
  }

  async isAllowed(key: string): Promise<boolean> {
    const r = getRedis();
    const redisKey: string = `ratelimit:${this.name}:${key}`;
    const now: number = Date.now();
    const windowStart: number = now - this.windowMs;

    try {
      const pipeline = r.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
      pipeline.zcard(redisKey);
      pipeline.pexpire(redisKey, this.windowMs);
      const results = await pipeline.exec();
      const count: number = (results![2][1] as number) || 0;
      return count <= this.maxRequests;
    } catch (e) {
      return this._localFallback(key);
    }
  }

  _localFallback(key: string): boolean {
    const now: number = Date.now();
    const entry = this.localFallback.get(key) || { count: 0, windowStart: now };
    if (now - entry.windowStart > this.windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }
    entry.count++;
    this.localFallback.set(key, entry);
    return entry.count <= this.maxRequests;
  }
}

// Distributed circuit breaker state via Redis
export class RedisCircuitState {
  name: string;
  failureThreshold: number;
  resetTimeout: number;

  constructor(name: string, failureThreshold: number, resetTimeout: number) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  async getState(): Promise<{ state: string; failures: number; lastFailure: number | null }> {
    const r = getRedis();
    try {
      const state = await r.get(`circuit:${this.name}:state`);
      const failures = await r.get(`circuit:${this.name}:failures`);
      const lastFailure = await r.get(`circuit:${this.name}:lastFailure`);
      return {
        state: state || "CLOSED",
        failures: parseInt(failures!) || 0,
        lastFailure: lastFailure ? parseInt(lastFailure) : null,
      };
    } catch (e) {
      return { state: "CLOSED", failures: 0, lastFailure: null };
    }
  }

  async recordSuccess(): Promise<void> {
    const r = getRedis();
    try {
      const state = await this.getState();
      if (state.state === "HALF_OPEN") {
        await r.set(`circuit:${this.name}:state`, "CLOSED");
        await r.set(`circuit:${this.name}:failures`, "0");
      }
    } catch (e) {}
  }

  async recordFailure(): Promise<void> {
    const r = getRedis();
    try {
      const state = await this.getState();
      const failures: number = state.failures + 1;
      await r.set(`circuit:${this.name}:failures`, failures.toString());
      await r.set(`circuit:${this.name}:lastFailure`, Date.now().toString());

      if (state.state === "HALF_OPEN" || failures >= this.failureThreshold) {
        await r.set(`circuit:${this.name}:state`, "OPEN");
        await r.pexpire(`circuit:${this.name}:state`, this.resetTimeout);
      }
    } catch (e) {}
  }

  async canExecute(): Promise<boolean> {
    const state = await this.getState();
    if (state.state === "CLOSED") return true;
    if (state.state === "OPEN") {
      const lastFailure = state.lastFailure;
      if (lastFailure && Date.now() - lastFailure >= this.resetTimeout) {
        const r = getRedis();
        await r.set(`circuit:${this.name}:state`, "HALF_OPEN");
        return true;
      }
      return false;
    }
    return true; // HALF_OPEN allows one request
  }
}

// DNS cache in Redis
export class RedisDnsCache {
  async get(host: string): Promise<string | null> {
    const r = getRedis();
    try {
      return await r.get(`dns:${host}`);
    } catch (e) {
      return null;
    }
  }

  async set(host: string, ip: string, ttlMs: number = 300000): Promise<void> {
    const r = getRedis();
    try {
      await r.setex(`dns:${host}`, Math.floor(ttlMs / 1000), ip);
    } catch (e) {}
  }

  async size(): Promise<number> {
    const r = getRedis();
    try {
      const keys = await r.keys("dns:*");
      return keys.length;
    } catch (e) {
      return 0;
    }
  }
}

// URL dedup via Redis Bloom Filter (using Set as approximation)
export class RedisUrlDedup {
  async isSeen(url: string): Promise<boolean> {
    const r = getRedis();
    try {
      return (await r.sismember("urls:seen", url)) === 1;
    } catch (e) {
      return false;
    }
  }

  async markSeen(url: string): Promise<void> {
    const r = getRedis();
    try {
      await r.sadd("urls:seen", url);
      // Keep set size manageable
      const size = await r.scard("urls:seen");
      if (size > 1000000) {
        await r.spop("urls:seen", 100000);
      }
    } catch (e) {}
  }
}
