// Direct migration via production database
// This will be run via the deployment API as a one-time script

const fs = require('fs');
const path = require('path');

// Read and execute SQL files directly
async function executeMigration() {
    try {
        // Use the existing database connection from the deployment context
        const { query } = require('./database/connection');
        
        console.log('🔄 Starting direct migration...');
        
        // Check if tables already exist
        const existingTables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('persons', 'person_company_roles', 'vehicles_new')
        `);
        
        console.log('Existing tables:', existingTables.rows.map(r => r.table_name));
        
        if (existingTables.rows.length === 0) {
            // Execute schema migration
            console.log('📊 Executing schema migration...');
            
            const schemaSQL = fs.readFileSync(
                path.join(__dirname, 'database/migration_unified_persons.sql'), 
                'utf8'
            );
            
            await query(schemaSQL);
            console.log('✅ Schema migration completed');
            
            // Execute data migration
            console.log('📊 Executing data migration...');
            
            const dataSQL = fs.readFileSync(
                path.join(__dirname, 'database/data_migration_unified_persons.sql'), 
                'utf8'
            );
            
            await query(dataSQL);
            console.log('✅ Data migration completed');
            
        } else {
            console.log('⚠️  Tables already exist, skipping migration');
        }
        
        // Verify final state
        const finalCheck = await query(`
            SELECT 
                'persons' as table_name, COUNT(*) as count FROM persons
            UNION ALL
            SELECT 
                'person_company_roles' as table_name, COUNT(*) as count FROM person_company_roles
            UNION ALL
            SELECT 
                'vehicles_new' as table_name, COUNT(*) as count FROM vehicles_new
        `);
        
        console.log('Final table counts:', finalCheck.rows);
        
        return {
            success: true,
            tables: finalCheck.rows
        };
        
    } catch (error) {
        console.error('❌ Migration error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = executeMigration;