# Tech Debt Registry

## Priority: Critical (Fix ASAP)

| ID | Описание | Влияние | Effort | Статус |
|----|----------|---------|--------|--------|
| TD-001 | setInterval без cleanup в queue.js | Memory leak potential | 2h | Open |
| TD-002 | DNS cache не имеет TTL expiration | Stale entries | 1h | Open |
| TD-003 | No graceful shutdown (SIGTERM) | Data loss on deploy | 3h | Open |

## Priority: High (Fix this month)

| ID | Описание | Влияние | Effort | Статус |
|----|----------|---------|--------|--------|
| TD-004 | No request tracing (trace ID) | Debugging difficulty | 4h | Open |
| TD-005 | No health check endpoints | K8s probes fail | 2h | Open |
| TD-006 | Rate limiting in-memory only | Doesn't work multi-instance | 3h | Open |
| TD-007 | No database migrations | Schema evolution hard | 4h | Open |
| TD-008 | Hardcoded VPS IP in config | Not portable | 1h | Open |

## Priority: Medium (Fix this quarter)

| ID | Описание | Влияние | Effort | Статус |
|----|----------|---------|--------|--------|
| TD-009 | No connection pooling | Performance under load | 3h | Open |
| TD-010 | No circuit breaker for HTTP | Cascade failures | 4h | Open |
| TD-011 | No retry with backoff | Flaky network | 2h | Open |
| TD-012 | TypeScript types not used | No type safety | 8h | Open |
| TD-013 | No API versioning | Breaking changes | 2h | Open |

## Priority: Low (Backlog)

| ID | Описание | Влияние | Effort | Статус |
|----|----------|---------|--------|--------|
| TD-014 | No E2E tests | Regression risk | 8h | Open |
| TD-015 | No load test in CI | Performance regression | 4h | Open |
| TD-016 | No structured error codes | Error handling inconsistency | 3h | Open |
| TD-017 | No request validation library | Manual validation | 2h | Open |

## Resolved

| ID | Описание | Решено | Дата |
|----|----------|--------|------|
| TD-018 | Old TS files in repo | Deleted src/__tests__, src/internal, src/cmd | 2024-01 |
| TD-019 | Log files in git | Added *.log to .gitignore | 2024-01 |
| TD-020 | package.json name wrong | Renamed to webindexerportfolio | 2024-01 |
| TD-021 | No rate limiting | Added ratelimit.js | 2024-01 |
| TD-022 | No structured logging | Added pino logger | 2024-01 |
| TD-023 | No API docs | Added Swagger UI | 2024-01 |
| TD-024 | No Prometheus metrics | Added /metrics endpoint | 2024-01 |

## How to Add

```markdown
| TD-XXX | Description | Impact | Effort | Status |
```

- **Impact**: Critical/High/Medium/Low
- **Effort**: Hours estimate
- **Status**: Open/In Progress/Resolved/Won't Fix
