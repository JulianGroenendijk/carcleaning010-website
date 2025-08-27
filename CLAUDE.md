# Claude Code - Carcleaning010 Project Notes

## 📁 Project Structure (VPS)
**VPS Path**: `/var/www/vhosts/carcleaning010.nl/carcleaning010-website/`

```
carcleaning010-website/          ← Git repository root
├── admin-system/               ← Node.js admin application
├── index.html                  ← Main website
├── styles.css
├── script.js
└── images/
```

## 🔧 VPS Update Commands
```bash
# Navigate to git root (NOT admin-system!)
cd /var/www/vhosts/carcleaning010.nl/carcleaning010-website

# Pull latest changes
git pull origin main

# Update admin system dependencies
cd admin-system
npm install --production

# Restart application
pm2 restart carcleaning010-admin
```

## 🔐 Current Credentials

### Local Development
- **Mock DB**: admin@carcleaning010.nl / admin123
- **Real DB**: admin@carcleaning010.nl / admin123 (password reset working)

### VPS Production  
- **Current**: admin@carcleaning010.nl / admin123
- **Target**: admin@carcleaning010.nl / N5jWp6gb (after update)

## 🚀 Quick Commands

### Development
```bash
# Start admin server (mock DB)
cd admin-system && node server.js

# Start admin server (real DB) - need PostgreSQL running
# Change .env DB_PASSWORD to IDPRO_S3cure!Db_2025
```

### Testing
```bash
# Test VPS admin login
curl -X POST https://carcleaning010.nl/admin/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@carcleaning010.nl","password":"admin123"}'

# Check VPS health
curl https://carcleaning010.nl/admin/api/health
```

## 📋 Common Tasks

1. **Local development**: Use mock database (DB_PASSWORD=your_postgres_password)
2. **Local with real DB**: Use IDPRO_S3cure!Db_2025 and start PostgreSQL
3. **VPS updates**: Always git pull from carcleaning010-website root directory
4. **Password sync**: Update VPS password after code updates

---
*Last updated: 2025-08-27*