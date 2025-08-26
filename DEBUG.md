# Debug Handleiding - Carcleaning010 Website

## ✅ Probleem Opgelost: Verbeterde JavaScript Stabiliteit

### 🔧 Wat er is gefixt:

**Voor:** JavaScript crashte bij navigatie tussen pagina's omdat elementen niet bestonden op elke pagina
**Na:** Alle JavaScript functies zijn nu veilig met error handling en bestaan-checks

### 📱 **Hoe te Testen:**

#### **Start de Server:**
```bash
cd "D:\Development\CarCleaning010-website"
python server.py
```

#### **Test Alle Pagina's:**
1. 🏠 **Home**: http://localhost:8000/
2. 👥 **Over Ons**: http://localhost:8000/over-ons.html
3. 🚗 **Op Locatie**: http://localhost:8000/op-locatie.html
4. 🛠️ **Diensten**: http://localhost:8000/diensten.html
5. 📸 **Projecten**: http://localhost:8000/projecten.html
6. 📞 **Contact**: http://localhost:8000/contact.html

#### **Test Scenario's:**
- ✅ Klik op elk navigatie item
- ✅ Test mobile hamburger menu
- ✅ Test formulieren (contactpagina)
- ✅ Test filter tabs (diensten pagina)
- ✅ Test portfolio filter (projecten pagina)
- ✅ Test WhatsApp button op elke pagina
- ✅ Test responsive design (verklein browser venster)

## 🐛 Debugging Tips

### **Als Links Niet Werken:**

1. **Check Browser Console:**
   - Druk F12 in browser
   - Ga naar "Console" tab
   - Kijk voor error messages

2. **Check Server Output:**
   - Kijk naar de terminal waar server.py draait
   - 200 = Succesvol geladen
   - 404 = Bestand niet gevonden (normaal voor placeholder images)

3. **Test Browser Cache:**
   - Hard refresh: Ctrl+F5 (Windows) of Cmd+Shift+R (Mac)
   - Of open browser in private/incognito mode

### **Als Server Crashes:**

1. **Port Already in Use:**
   ```bash
   # Gebruik andere port:
   python -m http.server 8001
   ```

2. **Python Errors:**
   - Check Python versie: `python --version`
   - Probeer: `python3 server.py`

### **Als JavaScript Niet Werkt:**

1. **Check Browser Compatibility:**
   - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

2. **Mobile Issues:**
   - Test op verschillende schermgroottes
   - Check touch events werken

## 📊 **Wat Normaal Is:**

### **Expected 404 Errors (Normaal):**
- `placeholder-*.jpg` - Dit zijn placeholder afbeeldingen
- `placeholder-*.png` - Deze zullen vervangen worden door echte foto's

### **Expected Browser Console Messages:**
- "Service filtering error" - Alleen op niet-diensten pagina's (normaal)
- "Portfolio filtering error" - Alleen op niet-projecten pagina's (normaal)

## 🎯 **Success Indicators:**

### **✅ Alles Werkt Als:**
- Alle pagina's laden zonder JavaScript errors
- Navigatie tussen pagina's is smooth
- Mobile menu opent/sluit correct
- Formulieren submitten zonder crashes
- Filter tabs werken op juiste pagina's
- WhatsApp/telefoon links openen juiste app

### **🚨 Let Op Voor:**
- JavaScript errors in browser console
- Server crashes in terminal
- Links die niet reageren
- Mobile menu die niet werkt
- Formulieren die niet submitten

## 🛠️ **Technische Details:**

### **Verbeteringen Gemaakt:**
1. **Error-Resistant Functions** - Alle JS functies checken element bestaan
2. **Safe Element Queries** - Geen crashes als elementen niet bestaan  
3. **Try-Catch Blocks** - Errors worden opgevangen en gelogd
4. **Conditional Initialization** - Functies alleen actief waar nodig
5. **Better Console Logging** - Waarschuwingen ipv crashes

### **JavaScript Structuur:**
```javascript
function initFeature() {
    const element = document.querySelector('.selector');
    if (!element) return; // Safe exit if not found
    
    try {
        // Feature implementation
    } catch (error) {
        console.warn('Feature error:', error); // Log warning
    }
}
```

## 📞 **Support:**

Als er nog steeds problemen zijn:
1. Check deze debug guide eerst
2. Test met verschillende browsers
3. Clear browser cache
4. Restart server
5. Check alle files bestaan in directory

**De website zou nu stabiel moeten werken op alle pagina's! 🎉**