require('dotenv').config();
const { query, close } = require('./database/connection');
const fs = require('fs');
const path = require('path');

async function runWebsiteMigration() {
    try {
        console.log('🔧 Running website services migration...');
        
        // Check if new fields already exist
        try {
            const checkResult = await query(`
                SELECT price_range_min, package_type, subtitle, icon, features
                FROM services 
                LIMIT 1
            `);
            console.log('✅ New fields already exist in database');
            return;
        } catch (error) {
            console.log('📋 New fields missing, running migration...');
        }
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_services_fields.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('🚀 Executing services field migration...');
        await query(migrationSQL);
        
        console.log('✅ Services migration completed successfully!');
        
        // Verify the migration worked
        const verifyResult = await query(`
            SELECT COUNT(*) as count
            FROM services
            WHERE price_range_min IS NOT NULL OR package_type IS NOT NULL
        `);
        
        console.log(`📊 Services with new fields: ${verifyResult.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await close();
    }
}

// Run if called directly
if (require.main === module) {
    runWebsiteMigration()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runWebsiteMigration };