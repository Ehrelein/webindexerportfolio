# ADR-001: SQLite вместо PostgreSQL

## Статус
Принято

## Контекст
Нужна реляционная БД для хранения URL, метаданных, FTS поиска. Два варианта: SQLite (embedded) или PostgreSQL (client-server).

## Решение
Используем SQLite с WAL mode.

## Обоснование

### SQLite (выбрано)
- **Zero config** — нет сервера, нет процесса, нет аутентификации
- **Zero cost** — $0 vs $15/mo для RDS
- **WAL mode** — concurrent reads + single write, достаточно для 1 воркера
- **FTS5** — встроенный full-text search, не нужен Elasticsearch для MVP
- **Переносимость** — файл .db можно скопировать, бэкапить, перенести
- **Proven** — используется в SQLite, browser storage, embedded systems

### PostgreSQL (отклонено)
- **Overkill** — для 1 воркера 200K записей не нужен отдельный сервер
- **Operational overhead** — нужно настраивать, мониторить, бэкапить
- **Стоимость** — $15/mo для RDS vs $0 для SQLite
- **Сеть** — client-server adds latency vs embedded

## Когда изменить
- Когда появится >1 воркер (нужна shared storage)
- Когда >1M записей (нужна partitioning)
- Когда нужен concurrent write scaling (SQLite: 1 writer)

## Миграция
```bash
# SQLite → PostgreSQL
pg_dump --schema-only > schema.sql
sqlite3 crawler.db ".dump" | psql webindexer
```

## Ссылки
- https://www.sqlite.org/wal.html
- https://www.sqlite.org/whentouse.html
