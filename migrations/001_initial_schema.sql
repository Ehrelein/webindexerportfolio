-- Migration 001: Initial schema
-- Version: 001
-- Created: 2024-01-01
-- Description: Initial database schema

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

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

CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
  url, title, description, metaDescription, ogTitle, ogDescription, domain
);

INSERT INTO schema_migrations (version, name) VALUES (1, 'initial_schema');

COMMIT;
