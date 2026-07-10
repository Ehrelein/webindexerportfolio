# ADR-002: In-memory кэш вместо Redis

## Статус
Принято

## Контекст
Нужен кэш для DNS, dedup URL, состояния краулинга. Варианты: in-memory Map или Redis.

## Решение
Используем in-memory Map/Set для DNS-кэша и frontier.

## Обоснование

### In-memory (выбрано)
- **Zero cost** — $0 vs $10/mo для Redis
- **Zero latency** — ~0ns vs ~1ms для Redis round-trip
- **Zero config** — нет процесса, нет аутентификации
- **Достаточно** — для 1 инстанса shared state не нужен

### Redis (отклонено)
- **Overhead** — network round-trip для каждого DNS lookup
- **Overkill** — для single instance shared state не нужен
- **Стоимость** — $10/mo для Upstash Redis

## Когда изменить
- Когда появится >1 instance (нужен shared DNS cache)
- Когда нужен distributed dedup (много воркеров)
- Когда нужен persistent cache (in-memory теряется при restart)

## Миграция
```bash
npm install ioredis
# Заменить Map на Redis в fetcher.js и queue.js
```
