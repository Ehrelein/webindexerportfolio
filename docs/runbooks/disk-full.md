# Runbook: Disk Full

## Симптомы
- Логи: `[DISK] PAUSED — XXXMB free, XX% used`
- Crawler перестаёт обрабатывать URL
- `df -h` показывает <500MB free или >80% usage

## Диагностика

```bash
# Проверить размер БД
ls -lh /home/crawler/app/crawler.db

# Проверить WAL
ls -lh /home/crawler/app/crawler.db-wal

# Проверить логи pm2
pm2 logs webindexer --lines 50

# Проверить disk usage
df -h /home/crawler/app
```

## Решение

### 1. Быстрое освобождение места

```bash
# Очистить старые логи
pm2 flush webindexer
find /home/crawler/app -name "*.log" -delete

# Очистить WAL (если не критично)
sqlite3 /home/crawler/app/crawler.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Удалить node_modules и переустановить
cd /home/crawler/app
rm -rf node_modules
npm install --production
```

### 2. Очистка БД (если >20GB)

```bash
# Удалить старые записи (оставить последние 100K)
sqlite3 /home/crawler/app/crawler.db "
DELETE FROM nodes WHERE url NOT IN (
  SELECT url FROM nodes ORDER BY rowid DESC LIMIT 100000
);
DELETE FROM visited WHERE url NOT IN (
  SELECT url FROM nodes
);
VACUUM;
"
```

### 3. Расширить disk

```bash
# Vultr: увеличить disk через API или панель
# После расширения:
resize2fs /dev/vda1
```

## Профилактика
- Мониторинг через Prometheus: `webindexer_memory_rss_bytes`
- Auto-pause при <500MB (включено по умолчанию)
- pm2 `--max-memory-restart 350M` предотвращает утечки

## escalation
- Если VPS disk расширен, но space не увеличился → перезагрузить VPS
- Если БД повреждена → см. runbook/db-corruption.md
