# SLO / SLI / Error Budget

## Service Level Objectives

| SLO | SLI | Target | Current | Error Budget |
|-----|-----|--------|---------|--------------|
| **Availability** | Successful requests / Total requests | 99.9% | ~99.5% | 43.8 min/month |
| **Latency (Dashboard)** | p95 response time for GET / | <200ms | ~12ms | 100% |
| **Latency (Search)** | p95 response time for GET /api/search | <500ms | ~45ms | 100% |
| **Crawl throughput** | Pages per second | >10 pg/s | ~14 pg/s | 100% |
| **Error rate** | Failed fetches / Total fetches | <15% | ~7-19% | varies |
| **Data freshness** | Max age of indexed page | <24h | ~1h | 100% |

## Error Budget Calculation

### Availability: 99.9%

```
Total minutes/month: 43,800
Error budget: 43,800 × 0.001 = 43.8 minutes
Current downtime: ~0 min (pm2 auto-restart)
Remaining budget: 43.8 min (100%)
```

### Crawl Error Rate: 15% threshold

```
Target: <15% error rate (4xx + 5xx + timeout)
Current: ~7-19% (varies by seed quality)
Status: BORDERLINE — some seeds produce 5xx
Action: Clean up bad seeds, add retry logic
```

## Alerting Rules

### Critical (Page immediately)

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| ServiceDown | health/live fails | 1 min | Restart pm2, check VPS |
| HighErrorRate | error rate > 30% | 5 min | Check disk, network, logs |
| DiskAlmostFull | usage > 90% | 1 min | cleanup, expand disk |

### Warning (Notify)

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| HighLatency | p95 > 500ms | 5 min | Check memory, CPU |
| LowThroughput | pg/s < 5 | 10 min | Check queue, DNS cache |
| MemoryHigh | RSS > 300MB | 5 min | Check for leaks, restart |

### Info (Log only)

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| SeedInjection | frontier < 10K | - | Normal behavior |
| DiskPause | disk paused | - | Check available space |
| FTSRebuild | FTS rebuilt | - | Normal maintenance |

## SLI Measurement

### Availability SLI

```javascript
// Measured at /api/stats endpoint
const availability = (success + fail) > 0
  ? (success / (success + fail)) * 100
  : 100;
```

### Latency SLI

```bash
# Load test with k6
k6 run --vus 10 --duration 30s load-test/api-stats.js
# Check: http_req_duration{scenario:"default"} p(95) < 200
```

### Throughput SLI

```bash
# Measured from crawler stats
# pg/s = success / uptime_seconds
# Target: >10 pg/s sustained
```

## Review Cadence

| Frequency | Action |
|-----------|--------|
| **Daily** | Check error budget burn rate |
| **Weekly** | Review SLO compliance, adjust thresholds |
| **Monthly** | Capacity planning, cost review |
| **Quarterly** | Architecture review, tech debt assessment |
