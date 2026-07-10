# Capacity Plan

## Текущая конфигурация (v1.0)

| Компонент | Ресурс | Макс. нагрузка |
|-----------|--------|-----------------|
| **VPS** | 1 CPU, 1GB RAM, 25GB SSD | ~14 pg/s, 200K+ nodes |
| **SQLite** | WAL, busy_timeout=15s | ~50K writes/s |
| **Node.js** | max-memory-restart=350M | ~15 concurrent fetches |
| **Disk** | auto-pause at 500MB / 80% | ~200K pages before pause |

## Прогноз на 3 месяца

| Метрика | Текущее | Через 1 мес | Через 3 мес |
|---------|---------|-------------|-------------|
| Pages indexed | 200K | 1M | 5M |
| Domains | 774 | 3,000 | 15,000 |
| Frontier | ~50K | ~200K | ~500K |
| Disk usage | ~2GB | ~8GB | ~20GB |
| pg/s | 14 | 14 | 14 (bottleneck: network) |

## Масштабирование

### Tier 1: Horizontal (добавить CPU)
- **Текущее**: 1 CPU, 15 concurrent
- **Цель**: 2 CPU, 30 concurrent
- **Эффект**: ~28 pg/s, 2x скорость
- **Стоимость**: $5 → $10/mo (Vultr)

### Tier 2: Vertical (добавить RAM + disk)
- **Текущее**: 1GB RAM, 25GB SSD
- **Цель**: 2GB RAM, 50GB SSD
- **Эффект**: до 1M nodes before disk pause
- **Стоимость**: $5 → $10/mo

### Tier 3: Multi-region
- **Архитектура**: 2+ VPS, SQLite replication через rsync
- **Эффект**: fault tolerance, read scaling
- **Стоимость**: $10 → $20/mo

### Tier 4: Production stack (Kafka + ES)
- **Архитектура**: 3-node Kafka cluster, 3-node ES cluster
- **Эффект**: 10x throughput, full-text search, dedup
- **Стоимость**: $200+/mo (cloud) vs $0 (self-hosted VPS)

## Cost Breakdown

### Self-hosted (текущая модель)

| Компонент | Стоимость | Альтернатива (cloud) |
|-----------|-----------|----------------------|
| VPS (Vultr 1CPU/1GB) | $5/mo | EC2 t3.nano: $15/mo |
| SQLite | $0 | RDS PostgreSQL: $15/mo |
| Node.js PM2 | $0 | ECS Fargate: $30/mo |
| Domain + DNS | $1/mo | Route53: $1/mo |
| **Total** | **$6/mo** | **$61/mo** |

### Экономия: ~90% vs cloud

| Период | Self-hosted | Cloud (AWS) | Экономия |
|--------|-------------|-------------|----------|
| 1 месяц | $6 | $61 | $55 (90%) |
| 6 месяцев | $36 | $366 | $330 (90%) |
| 1 год | $72 | $732 | $660 (90%) |

## Bottlenecks

1. **Network** — 15 concurrent fetches limited by bandwidth (~100Mbps)
2. **Disk I/O** — SQLite writes bottleneck at ~50K ops/s
3. **DNS resolution** — in-memory cache helps, but cold starts = 2s
4. **Memory** — Node.js heap limit 350MB, GC pauses every 5s

## Scaling Decisions

| Решение | Выбор | Почему |
|---------|-------|--------|
| Database | SQLite (не Postgres) | Zero config, WAL足够快, 1 CPU bottleneck |
| Queue | SQLite frontier (не Kafka) | Проще, $0, достаточно для 1 worker |
| Cache | In-memory (не Redis) | Достаточно для single instance |
| Search | SQLite FTS5 (не ES) | Zero config, prefix matching足够 |

### Когда менять:

| Компонент | Менять когда | Миграция |
|-----------|-------------|----------|
| SQLite → Postgres | >1M nodes, >10 concurrent writers | pg_dump + import |
| Frontier → Kafka | >5 workers, need distributed queue | kafka-console-consumer |
| In-memory → Redis | >2 instances, need shared state | npm install ioredis |
| FTS5 → Elasticsearch | Need ranking, faceted search, >1M docs | reindex script |

## Load Testing Results

См. `load-test/` директорию.

| Тест | RPS | Latency p95 | Latency p99 | Errors |
|------|-----|-------------|-------------|--------|
| GET / | 450 | 12ms | 25ms | 0% |
| GET /api/stats | 380 | 15ms | 30ms | 0% |
| GET /api/search?q=test | 120 | 45ms | 80ms | 0% |
| GET /api/tree | 200 | 35ms | 60ms | 0% |
| GET /metrics | 500 | 8ms | 15ms | 0% |
| GET /docs | 420 | 10ms | 20ms | 0% |
