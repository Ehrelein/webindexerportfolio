import { createDb, createStatements, createTransactions, CrawlState } from '../src/db';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

const TEST_DB: string = path.join(__dirname, 'test.db');

function cleanup(): void {
  try { fs.unlinkSync(TEST_DB); } catch {}
  try { fs.unlinkSync(TEST_DB + '-wal'); } catch {}
  try { fs.unlinkSync(TEST_DB + '-shm'); } catch {}
}

beforeEach(cleanup);
afterAll(cleanup);

describe('db', () => {
  let db: InstanceType<typeof Database>;
  let stmts: ReturnType<typeof createStatements>;
  let txn: ReturnType<typeof createTransactions>;

  beforeEach(() => {
    db = new Database(TEST_DB);
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        url TEXT PRIMARY KEY, title TEXT DEFAULT '', description TEXT DEFAULT '',
        domain TEXT DEFAULT '', depth INTEGER DEFAULT 0, parent TEXT,
        popularity INTEGER DEFAULT 1, lang TEXT DEFAULT '', https INTEGER DEFAULT 0,
        metaDescription TEXT DEFAULT '', ogTitle TEXT DEFAULT '', ogDescription TEXT DEFAULT '',
        contentLength INTEGER DEFAULT 0, crawled_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS visited (url TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS frontier (
        id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT UNIQUE,
        depth INTEGER DEFAULT 0, parent TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_frontier_url ON frontier(url);
      CREATE INDEX IF NOT EXISTS idx_nodes_domain ON nodes(domain);
      CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(url, title, description, metaDescription, ogTitle, ogDescription, domain);
    `);
    stmts = createStatements(db);
    txn = createTransactions(db, stmts);
  });

  afterEach(() => { try { db.close(); } catch {} });

  describe('statements', () => {
    test('insertNode inserts a node', () => {
      stmts.insertNode.run('https://example.com', 'Example', 'Desc', 'example.com', 0, null, 1, 'en', 1, '', '', '', 1000, Date.now());
      const count = stmts.nodeCount.get();
      expect((count as { c: number }).c).toBe(1);
    });

    test('insertFrontier inserts URL', () => {
      stmts.insertFrontier.run('https://example.com', 0, null);
      const count = stmts.frontierCount.get();
      expect((count as { c: number }).c).toBe(1);
    });

    test('isVisited returns null for unvisited', () => {
      expect(stmts.isVisited.get('https://example.com')).toBeUndefined();
    });

    test('markVisited + isVisited works', () => {
      stmts.markVisited.run('https://example.com');
      expect(stmts.isVisited.get('https://example.com')).toBeDefined();
    });

    test('getBatch returns URLs in order', () => {
      stmts.insertFrontier.run('https://a.com', 0, null);
      stmts.insertFrontier.run('https://b.com', 1, null);
      stmts.insertFrontier.run('https://c.com', 2, null);
      const batch = stmts.getBatch.all(0, 10) as Array<{ url: string }>;
      expect(batch.length).toBe(3);
      expect(batch[0].url).toBe('https://a.com');
      expect(batch[1].url).toBe('https://b.com');
    });

    test('domainCountStmt groups by domain', () => {
      stmts.insertNode.run('https://a.com/p1', '', '', 'a.com', 0, null, 1, '', 0, '', '', '', 0, Date.now());
      stmts.insertNode.run('https://a.com/p2', '', '', 'a.com', 0, null, 1, '', 0, '', '', '', 0, Date.now());
      stmts.insertNode.run('https://b.com/p1', '', '', 'b.com', 0, null, 1, '', 0, '', '', '', 0, Date.now());
      const counts = stmts.domainCountStmt.all() as Array<{ domain: string; c: number }>;
      expect(counts.length).toBe(2);
      const a = counts.find((r: { domain: string; c: number }) => r.domain === 'a.com');
      expect(a!.c).toBe(2);
    });
  });

  describe('transactions', () => {
    test('saveNode inserts node, marks visited, removes from frontier', () => {
      stmts.insertFrontier.run('https://example.com', 0, null);
      expect((stmts.frontierCount.get() as { c: number }).c).toBe(1);

      txn.saveNode({
        url: 'https://example.com', title: 'Example', desc: 'Desc', dom: 'example.com',
        depth: 0, parent: null, pop: 1, lang: 'en', https: 1, meta: '', ogt: '', ogd: '',
        clen: 1000, ts: Date.now(), origUrl: 'https://example.com'
      });

      expect((stmts.nodeCount.get() as { c: number }).c).toBe(1);
      expect(stmts.isVisited.get('https://example.com')).toBeDefined();
      expect((stmts.frontierCount.get() as { c: number }).c).toBe(0);
    });

    test('insertManyFrontier inserts multiple URLs', () => {
      const items = [
        { url: 'https://a.com', depth: 0, parent: null },
        { url: 'https://b.com', depth: 1, parent: 'https://a.com' },
        { url: 'https://c.com', depth: 2, parent: 'https://b.com' },
      ];
      txn.insertManyFrontier(items);
      expect((stmts.frontierCount.get() as { c: number }).c).toBe(3);
    });

    test('saveNode handles redirect (different origUrl)', () => {
      stmts.insertFrontier.run('https://old.com', 0, null);
      txn.saveNode({
        url: 'https://new.com', title: 'Moved', desc: '', dom: 'new.com',
        depth: 0, parent: null, pop: 1, lang: '', https: 1, meta: '', ogt: '', ogd: '',
        clen: 500, ts: Date.now(), origUrl: 'https://old.com'
      });
      expect((stmts.nodeCount.get() as { c: number }).c).toBe(1);
      expect(stmts.isVisited.get('https://old.com')).toBeDefined();
    });
  });

  describe('CrawlState', () => {
    test('refresh loads counts', () => {
      stmts.insertNode.run('https://a.com', '', '', 'a.com', 0, null, 1, '', 0, '', '', '', 0, Date.now());
      stmts.insertFrontier.run('https://b.com', 0, null);
      const state = new CrawlState(stmts);
      state.refresh();
      expect(state.nodeCount).toBe(1);
      expect(state.frontierCount).toBe(1);
    });

    test('fullRefresh loads domain counts', () => {
      stmts.insertNode.run('https://a.com/p1', '', '', 'a.com', 0, null, 1, '', 0, '', '', '', 0, Date.now());
      stmts.insertNode.run('https://a.com/p2', '', '', 'a.com', 0, null, 1, '', 0, '', '', '', 0, Date.now());
      stmts.insertNode.run('https://b.com/p1', '', '', 'b.com', 0, null, 1, '', 0, '', '', '', 0, Date.now());
      const state = new CrawlState(stmts);
      state.fullRefresh();
      expect(state.getDomainCount('a.com')).toBe(2);
      expect(state.getDomainCount('b.com')).toBe(1);
      expect(state.getDomainCount('c.com')).toBe(0);
    });

    test('incrementDomainCount works in-memory', () => {
      const state = new CrawlState(stmts);
      state.incrementDomainCount('test.com');
      expect(state.getDomainCount('test.com')).toBe(1);
      state.incrementDomainCount('test.com');
      expect(state.getDomainCount('test.com')).toBe(2);
    });

    test('inflight tracking', () => {
      const state = new CrawlState(stmts);
      expect(state.getInflight('a.com')).toBe(0);
      state.setInflight('a.com', 3);
      expect(state.getInflight('a.com')).toBe(3);
      state.setInflight('a.com', -1);
      expect(state.getInflight('a.com')).toBe(0);
    });
  });
});
