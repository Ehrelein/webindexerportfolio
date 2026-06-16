import os from "os";
import { getAllBreakers } from "./circuit";
import { CachedStats } from "./types";

let startTime: number = Date.now();

export function getMetrics(cached: CachedStats): string {
  const uptimeSec: number = Math.floor((Date.now() - startTime) / 1000);
  const cpuUsage: number = os.loadavg()[0] / os.cpus().length;
  const memUsage = process.memoryUsage();
  const rate: string = uptimeSec > 0 ? (cached.success / uptimeSec).toFixed(4) : "0";
  const total: number = cached.success + cached.fail;
  const errPct: string = total > 0 ? ((cached.fail / total) * 100).toFixed(2) : "0";
  const avgLatency: string = cached.success > 0 ? ((cached.totalFetchTime || 0) / cached.success).toFixed(0) : "0";

  const lines: string[] = [
    "# HELP webindexer_nodes_total Total indexed nodes",
    "# TYPE webindexer_nodes_total gauge",
    `webindexer_nodes_total ${cached.nodeCount}`,
    "",
    "# HELP webindexer_frontier_total URLs in frontier",
    "# TYPE webindexer_frontier_total gauge",
    `webindexer_frontier_total ${cached.frontierCount}`,
    "",
    "# HELP webindexer_success_total Total successful fetches",
    "# TYPE webindexer_success_total counter",
    `webindexer_success_total ${cached.success}`,
    "",
    "# HELP webindexer_fail_total Total failed fetches",
    "# TYPE webindexer_fail_total counter",
    `webindexer_fail_total ${cached.fail}`,
    "",
    "# HELP webindexer_error_rate_pct Error rate percentage",
    "# TYPE webindexer_error_rate_pct gauge",
    `webindexer_error_rate_pct ${errPct}`,
    "",
    "# HELP webindexer_domains_total Total unique domains checked",
    "# TYPE webindexer_domains_total gauge",
    `webindexer_domains_total ${cached.domainsChecked || 0}`,
    "",
    "# HELP webindexer_domains_blacklisted Auto-blacklisted domains",
    "# TYPE webindexer_domains_blacklisted gauge",
    `webindexer_domains_blacklisted ${cached.domainsBlacklisted || 0}`,
    "",
    "# HELP webindexer_pages_per_second Crawl throughput",
    "# TYPE webindexer_pages_per_second gauge",
    `webindexer_pages_per_second ${rate}`,
    "",
    "# HELP webindexer_avg_fetch_latency_ms Average fetch latency",
    "# TYPE webindexer_avg_fetch_latency_ms gauge",
    `webindexer_avg_fetch_latency_ms ${avgLatency}`,
    "",
    "# HELP webindexer_concurrency Current concurrent fetches",
    "# TYPE webindexer_concurrency gauge",
    `webindexer_concurrency ${cached.concurrency || 0}`,
    "",
    "# HELP webindexer_uptime_seconds Uptime in seconds",
    "# TYPE webindexer_uptime_seconds gauge",
    `webindexer_uptime_seconds ${uptimeSec}`,
    "",
    "# HELP webindexer_cpu_load Average CPU load",
    "# TYPE webindexer_cpu_load gauge",
    `webindexer_cpu_load ${cpuUsage.toFixed(4)}`,
    "",
    "# HELP webindexer_memory_rss_bytes Resident set size in bytes",
    "# TYPE webindexer_memory_rss_bytes gauge",
    `webindexer_memory_rss_bytes ${memUsage.rss}`,
    "",
    "# HELP webindexer_memory_heap_used_bytes Heap used in bytes",
    "# TYPE webindexer_memory_heap_used_bytes gauge",
    `webindexer_memory_heap_used_bytes ${memUsage.heapUsed}`,
  ];

  const breakers = getAllBreakers();
  for (const b of breakers) {
    lines.push("");
    lines.push(`# HELP webindexer_circuit_${b.name}_state Circuit breaker state (0=closed,1=open,2=half)`);
    lines.push(`# TYPE webindexer_circuit_${b.name}_state gauge`);
    const stateVal: number = b.state === "CLOSED" ? 0 : b.state === "OPEN" ? 1 : 2;
    lines.push(`webindexer_circuit_${b.name}_state ${stateVal}`);
    lines.push(`# HELP webindexer_circuit_${b.name}_failures Circuit breaker failure count`);
    lines.push(`# TYPE webindexer_circuit_${b.name}_failures gauge`);
    lines.push(`webindexer_circuit_${b.name}_failures ${b.failureCount || 0}`);
  }

  return lines.join("\n");
}

export function metricsHandler(cached: CachedStats) {
  return (req: any, res: any) => {
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(getMetrics(cached));
  };
}
