#!/bin/bash

# Carcleaning010 Admin System Deployment Script
# This script automates the deployment process on Ubuntu/Plesk

set -e  # Exit on any error

echo "🚀 Starting Carcleaning010 Admin System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/vhosts/carcleaning010.nl/admin-system"
DB_NAME="carcleaning010"
DB_USER="carcleaning010_user"
APP_NAME="carcleaning010-admin"

# Functions
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

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Don't run this script as root. Use a user with sudo privileges."
    exit 1
fi

# Step 1: System Requirements Check
log_info "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//' | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    log_error "Node.js version 16 or higher is required. Current version: $(node --version)"
    exit 1
fi
log_success "Node.js $(node --version) detected"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    log_error "PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi
log_success "PostgreSQL detected"

# Check PM2
if ! command -v pm2 &> /dev/null; then
    log_warning "PM2 not found. Installing PM2..."
    sudo npm install -g pm2
    log_success "PM2 installed"
fi

# Step 2: Create Application Directory
log_info "Setting up application directory..."
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p "$APP_DIR"
    sudo chown -R $USER:$USER "$APP_DIR"
    log_success "Application directory created: $APP_DIR"
fi

# Step 3: Install Application
log_info "Installing application..."
cd "$APP_DIR"

# Install dependencies
if [ -f "package.json" ]; then
    log_info "Installing NPM dependencies..."
    npm install --production
    log_success "Dependencies installed"
else
    log_error "package.json not found. Please ensure the application files are in $APP_DIR"
    exit 1
fi

# Step 4: Environment Configuration
log_info "Configuring environment..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_warning "Created .env from .env.example. Please edit .env with your configuration."
    else
        log_error ".env file not found and no .env.example available"
        exit 1
    fi
fi

# Step 5: Database Setup
log_info "Setting up database..."

# Check if database exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log_warning "Database $DB_NAME already exists"
else
    log_info "Creating database $DB_NAME..."
    sudo -u postgres createdb "$DB_NAME"
    log_success "Database created"
fi

# Check if user exists
if sudo -u postgres psql -t -c '\du' | cut -d \| -f 1 | grep -qw "$DB_USER"; then
    log_warning "Database user $DB_USER already exists"
else
    log_info "Creating database user $DB_USER..."
    read -s -p "Enter password for database user $DB_USER: " DB_PASSWORD
    echo
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    log_success "Database user created"
fi

# Import schema if exists
if [ -f "database/schema.sql" ]; then
    log_info "Importing database schema..."
    # Check if tables exist
    TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")
    
    if [ "$TABLE_COUNT" -eq "0" ]; then
        PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -f database/schema.sql
        log_success "Database schema imported"
        
        # Import seed data if exists
        if [ -f "database/seed.sql" ]; then
            read -p "Import seed data (demo data and admin user)? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -d "$DB_NAME" -f database/seed.sql
                log_success "Seed data imported"
                log_warning "Default admin credentials: admin@carcleaning010.nl / admin123"
                log_warning "IMPORTANT: Change the default password after first login!"
            fi
        fi
    else
        log_warning "Database tables already exist. Skipping schema import."
    fi
fi

# Step 6: Create necessary directories
log_info "Creating application directories..."
mkdir -p logs
mkdir -p uploads
chmod 755 logs uploads
log_success "Directories created"

# Step 7: Set permissions
log_info "Setting file permissions..."
sudo chown -R $USER:$USER "$APP_DIR"
find "$APP_DIR" -type f -name "*.js" -exec chmod 644 {} \;
find "$APP_DIR" -type d -exec chmod 755 {} \;
chmod +x deploy.sh 2>/dev/null || true
log_success "Permissions set"

# Step 8: Start/Restart Application with PM2
log_info "Starting application with PM2..."

# Stop existing instance if running
if pm2 describe "$APP_NAME" &> /dev/null; then
    log_info "Stopping existing application..."
    pm2 stop "$APP_NAME"
    pm2 delete "$APP_NAME"
fi

# Start application
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
else
    pm2 start server.js --name "$APP_NAME" --env production
fi

# Save PM2 configuration
pm2 save

# Generate startup script if not exists
if ! systemctl is-enabled pm2-$USER &> /dev/null; then
    pm2 startup | tail -n 1 | sudo bash
    log_success "PM2 startup script created"
fi

log_success "Application started with PM2"

# Step 9: Health Check
log_info "Performing health check..."
sleep 5  # Give the application time to start

if curl -sf http://localhost:3001/api/health > /dev/null; then
    log_success "Health check passed - Application is running"
else
    log_error "Health check failed - Application may not be running correctly"
    log_info "Check logs with: pm2 logs $APP_NAME"
fi

# Step 10: Display Summary
echo
echo "================================="
log_success "Deployment completed successfully!"
echo "================================="
echo
log_info "Application Details:"
echo "  Name: $APP_NAME"
echo "  Directory: $APP_DIR"
echo "  URL: http://localhost:3001"
echo "  Health Check: http://localhost:3001/api/health"
echo
log_info "Useful Commands:"
echo "  Monitor: pm2 monit"
echo "  Logs: pm2 logs $APP_NAME"
echo "  Restart: pm2 restart $APP_NAME"
echo "  Stop: pm2 stop $APP_NAME"
echo
log_info "Next Steps:"
echo "  1. Configure your reverse proxy/nginx"
echo "  2. Set up SSL certificate"
echo "  3. Configure firewall rules"
echo "  4. Test the admin interface"
echo "  5. Change default admin password if seed data was imported"
echo
log_warning "Remember to:"
echo "  - Update .env with your production settings"
echo "  - Set up regular database backups"
echo "  - Monitor application logs"
echo "  - Keep dependencies updated"
echo

log_success "Deployment script finished!"

exit 0