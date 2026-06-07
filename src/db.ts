import Database from "better-sqlite3";
import { DB_PATH } from "./config";
import { Statements, Transactions, Statement, PageData, FrontierItem, DomainPop } from "./types";

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -64000");
  db.pragma("busy_timeout = 15000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      url TEXT PRIMARY KEY,
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      domain TEXT DEFAULT '',
      depth INTEGER DEFAULT 0,
      parent TEXT,
      popularity INTEGER DEFAULT 1,
      lang TEXT DEFAULT '',
      https INTEGER DEFAULT 0,
      metaDescription TEXT DEFAULT '',
      ogTitle TEXT DEFAULT '',
      ogDescription TEXT DEFAULT '',
      contentLength INTEGER DEFAULT 0,
      crawled_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS visited (
      url TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS frontier (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE,
      depth INTEGER DEFAULT 0,
      parent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_frontier_url ON frontier(url);
    CREATE INDEX IF NOT EXISTS idx_nodes_domain ON nodes(domain);
    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent);
    CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(url, title, description, metaDescription, ogTitle, ogDescription, domain);
  `);

  const integrityCheck = db.pragma("integrity_check") as any[];
  if (integrityCheck[0]?.integrity_check === "ok") {
    console.log("[db] integrity_check OK");
  } else {
    console.log("[db] integrity_check FAILED:", JSON.stringify(integrityCheck));
    console.log("[db] attempting recovery: REINDEX...");
    try { db.exec("REINDEX"); console.log("[db] REINDEX done"); } catch (e) { console.log("[db] REINDEX failed:", (e as Error).message); }
  }

  return db;
}

function createStatements(db: Database.Database): Statements {
  return {
    insertNode: db.prepare(`INSERT INTO nodes (url, title, description, domain, depth, parent, popularity, lang, https, metaDescription, ogTitle, ogDescription, contentLength, crawled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(url) DO UPDATE SET title=excluded.title, description=excluded.description, domain=excluded.domain, depth=excluded.depth, parent=excluded.parent, popularity=excluded.popularity, lang=excluded.lang, https=excluded.https, metaDescription=excluded.metaDescription, ogTitle=excluded.ogTitle, ogDescription=excluded.ogDescription, contentLength=excluded.contentLength, crawled_at=excluded.crawled_at`),
    updatePop: db.prepare(`UPDATE nodes SET popularity = ? WHERE url = ?`),
    markVisited: db.prepare(`INSERT OR IGNORE INTO visited (url) VALUES (?)`),
    isVisited: db.prepare(`SELECT 1 FROM visited WHERE url = ?`),
    insertFrontier: db.prepare(`INSERT OR IGNORE INTO frontier (url, depth, parent) VALUES (?, ?, ?)`),
    getBatch: db.prepare(`SELECT url, depth, parent, id FROM frontier WHERE id > ? ORDER BY id ASC LIMIT ?`),
    getMinId: db.prepare(`SELECT MIN(id) as m FROM frontier`),
    clearProcessed: db.prepare(`DELETE FROM frontier WHERE id IN (SELECT f.id FROM frontier f INNER JOIN visited v ON f.url = v.url LIMIT 10000)`),
    deleteFromFrontier: db.prepare(`DELETE FROM frontier WHERE url = ?`),
    nodeCount: db.prepare(`SELECT COUNT(*) as c FROM nodes`),
    frontierCount: db.prepare(`SELECT COUNT(*) as c FROM frontier`),
    domainPopStmt: db.prepare(`SELECT domain, COUNT(*) as c FROM nodes GROUP BY domain ORDER BY c DESC LIMIT 20`),
    totalNodes: db.prepare(`SELECT COUNT(*) as c FROM nodes`),
    insertFts: db.prepare(`INSERT INTO nodes_fts(url, title, description, metaDescription, ogTitle, ogDescription, domain) VALUES (?, ?, ?, ?, ?, ?, ?)`),
    domainCountStmt: db.prepare(`SELECT domain, COUNT(*) as c FROM nodes GROUP BY domain`),
    treeLight: db.prepare(`SELECT url, title, domain, depth, parent, popularity, https FROM nodes ORDER BY rowid DESC LIMIT ?`),
    rebuildFts: db.prepare(`INSERT INTO nodes_fts(url, title, description, metaDescription, ogTitle, ogDescription, domain) SELECT url, title, description, metaDescription, ogTitle, ogDescription, domain FROM nodes`),
    ftsCount: db.prepare(`SELECT COUNT(*) as c FROM nodes_fts`),
    recrawlTargets: db.prepare(`SELECT url FROM nodes ORDER BY RANDOM() LIMIT ?`),
  };
}

function createTransactions(db: Database.Database, stmts: Statements): Transactions {
  const saveNode = db.transaction((d: PageData) => {
    stmts.insertNode.run(d.url, d.title, d.desc, d.dom, d.depth, d.parent, d.pop, d.lang, d.https, d.meta, d.ogt, d.ogd, d.clen, d.ts);
    stmts.markVisited.run(d.url);
    stmts.deleteFromFrontier.run(d.url);
    if (d.origUrl !== d.url) {
      stmts.markVisited.run(d.origUrl);
      stmts.deleteFromFrontier.run(d.origUrl);
    }
    try { stmts.insertFts.run(d.url, d.title || '', d.desc || '', d.meta || '', d.ogt || '', d.ogd || '', d.dom); } catch(e) { console.log("[db] FTS insert failed for " + d.url + ": " + (e as Error).message); }
  });

  const insertManyFrontier = db.transaction((items: FrontierItem[]) => {
    for (const i of items) stmts.insertFrontier.run(i.url, i.depth, i.parent);
  });

  return { saveNode, insertManyFrontier };
}

class CrawlState {
  stmts: Statements;
  nodeCount: number;
  frontierCount: number;
  domainPop: DomainPop[];
  domainNodeCount: Map<string, number>;
  domainInflight: Map<string, number>;
  domainSuccess: Map<string, number>;
  domainFail: Map<string, number>;
  domainBlacklist: Set<string>;
  success: number;
  fail: number;
  diskPaused: boolean;

  constructor(stmts: Statements) {
    this.stmts = stmts;
    this.nodeCount = 0;
    this.frontierCount = 0;
    this.domainPop = [];
    this.domainNodeCount = new Map();
    this.domainInflight = new Map();
    this.domainSuccess = new Map();
    this.domainFail = new Map();
    this.domainBlacklist = new Set();
    this.success = 0;
    this.fail = 0;
    this.diskPaused = false;
  }

  refresh(): void {
    try {
      this.nodeCount = this.stmts.nodeCount.get().c;
      this.frontierCount = this.stmts.frontierCount.get().c;
      this.domainPop = this.stmts.domainPopStmt.all();
    } catch(e) {}
  }

  fullRefresh(): void {
    try {
      this.refresh();
      const dc = this.stmts.domainCountStmt.all();
      this.domainNodeCount.clear();
      for (const r of dc) this.domainNodeCount.set(r.domain, r.c);
    } catch(e) {}
  }

  getDomainCount(domain: string): number {
    return this.domainNodeCount.get(domain) || 0;
  }

  incrementDomainCount(domain: string): void {
    this.domainNodeCount.set(domain, (this.domainNodeCount.get(domain) || 0) + 1);
  }

  recordDomainSuccess(domain: string): void {
    this.domainSuccess.set(domain, (this.domainSuccess.get(domain) || 0) + 1);
  }

  recordDomainFail(domain: string): void {
    this.domainFail.set(domain, (this.domainFail.get(domain) || 0) + 1);
    const ok = this.domainSuccess.get(domain) || 0;
    const fail = this.domainFail.get(domain)!;
    const total = ok + fail;
    if (total >= 20 && fail / total > 0.9) {
      this.domainBlacklist.add(domain);
    }
  }

  isDomainBlacklisted(domain: string): boolean {
    return this.domainBlacklist.has(domain);
  }

  getInflight(domain: string): number {
    return this.domainInflight.get(domain) || 0;
  }

  setInflight(domain: string, val: number): void {
    this.domainInflight.set(domain, Math.max(0, val));
  }
}

export { createDb, createStatements, createTransactions, CrawlState };
