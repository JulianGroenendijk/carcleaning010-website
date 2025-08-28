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
            
            // Execute simplified data migration (only existing tables)
            console.log('📊 Executing simplified data migration...');
            
            // Migrate customers if they exist
            try {
                const customerCount = await query('SELECT COUNT(*) FROM customers');
                console.log(`Found ${customerCount.rows[0].count} customers to migrate`);
                
                if (parseInt(customerCount.rows[0].count) > 0) {
                    await query(`
                        INSERT INTO persons (
                            id, email, first_name, last_name, phone, address, city, postal_code, 
                            is_individual_customer, is_business_customer, is_individual_lead, is_business_lead,
                            notes, created_at, updated_at
                        )
                        SELECT 
                            c.id, c.email, c.first_name, c.last_name, c.phone, c.address, c.city, c.postal_code,
                            true as is_individual_customer,  -- Existing customers are individual customers
                            false as is_business_customer,
                            false as is_individual_lead,
                            false as is_business_lead,
                            c.notes, c.created_at, c.updated_at
                        FROM customers c
                        ON CONFLICT (id) DO NOTHING
                    `);
                    console.log('✅ Customers migrated');
                }
            } catch (error) {
                console.log('⚠️  No customers table found, skipping');
            }
            
            // Migrate website leads if they exist
            try {
                const leadCount = await query('SELECT COUNT(*) FROM website_leads');
                console.log(`Found ${leadCount.rows[0].count} website leads to migrate`);
                
                if (parseInt(leadCount.rows[0].count) > 0) {
                    await query(`
                        INSERT INTO persons (
                            id, email, first_name, last_name, phone,
                            is_individual_customer, is_business_customer, is_individual_lead, is_business_lead,
                            lead_source, lead_status, notes, created_at, updated_at
                        )
                        SELECT 
                            wl.id,
                            wl.email,
                            COALESCE(wl.first_name, 'Website') as first_name,
                            COALESCE(wl.last_name, 'Lead') as last_name,
                            wl.phone,
                            false as is_individual_customer,
                            false as is_business_customer,
                            true as is_individual_lead,  -- Website leads are individual leads
                            false as is_business_lead,
                            wl.source as lead_source,
                            wl.status as lead_status,
                            CONCAT_WS(E'\\n',
                                CASE WHEN wl.service_type IS NOT NULL THEN 'Service: ' || wl.service_type END,
                                CASE WHEN wl.vehicle_info IS NOT NULL THEN 'Voertuig: ' || wl.vehicle_info END,
                                CASE WHEN wl.message IS NOT NULL THEN 'Bericht: ' || wl.message END
                            ) as notes,
                            wl.created_at,
                            wl.updated_at
                        FROM website_leads wl
                        ON CONFLICT (email) DO UPDATE SET
                            is_individual_lead = true,
                            lead_source = COALESCE(persons.lead_source, EXCLUDED.lead_source)
                    `);
                    console.log('✅ Website leads migrated');
                }
            } catch (error) {
                console.log('⚠️  No website_leads table found, skipping');
            }
            
            // Migrate existing vehicles if they exist
            try {
                const vehicleCount = await query('SELECT COUNT(*) FROM vehicles');
                console.log(`Found ${vehicleCount.rows[0].count} vehicles to migrate`);
                
                if (parseInt(vehicleCount.rows[0].count) > 0) {
                    await query(`
                        INSERT INTO vehicles_new (
                            id, owner_person_id, primary_driver_id, make, model, year, color,
                            license_plate, vin, vehicle_type, mileage, is_active, notes,
                            created_at, updated_at
                        )
                        SELECT 
                            v.id,
                            v.customer_id as owner_person_id,
                            v.customer_id as primary_driver_id,
                            v.make, v.model, v.year, v.color, v.license_plate, v.vin,
                            'car' as vehicle_type,
                            NULL as mileage,
                            true as is_active,
                            v.notes,
                            v.created_at,
                            CURRENT_TIMESTAMP as updated_at
                        FROM vehicles v
                        WHERE v.customer_id IS NOT NULL
                        ON CONFLICT (id) DO NOTHING
                    `);
                    console.log('✅ Vehicles migrated');
                }
            } catch (error) {
                console.log('⚠️  No vehicles table found, skipping');
            }
            
            console.log('✅ Simplified data migration completed');
            
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