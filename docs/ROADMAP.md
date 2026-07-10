# Roadmap

## Q1 2024: Foundation (текущий)

### Milestone 1.1: Core Crawler ✅
- [x] Modular architecture (config, db, fetcher, seeds, queue, tree, html)
- [x] SQLite with WAL mode, FTS5
- [x] Concurrent crawling (15 workers)
- [x] Domain rate limiting (15 concurrent, 200 max/domain)
- [x] robots.txt support
- [x] DNS caching

### Milestone 1.2: Dashboard ✅
- [x] Force-directed graph visualization
- [x] Real-time stats (pg/s, error rate, uptime)
- [x] Google-like search page
- [x] Gzip compression

### Milestone 1.3: Production ✅
- [x] pm2 process management
- [x] VPS deployment (vps.js)
- [x] Disk monitoring (auto-pause)
- [x] Memory management (GC hints, 350MB limit)
- [x] Structured logging (pino)
- [x] Rate limiting (per-IP)
- [x] API documentation (Swagger)
- [x] Prometheus metrics
- [x] CI/CD (GitHub Actions)

### Milestone 1.4: Testing ✅
- [x] 46+ tests
- [x] Integration tests (server API)
- [x] Load test scripts (k6)
- [x] Chaos test script

---

## Q2 2024: Reliability

### Milestone 2.1: Graceful Shutdown
- [ ] SIGTERM handler
- [ ] Connection draining
- [ ] Cleanup on exit
- [ ] Health check endpoints (/health/live, /health/ready)

### Milestone 2.2: Resilience
- [ ] Circuit breaker for HTTP requests
- [ ] Retry with exponential backoff + jitter
- [ ] Dead letter queue (Kafka)
- [ ] Fallback strategies

### Milestone 2.3: Observability
- [ ] Request tracing (trace ID)
- [ ] Structured request logging
- [ ] Grafana dashboard (importable JSON)
- [ ] Alerting rules (Prometheus)

### Milestone 2.4: Security
- [ ] CSP + security headers
- [ ] Input validation + sanitization
- [ ] Secrets management (.env)
- [ ] Rate limiting on Redis (multi-instance)

---

## Q3 2024: Scale

### Milestone 3.1: Performance
- [ ] Connection pooling
- [ ] Batch operations optimization
- [ ] Stream processing for large responses
- [ ] Load testing in CI

### Milestone 3.2: Distributed
- [ ] Multi-region support (2+ VPS)
- [ ] SQLite replication (rsync)
- [ ] Kafka integration (distributed queue)
- [ ] Redis integration (shared cache)

### Milestone 3.3: Database
- [ ] Database migrations (versioned schema)
- [ ] Read replicas (SQLite WAL readers)
- [ ] Backup automation
- [ ] Data retention policies

---

## Q4 2024: Enterprise

### Milestone 4.1: Multi-tenancy
- [ ] Tenant isolation
- [ ] Per-tenant quotas
- [ ] Billing integration

### Milestone 4.2: Analytics
- [ ] Crawl analytics dashboard
- [ ] Domain popularity trends
- [ ] Search analytics
- [ ] Cost tracking

### Milestone 4.3: Advanced Features
- [ ] CQRS (read/write separation)
- [ ] Event sourcing (Kafka events)
- [ ] Webhook notifications
- [ ] API key authentication

---

## Timeline Summary

```
Q1 2024: Foundation     ████████████████████ 100%
Q2 2024: Reliability    ░░░░░░░░░░░░░░░░░░░░   0%
Q3 2024: Scale          ░░░░░░░░░░░░░░░░░░░░   0%
Q4 2024: Enterprise     ░░░░░░░░░░░░░░░░░░░░   0%
```

## Success Metrics

| Metric | Current | Q2 Target | Q4 Target |
|--------|---------|-----------|-----------|
| Pages indexed | 200K | 1M | 5M |
| Test coverage | 57% | 75% | 85% |
| Error rate | 7-19% | <10% | <5% |
| Latency p95 | 12ms | <50ms | <100ms |
| Uptime | 99.5% | 99.9% | 99.99% |
