# Runbook: Database Corruption

## Симптомы
- Логи: `SQLITE_CORRUPT` или `integrity_check FAILED`
- Dashboard: 0 nodes, frontier пуст
- Crawler не может записывать данные

## Диагностика

```bash
# Проверить целостность
sqlite3 /home/crawler/app/crawler.db "PRAGMA integrity_check;"

# Проверить размер
ls -lh /home/crawler/app/crawler.db*

# Проверить WAL
sqlite3 /home/crawler/app/crawler.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

## Решение

### 1. REINDEX (если integrity_check failed)

```bash
sqlite3 /home/crawler/app/crawler.db "REINDEX;"
sqlite3 /home/crawler/app/crawler.db "PRAGMA integrity_check;"
```

### 2. Восстановить из WAL (если main file повреждён)

```bash
# Остановить crawler
pm2 stop webindexer

# Попытаться восстановить
sqlite3 /home/crawler/app/crawler.db ".recover" | sqlite3 /home/crawler/app/crawler_new.db

# Заменить
mv /home/crawler/app/crawler.db /home/crawler/app/crawler.db.broken
mv /home/crawler/app/crawler_new.db /home/crawler/app/crawler.db

# Запуститьcrawler
pm2 start webindexer
```

### 3. Полная потеря данных (последний вариант)

```bash
# Остановить crawler
pm2 stop webindexer

# Удалить БД
rm /home/crawler/app/crawler.db*

# Запуститьcrawler — создаст новую БД и начнёт с seeds
pm2 start webindexer
```

## Профилактика
- WAL mode + busy_timeout=15s (уже включено)
- `synchronous=NORMAL` для производительности
- Integrity check при старте (уже включено)
- Регулярные бэкапы: `sqlite3 crawler.db ".backup backup.db"`

## escalation
- Если REINDEX не помогает → полная потеря данных, начать заново
- Если проблема повторяется → возможно проблема с disk I/O, проверить `dmesg`
