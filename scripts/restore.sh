#!/bin/bash
set -euo pipefail

# WebIndexer Restore Script
# Usage: ./restore.sh [backup_date]

BACKUP_DIR="/home/crawler/backups"
DB_PATH="/home/crawler/app/crawler.db"
BACKUP_DATE=${1:-$(ls -1t "$BACKUP_DIR"/crawler_*.db.gz 2>/dev/null | head -1 | sed 's/.*crawler_//;s/.db.gz//')}

if [ -z "$BACKUP_DATE" ]; then
    echo "No backups found in $BACKUP_DIR"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/crawler_${BACKUP_DATE}.db.gz"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring from: $BACKUP_FILE"

# 1. Stop crawler
echo "Stopping crawler..."
pm2 stop webindexer 2>/dev/null || true

# 2. Decompress
echo "Decompressing backup..."
gunzip -c "$BACKUP_FILE" > /tmp/crawler_restore.db

# 3. Verify integrity
echo "Verifying integrity..."
INTEGRITY=$(sqlite3 /tmp/crawler_restore.db "PRAGMA integrity_check;" 2>/dev/null)
if [ "$INTEGRITY" != "ok" ]; then
    echo "ERROR: Backup integrity check failed: $INTEGRITY"
    rm /tmp/crawler_restore.db
    exit 1
fi

# 4. Backup current DB
echo "Backing up current database..."
if [ -f "$DB_PATH" ]; then
    mv "$DB_PATH" "${DB_PATH}.pre-restore.$(date +%Y%m%d_%H%M%S)"
fi

# 5. Restore
echo "Restoring database..."
mv /tmp/crawler_restore.db "$DB_PATH"

# 6. Start crawler
echo "Starting crawler..."
pm2 start webindexer 2>/dev/null || node /home/crawler/app/server.js &

echo "Restore complete!"
echo "Database: $DB_PATH"
echo "Backup used: $BACKUP_FILE"
