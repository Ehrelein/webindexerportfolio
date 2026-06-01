# WebIndexer

Production-grade веб-кроулер и поисковая система. Полная бэкенд-инфраструктура: PostgreSQL, Kafka, Redis, Elasticsearch, Prometheus, Grafana — Docker Compose или один VPS.

**400K+ проиндексированных страниц** на VPS за $6/мес. Продакшен-стек, а не учебный проект.

## Демо

- **Дашборд**: http://45.77.23.140:3000
- **Поиск**: http://45.77.23.140:3000/search
- **Метрики**: http://45.77.23.140:3000/metrics
- **Health Check**: http://45.77.23.140:3000/health/ready

## Стек технологий

| Уровень | Технология | Назначение |
|---------|-----------|-----------|
| **База данных** | PostgreSQL 16 | Connection pooling (20 conns), async I/O, tsvector полнотекстовый поиск с GIN-индексами |
| **Кэш** | Redis 7 | Распределённый sliding-window rate limiting, circuit breaker state, DNS-кэш, URL dedup |
| **Очередь сообщений** | Apache Kafka 7.5 | Распределённая очередь URL с domain-based partitioning (6 partitions), dead-letter queue, retry |
| **Поисковая система** | Elasticsearch 8 | Полнотекстовый индекс с fuzzy matching, multi-field boosting, highlight extraction |
| **Контейнеризация** | Docker Compose | 8-сервисный стек: PG + Redis + Kafka + Zookeeper + ES + App + Prometheus + Grafana |
| **Модель процессов** | child_process.fork() | Изолированный процесс кроулера, IPC обмен статистикой, автоперезапуск через PM2 |
| **Runtime** | Node.js 20 | Event-driven, non-blocking I/O |
| **Веб-сервер** | Express 4.18 | Middleware pipeline, trust proxy, gzip compression |
| **Структурированное логирование** | Pino | Самый быстрый Node.js логгер, JSON-вывод, child loggers |
| **Мониторинг** | Prometheus + Grafana | 14 пользовательских метрик, состояния circuit breaker'ов, дашборды, алерты |
| **Безопасность** | Helmet | CSP, HSTS, X-Frame-Options, input sanitization, request tracing |
| **Circuit Breaker** | Собственная реализация + Redis | 3-состояний автомат (CLOSED/OPEN/HALF_OPEN), exponential backoff, распределён через Redis |
| **CI/CD** | GitHub Actions | Matrix тесты на Node 18/20/22, автодеплой при пуше |

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│                   VPS (Ubuntu 22.04)                  │
│                                                        │
│  ┌──────────────┐    ┌──────────────────┐             │
│  │  Express API  │◄──►│  Crawler Process  │             │
│  │  (Port 3000)  │IPC │  (child_process)  │             │
│  │  Dashboard    │    │  CONCURRENCY=2    │             │
│  │  Search       │    │  DOMAINS=200      │             │
│  │  Health/Metrics│   │  Timeout=1.5s     │             │
│  └──────┬───────┘    └────────┬─────────┘             │
│         │                      │                       │
│  ┌──────▼──────────────────────▼─────────────┐        │
│  │              SQLite WAL (primary)           │        │
│  │  nodes / nodes_fts / frontier / settings    │        │
│  └────────────────────────────────────────────┘        │
│                                                        │
│  ┌────────────────────────────────────────────┐        │
│  │              Optional Backends               │        │
│  │  ┌──────────┐ ┌───────┐ ┌───────┐ ┌──────┐│        │
│  │  │PostgreSQL│ │ Redis │ │ Kafka │ │  ES  ││        │
│  │  │  (Pool)  │ │(Cache)│ │(Queue)│ │(Full ││        │
│  │  │          │ │       │ │       │ │Text) ││        │
│  │  └──────────┘ └───────┘ └───────┘ └──────┘│        │
│  └────────────────────────────────────────────┘        │
│                                                        │
│  ┌────────────────────────────────────────────┐        │
│  │              Observability                   │        │
│  │  ┌───────────┐  ┌────────┐  ┌───────────┐  │        │
│  │  │Prometheus │  │Grafana │  │   PM2     │  │        │
│  │  │  (9090)   │  │ (3001) │  │ (process) │  │        │
│  │  └───────────┘  └────────┘  └───────────┘  │        │
│  └────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

**Продакшен (текущий):** Один VPS, PM2, SQLite, in-memory кэши. ~2 стр/с на 1 CPU / 1GB RAM.

**Полный стек (Docker Compose):** PostgreSQL + Redis + Kafka + Elasticsearch + Prometheus + Grafana. Деплой на любой 4GB+ машине через `docker-compose up`.

## Производительность

~2 страницы в секунду на одном VPS (1 CPU / 1GB RAM) с SQLite (ограничение: DOMAIN_LIMIT=2, FETCH_TIMEOUT=1.5s).

```
DNS запрос:           20-200мс
TCP handshake:        50-150мс
TLS negotiation:      100-300мс (1-2 round-trip'а)
Обработка сервера:    200-2000мс
Загрузка HTML:        50-500мс
─────────────────────────────────
Итого на страницу:    420мс - 3200мс
```

С 2 одновременными запросами на SQLite: **~2 стр/с** реальных, с таймаутами на мёртвые/посещённые URL.

**Масштабирование до 10+ стр/с:** Docker Compose стек с PostgreSQL, Kafka partitioning между процессами, Elasticsearch для поиска. Всё реализовано и готово к деплою.

## Быстрый старт

### Docker Compose (полный стек)

```bash
git clone https://github.com/Ehrelein/webindexerportfolio.git
cd webindexerportfolio
docker-compose up -d
# PostgreSQL + Redis + Kafka + Zookeeper + Elasticsearch + App + Prometheus + Grafana
```

### Локальная разработка

```bash
npm install
npm test          # 89 тестов
node server.js    # SQLite режим (без зависимостей)
```

### Продакшен (VPS)

```bash
npm install
pm2 start server.js --name webindexer --max-memory-restart 450M
pm2 save
```

## Структура проекта

```
src/
├── db.js              # SQLite: WAL mode, prepared statements, CrawlState
├── db-pg.js           # PostgreSQL: connection pool, async queries, GIN FTS
├── db-adapter.js      # Единый async-интерфейс (SQLite ↔ PostgreSQL)
├── redis.js           # Redis: rate limiter, circuit state, DNS cache, URL dedup
├── kafka.js           # Kafka: очередь URL, DLQ, domain partitioning, fallback
├── elasticsearch.js   # ES: полнотекстовый индекс, bulk index, fuzzy search
├── fetcher.js         # HTTP запросы, DNS кэш, robots.txt, circuit breaker
├── queue.js           # Управление фронтейром, crawl loop, интеграция Kafka
├── seeds.js           # 180+ seed URLs, случайная инъекция Wikipedia
├── circuit.js         # 3-состояний circuit breaker + exponential backoff
├── errors.js          # Типизированные ошибки: AppError, FetchError, DatabaseError
├── security.js        # Helmet CSP, HSTS, input sanitization
├── metrics.js         # 14 Prometheus метрик + состояния circuit breaker'ов
├── ratelimit.js       # Распределённый rate limiting (Redis) с in-memory fallback
├── tree.js            # Граф доменов с partition window запросами
├── logger.js          # Pino структурированное логирование
├── container.js       # Лёгкий DI контейнер
├── config.js          # 180+ seeds, 40+ чёрный список, все настройки
├── dashboard.js       # HTML дашборда
├── html.js            # HTML страницы поиска
└── status.js          # HTML страницы статуса

server.js              # Точка входа Express: child_process.fork(), IPC, роуты, health
crawler.js             # Автономная точка входа кроулера (PM2 / Docker worker)
tests/                 # 89 тестов (unit + integration)
k8s/                   # Kubernetes манифесты (9 файлов)
```

## API Эндпоинты

| Эндпоинт | Метод | Описание |
|----------|-------|---------|
| `/api/stats` | GET | Статистика: узлы, фронтейр, скорость, ошибки, circuit breakers, бэкенды |
| `/api/search?q=` | GET | Полнотекстовый поиск (ES → PostgreSQL → SQLite цепочка fallback) |
| `/api/tree` | GET | Данные графа доменов (gzip) |
| `/api/circuit-breakers` | GET | Состояния всех circuit breaker'ов |
| `/health/live` | GET | Liveness probe |
| `/health/ready` | GET | Readiness probe (БД, Redis, Kafka, ES, память, circuit breakers) |
| `/metrics` | GET | Prometheus формат (14 метрик + per-circuit состояния) |

## Docker Compose стек

| Сервис | Образ | Порт | Назначение |
|--------|-------|------|-----------|
| PostgreSQL | `postgres:16-alpine` | 5432 | Основная БД, GIN полнотекстовый индекс |
| Redis | `redis:7-alpine` | 6379 | Rate limiting, circuit state, DNS кэш |
| Zookeeper | `confluentinc/cp-zookeeper:7.5.0` | 2181 | Координация Kafka |
| Kafka | `confluentinc/cp-kafka:7.5.0` | 9092 | Очередь URL (6 partitions, DLQ) |
| Elasticsearch | `elasticsearch:8.11.0` | 9200 | Полнотекстовый поиск с fuzzy matching |
| App | Custom | 3000 | API + Дашборд |
| Prometheus | `prom/prometheus` | 9090 | Сбор метрик |
| Grafana | `grafana/grafana` | 3001 | Дашборды + алерты |

## Kubernetes манифесты

| Файл | Что |
|------|-----|
| `namespace.yaml` | Изолированный namespace `crawler` |
| `configmap.yaml` | Конфиг окружения (все флаги бэкендов) |
| `postgres.yaml` | PostgreSQL Deployment + PVC + Service |
| `redis.yaml` | Redis Deployment + Service |
| `kafka.yaml` | Kafka + Zookeeper StatefulSets |
| `elasticsearch.yaml` | Elasticsearch StatefulSet + Service |
| `api-deployment.yaml` | API Deployment + HPA (2-10 replicas) + Service + LB |
| `worker-deployment.yaml` | Кроулер воркеры + HPA (3-20 replicas) |

## Конфигурация

```bash
# Выбор бэкенда
DB_BACKEND=pg|sqlite          # Бэкенд базы данных
REDIS_ENABLED=true|false      # Распределённый rate limiting
KAFKA_ENABLED=true|false      # Распределённая очередь URL
ES_ENABLED=true|false         # Полнотекстовый поисковик

# Строки подключения
PG_HOST=postgres
REDIS_HOST=redis
KAFKA_BROKERS=kafka:9092
ES_NODE=http://elasticsearch:9200

# Тюнинг кроулера (продакшен дефолты)
CONCURRENCY=2                 # Параллельных HTTP запросов (на VPS)
DOMAIN_LIMIT=2                # Макс. одновременных на домен
DOMAIN_MAX=200                # Макс. страниц на домен
FETCH_TIMEOUT=1500            # HTTP таймаут (мс)
MAX_DEPTH=10                  # Лимит глубины кроулинга
```

## Надёжность

| Отказ | Реакция |
|-------|---------|
| Падение сервера | PM2/K8s перезапуск через 3с, макс. 10 перезапусков |
| БД заблокирована | busy_timeout=15с, автоматические ретраи |
| Диск полон (<500MB) | Кроулер ставится на паузу, возобновляется автоматически |
| Домен мёртвый | Автоблокировка после 90% ошибок (20+ попыток) |
| Сеть упала | Circuit breaker открывается, прекращает нагружать, ретраит с бэкоффом |
| Kafka упала | Fallback на SQLite frontier |
| Redis упала | Fallback на in-memory rate limiting |
| Elasticsearch упала | Fallback на PostgreSQL tsvector → SQLite FTS5 |

## Мониторинг

**Prometheus метрики** (14 базовых + per-circuit-breaker):

```
webindexer_pages_per_second       # Пропускная способность (цель: >5)
webindexer_error_rate_pct         # Процент ошибок (цель: <50%)
webindexer_circuit_http_fetch_state  # 0=closed, 1=open
webindexer_domains_blacklisted    # Мёртвые домены
webindexer_concurrency            # Активные запросы
webindexer_avg_fetch_latency_ms   # Среднее время запроса
webindexer_memory_rss_bytes       # Память процесса
```

## Тесты

```bash
npm test                    # 89 unit + integration тестов
npm run test:coverage       # Отчёт покрытия
npm run test:integration    # DB integration тесты
```

## Стоимость

| Вариант | В месяц | Стек |
|---------|---------|------|
| **VPS (текущий)** | $6 | SQLite + in-memory, один процесс, PM2 |
| **Docker Compose** | $10-20 | PG + Redis + Kafka + ES на 4GB дроплете |

## Лицензия

MIT
