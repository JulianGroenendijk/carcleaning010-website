#!/bin/bash

# Carcleaning010 Database Backup Script
# Automatically creates database backups with rotation

set -e

# Configuration
DB_NAME="carcleaning010"
DB_USER="carcleaning010_user"
BACKUP_DIR="/var/backups/carcleaning010"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    sudo mkdir -p "$BACKUP_DIR"
    sudo chown $USER:$USER "$BACKUP_DIR"
    log_info "Created backup directory: $BACKUP_DIR"
fi

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/carcleaning010_backup_$TIMESTAMP.sql"

log_info "Starting database backup..."
log_info "Database: $DB_NAME"
log_info "Backup file: $BACKUP_FILE"

# Create database dump
if pg_dump -U "$DB_USER" -h localhost "$DB_NAME" > "$BACKUP_FILE"; then
    log_success "Database backup created successfully"
    
    # Compress backup file
    gzip "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"
    log_success "Backup file compressed: $BACKUP_FILE"
    
    # Get file size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup size: $BACKUP_SIZE"
    
else
    log_error "Database backup failed"
    exit 1
fi

# Clean up old backups
log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "carcleaning010_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
    log_success "Deleted $DELETED_COUNT old backup files"
else
    log_info "No old backup files to delete"
fi

# List current backups
log_info "Current backups:"
ls -lah "$BACKUP_DIR"/carcleaning010_backup_*.sql.gz | tail -5

# Backup summary
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/carcleaning010_backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo
log_success "Backup completed successfully!"
log_info "Total backups: $TOTAL_BACKUPS"
log_info "Total backup size: $TOTAL_SIZE"
log_info "Latest backup: $BACKUP_FILE"

# Optional: Send notification (uncomment to enable)
# log_info "Sending backup notification..."
# echo "Carcleaning010 database backup completed successfully at $(date)" | mail -s "Database Backup Success" admin@carcleaning010.nl

exit 0