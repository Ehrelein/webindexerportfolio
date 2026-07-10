# Disaster Recovery Plan

## RTO/RPO Targets

| Scenario | RTO (Recovery Time) | RPO (Data Loss) | Priority |
|----------|---------------------|-----------------|----------|
| Process crash | <30 seconds | 0 (pm2 auto-restart) | Critical |
| VPS reboot | <5 minutes | 0 (pm2 save/startup) | High |
| Database corruption | <30 minutes | Last 1000 pages | High |
| VPS failure | <2 hours | Last 24 hours | Critical |
| Disk failure | <1 hour | Last backup | High |
| Network partition | <5 minutes | 0 (auto-recovery) | Medium |

## Backup Strategy

### Database Backup

```bash
#!/bin/bash
# backup.sh — Run daily via cron
BACKUP_DIR="/home/crawler/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/home/crawler/app/crawler.db"

mkdir -p $BACKUP_DIR

# Hot backup (WAL mode)
sqlite3 $DB_PATH ".backup $BACKUP_DIR/crawler_$DATE.db"

# Compress
gzip $BACKUP_DIR/crawler_$DATE.db

# Keep last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/crawler_$DATE.db.gz s3://webindexer-backups/
```

### Configuration Backup

```bash
# Backup config files
tar -czf /home/crawler/backups/config_$(date +%Y%m%d).tar.gz \
  /home/crawler/app/src/config.js \
  /home/crawler/app/environments/ \
  /home/crawler/app/.env \
  /home/crawler/app/docker-compose*.yaml
```

## Recovery Procedures

### Scenario 1: Process Crash (RTO: <30s)

```bash
# PM2 auto-handles this
pm2 status  # Check if restarted automatically
pm2 logs webindexer --lines 10  # Check logs
```

### Scenario 2: VPS Reboot (RTO: <5min)

```bash
# PM2 startup script handles this
pm2 resurrect  # Restore saved processes
pm2 status
```

### Scenario 3: Database Corruption (RTO: <30min)

```bash
# 1. Stop crawler
pm2 stop webindexer

# 2. Check integrity
sqlite3 /home/crawler/app/crawler.db "PRAGMA integrity_check;"

# 3. If failed, try recovery
sqlite3 /home/crawler/app/crawler.db ".recover" > recovered.sql
sqlite3 /home/crawler/app/crawler_new.db < recovered.sql

# 4. Replace
mv /home/crawler/app/crawler.db /home/crawler/app/crawler.db.broken
mv /home/crawler/app/crawler_new.db /home/crawler/app/crawler.db

# 5. Restart
pm2 start webindexer
```

### Scenario 4: VPS Failure (RTO: <2h)

```bash
# 1. Provision new VPS
cd terraform
terraform apply -var="environment=prod"

# 2. Deploy app
node vps.js deploy

# 3. Restore database from backup
scp backup:crawler.db /home/crawler/app/crawler.db

# 4. Start
node vps.js start
```

### Scenario 5: Disk Failure (RTO: <1h)

```bash
# 1. Expand disk (Vultr API)
# 2. Resize filesystem
resize2fs /dev/vda1

# 3. If data lost, restore from backup
# (See Scenario 4)
```

## Monitoring & Alerting

### Health Checks

| Endpoint | Check | Frequency | Alert |
|----------|-------|-----------|-------|
| `/health/live` | Process alive | 30s | PagerDuty |
| `/health/ready` | DB + memory OK | 30s | Slack |
| `/metrics` | Prometheus scrape | 15s | Grafana |

### Alert Rules

| Alert | Condition | Duration | Action |
|-------|-----------|----------|--------|
| ServiceDown | health/live fails | 1 min | Auto-restart |
| HighErrorRate | >30% errors | 5 min | Check logs |
| DiskAlmostFull | >90% usage | 1 min | Cleanup |
| MemoryHigh | >300MB RSS | 5 min | Restart |
| DatabaseCorrupt | integrity_check failed | 0 | Manual recovery |

## Testing DR

```bash
# Test backup restoration
./backup.sh
sqlite3 /tmp/test.db < /home/crawler/backups/crawler_*.db

# Test failover
pm2 stop webindexer
sleep 30
pm2 start webindexer

# Test disk full scenario
node load-test/chaos.js disk-full
```

## Contact Information

| Role | Contact | Escalation |
|------|---------|------------|
| Primary | admin@webindexer.dev | 15 min |
| Backup | ops@webindexer.dev | 30 min |
| Emergency | +1-555-0123 | Immediate |
