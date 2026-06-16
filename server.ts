import express, { Request, Response, NextFunction, Application } from "express";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
import zlib from "zlib";
import path from "path";
import { fork, ChildProcess } from "child_process";
import { DASHBOARD_HOST, DB_BACKEND, REDIS_ENABLED, KAFKA_ENABLED, ES_ENABLED } from "./src/config";
import { DASHBOARD_HTML } from "./src/dashboard";
import { SEARCH_HTML } from "./src/html";
import { STATUS_HTML } from "./src/status";
import { rateLimit, searchRateLimit } from "./src/ratelimit";
import logger from "./src/logger";
import { metricsHandler } from "./src/metrics";
import { securityHeaders, requestId, sanitizeInput } from "./src/security";
import { getBreaker, getAllBreakers } from "./src/circuit";
import { AppError, DatabaseError } from "./src/errors";

const dbBreaker = getBreaker("database", { failureThreshold: 3, resetTimeout: 15000 });

let searchDb: any = null;
let searchDbHealth = false;
let searchDbLastOpen = 0;
const SEARCH_DB_TTL = 60000;

function closeSearchDb(): void {
  if (searchDb) {
    try { searchDb.close(); } catch {}
    searchDb = null;
  }
  searchDbHealth = false;
  searchDbLastOpen = 0;
}

function getSearchDb(): any {
  const now = Date.now();
  if (searchDb && (now - searchDbLastOpen) > SEARCH_DB_TTL) {
    closeSearchDb();
  }
  if (searchDb) return searchDb;
  try {
    const Database = require("better-sqlite3");
    searchDb = new Database(path.join(__dirname, "crawler.db"), { readonly: true });
    searchDb.pragma("busy_timeout = 500");
    searchDb.pragma("cache_size = -8000");
    searchDbHealth = true;
    searchDbLastOpen = now;
    return searchDb;
  } catch(e: any) {
    logger.error({ err: e.message }, "search DB open error");
    searchDbHealth = false;
    return null;
  }
}

function checkDbHealth(): boolean {
  try {
    if (DB_BACKEND === "pg") return true;
    getSearchDb();
    if (!searchDb) return false;
    searchDb.prepare("SELECT 1").get();
    searchDbHealth = true;
    return true;
  } catch(e: any) {
    logger.error({ err: e.message }, "DB health check failed");
    closeSearchDb();
    return false;
  }
}

let cachedNodeCount = 0;
let cachedFrontierCount = 0;
let cachedDomainPop: any[] = [];
let cachedSuccess = 0;
let cachedFail = 0;
let cachedRate = "0.0";
let cachedUptime = 0;
let cachedDomainsChecked = 0;
let cachedDomainsBlacklisted = 0;
let cachedTotalFetchTime = 0;
let cachedConcurrency = 0;
let treeJsonStr = '{"nodes":[],"total":0}';
let treeGzipBuf: Buffer<ArrayBufferLike> = Buffer.from(treeJsonStr);

const gz = (buf: Buffer): Buffer<ArrayBufferLike> => zlib.gzipSync(buf, { level: 6, memLevel: 8 });

function loadTreeFromDb(): void {
  try {
    if (DB_BACKEND === "pg") return;
    const Database = require("better-sqlite3");
    const db = new Database(path.join(__dirname, "crawler.db"), { readonly: true });
    db.pragma("busy_timeout = 2000");
    const nodes = db.prepare(`SELECT url, title, domain, depth, parent, popularity, https FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY domain ORDER BY popularity DESC) as rn FROM nodes) WHERE rn = 1 ORDER BY popularity DESC LIMIT 200`).all();
    if (nodes.length > 0) {
      const domainSet = new Set(nodes.map((n: any) => n.domain));
      const rawEdges = db.prepare(`SELECT p.domain as src, n.domain as dst, COUNT(*) as w FROM nodes n INNER JOIN nodes p ON n.parent = p.url WHERE n.domain != p.domain GROUP BY p.domain, n.domain ORDER BY w DESC LIMIT 300`).all();
      const edges = rawEdges.filter((e: any) => domainSet.has(e.src) && domainSet.has(e.dst));
      const total = db.prepare(`SELECT COUNT(*) as c FROM nodes`).get().c;
      const data = { nodes, edges, total, domains: nodes.length };
      treeJsonStr = JSON.stringify(data);
      treeGzipBuf = gz(Buffer.from(treeJsonStr));
      logger.info({ nodes: nodes.length, edges: edges.length, total }, "tree loaded from DB");
    }
    db.close();
  } catch (e: any) {
    logger.warn({ err: e.message }, "failed to load tree from DB");
  }
}
loadTreeFromDb();

let htmlGzip = gz(Buffer.from(DASHBOARD_HTML));
let searchHtmlGzip = gz(Buffer.from(SEARCH_HTML));
let statusHtmlGzip = gz(Buffer.from(STATUS_HTML));

const cached = {
  get nodeCount() { return cachedNodeCount; },
  get frontierCount() { return cachedFrontierCount; },
  get success() { return cachedSuccess; },
  get fail() { return cachedFail; },
  get domainsChecked() { return cachedDomainsChecked; },
  get domainsBlacklisted() { return cachedDomainsBlacklisted; },
  get totalFetchTime() { return cachedTotalFetchTime; },
  get concurrency() { return cachedConcurrency; },
};

let crawlerWorker: ChildProcess | null = null;
let isShuttingDown = false;
let crawlerRestarts = 0;
const MAX_CRAWLER_RESTARTS = 10;
let workerAlive = false;

function setupWorker(): ChildProcess | null {
  if (crawlerRestarts > MAX_CRAWLER_RESTARTS) {
    logger.fatal({ restarts: crawlerRestarts }, "Crawler exceeded max restarts");
    return null;
  }

  let child: ChildProcess | null = null;
  try {
    child = fork(path.join(__dirname, "crawler.ts"), [], {
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      env: { ...process.env },
      execArgv: ["-r", "ts-node/register"],
    });
  } catch (e: any) {
    logger.error({ err: e.message }, "Failed to fork crawler");
    return null;
  }

  child.on("message", (msg: any) => {
    if (msg.type === "stats") {
      cachedNodeCount = msg.total || 0;
      cachedFrontierCount = msg.frontier || 0;
      cachedSuccess = msg.success || 0;
      cachedFail = msg.fail || 0;
      cachedUptime = msg.uptime || 0;
      cachedDomainsChecked = msg.domainsChecked || 0;
      cachedRate = msg.rate || "0.0";
      cachedDomainsBlacklisted = msg.domainsBlacklisted || 0;
      cachedTotalFetchTime = msg.totalFetchTime || 0;
      cachedConcurrency = msg.concurrency || 0;
      cachedDomainPop = msg.domains || cachedDomainPop;
    } else if (msg.type === "tree") {
      const json = JSON.stringify(msg.data);
      treeJsonStr = json;
      zlib.gzip(json, { level: 1, memLevel: 2 }, (err: Error | null, buf: Buffer) => {
        if (!err) treeGzipBuf = buf;
      });
    }
  });

  child.on("error", (err: Error) => {
    logger.error({ err: err.message }, "crawler worker error");
    workerAlive = false;
  });

  child.on("exit", (code: number | null) => {
    workerAlive = false;
    crawlerRestarts++;
    logger.warn({ code, restarts: crawlerRestarts }, "crawler worker exited, restarting in 5s");
    setTimeout(() => {
      if (!isShuttingDown) crawlerWorker = setupWorker();
    }, 5000);
  });

  workerAlive = true;
  return child;
}

try {
  crawlerWorker = setupWorker();
} catch (e: any) {
  logger.error({ err: e.message }, "Failed to start crawler worker");
}
const app: Application = express();

app.set("trust proxy", 1);

app.use(securityHeaders);
app.use(requestId);

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn({ method: req.method, url: req.url, duration, status: res.statusCode }, "Slow request");
    }
  });
  next();
});

app.use(rateLimit);

app.get("/health/live", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: Date.now(), uptime: Math.floor(process.uptime()) });
});

app.get("/health/ready", async (req: Request, res: Response) => {
  const dbOk = checkDbHealth();
  const checks: Record<string, boolean> = {
    uptime: process.uptime() > 0,
    memory: process.memoryUsage().rss < 500 * 1024 * 1024,
    crawler: workerAlive,
    db: dbOk,
    circuitBreakers: getAllBreakers().every(b => b.state !== "OPEN"),
  };

  if (REDIS_ENABLED) {
    try {
      const { isConnected } = require("./src/redis");
      checks.redis = isConnected();
    } catch { checks.redis = false; }
  }

  if (KAFKA_ENABLED) {
    try {
      const { isConnected } = require("./src/kafka");
      checks.kafka = isConnected();
    } catch { checks.kafka = false; }
  }

  if (ES_ENABLED) {
    try {
      const { isConnected } = require("./src/elasticsearch");
      checks.elasticsearch = isConnected();
    } catch { checks.elasticsearch = false; }
  }

  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not ready",
    checks,
    timestamp: Date.now(),
    version: require("./package.json").version,
    architecture: "child_process",
    backends: { db: DB_BACKEND, redis: REDIS_ENABLED, kafka: KAFKA_ENABLED, es: ES_ENABLED },
  });
});

app.get("/api/circuit-breakers", (req: Request, res: Response) => {
  res.json({ breakers: getAllBreakers() });
});

app.get("/api/tree", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  const ae = req.headers["accept-encoding"] || "";
  if (ae.includes("gzip")) {
    res.setHeader("Content-Encoding", "gzip");
    res.send(treeGzipBuf);
  } else { res.send(treeJsonStr); }
});

app.get("/api/stats", (req: Request, res: Response) => {
  res.json({
    total: cachedNodeCount,
    frontier: cachedFrontierCount,
    domains: cachedDomainPop,
    success: cachedSuccess,
    fail: cachedFail,
    rate: cachedRate,
    uptime: cachedUptime,
    domainsChecked: cachedDomainsChecked,
    domainsBlacklisted: cachedDomainsBlacklisted,
    crawlerRestarts,
    architecture: "child_process",
    backends: { db: DB_BACKEND, redis: REDIS_ENABLED, kafka: KAFKA_ENABLED, es: ES_ENABLED },
    circuitBreakers: getAllBreakers().map(b => ({ name: b.name, state: b.state })),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    rssBytes: process.memoryUsage().rss,
  });
});

app.get("/api/search", searchRateLimit, async (req: Request, res: Response) => {
  const raw = ((req.query.q as string) || "").trim().slice(0, 500);
  const q = sanitizeInput(raw);
  if (!q) return res.json({ results: [], query: q });

  try {
    if (ES_ENABLED) {
      const es = require("./src/elasticsearch");
      if (es.isConnected()) {
        const results = await es.searchPages(q, 30);
        if (results !== null) return res.json({ results, query: q, source: "elasticsearch" });
      }
    }

    if (DB_BACKEND === "pg") {
      const pool = require("./src/db-pg").getPool();
      const clean = q.replace(/['"(){}^~\\+\-]/g, " ").trim();
      const words = clean.split(/\s+/).filter((w: string) => w.length > 0);
      if (!words.length) return res.json({ results: [], query: q });
      const tsQuery = words.join(" ");
      const tsVector = `to_tsvector('english', coalesce(title,'') || ' ' || coalesce(metaDescription,'') || ' ' || coalesce(ogTitle,'') || ' ' || coalesce(domain,''))`;
      const r = await pool.query(
        `SELECT url, title, metaDescription, ogTitle, ogDescription, domain, ts_rank(${tsVector}, plainto_tsquery('english', $1)) as rank FROM nodes WHERE ${tsVector} @@ plainto_tsquery('english', $1) ORDER BY rank DESC LIMIT 30`,
        [tsQuery]
      );
      return res.json({ results: r.rows, query: q, source: "postgresql" });
    }

    const db = await dbBreaker.execute(
      () => {
        const db = getSearchDb();
        if (!db) throw new DatabaseError("Search DB not available");
        return db;
      },
      () => null
    );

    if (!db) return res.json({ results: [], query: q, error: "DB not ready", degraded: true });

    const clean = q.replace(/['"(){}^~\\+\-]/g, " ").trim();
    const words = clean.split(/\s+/).filter((w: string) => w.length > 0);
    if (!words.length) return res.json({ results: [], query: q });

    const ftsQuery = words.map((w: string) => w + "*").join(" ");
    const results = db.prepare(
      `SELECT url, title, metaDescription, ogTitle, ogDescription, domain, rank FROM nodes_fts WHERE nodes_fts MATCH ? ORDER BY rank LIMIT 30`
    ).all(ftsQuery);

    res.json({ results, query: q, source: "sqlite" });
  } catch(e: any) {
    logger.error({ err: e.message, query: q }, "Search error");
    res.json({ results: [], query: q, error: "Search temporarily unavailable" });
  }
});

app.get("/metrics", metricsHandler(cached));

app.get("/search", (req: Request, res: Response) => {
  const ae = req.headers["accept-encoding"] || "";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (ae.includes("gzip") && searchHtmlGzip) {
    res.setHeader("Content-Encoding", "gzip");
    res.send(searchHtmlGzip);
  } else { res.send(SEARCH_HTML); }
});

app.get("/status", (req: Request, res: Response) => {
  const ae = req.headers["accept-encoding"] || "";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (ae.includes("gzip") && statusHtmlGzip) {
    res.setHeader("Content-Encoding", "gzip");
    res.send(statusHtmlGzip);
  } else { res.send(STATUS_HTML); }
});

app.get("/", (req: Request, res: Response) => {
  const ae = req.headers["accept-encoding"] || "";
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (ae.includes("gzip") && htmlGzip) {
    res.setHeader("Content-Encoding", "gzip");
    res.send(htmlGzip);
  } else { res.send(DASHBOARD_HTML); }
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn({ err: err.toJSON(), requestId: req.id }, "App error");
    return res.status(err.statusCode).json(err.toJSON());
  }

  logger.error({ err: err.message, stack: err.stack, requestId: req.id }, "Unhandled error");
  res.status(500).json({
    error: "Internal server error",
    requestId: req.id,
    code: "INTERNAL_ERROR",
  });
});

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT, host: DASHBOARD_HOST, pid: process.pid, backends: { db: DB_BACKEND, redis: REDIS_ENABLED, kafka: KAFKA_ENABLED, es: ES_ENABLED } }, "Dashboard HTTP server started");
});

async function initBackends(): Promise<void> {
  if (REDIS_ENABLED) {
    try {
      const { connectRedis } = require("./src/redis");
      await connectRedis();
    } catch(e: any) { logger.warn({ err: e.message }, "Redis init failed"); }
  }

  if (KAFKA_ENABLED) {
    try {
      const { connectProducer } = require("./src/kafka");
      await connectProducer();
    } catch(e: any) { logger.warn({ err: e.message }, "Kafka init failed"); }
  }

  if (ES_ENABLED) {
    try {
      const { connectElasticsearch, initEsIndex } = require("./src/elasticsearch");
      const ok = await connectElasticsearch();
      if (ok) await initEsIndex();
    } catch(e: any) { logger.warn({ err: e.message }, "Elasticsearch init failed"); }
  }
}

initBackends();

function gracefulShutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "Graceful shutdown initiated");

  server.close(async () => {
    logger.info("HTTP server closed");
    if (crawlerWorker) {
      try { crawlerWorker.kill("SIGTERM"); } catch {}
      setTimeout(() => {
        try { crawlerWorker!.kill("SIGKILL"); } catch {}
        process.exit(0);
      }, 5000);
    }

    try {
      if (REDIS_ENABLED) {
        const { getRedis } = require("./src/redis");
        const r = getRedis();
        if (r && r.quit) await r.quit();
      }
    } catch {}

    try {
      if (KAFKA_ENABLED) {
        const { disconnectKafka } = require("./src/kafka");
        await disconnectKafka();
      }
    } catch {}

    try {
      if (ES_ENABLED) {
        const { closeEs } = require("./src/elasticsearch");
        await closeEs();
      }
    } catch {}

    if (!crawlerWorker) process.exit(0);
  });

  setTimeout(() => {
    logger.error("Shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, "Uncaught exception");
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason: String(reason) }, "Unhandled rejection");
});

export { app, server };
