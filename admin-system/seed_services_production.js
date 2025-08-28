#!/usr/bin/env node

// Production Services Seed Script
// Voegt alle services toe aan de productie database

const { Client } = require('pg');

const config = {
    host: 'localhost',
    port: 5432,
    database: 'carcleaning010_db', 
    user: 'carcleaning_admin',
    password: 'Carcleaning010_VPS_2025!'
};

const services = [
    {
        name: 'Premium Signature Detail',
        description: 'Het ultieme detailing pakket voor wie het beste voor zijn auto wil. Complete verzorging van binnen en buiten.',
        base_price: 225.00,
        duration_minutes: 300,
        category: 'signature'
    },
    {
        name: 'Standard Signature Detail',
        description: 'Uitgebreide detailing met uren intensief handwerk voor een professioneel eindresultaat.',
        base_price: 165.00,
        duration_minutes: 240,
        category: 'signature'
    },
    {
        name: 'Express Detail',
        description: 'Snelle maar grondige detailing voor de klant die tijdsefficiënt wil werken.',
        base_price: 85.00,
        duration_minutes: 120,
        category: 'signature'
    },
    {
        name: 'Hand Wash Premium',
        description: 'Traditionele handwas waarbij elk paneel minutieus wordt behandeld. Fysiek intensief werk met premium producten.',
        base_price: 55.00,
        duration_minutes: 90,
        category: 'cleaning'
    },
    {
        name: 'Interior Deep Clean',
        description: 'Uren intensief werk aan elke hoek en plooi van het interieur. Van detailstofzuigen tot handmatige reiniging.',
        base_price: 100.00,
        duration_minutes: 150,
        category: 'cleaning'
    },
    {
        name: 'Paint Correction (1-stap)',
        description: 'Professionele lakrestauratie om lichte krassen en swirl marks te verwijderen.',
        base_price: 125.00,
        duration_minutes: 180,
        category: 'correction'
    },
    {
        name: 'Paint Correction (2-stap)',
        description: 'Uitgebreide lakrestauratie voor zwaar beschadigde lak met meerdere polijststappen.',
        base_price: 250.00,
        duration_minutes: 360,
        category: 'correction'
    },
    {
        name: 'Ceramic Coating (1 jaar)',
        description: 'Keramische beschermingslaag die 1 jaar bescherming biedt tegen weersinvloeden.',
        base_price: 350.00,
        duration_minutes: 240,
        category: 'protection'
    },
    {
        name: 'Ceramic Coating (2 jaar)',
        description: 'Premium keramische coating met 2 jaar garantie voor langdurige bescherming.',
        base_price: 550.00,
        duration_minutes: 300,
        category: 'protection'
    },
    {
        name: 'Ceramic Coating (5 jaar)',
        description: 'Topkwaliteit keramische coating met 5 jaar garantie - de ultieme bescherming.',
        base_price: 750.00,
        duration_minutes: 360,
        category: 'protection'
    },
    {
        name: 'Engine Bay Detailing',
        description: 'Zeer arbeidsintensieve reiniging waarbij elke component apart wordt behandeld.',
        base_price: 80.00,
        duration_minutes: 120,
        category: 'cleaning'
    },
    {
        name: 'Headlight Restoration',
        description: 'Professionele restauratie van matte en vergeelde koplampen.',
        base_price: 105.00,
        duration_minutes: 90,
        category: 'restoration'
    },
    {
        name: 'Trim Restoration',
        description: 'Restauratie van plastic en rubber onderdelen voor een zoals-nieuw uiterlijk.',
        base_price: 75.00,
        duration_minutes: 60,
        category: 'restoration'
    },
    {
        name: 'Ozonbehandeling',
        description: 'Eliminatie van geuren en bacteriën door middel van ozonbehandeling.',
        base_price: 45.00,
        duration_minutes: 30,
        category: 'addon'
    },
    {
        name: 'Pet Hair Removal',
        description: 'Grondige verwijdering van huisdierenharen uit het interieur.',
        base_price: 25.00,
        duration_minutes: 30,
        category: 'addon'
    },
    {
        name: 'Stoombehang Reiniging',
        description: 'Professionele stoomreiniging van stoffen bekleding.',
        base_price: 65.00,
        duration_minutes: 90,
        category: 'addon'
    },
    {
        name: 'Chrome Polish',
        description: 'Polijsten en beschermen van chromen onderdelen.',
        base_price: 45.00,
        duration_minutes: 60,
        category: 'addon'
    },
    {
        name: 'Convertible Top Care',
        description: 'Specialistische reiniging en behandeling van cabriokappen.',
        base_price: 85.00,
        duration_minutes: 120,
        category: 'addon'
    }
];

async function seedServices() {
    const client = new Client(config);
    
    try {
        console.log('🔗 Connecting to production database...');
        await client.connect();
        
        // Check if services table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'services'
            )
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('❌ Services table does not exist! Run main migration first.');
            process.exit(1);
        }
        
        // Clear existing services (if any)
        const existingCount = await client.query('SELECT COUNT(*) as count FROM services');
        console.log(`📊 Found ${existingCount.rows[0].count} existing services`);
        
        if (existingCount.rows[0].count > 0) {
            console.log('🗑️  Clearing existing services...');
            await client.query('DELETE FROM services');
        }
        
        console.log('📥 Seeding services data...');
        
        // Insert all services
        let insertedCount = 0;
        for (const service of services) {
            try {
                await client.query(`
                    INSERT INTO services (name, description, base_price, duration_minutes, category, active, sort_order)
                    VALUES ($1, $2, $3, $4, $5, true, $6)
                `, [
                    service.name,
                    service.description,
                    service.base_price,
                    service.duration_minutes,
                    service.category,
                    insertedCount
                ]);
                insertedCount++;
                console.log(`  ✅ Added: ${service.name} (${service.category})`);
            } catch (error) {
                console.log(`  ❌ Failed to add ${service.name}: ${error.message}`);
            }
        }
        
        console.log(`\n🎉 Successfully seeded ${insertedCount}/${services.length} services!`);
        
        // Verify data
        const finalCount = await client.query('SELECT COUNT(*) as count FROM services WHERE active = true');
        console.log(`📊 Total active services in database: ${finalCount.rows[0].count}`);
        
        // Show categories summary
        const categorySummary = await client.query(`
            SELECT category, COUNT(*) as count, AVG(base_price) as avg_price
            FROM services 
            WHERE active = true 
            GROUP BY category 
            ORDER BY category
        `);
        
        console.log('\n📋 Services by category:');
        categorySummary.rows.forEach(row => {
            console.log(`  - ${row.category}: ${row.count} services (avg: €${parseFloat(row.avg_price).toFixed(2)})`);
        });
        
    } catch (error) {
        console.error('❌ Services seeding failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔒 Database connection closed');
    }
}

seedServices();