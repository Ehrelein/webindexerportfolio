import { execSync } from "child_process";
import { MAX_NODES, MAX_FRONTIER, CONCURRENCY, DOMAIN_LIMIT, DOMAIN_MAX, QUEUE_LOW_WATER, MIN_DISK_MB, DISK_MAX_USAGE_PCT, FRONTIER_MAX, MAX_DEPTH, CLEAR_INTERVAL_MS, DISK_CHECK_INTERVAL_MS, DB_BACKEND, KAFKA_ENABLED, SEEDS } from "./config";
import { getDomain, isBlacklisted, fetchHtml, parsePage, evictDnsCache, dnsCache, checkRobotsTxt, robotsCache } from "./fetcher";
import { addSeedBatch, seedInitialUrls } from "./seeds";
import type { Statements, Transactions, CrawlStateLike, DiskSpace, FrontierItem } from "./types";

let kafkaQueue: any = null;
let kafkaConsumerRunning = false;

async function startKafkaConsumer(stmts: Statements): Promise<void> {
  if (!KAFKA_ENABLED || kafkaConsumerRunning) return;
  try {
    const { KafkaUrlQueue } = require("./kafka");
    kafkaQueue = new KafkaUrlQueue();
    const ok = await kafkaQueue.init();
    if (!ok) { kafkaQueue = null; return; }
    kafkaConsumerRunning = true;
    console.log("[kafka] consumer started");
    kafkaQueue.consumeMessages(async (msg: { url: string; depth?: number; parent?: string | null }) => {
      try {
        await stmts.insertFrontier.run(msg.url, msg.depth || 0, msg.parent || null);
      } catch(e) {}
    }).catch(() => { kafkaConsumerRunning = false; });
  } catch(e: any) {
    console.log("[kafka] consumer init failed:", e.message);
    kafkaQueue = null;
  }
}

async function kafkaEnqueue(url: string, depth: number, parent: string | null): Promise<boolean> {
  if (!kafkaQueue) return false;
  try { await kafkaQueue.enqueue(url, depth, parent); return true; } catch { return false; }
}

export function checkDiskSpace(): DiskSpace {
  try {
    const out: string = execSync("df -m /home/crawler/app 2>/dev/null || df -m .", { encoding: "utf-8", timeout: 5000 });
    const lines = out.trim().split("\n");
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      const total = parseInt(parts[1]) || 99999;
      const used = parseInt(parts[2]) || 0;
      const avail = parseInt(parts[3]) || 99999;
      const usagePct = total > 0 ? Math.round((used / total) * 100) : 0;
      return { avail, total, used, usagePct };
    }
  } catch {}
  return { avail: 9999, total: 9999, used: 0, usagePct: 0 };
}

async function cleanupFrontier(db: any, stmts: Statements, fCount: number): Promise<void> {
  if (fCount > FRONTIER_MAX) {
    console.log("[cleanup] frontier too large (" + fCount + "), dropping and re-creating...");
    try {
      if (db._pg) {
        await db.exec("DELETE FROM frontier");
      } else {
        await db.exec("DROP TABLE IF EXISTS frontier");
        await db.exec(`CREATE TABLE IF NOT EXISTS frontier (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT UNIQUE, depth INTEGER DEFAULT 0, parent TEXT)`);
        await db.exec(`CREATE INDEX IF NOT EXISTS idx_frontier_url ON frontier(url)`);
      }
      console.log("[cleanup] frontier reset to 0");
    } catch(e: any) { console.log("[cleanup] drop error:", e.message); }
  } else {
    console.log("[cleanup] removing visited URLs from frontier...");
    let totalCleaned = 0;
    let cleaned: { changes: number } = { changes: 1 };
    const cleanupQuery = `DELETE FROM frontier WHERE id IN (SELECT f.id FROM frontier f INNER JOIN visited v ON f.url = v.url LIMIT 50000)`;
    let cleanupStmt: any = null;
    if (db._pg) cleanupQuery; // PG uses pool.query directly
    else cleanupStmt = db.prepare(cleanupQuery);
    do {
      try {
        if (db._pg) {
          const r = await require("./db-pg").getPool().query(
            "DELETE FROM frontier WHERE id IN (SELECT f.id FROM frontier f INNER JOIN visited v ON f.url = v.url LIMIT 50000)"
          );
          cleaned = { changes: r.rowCount || 0 };
          } else {
            cleaned = cleanupStmt.run();
          }
          totalCleaned += cleaned.changes || 0;
          if (cleaned.changes > 0) await new Promise<void>(r => setImmediate(r));
        } catch(e: any) {
          console.log("[cleanup] retry in 2s:", e.message);
          await new Promise<void>(r => setTimeout(r, 2000));
          try {
            if (db._pg) {
              const r = await require("./db-pg").getPool().query(
                "DELETE FROM frontier WHERE id IN (SELECT f.id FROM frontier f INNER JOIN visited v ON f.url = v.url LIMIT 50000)"
              );
              cleaned = { changes: r.rowCount || 0 };
            } else {
              cleaned = cleanupStmt.run();
          }
          totalCleaned += cleaned.changes || 0;
        } catch(e2: any) { console.log("[cleanup] skip:", e2.message); cleaned = { changes: 0 }; }
      }
    } while (cleaned.changes > 0);
    console.log("[cleanup] removed " + totalCleaned + " visited URLs from frontier");
  }
  const fc = await stmts.frontierCount.get();
  console.log("[cleanup] frontier now=" + (fc ? fc.c : 0));
}

async function rebuildFtsIfNeeded(db: any, existing: number, ftsCount: number, stmts: Statements): Promise<void> {
  if (DB_BACKEND === "pg") {
    console.log("[fts] PostgreSQL GIN index active, " + ftsCount + " entries");
    return;
  }
  if (ftsCount < existing * 0.8) {
    console.log("[fts] rebuilding FTS index (" + ftsCount + " -> " + existing + ")...");
    try {
      await db.exec(`DELETE FROM nodes_fts`);
      await stmts.rebuildFts.run();
      const c = await stmts.ftsCount.get();
      console.log("[fts] done, " + (c ? c.c : 0) + " entries");
    } catch(e: any) {
      console.log("[fts] rebuild failed, continuing:", e.message);
    }
  } else {
    console.log("[fts] FTS index OK, " + ftsCount + " entries");
  }
}

export async function initializeCrawl(db: any, stmts: Statements, txn: Transactions, state: CrawlStateLike, resolveDnsFn: (host: string) => Promise<string>, isAsync: boolean): Promise<void> {
  const existing = (await stmts.nodeCount.get()).c;
  console.log("[db] " + existing + " nodes from previous runs");

  const fc = (await stmts.frontierCount.get()).c;
  await cleanupFrontier(db, stmts, fc);

  const ftsCount = (await stmts.ftsCount.get()).c;
  await rebuildFtsIfNeeded(db, existing, ftsCount, stmts);

  await seedInitialUrls(db, stmts, SEEDS, isAsync);

  const hosts = new Set<string>();
  SEEDS.forEach(u => { try { hosts.add(new URL(u).hostname); } catch {} });
  await Promise.allSettled([...hosts].map(h => resolveDnsFn(h).catch(() => {})));
  console.log("DNS cache: " + dnsCache.size + " IPs");

  await startKafkaConsumer(stmts);
}

export function startCrawlLoop(db: any, stmts: Statements, txn: Transactions, state: CrawlStateLike, sendToServer: ((msg: any) => void) | undefined, isAsync: boolean): void {
  const startTime = Date.now();
  let active = 0;
  let linkCountSinceCheck = 0;
  let domainFullRefreshCount = 0;
  let totalFetchTime = 0;
  const domainsChecked = new Set<string>();
  let frontierCursor = 0;

  (async () => {
    try {
      const r = await stmts.getMinId.get();
      if (r && r.m) frontierCursor = r.m - 1;
    } catch(e) {}
  })();

  async function enqueueUrl(url: string, depth: number, parent: string | null): Promise<void> {
    if (isBlacklisted(url)) return;
    if (depth > MAX_DEPTH) return;
    linkCountSinceCheck++;
    if (linkCountSinceCheck > 200) {
      await state.refresh();
      linkCountSinceCheck = 0;
    }
    if (state.nodeCount >= MAX_NODES) return;
    if (state.frontierCount >= MAX_FRONTIER) return;
    if (state.diskPaused) return;
    const dom = getDomain(url);
    if (dom && state.getDomainCount(dom) >= DOMAIN_MAX) return;
    if (KAFKA_ENABLED && kafkaQueue) {
      await kafkaEnqueue(url, depth, parent);
    } else {
      try { await stmts.insertFrontier.run(url, depth, parent); } catch(e) {}
    }
  }

  function yield_(): Promise<void> { return new Promise(r => setImmediate(r)); }

  async function processNext(): Promise<void> {
    if (state.nodeCount >= MAX_NODES) {
      console.log("[DONE] reached MAX_NODES=" + MAX_NODES);
      return;
    }

    await yield_();

    if (active >= CONCURRENCY) return;

    const slots = CONCURRENCY - active;
    if (slots <= 0) return;
    const batch: FrontierItem[] = await stmts.getBatch.all(frontierCursor, 50);
    if (batch.length > 0) frontierCursor = batch[batch.length - 1].id!;
    if (batch.length === 0) frontierCursor = 0;
    if (batch.length === 0 && active === 0) {
      if (state.frontierCount < QUEUE_LOW_WATER) {
        if (state.nodeCount > 0 && !state._recrawlAttempted) {
          state._recrawlAttempted = true;
          console.log("[queue] frontier empty, re-crawling existing pages for new links...");
          const targets = await stmts.recrawlTargets.all(Math.min(state.nodeCount, 15));
          for (const t of targets) {
            try { await stmts.insertFrontier.run(t.url, -1, null); } catch(e) {}
          }
          console.log("[queue] re-crawl injected " + targets.length + " pages");
          setTimeout(processNext, 200);
          return;
        }
        console.log("[queue] low (" + state.frontierCount + "), injecting seeds...");
        state._recrawlAttempted = false;
        await addSeedBatch(db, stmts, isAsync);
      }
      setTimeout(processNext, 500);
      return;
    }

    let startedAny = false;
    for (const item of batch) {
      if (active >= CONCURRENCY) break;
      const isRecrawl = item.depth === -1;
      if (!isRecrawl) {
        const visited = await stmts.isVisited.get(item.url);
        if (visited) {
          try { await stmts.deleteFromFrontier.run(item.url); } catch(e) {}
          continue;
        }
      }
      const domain = getDomain(item.url);
      if (!domain) { try { await stmts.deleteFromFrontier.run(item.url); } catch(e) {} continue; }
      if (state.isDomainBlacklisted(domain)) {
        try { await stmts.deleteFromFrontier.run(item.url); } catch(e) {}
        continue;
      }
      const inflight = state.getInflight(domain);
      if (inflight >= DOMAIN_LIMIT) continue;

      if (!isRecrawl) {
        const parsedUrl = new URL(item.url);
        const origin = parsedUrl.origin;
        if (!domainsChecked.has(origin)) {
          domainsChecked.add(origin);
          try { await checkRobotsTxt(item.url); } catch {}
        }
        if (robotsCache.has(origin) && robotsCache.get(origin)) {
          const blocked = robotsCache.get(origin)!;
          if (blocked.some(p => parsedUrl.pathname.startsWith(p))) {
            await stmts.markVisited.run(item.url);
            await stmts.deleteFromFrontier.run(item.url);
            continue;
          }
        }
      }

      active++;
      startedAny = true;
      state.setInflight(domain, inflight + 1);

      const fetchStart = Date.now();
      fetchHtml(item.url).then(async ({ html, finalUrl }) => {
        totalFetchTime += Date.now() - fetchStart;
        const parsed = parsePage(html, finalUrl);
        const dom = getDomain(finalUrl);

        if (!isRecrawl) {
          const pop = (state.domainPop.find(r => r.domain === dom)?.c || 0) + 1;
          try {
            await txn.saveNode({ url: finalUrl, title: parsed.title, desc: parsed.metaDescription || parsed.ogDescription || "", dom, depth: item.depth, parent: item.parent, pop, lang: parsed.lang || "", https: finalUrl.startsWith("https") ? 1 : 0, meta: parsed.metaDescription, ogt: parsed.ogTitle, ogd: parsed.ogDescription, clen: parsed.contentLength, ts: Date.now(), origUrl: item.url });
            state.incrementDomainCount(dom);
            state.recordDomainSuccess(domain);
            state.success++;
          } catch(saveErr) { state.fail++; state.recordDomainFail(domain); return; }
        } else {
          try { await stmts.markVisited.run(item.url); await stmts.deleteFromFrontier.run(item.url); } catch(e) {}
          state.success++;
        }

        const batch2: FrontierItem[] = [];
        if (!isRecrawl) {
          for (const link of parsed.links) {
            if (isBlacklisted(link)) continue;
            if (item.depth + 1 > MAX_DEPTH) continue;
            if (state.nodeCount >= MAX_NODES) break;
            if (state.frontierCount >= MAX_FRONTIER) break;
            if (state.diskPaused) break;
            const ld = getDomain(link);
            if (ld && (state.getDomainCount(ld) >= DOMAIN_MAX || state.isDomainBlacklisted(ld))) continue;
            batch2.push({ url: link, depth: item.depth + 1, parent: finalUrl });
          }
        }
        try { if (batch2.length) await txn.insertManyFrontier(batch2); } catch(e) {}
      }).catch(async () => {
        totalFetchTime += Date.now() - fetchStart;
        state.fail++;
        state.recordDomainFail(domain);
        try { await stmts.markVisited.run(item.url); await stmts.deleteFromFrontier.run(item.url); } catch(e) {}
      }).finally(() => {
        active--;
        state.setInflight(domain, state.getInflight(domain) - 1);
        setImmediate(processNext);
      });
    }

    if (!startedAny && active === 0) {
      setTimeout(processNext, 200);
    }
  }

  processNext();

  setInterval(async () => {
    try {
      domainFullRefreshCount++;
      if (domainFullRefreshCount % 6 === 0) {
        await state.fullRefresh();
      } else {
        await state.refresh();
      }
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (state.success / (Date.now() - startTime) * 1000).toFixed(1);
      console.log("[" + elapsed + "s] ok=" + state.success + " err=" + state.fail + " " + rate + " pg/s nodes=" + state.nodeCount + " frontier=" + state.frontierCount + " mem=" + (process.memoryUsage().rss / 1048576).toFixed(0) + "MB dns=" + dnsCache.size + " blk=" + state.domainBlacklist.size + (state.diskPaused ? " DISK_PAUSED" : ""));
      if (global.gc) global.gc();
      if (sendToServer) sendToServer({ type: "stats", total: state.nodeCount, frontier: state.frontierCount, domains: state.domainPop, success: state.success, fail: state.fail, rate: rate, uptime: Math.floor(Number(elapsed)), domainsChecked: domainsChecked.size, domainsBlacklisted: state.domainBlacklist.size, totalFetchTime, concurrency: active });

      if (state.frontierCount < QUEUE_LOW_WATER && state.nodeCount < MAX_NODES && !state.diskPaused) {
        await addSeedBatch(db, stmts, isAsync);
      }
      if (state.frontierCount > 0) state._recrawlAttempted = false;
    } catch(e: any) { console.log("[interval] error:", e.message); }
  }, 5000);

  setInterval(async () => {
    try {
      if (DB_BACKEND !== "pg") {
        try { await stmts.clearProcessed.run(); } catch(e) {}
      }
    } catch(e) {}
  }, CLEAR_INTERVAL_MS);

  setInterval(() => {
    try {
      const disk = checkDiskSpace();
      const wasPaused = state.diskPaused;
      state.diskPaused = disk.avail < MIN_DISK_MB || disk.usagePct >= DISK_MAX_USAGE_PCT;
      if (state.diskPaused && !wasPaused) console.log("[DISK] PAUSED — " + disk.avail + "MB free, " + disk.usagePct + "% used (limit " + DISK_MAX_USAGE_PCT + "%)");
      if (!state.diskPaused && wasPaused) console.log("[DISK] RESUMED — " + disk.avail + "MB free, " + disk.usagePct + "% used");
      const evicted = evictDnsCache(50000);
      if (evicted > 0) console.log("[dns] evicted " + evicted + " entries, cache=" + dnsCache.size);
      if (DB_BACKEND !== "pg") {
        try { db._raw.pragma("wal_checkpoint(PASSIVE)"); } catch(e) {}
      }
    } catch(e: any) { console.log("[cleanup] error:", e.message); }
  }, DISK_CHECK_INTERVAL_MS);
}
