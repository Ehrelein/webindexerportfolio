-- Migration 002: Add performance indexes
-- Version: 002
-- Created: 2024-01-15
-- Description: Add indexes for better query performance

BEGIN TRANSACTION;

CREATE INDEX IF NOT EXISTS idx_nodes_crawled_at ON nodes(crawled_at);
CREATE INDEX IF NOT EXISTS idx_nodes_https ON nodes(https);
CREATE INDEX IF NOT EXISTS idx_nodes_lang ON nodes(lang);
CREATE INDEX IF NOT EXISTS idx_nodes_depth ON nodes(depth);
CREATE INDEX IF NOT EXISTS idx_nodes_popularity ON nodes(popularity);
CREATE INDEX IF NOT EXISTS idx_frontier_depth ON frontier(depth);

INSERT INTO schema_migrations (version, name) VALUES (2, 'performance_indexes');

COMMIT;
