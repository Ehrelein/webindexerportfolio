# Runbook: Crawler Process Down

## Симптомы
- Dashboard показывает 0 pg/s
- pm2 статус: `errored` или `stopped`
- Логи: `crawler exited code=1`

## Диагностика

```bash
# Статус pm2
pm2 status

# Логи
pm2 logs webindexer --lines 100 --err

# Проверить порт
lsof -i :3000

# Проверить память
free -h
```

## Решение

### 1. Простой restart

```bash
pm2 restart webindexer
```

### 2. Полный перезапуск (если restart не помогает)

```bash
pm2 kill
cd /home/crawler/app
node server.js
pm2 start server.js --name webindexer --max-memory-restart 350M --node-args="--expose-gc"
pm2 save
```

### 3. Через vps.js (из локальной машины)

```bash
node vps.js fix
```

### 4. Если БД повреждена

```bash
# Проверить целостность
sqlite3 /home/crawler/app/crawler.db "PRAGMA integrity_check;"

# Если failed — REINDEX
sqlite3 /home/crawler/app/crawler.db "REINDEX;"

# Если всё ещё failed — восстановить из backup
cp /home/crawler/app/crawler.db /home/crawler/app/crawler.db.broken
# Запустить crawler.js — создаст новую БД
```

## Профилактика
- pm2 auto-restart при crash (включено)
- `--max-memory-restart 350M` предотвращает OOM
- `--node-args="--expose-gc"` для явного GC

## escalation
- Если pm2 не может запустить process → проверить Node.js version: `node -v`
- Если OOM → увеличить RAM или уменьшить CONCURRENCY в config.js
