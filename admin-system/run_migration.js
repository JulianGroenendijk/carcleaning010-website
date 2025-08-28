#!/usr/bin/env node

// Script to run database migrations on production
// Usage: node run_migration.js [schema|data|both]

const { query, close } = require('./database/connection');
const fs = require('fs');
const path = require('path');

async function runSchemaMigration() {
    console.log('🔄 Starting schema migration...');
    
    try {
        const schemaSQL = fs.readFileSync(
            path.join(__dirname, 'database/migration_unified_persons.sql'), 
            'utf8'
        );
        
        console.log('📊 Executing schema migration SQL...');
        await query(schemaSQL);
        
        console.log('✅ Schema migration completed successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Schema migration failed:', error.message);
        return false;
    }
}

async function runDataMigration() {
    console.log('🔄 Starting data migration...');
    
    try {
        const dataSQL = fs.readFileSync(
            path.join(__dirname, 'database/data_migration_unified_persons.sql'), 
            'utf8'
        );
        
        console.log('📊 Executing data migration SQL...');
        await query(dataSQL);
        
        console.log('✅ Data migration completed successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Data migration failed:', error.message);
        console.error('Error details:', error);
        return false;
    }
}

async function checkTablesExist() {
    try {
        const result = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('persons', 'person_company_roles', 'vehicles_new')
            ORDER BY table_name
        `);
        
        return result.rows.map(r => r.table_name);
        
    } catch (error) {
        console.error('Error checking tables:', error);
        return [];
    }
}

async function main() {
    const args = process.argv.slice(2);
    const action = args[0] || 'both';
    
    console.log('🚀 Database Migration Tool');
    console.log(`📋 Action: ${action}`);
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
    
    try {
        // Check current table status
        console.log('\n📊 Checking existing tables...');
        const existingTables = await checkTablesExist();
        console.log('Existing unified tables:', existingTables);
        
        let schemaSuccess = true;
        let dataSuccess = true;
        
        // Run schema migration
        if (action === 'schema' || action === 'both') {
            if (existingTables.length > 0) {
                console.log('⚠️  Some unified tables already exist, skipping schema migration');
            } else {
                schemaSuccess = await runSchemaMigration();
            }
        }
        
        // Run data migration
        if ((action === 'data' || action === 'both') && schemaSuccess) {
            // Check if we have any data to migrate
            try {
                const customerCount = await query('SELECT COUNT(*) FROM customers');
                const leadCount = await query('SELECT COUNT(*) FROM website_leads');
                
                console.log(`📊 Found ${customerCount.rows[0].count} customers and ${leadCount.rows[0].count} leads to migrate`);
                
                if (parseInt(customerCount.rows[0].count) > 0 || parseInt(leadCount.rows[0].count) > 0) {
                    dataSuccess = await runDataMigration();
                } else {
                    console.log('ℹ️  No data to migrate');
                }
                
            } catch (error) {
                console.log('⚠️  Could not check existing data, proceeding with data migration anyway');
                dataSuccess = await runDataMigration();
            }
        }
        
        // Final status
        console.log('\n📋 Migration Summary:');
        console.log(`Schema: ${schemaSuccess ? '✅ Success' : '❌ Failed'}`);
        console.log(`Data: ${dataSuccess ? '✅ Success' : '❌ Failed'}`);
        
        // Check final table status
        const finalTables = await checkTablesExist();
        console.log('Final unified tables:', finalTables);
        
        if (schemaSuccess && dataSuccess) {
            console.log('\n🎉 Migration completed successfully!');
            process.exit(0);
        } else {
            console.log('\n❌ Migration failed');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Migration script error:', error);
        process.exit(1);
        
    } finally {
        await close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { runSchemaMigration, runDataMigration };