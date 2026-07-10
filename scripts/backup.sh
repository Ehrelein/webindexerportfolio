#!/bin/bash
set -euo pipefail

# WebIndexer Backup Script
# Run daily via cron: 0 2 * * * /home/crawler/app/scripts/backup.sh

BACKUP_DIR="/home/crawler/backups"
DB_PATH="/home/crawler/app/crawler.db"
LOG_PATH="/home/crawler/app/crawler.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# 1. Database backup (hot backup with WAL)
if [ -f "$DB_PATH" ]; then
    echo "[$(date)] Backing up database..."
    sqlite3 "$DB_PATH" ".backup $BACKUP_DIR/crawler_${DATE}.db"
    gzip "$BACKUP_DIR/crawler_${DATE}.db"
    echo "[$(date)] Database backup: crawler_${DATE}.db.gz"
fi

# 2. Configuration backup
echo "[$(date)] Backing up configuration..."
tar -czf "$BACKUP_DIR/config_${DATE}.tar.gz" \
    -C /home/crawler/app \
    src/config.js \
    environments/ \
    .env \
    docker-compose*.yaml \
    k8s/ \
    terraform/ \
    2>/dev/null || true
echo "[$(date)] Config backup: config_${DATE}.tar.gz"

# 3. Cleanup old backups
echo "[$(date)] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# 4. Summary
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR" | wc -l)
echo "[$(date)] Backup complete: ${BACKUP_COUNT} files, ${BACKUP_SIZE} total"

# 5. Optional: Upload to S3
# aws s3 cp "$BACKUP_DIR/crawler_${DATE}.db.gz" s3://webindexer-backups/db/
# aws s3 cp "$BACKUP_DIR/config_${DATE}.tar.gz" s3://webindexer-backups/config/

echo "[$(date)] Backup finished successfully"
