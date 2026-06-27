import { getMetrics } from "../src/metrics";

describe("getMetrics", () => {
  test("returns Prometheus format", () => {
    const m: string = getMetrics({ nodeCount: 100, frontierCount: 50, success: 80, fail: 20, domainsChecked: 10, domainsBlacklisted: 0, totalFetchTime: 0, concurrency: 1 } as any);
    expect(m).toContain("# HELP webindexer_nodes_total");
    expect(m).toContain("# TYPE webindexer_nodes_total gauge");
    expect(m).toContain("webindexer_nodes_total 100");
    expect(m).toContain("webindexer_frontier_total 50");
    expect(m).toContain("webindexer_success_total 80");
    expect(m).toContain("webindexer_fail_total 20");
    expect(m).toContain("webindexer_domains_total 10");
  });

  test("handles zero values", () => {
    const m: string = getMetrics({ nodeCount: 0, frontierCount: 0, success: 0, fail: 0, domainsChecked: 0, domainsBlacklisted: 0, totalFetchTime: 0, concurrency: 0 } as any);
    expect(m).toContain("webindexer_nodes_total 0");
    expect(m).toContain("webindexer_frontier_total 0");
    expect(m).toContain("webindexer_pages_per_second 0");
  });

  test("includes CPU and memory metrics", () => {
    const m: string = getMetrics({ nodeCount: 10, frontierCount: 5, success: 8, fail: 2, domainsChecked: 3, domainsBlacklisted: 0, totalFetchTime: 0, concurrency: 0 } as any);
    expect(m).toContain("# HELP webindexer_cpu_load");
    expect(m).toContain("# HELP webindexer_memory_rss_bytes");
    expect(m).toContain("# HELP webindexer_memory_heap_used_bytes");
    expect(m).toContain("# HELP webindexer_uptime_seconds");
  });

  test("includes new metrics", () => {
    const m: string = getMetrics({ nodeCount: 10, frontierCount: 5, success: 8, fail: 2, domainsChecked: 3, domainsBlacklisted: 1, totalFetchTime: 5000, concurrency: 15 } as any);
    expect(m).toContain("webindexer_domains_blacklisted 1");
    expect(m).toContain("webindexer_error_rate_pct");
    expect(m).toContain("webindexer_avg_fetch_latency_ms");
    expect(m).toContain("webindexer_concurrency 15");
  });
});
