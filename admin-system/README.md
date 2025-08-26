# Carcleaning010 Admin System

Een complete business management suite voor Carcleaning010, gebouwd met Node.js, Express, PostgreSQL, en Bootstrap.

## Overzicht

Dit systeem biedt een complete oplossing voor het beheren van:
- **Klanten** - Klantgegevens en contactinformatie
- **Offertes** - Professionele offertes met PDF generatie
- **Planning** - Afspraken en agenda beheer
- **Facturen** - Facturatie en betalingsadministratie
- **Certificaten** - Service certificaten met garantie
- **Website Leads** - Automatische verwerking van website aanvragen

## Functies

### 🎯 Core Functionaliteit
- ✅ Responsive admin dashboard (mobiel-vriendelijk)
- ✅ JWT authenticatie met bcrypt password hashing
- ✅ Volledige CRUD operaties voor alle entiteiten
- ✅ A4 PDF generatie (quotes, facturen, certificaten)
- ✅ Website formulier integratie met rate limiting
- ✅ Real-time dashboard statistieken
- ✅ Uitgebreide zoek- en filterfunctionaliteit

### 🔐 Beveiliging
- ✅ Rate limiting per endpoint
- ✅ CORS configuratie
- ✅ Input validatie met express-validator
- ✅ SQL injection preventie
- ✅ JWT token verificatie
- ✅ Helmet security headers

### 📊 Business Intelligence
- Dashboard met key metrics
- Recente activiteit tracking
- Omzet en performance statistieken
- Lead conversion tracking

## Technische Stack

### Backend
- **Node.js** (v16+) - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Puppeteer** - PDF generation
- **express-validator** - Input validation

### Frontend
- **Bootstrap 5** - CSS framework
- **Bootstrap Icons** - Icon library
- **Vanilla JavaScript** - No framework dependencies
- **Progressive Web App** - PWA capabilities

### Development
- **dotenv** - Environment variables
- **nodemon** - Development server
- **Winston** - Logging (optional)

## Installatie

### Vereisten
- Node.js 16.0 of hoger
- PostgreSQL 13.0 of hoger
- PM2 (voor productie)

### 1. Project Setup
```bash
# Clone project files naar je server
cd /var/www/carcleaning010-admin

# Installeer dependencies
npm install

# Maak .env bestand
cp .env.example .env
```

### 2. Environment Configuratie
Bewerk `.env` bestand:
```env
# Server
NODE_ENV=production
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=carcleaning010
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# Security
JWT_SECRET=your_very_secure_jwt_secret_here
BCRYPT_ROUNDS=12

# CORS (pas aan voor je domein)
ALLOWED_ORIGINS=https://carcleaning010.nl,https://www.carcleaning010.nl
```

### 3. Database Setup
```bash
# Maak database aan
sudo -u postgres createdb carcleaning010

# Voer database schema uit
psql -U your_db_user -d carcleaning010 -f database/schema.sql

# Maak admin gebruiker aan (optioneel via SQL)
psql -U your_db_user -d carcleaning010 -f database/seed.sql
```

### 4. Start Applicatie
```bash
# Development
npm run dev

# Production met PM2
npm run start:prod
```

## Database Schema

Het systeem gebruikt PostgreSQL met de volgende hoofdtabellen:

- `admin_users` - Admin gebruikers
- `customers` - Klantgegevens
- `vehicles` - Voertuigen gekoppeld aan klanten
- `quotes` - Offertes met items
- `appointments` - Afspraken en planning
- `invoices` - Facturen met items
- `certificates` - Service certificaten
- `website_leads` - Website aanvragen
- `services` - Diensten catalogus

Zie `database/schema.sql` voor complete database structuur.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Token verificatie

### Customers
- `GET /api/customers` - Lijst klanten
- `POST /api/customers` - Nieuwe klant
- `GET /api/customers/:id` - Specifieke klant
- `PUT /api/customers/:id` - Klant bijwerken
- `DELETE /api/customers/:id` - Klant verwijderen

### Quotes
- `GET /api/quotes` - Lijst offertes
- `POST /api/quotes` - Nieuwe offerte
- `GET /api/quotes/:id` - Specifieke offerte
- `PUT /api/quotes/:id` - Offerte bijwerken
- `POST /api/quotes/:id/pdf` - PDF genereren
- `POST /api/quotes/:id/convert-to-invoice` - Naar factuur

### Appointments
- `GET /api/appointments` - Lijst afspraken
- `POST /api/appointments` - Nieuwe afspraak
- `GET /api/appointments/calendar` - Kalender view
- `GET /api/appointments/availability/:date` - Beschikbaarheid

### Invoices
- `GET /api/invoices` - Lijst facturen
- `POST /api/invoices` - Nieuwe factuur
- `POST /api/invoices/:id/pdf` - PDF genereren
- `POST /api/invoices/:id/mark-paid` - Markeren als betaald

### Certificates
- `GET /api/certificates` - Lijst certificaten
- `POST /api/certificates` - Nieuw certificaat
- `POST /api/certificates/:id/pdf` - PDF genereren

### Website Leads
- `POST /api/website-leads` - Nieuwe lead (openbaar)
- `GET /api/leads` - Admin lead beheer (auth required)

## Deployment op Ubuntu/Plesk

### 1. Server Vereisten
```bash
# Update systeem
sudo apt update && sudo apt upgrade -y

# Installeer Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installeer PostgreSQL
sudo apt install postgresql postgresql-contrib

# Installeer PM2
sudo npm install -g pm2

# Installeer Puppeteer dependencies
sudo apt install -y chromium-browser
sudo apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

### 2. Plesk Configuratie

#### Domain Setup
1. Maak subdomain aan: `admin.carcleaning010.nl`
2. Document Root: `/var/www/vhosts/carcleaning010.nl/admin-system/public`
3. Enable SSL certificaat

#### Node.js App Setup in Plesk
1. **Applications** → **Node.js**
2. **Enable Node.js**: ✓
3. **Application root**: `/admin-system`
4. **Application startup file**: `server.js`
5. **Node.js version**: 18.x
6. **Environment**: `production`

#### Environment Variables in Plesk
```
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=carcleaning010
DB_USER=carcleaning010_user
DB_PASSWORD=secure_password_here
JWT_SECRET=super_secure_jwt_secret_256_bits
ALLOWED_ORIGINS=https://carcleaning010.nl,https://www.carcleaning010.nl,https://admin.carcleaning010.nl
```

#### Reverse Proxy Setup
Nginx configuratie voor Plesk:
```nginx
location / {
    try_files $uri $uri/ @nodejs;
}

location @nodejs {
    proxy_pass http://localhost:3001;
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

### 3. Database Setup
```bash
# Switch naar postgres user
sudo -u postgres psql

# Maak database en gebruiker aan
CREATE DATABASE carcleaning010;
CREATE USER carcleaning010_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE carcleaning010 TO carcleaning010_user;
\q

# Import schema
psql -U carcleaning010_user -d carcleaning010 -f database/schema.sql
```

### 4. SSL & Security
```bash
# Firewall configuratie
sudo ufw enable
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001

# Let's Encrypt via Plesk
# Gebruik Plesk SSL/TLS Certificates extensie
```

### 5. Process Management
```bash
# PM2 configuratie
pm2 start server.js --name "carcleaning010-admin"
pm2 save
pm2 startup

# Monitoring
pm2 monit
pm2 logs carcleaning010-admin
```

## Backup & Onderhoud

### Database Backup
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U carcleaning010_user carcleaning010 > /backups/carcleaning010_$DATE.sql
# Bewaar alleen laatste 30 dagen
find /backups -name "carcleaning010_*.sql" -mtime +30 -delete
```

### Log Rotation
```bash
# PM2 logs
pm2 flush
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Updates
```bash
# Update applicatie
git pull origin main
npm install --production
pm2 reload carcleaning010-admin
```

## Troubleshooting

### Veel voorkomende problemen:

1. **PDF generatie faalt**
   - Installeer alle Puppeteer dependencies
   - Check Chrome/Chromium installatie
   
2. **Database connectie errors**
   - Controleer PostgreSQL service: `sudo systemctl status postgresql`
   - Verificeer credentials in .env
   
3. **Permission errors**
   - Check file permissions: `sudo chown -R www-data:www-data /var/www/vhosts/carcleaning010.nl/admin-system`
   
4. **Memory issues**
   - Monitor met `pm2 monit`
   - Verhoog server memory indien nodig

### Log Files
- Application logs: `pm2 logs carcleaning010-admin`
- Database logs: `/var/log/postgresql/postgresql-13-main.log`
- Nginx logs: `/var/log/nginx/access.log`

## Security Checklist

- ✅ JWT tokens met secure secret
- ✅ Rate limiting geïmplementeerd
- ✅ Input validatie op alle endpoints
- ✅ HTTPS geforceerd
- ✅ CORS correct geconfigureerd
- ✅ Database credentials beveiligd
- ✅ Error handling zonder sensitive info
- ✅ File upload restrictions
- ✅ SQL injection preventie

## Support

Voor vragen of problemen:
- Check logs met `pm2 logs`
- Monitor performance met `pm2 monit`
- Database queries via `psql`

Het systeem is gebouwd voor eenvoudig onderhoud door Jordy zelf, met minimale technische kennis vereist voor dagelijks gebruik.