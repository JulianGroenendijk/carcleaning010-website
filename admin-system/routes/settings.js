const express = require('express');
const { verifyToken: authMiddleware } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// Settings file path
const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json');

// Default settings
const DEFAULT_SETTINGS = {
    vat_enabled: false,
    vat_percentage: 21,
    company_name: 'Carcleaning010',
    company_phone: '+31 6 36 52 97 93',
    company_email: 'info@carcleaning010.nl',
    company_vat_number: '',
    company_address: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

// Ensure settings file exists
async function ensureSettingsFile() {
    try {
        const dataDir = path.dirname(SETTINGS_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        
        try {
            await fs.access(SETTINGS_FILE);
        } catch {
            // File doesn't exist, create it
            await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
            console.log('✅ Created default settings file');
        }
    } catch (error) {
        console.error('Error ensuring settings file:', error);
    }
}

// Load settings from file
async function loadSettings() {
    try {
        await ensureSettingsFile();
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading settings:', error);
        return DEFAULT_SETTINGS;
    }
}

// Save settings to file
async function saveSettings(settings) {
    try {
        await ensureSettingsFile();
        const updatedSettings = {
            ...settings,
            updated_at: new Date().toISOString()
        };
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
        return updatedSettings;
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

// GET /api/settings - Get current settings
router.get('/', async (req, res) => {
    try {
        const settings = await loadSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ error: 'Fout bij ophalen instellingen' });
    }
});

// PUT /api/settings - Update settings
router.put('/', async (req, res) => {
    try {
        const currentSettings = await loadSettings();
        
        // Merge new settings with current ones
        const updatedSettings = {
            ...currentSettings,
            ...req.body,
            updated_at: new Date().toISOString()
        };
        
        // Validate required fields
        if (updatedSettings.vat_percentage < 0 || updatedSettings.vat_percentage > 100) {
            return res.status(400).json({ error: 'BTW percentage moet tussen 0 en 100 zijn' });
        }
        
        const savedSettings = await saveSettings(updatedSettings);
        
        console.log('✅ Settings updated:', savedSettings);
        res.json(savedSettings);
        
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Fout bij opslaan instellingen' });
    }
});

// POST /api/settings/reset - Reset to defaults
router.post('/reset', async (req, res) => {
    try {
        const resetSettings = {
            ...DEFAULT_SETTINGS,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const savedSettings = await saveSettings(resetSettings);
        
        console.log('✅ Settings reset to defaults');
        res.json(savedSettings);
        
    } catch (error) {
        console.error('Error resetting settings:', error);
        res.status(500).json({ error: 'Fout bij resetten instellingen' });
    }
});

module.exports = router;