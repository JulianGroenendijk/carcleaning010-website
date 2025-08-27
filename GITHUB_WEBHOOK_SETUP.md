# GitHub Webhook Auto-Deployment Setup

## 🎯 Doel
Automatische deployment van zowel website als admin systeem bij elke GitHub push.

## 🔧 Webhook Endpoint
- **URL**: `https://carcleaning010.nl/admin/api/deploy/webhook`
- **Method**: POST
- **Content-Type**: application/json

## 🚀 GitHub Webhook Configuratie

### Stap 1: GitHub Repository Webhook
1. Ga naar **GitHub Repository** → **Settings** → **Webhooks**
2. Klik **Add webhook**
3. **Payload URL**: `https://carcleaning010.nl/admin/api/deploy/webhook`
4. **Content type**: `application/json`
5. **Secret**: (optioneel - voor extra beveiliging)
6. **Events**: Selecteer "Just the push event"
7. **Active**: ✓ Enabled
8. Klik **Add webhook**

### Stap 2: Webhook Secret (Optioneel)
Voor extra beveiliging, voeg webhook secret toe aan VPS .env:
```bash
# In /var/www/vhosts/carcleaning010.nl/carcleaning010-website/admin-system/.env
WEBHOOK_SECRET=jouw_github_webhook_secret_hier
```

## 📋 Wat Gebeurt Er Bij Push?

### Automatische Deployment Stappen:
1. **Git Pull**: Haalt laatste code van GitHub
2. **Website Deploy**: Kopieert HTML/CSS/JS/images naar httpdocs
3. **Admin Update**: Installeert dependencies in admin-system
4. **Security**: Fixe vulnerabilities met npm audit fix
5. **Restart**: Herstart admin application met PM2

### Bestanden Die Worden Gesynchroniseerd:
- ✅ **Website**: `*.html`, `*.css`, `*.js`, `images/`
- ✅ **Admin System**: Alle Node.js code + dependencies
- ✅ **Database Schema**: (bij toekomstige wijzigingen)

## 🧪 Testen

### Handmatig Testen
```bash
curl -X POST https://carcleaning010.nl/admin/api/deploy/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
```

### GitHub Push Test
1. Maak kleine wijziging in repository
2. Push naar main branch
3. Controleer webhook logs in GitHub
4. Verificeer deployment op website

## 📊 Monitoring

### Webhook Logs
- **GitHub**: Repository → Settings → Webhooks → Recent Deliveries
- **VPS**: PM2 logs: `pm2 logs carcleaning010-admin`

### Health Check
```bash
curl https://carcleaning010.nl/admin/api/deploy/status
```

## 🔒 Security

### Webhook IP Whitelist (Optioneel)
GitHub webhook IPs (voor productie):
- `192.30.252.0/22`
- `185.199.108.0/22`  
- `140.82.112.0/20`

### Rate Limiting
- Webhook heeft automatisch rate limiting
- Max 10 deployments per 15 minuten

## 🚨 Troubleshooting

### Webhook Fails
1. Check GitHub webhook logs
2. Check VPS PM2 logs: `pm2 logs carcleaning010-admin`
3. Test manual deployment: `curl -X POST .../webhook`

### Deployment Issues
- **Git pull fails**: Check VPS git permissions
- **File copy fails**: Check httpdocs permissions
- **PM2 restart fails**: Check PM2 status

### Rollback
Als deployment faalt, handmatig rollback:
```bash
cd /var/www/vhosts/carcleaning010.nl/carcleaning010-website
git reset --hard HEAD~1  # Go back 1 commit
# Run manual deployment
```

## ✅ Benefits

### Voor Developer (Jou):
- 🚀 **Push & Forget**: Gewoon pushen naar GitHub
- 🔄 **Auto-Sync**: Website + admin altijd gesynchroniseerd  
- 🛡️ **No SSH Needed**: Werkt ook als SSH geblokkeerd is
- 📱 **Mobile Deploy**: Kun zelfs vanaf telefoon pushen

### Voor Jordy:
- 🌐 **Altijd Up-to-Date**: Website heeft altijd nieuwste features
- 📧 **Contact Forms Work**: Offerteaanvragen komen altijd binnen
- 🔐 **Security**: Automatische security updates
- 📊 **Reliable**: Geen handmatige fouten meer

---

**Status**: Webhook endpoint klaar - GitHub webhook configuratie nog needed
**Next**: Webhook toevoegen aan GitHub repository settings