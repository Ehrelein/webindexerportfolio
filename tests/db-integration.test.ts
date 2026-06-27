import path from "path";
import fs from "fs";
import { createDb, createStatements, createTransactions, CrawlState } from "../src/db";
import Database from 'better-sqlite3';

let db: InstanceType<typeof Database>;
let stmts: ReturnType<typeof createStatements>;
let txn: ReturnType<typeof createTransactions>;
const TEST_DB: string = path.join(__dirname, "test_integration.db");

beforeAll(() => {
  [".db", ".db-wal", ".db-shm"].forEach((ext: string) => {
    const f = TEST_DB + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
  db = new Database(TEST_DB);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -8000");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (url TEXT PRIMARY KEY, title TEXT DEFAULT '', description TEXT DEFAULT '', domain TEXT DEFAULT '', depth INTEGER DEFAULT 0, parent TEXT, popularity INTEGER DEFAULT 1, lang TEXT DEFAULT '', https INTEGER DEFAULT 0, metaDescription TEXT DEFAULT '', ogTitle TEXT DEFAULT '', ogDescription TEXT DEFAULT '', contentLength INTEGER DEFAULT 0, crawled_at INTEGER);
    CREATE TABLE IF NOT EXISTS visited (url TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS frontier (id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT UNIQUE, depth INTEGER DEFAULT 0, parent TEXT);
    CREATE INDEX IF NOT EXISTS idx_frontier_url ON frontier(url);
    CREATE INDEX IF NOT EXISTS idx_nodes_domain ON nodes(domain);
    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent);
    CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(url, title, description, metaDescription, ogTitle, ogDescription, domain);
  `);
  stmts = createStatements(db);
  txn = createTransactions(db, stmts);
});

afterAll(() => {
  if (db) db.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
  [".db", ".db-wal", ".db-shm"].forEach((ext: string) => {
    const f = TEST_DB + ext;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });
});

interface NodeData {
  url: string;
  title: string;
  desc: string;
  dom: string;
  depth: number;
  parent: string | null;
  pop: number;
  lang: string;
  https: number;
  meta: string;
  ogt: string;
  ogd: string;
  clen: number;
  ts: number;
  origUrl: string;
}

describe("DB → API integration", () => {
  test("insert node and query via FTS", () => {
    const node: NodeData = {
      url: "https://example.com/test",
      title: "Test Page for Integration",
      desc: "A test description",
      dom: "example.com",
      depth: 1,
      parent: "https://example.com",
      pop: 5,
      lang: "en",
      https: 1,
      meta: "test meta description",
      ogt: "Test OG Title",
      ogd: "Test OG Description",
      clen: 1024,
      ts: Date.now(),
      origUrl: "https://example.com/test",
    };

    txn.saveNode(node);

    const count = (stmts.nodeCount.get() as { c: number }).c;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("FTS search returns inserted content", () => {
    const results: Array<{ url: string; title: string }> = db.prepare(
      `SELECT url, title FROM nodes_fts WHERE nodes_fts MATCH 'integration*' LIMIT 5`
    ).all() as Array<{ url: string; title: string }>;

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toContain("Integration");
  });

  test("insert batch of frontier items", () => {
    const items: Array<{ url: string; depth: number; parent: string }> = [];
    for (let i = 0; i < 10; i++) {
      items.push({ url: `https://batch.test/page${i}`, depth: 2, parent: "https://batch.test" });
    }
    txn.insertManyFrontier(items);

    const count = (stmts.frontierCount.get() as { c: number }).c;
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test("getBatch returns items in order", () => {
    const batch = stmts.getBatch.all(0, 5) as Array<{ id: number; url: string }>;
    expect(batch.length).toBeLessThanOrEqual(5);
    expect(batch.length).toBeGreaterThan(0);
    if (batch.length > 1) {
      expect(batch[0].id).toBeLessThan(batch[batch.length - 1].id);
    }
  });

  test("mark visited and check", () => {
    stmts.markVisited.run("https://visited.test/page1");
    const visited = stmts.isVisited.get("https://visited.test/page1");
    expect(visited).toBeTruthy();

    const notVisited = stmts.isVisited.get("https://notvisited.test/page1");
    expect(notVisited).toBeFalsy();
  });

  test("duplicate insert is ignored", () => {
    stmts.insertFrontier.run("https://dupe.test/page", 0, null);
    stmts.insertFrontier.run("https://dupe.test/page", 0, null);

    const results = db.prepare(`SELECT COUNT(*) as c FROM frontier WHERE url = 'https://dupe.test/page'`).get() as { c: number };
    expect(results.c).toBe(1);
  });

  test("domain count aggregation works", () => {
    for (let i = 0; i < 5; i++) {
      stmts.insertNode.run(
        `https://counting.test/page${i}`, `Page ${i}`, "", "counting.test",
        0, null, 1, "en", 0, "", "", "", 100, Date.now()
      );
    }

    const domains = stmts.domainPopStmt.all() as Array<{ domain: string; c: number }>;
    expect(domains.length).toBeGreaterThan(0);
    const counting = domains.find((d: { domain: string; c: number }) => d.domain === "counting.test");
    expect(counting).toBeDefined();
    expect(counting!.c).toBe(5);
  });

  test("CrawlState refresh works", () => {
    const state = new CrawlState(stmts);
    state.refresh();
    expect(state.nodeCount).toBeGreaterThan(0);
    expect(state.frontierCount).toBeGreaterThan(0);
  });
});

describe("Frontier lifecycle", () => {
  test("cleanup removes visited from frontier", () => {
    stmts.insertFrontier.run("https://cleanup.test/to_delete", 0, null);
    stmts.markVisited.run("https://cleanup.test/to_delete");

    db.exec(`DELETE FROM frontier WHERE id IN (SELECT f.id FROM frontier f INNER JOIN visited v ON f.url = v.url LIMIT 100)`);

    const remaining = db.prepare(`SELECT 1 FROM frontier WHERE url = 'https://cleanup.test/to_delete'`).get();
    expect(remaining).toBeUndefined();
  });

  test("deleteFromFrontier works", () => {
    stmts.insertFrontier.run("https://del.test/page", 0, null);
    stmts.deleteFromFrontier.run("https://del.test/page");
    const found = db.prepare(`SELECT 1 FROM frontier WHERE url = 'https://del.test/page'`).get();
    expect(found).toBeUndefined();
  });
});
