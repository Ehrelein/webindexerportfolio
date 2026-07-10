# Runbook: High Error Rate (>30%)

## Симптомы
- Логи: много `err=XXX` в stats interval
- Dashboard: error rate >30%
- Prometheus: `webindexer_fail_total` растёт быстрее `webindexer_success_total`

## Диагностика

```bash
# Проверить типы ошибок
pm2 logs webindexer --lines 200 | grep -i "err\|error\|timeout\|500\|503"

# Проверить сеть
curl -s -o /dev/null -w "%{http_code}" https://example.com

# Проверить DNS
nslookup example.com

# Проверить disk (может быть disk pause)
df -h /home/crawler/app
```

## Типичные причины

### 1. Network issues
- **Симптом**: все запросы timeout
- **Решение**: проверить сеть, перезапустить VPS

### 2. DNS issues
- **Симптом**: `ENOTFOUND` ошибки
- **Решение**: проверить `/etc/resolv.conf`, добавить `8.8.8.8`

### 3. Bad seeds
- **Симптом**: ошибки только на определённых доменах
- **Решение**: добавить домены в BLACKLIST в config.js

### 4. Disk pause
- **Симптом**: `[DISK] PAUSED` в логах
- **Решение**: см. runbook/disk-full.md

### 5. robots.txt blocking
- **Симптом**: 403 на всех страницах домена
- **Решение**: нормально, кrawler должен пропускать такие домены

## Решение

```bash
# Очистить DNS cache (в crawler)
# Перезапуститьcrawler
pm2 restart webindexer

# Если bestimmte seeds проблемные — добавить в blacklist
# В config.js добавить домен в BLACKLIST Set
```

## Профилактика
- Мониторинг error rate через Prometheus
- Автоматическая очистка bad seeds
- Retry с exponential backoff

## escalation
- Если error rate >50% дольше 10 минут → перезапустить crawler
- Если проблема сохраняется → проверить VPS network connectivity
