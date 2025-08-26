# Deployment Guide - Carcleaning010 Admin System

Dit document beschrijft stap-voor-stap hoe je het Carcleaning010 Admin System kunt deployen op een Ubuntu VPS met Plesk.

## 🎯 Doel

Een complete business management suite voor Carcleaning010 deployen op een productiemiljier met:
- Ubuntu 22.04 LTS
- Plesk control panel
- PostgreSQL database
- PM2 process manager
- SSL certificaat
- Automatische backups

## 📋 Vereisten

### Server Specificaties
- **OS**: Ubuntu 22.04 LTS
- **RAM**: Minimaal 2GB (aanbevolen 4GB)
- **Storage**: Minimaal 20GB vrije ruimte
- **CPU**: Minimaal 2 cores
- **Control Panel**: Plesk Obsidian

### Software Vereisten
- Node.js 18.x of hoger
- PostgreSQL 13.x of hoger
- PM2 process manager
- Nginx (via Plesk)
- SSL certificaat

## 🚀 Stap-voor-Stap Deployment

### Stap 1: Server Voorbereiding

#### 1.1 Systeem Updates
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

#### 1.2 Node.js Installatie
```bash
# Voeg NodeSource repository toe
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Installeer Node.js
sudo apt-get install -y nodejs

# Controleer versie
node --version  # Moet v18.x.x of hoger zijn
npm --version
```

#### 1.3 PostgreSQL Installatie
```bash
# Installeer PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Controleer status
sudo systemctl status postgresql
```

#### 1.4 PM2 Installatie
```bash
# Installeer PM2 globaal
sudo npm install -g pm2

# Controleer installatie
pm2 --version
```

#### 1.5 Puppeteer Dependencies
```bash
# Installeer Chrome dependencies voor PDF generatie
sudo apt install -y \
    gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
    libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
    libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 ca-certificates fonts-liberation libappindicator1 \
    libnss3 lsb-release xdg-utils wget chromium-browser
```

### Stap 2: Plesk Configuratie

#### 2.1 Subdomain Aanmaken
1. Log in op Plesk
2. Ga naar **Websites & Domains**
3. Klik **Add Subdomain**
4. Subdomain naam: `admin`
5. Document root: `/admin-system/public`
6. Klik **OK**

#### 2.2 Node.js App Configuratie
1. Ga naar **Websites & Domains** → `admin.carcleaning010.nl`
2. Klik **Node.js**
3. **Enable Node.js**: ✓
4. **Node.js version**: 18.x
5. **Application mode**: Production
6. **Document root**: `/admin-system/public`
7. **Application startup file**: `../server.js`
8. Klik **Enable**

#### 2.3 Environment Variables
In Plesk Node.js configuratie, voeg toe:
```
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=carcleaning010
DB_USER=carcleaning010_user
DB_PASSWORD=jouw_veilige_database_wachtwoord
JWT_SECRET=jouw_zeer_veilige_jwt_secret_minimaal_32_karakters
ALLOWED_ORIGINS=https://carcleaning010.nl,https://www.carcleaning010.nl,https://admin.carcleaning010.nl
```

### Stap 3: Database Setup

#### 3.1 Database & User Aanmaken
```bash
# Switch naar postgres user
sudo -u postgres psql

# Maak database aan
CREATE DATABASE carcleaning010;

# Maak user aan
CREATE USER carcleaning010_user WITH PASSWORD 'jouw_veilige_wachtwoord';

# Geef rechten
GRANT ALL PRIVILEGES ON DATABASE carcleaning010 TO carcleaning010_user;

# Exit
\q
```

#### 3.2 Database Schema Importeren
```bash
# Navigeer naar app directory
cd /var/www/vhosts/carcleaning010.nl/admin-system

# Importeer schema
PGPASSWORD='jouw_wachtwoord' psql -U carcleaning010_user -d carcleaning010 -f database/schema.sql

# Importeer seed data (optioneel)
PGPASSWORD='jouw_wachtwoord' psql -U carcleaning010_user -d carcleaning010 -f database/seed.sql
```

### Stap 4: Applicatie Deployment

#### 4.1 Bestanden Uploaden
Upload alle project bestanden naar:
```
/var/www/vhosts/carcleaning010.nl/admin-system/
```

#### 4.2 Deployment Script Uitvoeren
```bash
# Navigeer naar app directory
cd /var/www/vhosts/carcleaning010.nl/admin-system

# Maak deployment script executable
chmod +x deploy.sh

# Voer deployment uit
./deploy.sh
```

### Stap 5: SSL Certificaat

#### 5.1 Let's Encrypt via Plesk
1. Ga naar **Websites & Domains** → `admin.carcleaning010.nl`
2. Klik **SSL/TLS Certificates**
3. Klik **Install** bij Let's Encrypt
4. **Email**: `jouw-email@domein.nl`
5. **Domain names**: Selecteer admin.carcleaning010.nl
6. Klik **Install**

#### 5.2 HTTPS Forceren
1. **Apache & Nginx Settings**
2. **Additional nginx directives**:
```nginx
return 301 https://$server_name$request_uri;
```

### Stap 6: Reverse Proxy Configuratie

#### 6.1 Nginx Configuratie
In Plesk **Apache & Nginx Settings** → **Additional nginx directives**:
```nginx
location / {
    try_files $uri $uri/ @nodejs;
}

location @nodejs {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
}
```

### Stap 7: Firewall Configuratie

```bash
# Enable UFW
sudo ufw enable

# Allow essential ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 8443  # Plesk
sudo ufw allow 3001  # Node.js app

# Check status
sudo ufw status
```

### Stap 8: Automatische Backups

#### 8.1 Database Backup Script
```bash
# Maak backup script executable
chmod +x scripts/backup.sh

# Test backup
./scripts/backup.sh
```

#### 8.2 Cron Job Setup
```bash
# Bewerk crontab
crontab -e

# Voeg dagelijkse backup toe (3:00 AM)
0 3 * * * /var/www/vhosts/carcleaning010.nl/admin-system/scripts/backup.sh
```

### Stap 9: Monitoring Setup

#### 9.1 PM2 Monitoring
```bash
# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
# Volg de instructies die worden weergegeven

# Monitor applicatie
pm2 monit
```

#### 9.2 Log Monitoring
```bash
# Bekijk logs
pm2 logs carcleaning010-admin

# Tail logs
tail -f /var/www/vhosts/carcleaning010.nl/admin-system/logs/combined.log
```

## ✅ Verificatie & Testing

### 1. Health Check
```bash
curl -k https://admin.carcleaning010.nl/api/health
```
**Verwacht resultaat**: JSON response met status "healthy"

### 2. Database Connectie
```bash
# Test database connectie
PGPASSWORD='jouw_wachtwoord' psql -U carcleaning010_user -d carcleaning010 -c "SELECT COUNT(*) FROM admin_users;"
```

### 3. Admin Login
1. Ga naar `https://admin.carcleaning010.nl`
2. Login met:
   - **Email**: `admin@carcleaning010.nl`
   - **Wachtwoord**: `admin123` (als seed data is geïmporteerd)
3. **BELANGRIJK**: Wijzig direct het standaard wachtwoord!

### 4. PDF Generatie Test
1. Ga naar `/api/pdf/test`
2. Controleer of een PDF wordt gedownload

### 5. Website Formulier Test
Test het contact formulier op de hoofdwebsite om te controleren of leads correct worden verwerkt.

## 🛠️ Onderhoud & Updates

### Applicatie Updates
```bash
cd /var/www/vhosts/carcleaning010.nl/admin-system
git pull origin main  # Als git wordt gebruikt
npm install --production
pm2 reload carcleaning010-admin
```

### Database Onderhoud
```bash
# Backup maken
npm run backup

# Database statistieken
PGPASSWORD='jouw_wachtwoord' psql -U carcleaning010_user -d carcleaning010 -c "
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation 
FROM pg_stats 
WHERE schemaname = 'public';
"
```

### Log Rotatie
```bash
# PM2 log rotatie installeren
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🚨 Troubleshooting

### Veel Voorkomende Problemen

#### 1. Applicatie start niet
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs carcleaning010-admin

# Herstart applicatie
pm2 restart carcleaning010-admin
```

#### 2. Database connectie errors
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connectie
PGPASSWORD='jouw_wachtwoord' psql -U carcleaning010_user -d carcleaning010 -c "SELECT version();"
```

#### 3. PDF generatie faalt
```bash
# Check Chrome installatie
chromium-browser --version

# Test Puppeteer
node -e "const puppeteer = require('puppeteer'); puppeteer.launch().then(() => console.log('Puppeteer OK'));"
```

#### 4. Permission errors
```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/vhosts/carcleaning010.nl/admin-system
find /var/www/vhosts/carcleaning010.nl/admin-system -type f -exec chmod 644 {} \;
find /var/www/vhosts/carcleaning010.nl/admin-system -type d -exec chmod 755 {} \;
```

### Log Locaties
- **PM2 logs**: `~/.pm2/logs/`
- **App logs**: `/var/www/vhosts/carcleaning010.nl/admin-system/logs/`
- **PostgreSQL logs**: `/var/log/postgresql/`
- **Nginx logs**: `/var/log/nginx/`

## 📞 Support

Voor technische ondersteuning:

1. **Check logs**: Altijd eerst de logs controleren
2. **Health check**: Controleer `/api/health` endpoint  
3. **Database status**: Verificeer database connectie
4. **PM2 status**: Check process manager status

## 🔐 Security Checklist

- ✅ SSL certificaat geïnstalleerd
- ✅ HTTPS geforceerd  
- ✅ Firewall geconfigureerd
- ✅ Database credentials beveiligd
- ✅ JWT secret ingesteld
- ✅ Rate limiting actief
- ✅ Default wachtwoorden gewijzigd
- ✅ Regular backups ingesteld
- ✅ PM2 monitoring actief

**Deployment voltooid!** 🎉

Het Carcleaning010 Admin System is nu live en klaar voor gebruik. Jordy kan nu:
- Klanten beheren
- Offertes maken en versturen  
- Planning bijhouden
- Facturen genereren
- Certificaten uitgeven
- Website leads verwerken

Alles vanaf zijn telefoon of desktop, met professionele PDF documenten en een veilige, schaalbare infrastructuur.