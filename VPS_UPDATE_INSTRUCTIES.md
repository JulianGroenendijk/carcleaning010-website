# VPS Update Instructies - Carcleaning010

## 🚨 Huidige Situatie
- **VPS Status**: Draait oude versie (v1.0.0)
- **SSH Toegang**: Geblokkeerd/niet beschikbaar
- **Admin Login VPS**: admin@carcleaning010.nl / admin123 ✅ WERKT
- **Admin Login Lokaal**: admin@carcleaning010.nl / admin123 (mock db) of N5jWp6gb (echte db)

## 📋 Wat is Bijgewerkt (klaar voor VPS)

### Code Wijzigingen
- ✅ Password change functionaliteit toegevoegd
- ✅ Deployment webhook endpoint toegevoegd (`/api/deploy/webhook`)
- ✅ Credential documentatie bijgewerkt
- ✅ Alle wijzigingen gecommit en gepusht naar GitHub

### Database Updates Nodig
- Wachtwoord wijzigen naar `N5jWp6gb` voor consistentie

## 🔧 Handmatige VPS Update Stappen

### Optie 1: Via Plesk File Manager
1. **Login bij Plesk control panel**
2. **Ga naar File Manager** → `/var/www/vhosts/carcleaning010.nl/`
3. **Backup maken** van huidige `admin-system` folder
4. **Git pull** via Plesk terminal of upload nieuwe bestanden
5. **Restart Node.js app** via Plesk

### Optie 2: Via Plesk Terminal (als beschikbaar)
```bash
cd /var/www/vhosts/carcleaning010.nl/admin-system
git pull origin main
npm install --production
pm2 restart carcleaning010-admin
```

### Optie 3: Via Plesk Git Repository
1. **Git Repository** configureren in Plesk
2. **Auto-deployment** inschakelen
3. **Manual deployment** triggeren

## 🔐 Na Update - Password Wijzigen

Zodra de nieuwe code op de VPS draait:

1. **Login met huidige credentials**: admin@carcleaning010.nl / admin123
2. **Ga naar Settings** in admin dashboard  
3. **Wijzig wachtwoord** naar: `N5jWp6gb`
4. **Of gebruik API**:
```bash
curl -X POST https://carcleaning010.nl/admin/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TOKEN]" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "N5jWp6gb", 
    "confirmPassword": "N5jWp6gb"
  }'
```

## 🧪 Verificatie

### 1. Check nieuwe versie draait
```bash
curl https://carcleaning010.nl/admin/api/deploy/status
```
**Verwacht**: `{"version": "1.1.0", ...}`

### 2. Test login met nieuwe credentials
- Email: admin@carcleaning010.nl
- Password: N5jWp6gb

### 3. Test nieuwe functionaliteit
- Password change in settings werkt
- Deployment webhook beschikbaar

## 🔄 Alternatieve Deployment (Future)

Na deze update kun je in de toekomst updaten via webhook:

```bash
curl -X POST https://carcleaning010.nl/admin/api/deploy/webhook
```

## 📞 Als Iets Misgaat

### Rollback Plan
1. **Restore backup** van admin-system folder
2. **Restart Node.js** application
3. **Check health**: `/api/health`

### Debug
1. **Check logs**: Plesk → Logs → Node.js logs
2. **Check process**: PM2 status via Plesk terminal
3. **Database**: Test connectie via health endpoint

---

**Status**: Wacht op handmatige VPS update via Plesk control panel
**Prioriteit**: Medium (systeem werkt, maar niet gesynchroniseerd)