require('dotenv').config();
const { query } = require('./connection');

async function seedWebsiteData() {
    try {
        console.log('🌱 Starting website data seeding...');

        // Clear existing data (optional - remove if you want to keep existing data)
        // await query('DELETE FROM service_addons');
        // await query('DELETE FROM projects');
        
        // Update existing services with new fields based on diensten.html
        const services = [
            {
                name: 'Premium Signature Detail',
                price_range_min: 225,
                price_range_max: 225,
                duration_text: 'Intensieve behandeling: 4-6 uur pure arbeid',
                package_type: 'signature',
                subtitle: 'Het complete detailing pakket voor eigenaren die het beste willen',
                icon: '⭐',
                features: [
                    'Pre-wash en snow foam',
                    'Grondige handwas met premium producten',
                    'Complete interieur detailing',
                    'Professioneel polijsten (1-staps)',
                    'Premium wax bescherming',
                    'Banden en velgen treatment',
                    'Motorruimte reiniging',
                    'Ruiten kristalhelder'
                ]
            },
            {
                name: 'Standard Signature Detail',
                price_range_min: 165,
                price_range_max: 165,
                duration_text: 'Duur: 3-4 uur',
                package_type: 'signature',
                subtitle: 'Uitgebreide detailing met uren intensief handwerk',
                icon: '🚗',
                features: [
                    'Grondige pre-wash',
                    'Handwas met professionele producten',
                    'Interieur reiniging en verzorging',
                    'Basis polijsten waar nodig',
                    'Beschermende wax laag',
                    'Banden en velgen reiniging',
                    'Ruiten behandeling'
                ]
            },
            {
                name: 'Express Detail',
                price_range_min: 85,
                price_range_max: 85,
                duration_text: 'Duur: 1.5-2 uur',
                package_type: 'signature',
                subtitle: 'Snelle maar grondige detailing voor wie weinig tijd heeft',
                icon: '⚡',
                features: [
                    'Professionele handwas',
                    'Snelle interieur reiniging',
                    'Quick detailer afwerking',
                    'Banden en velgen basis reiniging',
                    'Ruiten schoonmaken'
                ]
            },
            {
                name: 'Hand Wash Premium',
                price_range_min: 45,
                price_range_max: 65,
                duration_text: null,
                package_type: 'individual',
                subtitle: 'Traditionele handwas waarbij elk paneel minutieus wordt behandeld',
                icon: '▪',
                features: [
                    'Twee-emmer wash methode',
                    'pH-neutrale shampoos',
                    'Microfiber drying',
                    'Velgen en banden reiniging'
                ]
            },
            {
                name: 'Paint Correction',
                price_range_min: 125,
                price_range_max: 450,
                duration_text: null,
                package_type: 'individual',
                subtitle: 'Professionele lakrestauratie voor het verwijderen van krassen, swirl marks en oxidatie',
                icon: '✨',
                features: [
                    '1, 2 of 3-staps polish proces',
                    'Krassen en hologram verwijdering',
                    'Glans en diepte herstel',
                    'Professionele polish producten'
                ]
            },
            {
                name: 'Ceramic Coating',
                price_range_min: 350,
                price_range_max: 750,
                duration_text: null,
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
        ];

        // Update services with new data
        for (const service of services) {
            await query(`
                UPDATE services SET 
                    price_range_min = $1,
                    price_range_max = $2,
                    duration_text = $3,
                    package_type = $4,
                    subtitle = $5,
                    icon = $6,
                    features = $7::jsonb
                WHERE name = $8
            `, [
                service.price_range_min,
                service.price_range_max,
                service.duration_text,
                service.package_type,
                service.subtitle,
                service.icon,
                JSON.stringify(service.features),
                service.name
            ]);
        }

        // Insert add-ons
        const addons = [
            { name: 'Ozonbehandeling', description: 'Voor het verwijderen van hardnekkige geuren', price: 45 },
            { name: 'Stoombehang Reiniging', description: 'Diepgaande reiniging van stoffen interieur', price: 65 },
            { name: 'Trim Restauratie', description: 'Herstel van verkleurde kunststof onderdelen', price: 35 },
            { name: 'Pet Hair Removal', description: 'Specialistische verwijdering van dierenharen', price: 25 },
            { name: 'Convertible Top Care', description: 'Reiniging en impregnering van cabriodak', price: 85 },
            { name: 'Chrome Polish', description: 'Speciaal polijsten van chromen onderdelen', price: 45 }
        ];

        for (const addon of addons) {
            await query(`
                INSERT INTO service_addons (name, description, price)
                VALUES ($1, $2, $3)
                ON CONFLICT DO NOTHING
            `, [addon.name, addon.description, addon.price]);
        }

        // Insert sample projects
        const projects = [
            {
                title: 'BMW M3',
                description: 'Complete Signature Detail',
                category: 'premium',
                location: 'Rotterdam',
                car_make: 'BMW',
                car_model: 'M3',
                service_type: 'Premium Detailing',
                testimonial: 'Fantastische service en resultaat. Mijn BMW ziet er beter uit dan toen hij nieuw was. Zeer professioneel werk.',
                customer_name: 'Marco van der Berg',
                main_image_url: 'images/bmw-project-800x600.jpg'
            },
            {
                title: 'Audi RS6',
                description: 'Paint Correction + Ceramic Coating',
                category: 'premium',
                location: 'Den Haag',
                car_make: 'Audi',
                car_model: 'RS6',
                service_type: 'Paint Correction',
                testimonial: 'Het wachten waard voor dit niveau van kwaliteit. Ongelooflijk resultaat en perfecte afwerking.',
                customer_name: 'Lisa Hendricks',
                main_image_url: 'images/paint-correction-600x400.jpg'
            },
            {
                title: 'Porsche 911 (1987)',
                description: 'Classic Car Restoration Detail',
                category: 'classic',
                location: 'Amsterdam',
                car_make: 'Porsche',
                car_model: '911',
                car_year: 1987,
                service_type: 'Classic Restoration',
                testimonial: 'Mijn klassieke 911 heeft zijn oorspronkelijke glans terug. Geweldig vakmanschap en passie voor auto\'s.',
                customer_name: 'Thomas Janssen',
                main_image_url: 'images/porsche-project-800x600.jpg'
            },
            {
                title: 'Volkswagen Golf GTI',
                description: 'Standard Detail Package',
                category: 'daily',
                location: 'Utrecht',
                car_make: 'Volkswagen',
                car_model: 'Golf GTI',
                service_type: 'Standard Detailing',
                testimonial: 'Geweldige service en een perfecte prijs-kwaliteit verhouding. Mijn Golf ziet er weer uit als nieuw!',
                customer_name: 'Peter de Vries',
                main_image_url: 'images/golf-project-800x600.jpg'
            }
        ];

        for (const project of projects) {
            await query(`
                INSERT INTO projects (
                    title, description, category, location, car_make, car_model, car_year,
                    service_type, testimonial, customer_name, main_image_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT DO NOTHING
            `, [
                project.title, project.description, project.category, project.location,
                project.car_make, project.car_model, project.car_year,
                project.service_type, project.testimonial, project.customer_name,
                project.main_image_url
            ]);
        }

        console.log('✅ Website data seeding completed successfully');

    } catch (error) {
        console.error('❌ Error seeding website data:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    seedWebsiteData()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { seedWebsiteData };