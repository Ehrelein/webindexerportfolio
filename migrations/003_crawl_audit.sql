-- Migration 003: Add crawl audit table
-- Version: 003
-- Created: 2024-02-01
-- Description: Track crawl history for analytics

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS crawl_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  pages_crawled INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  domains INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS domain_stats (
  domain TEXT PRIMARY KEY,
  pages_crawled INTEGER DEFAULT 0,
  last_crawled_at INTEGER,
  avg_response_time_ms INTEGER DEFAULT 0,
  error_rate REAL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_crawl_sessions_started ON crawl_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_domain_stats_pages ON domain_stats(pages_crawled);

INSERT INTO schema_migrations (version, name) VALUES (3, 'crawl_audit');

COMMIT;
