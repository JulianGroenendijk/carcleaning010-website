#!/usr/bin/env node

// Production Database Migration Script
// Voor Invoice Schema Updates

const { Client } = require('pg');

const config = {
    host: 'localhost',
    port: 5432,
    database: 'carcleaning010_db', 
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'IDPRO_S3cure!Db_2025'
};

async function runMigration() {
    const client = new Client(config);
    
    try {
        console.log('🔗 Connecting to production database...');
        await client.connect();
        
        console.log('📊 Running invoice schema migration...');
        
        // Add missing columns to invoices
        await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS description TEXT`);
        console.log('✅ Added description column');
        
        await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0`);
        console.log('✅ Added discount_percentage column');
        
        await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0`);
        console.log('✅ Added discount_amount column');
        
        await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5,2) DEFAULT 21`);
        console.log('✅ Added tax_percentage column');
        
        // Rename subtotal to subtotal_amount if it exists
        const checkSubtotal = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='invoices' AND column_name='subtotal'
        `);
        
        if (checkSubtotal.rows.length > 0) {
            await client.query(`ALTER TABLE invoices RENAME COLUMN subtotal TO subtotal_amount`);
            console.log('✅ Renamed subtotal to subtotal_amount');
        } else {
            console.log('ℹ️  subtotal column already renamed or doesn\'t exist');
        }
        
        // Add service_name to invoice_items
        await client.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS service_name VARCHAR(200)`);
        console.log('✅ Added service_name column to invoice_items');
        
        // Add color column to appointments
        await client.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT NULL`);
        console.log('✅ Added color column to appointments');
        
        // Add index for appointment colors
        await client.query(`CREATE INDEX IF NOT EXISTS idx_appointments_color ON appointments(color)`);
        console.log('✅ Added index for appointment colors');
        
        console.log('🎉 Migration completed successfully!');
        
        // Verify schema
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name='invoices' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Current invoices table schema:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔒 Database connection closed');
    }
}

runMigration();