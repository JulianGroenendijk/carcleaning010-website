require('dotenv').config();
const { query } = require('./database/connection');

async function fixServicesData() {
    try {
        console.log('🔧 Fixing services data migration...');
        
        // Update services that don't have the new fields populated
        const servicesToUpdate = [
            {
                name: 'Interior Deep Clean',
                updates: {
                    price_range_min: 75,
                    price_range_max: 125,
                    package_type: 'individual',
                    subtitle: 'Uren intensief werk aan elke hoek en plooi van het interieur',
                    icon: '▪',
                    features: [
                        'Stofzuigen en detailreiniging',
                        'Leer/stof behandeling', 
                        'Dashboard en trim verzorging',
                        'Vlekverwijdering'
                    ]
                }
            },
            {
                name: 'Engine Bay Detailing',
                updates: {
                    price_range_min: 65,
                    price_range_max: 95,
                    package_type: 'individual',
                    subtitle: 'Zeer arbeidsintensieve reiniging waarbij elke component apart wordt behandeld',
                    icon: '▪',
                    features: [
                        'Veilige reinigingsmethoden',
                        'Speciale degreasers',
                        'Bescherming elektronica',
                        'Professionele afwerking'
                    ]
                }
            },
            {
                name: 'Paint Correction (1-stap)',
                updates: {
                    name: 'Paint Correction',
                    price_range_min: 125,
                    price_range_max: 450,
                    package_type: 'individual',
                    subtitle: 'Professionele lakrestauratie voor het verwijderen van krassen, swirl marks en oxidatie',
                    icon: '✨',
                    features: [
                        '1, 2 of 3-staps polish proces',
                        'Krassen en hologram verwijdering',
                        'Glans en diepte herstel',
                        'Professionele polish producten'
                    ]
                }
            },
            {
                name: 'Headlight Restoration', 
                updates: {
                    price_range_min: 85,
                    price_range_max: 125,
                    package_type: 'individual',
                    subtitle: 'Herstel van vergeelde en matte koplampen voor betere zichtbaarheid en uitstraling',
                    icon: '🪟',
                    features: [
                        'Professionele sanding technieken',
                        'Multi-stap polish proces',
                        'UV-beschermende coating',
                        'Langdurig helder resultaat'
                    ]
                }
            },
            {
                name: 'Ceramic Coating (1 jaar)',
                updates: {
                    name: 'Ceramic Coating',
                    price_range_min: 350,
                    price_range_max: 750,
                    package_type: 'individual',
                    subtitle: 'Ultieme bescherming met keramische coating voor langdurige glans',
                    icon: '🛡️',
                    features: [
                        '2-5 jaar bescherming',
                        'Hydrofobe eigenschappen',
                        'UV en chemische bescherming',
                        'Professionele applicatie'
                    ]
                }
            }
        ];

        for (const service of servicesToUpdate) {
            const currentService = await query('SELECT * FROM services WHERE name = $1', [service.name]);
            
            if (currentService.rows.length > 0) {
                console.log(`📝 Updating service: ${service.name}`);
                
                await query(`
                    UPDATE services SET 
                        name = COALESCE($1, name),
                        price_range_min = COALESCE($2, price_range_min),
                        price_range_max = COALESCE($3, price_range_max),
                        package_type = COALESCE($4, package_type),
                        subtitle = COALESCE($5, subtitle),
                        icon = COALESCE($6, icon),
                        features = COALESCE($7::jsonb, features)
                    WHERE name = $8
                `, [
                    service.updates.name || service.name,
                    service.updates.price_range_min,
                    service.updates.price_range_max,
                    service.updates.package_type,
                    service.updates.subtitle,
                    service.updates.icon,
                    JSON.stringify(service.updates.features || []),
                    service.name
                ]);
            }
        }

        // Remove duplicate services that are no longer needed
        const duplicatesToRemove = [
            'Ceramic Coating (2 jaar)',
            'Ceramic Coating (5 jaar)', 
            'Paint Correction (2-stap)',
            'Ozonbehandeling',
            'Pet Hair Removal',
            'Chrome Polish',
            'Convertible Top Care',
            'Stoombehang Reiniging',
            'Trim Restoration'
        ];

        for (const serviceName of duplicatesToRemove) {
            console.log(`🗑️ Removing duplicate: ${serviceName}`);
            await query('DELETE FROM services WHERE name = $1', [serviceName]);
        }

        console.log('✅ Services data migration completed successfully!');
        
        // Show final result
        const finalResult = await query('SELECT name, price_range_min, price_range_max, icon, package_type FROM services ORDER BY package_type, name');
        console.log('\n📊 Final services list:');
        finalResult.rows.forEach(service => {
            console.log(`- ${service.name} | ${service.icon || '📄'} | €${service.price_range_min}-${service.price_range_max} | ${service.package_type || 'unknown'}`);
        });

    } catch (error) {
        console.error('❌ Error fixing services data:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    fixServicesData()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { fixServicesData };