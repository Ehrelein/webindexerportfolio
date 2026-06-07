import { Pool, PoolClient, QueryResult } from "pg";
import { Statements, Transactions, DomainPop } from "./types";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  pool = new Pool({
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432"),
    database: process.env.PG_DATABASE || "webindexer",
    user: process.env.PG_USER || "webindexer",
    password: process.env.PG_PASSWORD || "webindexer",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool.on("error", (err) => {
    console.error("[pg] pool error:", err.message);
  });
  return pool;
}

async function initPgSchema(): Promise<void> {
  const p = getPool();
  await p.query(`
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
      crawled_at BIGINT
    );
    CREATE TABLE IF NOT EXISTS visited (
      url TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS frontier (
      id SERIAL PRIMARY KEY,
      url TEXT UNIQUE,
      depth INTEGER DEFAULT 0,
      parent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_frontier_url ON frontier(url);
    CREATE INDEX IF NOT EXISTS idx_nodes_domain ON nodes(domain);
    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent);
  `);

  try {
    await p.query(`
      CREATE INDEX IF NOT EXISTS idx_nodes_fts_gin ON nodes
      USING gin(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(metaDescription,'') || ' ' || coalesce(ogTitle,'') || ' ' || coalesce(domain,'')));
    `);
  } catch (e) {
    console.log("[pg] gin index skip:", (e as Error).message);
  }

  console.log("[pg] schema initialized");
}

async function createPgStatements(): Promise<Statements> {
  const p = getPool();
  return {
    insertNode: {
      run: async (url: string, title: string, desc: string, dom: string, depth: number, parent: string, pop: number, lang: string, https: number, meta: string, ogt: string, ogd: string, clen: number, ts: number) => {
        await p.query(
          `INSERT INTO nodes (url, title, description, domain, depth, parent, popularity, lang, https, metaDescription, ogTitle, ogDescription, contentLength, crawled_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT (url) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, popularity=EXCLUDED.popularity, crawled_at=EXCLUDED.crawled_at`,
          [url, title, desc, dom, depth, parent, pop, lang, https, meta, ogt, ogd, clen, ts]
        );
      },
    } as any,
    markVisited: {
      run: async (url: string) => {
        await p.query(`INSERT INTO visited (url) VALUES ($1) ON CONFLICT DO NOTHING`, [url]);
      },
    } as any,
    isVisited: {
      get: async (url: string) => {
        const r = await p.query(`SELECT 1 FROM visited WHERE url = $1`, [url]);
        return r.rows[0] || null;
      },
    } as any,
    insertFrontier: {
      run: async (url: string, depth: number, parent: string) => {
        await p.query(
          `INSERT INTO frontier (url, depth, parent) VALUES ($1,$2,$3) ON CONFLICT (url) DO NOTHING`,
          [url, depth, parent]
        );
      },
    } as any,
    getBatch: {
      all: async (cursor: number, limit: number) => {
        const r = await p.query(
          `SELECT url, depth, parent, id FROM frontier WHERE id > $1 ORDER BY id ASC LIMIT $2`,
          [cursor, limit]
        );
        return r.rows;
      },
    } as any,
    getMinId: {
      get: async () => {
        const r = await p.query(`SELECT MIN(id) as m FROM frontier`);
        return r.rows[0];
      },
    } as any,
    deleteFromFrontier: {
      run: async (url: string) => {
        await p.query(`DELETE FROM frontier WHERE url = $1`, [url]);
      },
    } as any,
    clearProcessed: {
      run: async () => {
        await p.query(
          `DELETE FROM frontier WHERE id IN (SELECT f.id FROM frontier f INNER JOIN visited v ON f.url = v.url LIMIT 10000)`
        );
      },
    } as any,
    nodeCount: {
      get: async () => {
        const r = await p.query(`SELECT COUNT(*) as c FROM nodes`);
        return r.rows[0];
      },
    } as any,
    frontierCount: {
      get: async () => {
        const r = await p.query(`SELECT COUNT(*) as c FROM frontier`);
        return r.rows[0];
      },
    } as any,
    domainPopStmt: {
      all: async () => {
        const r = await p.query(`SELECT domain, COUNT(*) as c FROM nodes GROUP BY domain ORDER BY c DESC LIMIT 20`);
        return r.rows;
      },
    } as any,
    domainCountStmt: {
      all: async () => {
        const r = await p.query(`SELECT domain, COUNT(*) as c FROM nodes GROUP BY domain`);
        return r.rows;
      },
    } as any,
    insertFts: {
      run: async (_url: string, _title: string, _desc: string, _meta: string, _ogt: string, _ogd: string, _dom: string) => {
        // PostgreSQL: FTS is done via GIN index automatically, no separate table needed
      },
    } as any,
    ftsCount: {
      get: async () => {
        const r = await p.query(`SELECT COUNT(*) as c FROM nodes`);
        return r.rows[0];
      },
    } as any,
    rebuildFts: {
      run: async () => {
        // No-op for PostgreSQL — GIN index is automatic
      },
    } as any,
    treeLight: {
      all: async (limit: number) => {
        const r = await p.query(
          `SELECT url, title, domain, depth, parent, popularity, https FROM nodes ORDER BY crawled_at DESC LIMIT $1`,
          [limit]
        );
        return r.rows;
      },
    } as any,
    searchFts: {
      all: async (query: string, limit: number) => {
        const r = await p.query(
          `SELECT url, title, description, domain,
                  ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')), plainto_tsquery('english', $1)) as rank
           FROM nodes
           WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')) @@ plainto_tsquery('english', $1)
           ORDER BY rank DESC LIMIT $2`,
          [query, limit]
        );
        return r.rows;
      },
    } as any,
    recrawlTargets: {
      all: async (limit: number) => {
        const r = await p.query(`SELECT url FROM nodes ORDER BY RANDOM() LIMIT $1`, [limit]);
        return r.rows;
      },
    } as any,
  };
}

class PgCrawlState {
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

  async refresh(): Promise<void> {
    try {
      const nc = await this.stmts.nodeCount.get();
      this.nodeCount = parseInt(nc.c) || 0;
      const fc = await this.stmts.frontierCount.get();
      this.frontierCount = parseInt(fc.c) || 0;
      this.domainPop = await this.stmts.domainPopStmt.all();
    } catch (e) {}
  }

  async fullRefresh(): Promise<void> {
    try {
      await this.refresh();
      const dc = await this.stmts.domainCountStmt.all();
      this.domainNodeCount.clear();
      for (const r of dc) this.domainNodeCount.set(r.domain, parseInt(r.c) || 0);
    } catch (e) {}
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

async function createPgTransactions(stmts: Statements): Promise<Transactions> {
  const p = getPool();

  const saveNode = async (d: any) => {
    const client: PoolClient = await p.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO nodes (url, title, description, domain, depth, parent, popularity, lang, https, metaDescription, ogTitle, ogDescription, contentLength, crawled_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (url) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, domain=EXCLUDED.domain, depth=EXCLUDED.depth, parent=EXCLUDED.parent, popularity=EXCLUDED.popularity, lang=EXCLUDED.lang, https=EXCLUDED.https, metaDescription=EXCLUDED.metaDescription, ogTitle=EXCLUDED.ogTitle, ogDescription=EXCLUDED.ogDescription, contentLength=EXCLUDED.contentLength, crawled_at=EXCLUDED.crawled_at`,
        [d.url, d.title, d.desc, d.dom, d.depth, d.parent, d.pop, d.lang, d.https, d.meta, d.ogt, d.ogd, d.clen, d.ts]
      );
      await client.query(`INSERT INTO visited (url) VALUES ($1) ON CONFLICT DO NOTHING`, [d.url]);
      await client.query(`DELETE FROM frontier WHERE url = $1`, [d.url]);
      if (d.origUrl !== d.url) {
        await client.query(`INSERT INTO visited (url) VALUES ($1) ON CONFLICT DO NOTHING`, [d.origUrl]);
        await client.query(`DELETE FROM frontier WHERE url = $1`, [d.origUrl]);
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  };

  const insertManyFrontier = async (items: any[]) => {
    const client: PoolClient = await p.connect();
    try {
      await client.query("BEGIN");
      for (const i of items) {
        await client.query(
          `INSERT INTO frontier (url, depth, parent) VALUES ($1,$2,$3) ON CONFLICT (url) DO NOTHING`,
          [i.url, i.depth, i.parent]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  };

  return { saveNode, insertManyFrontier };
}

async function closePg(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export { getPool, initPgSchema, createPgStatements, createPgTransactions, PgCrawlState, closePg };
