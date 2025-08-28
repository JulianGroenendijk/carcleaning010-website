// Dynamic content loader for diensten.html
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Loading dynamic services content...');
        
        // Get services data from API
        const data = await window.websiteAPI.getServices();
        console.log('Services data loaded:', data);

        // Load signature packages
        loadSignaturePackages(data.services.filter(s => s.package_type === 'signature'));
        
        // Load individual services
        loadIndividualServices(data.services.filter(s => s.package_type === 'individual'));
        
        // Load add-ons
        loadServiceAddons(data.addons);

    } catch (error) {
        console.error('Error loading services content:', error);
        // Keep existing static content as fallback
    }
});

function loadSignaturePackages(services) {
    const container = document.querySelector('.signature-grid');
    if (!container || services.length === 0) return;

    console.log('Loading signature packages:', services);

    // Clear existing content
    container.innerHTML = '';

    services.forEach((service, index) => {
        const packageClass = index === 0 ? 'premium' : (index === 1 ? 'standard' : 'basic');
        const badge = index === 0 ? '<span class="package-badge">Meest Gekozen</span>' : '';
        
        const packageHTML = `
            <div class="signature-package ${packageClass}">
                <div class="package-header">
                    <h3>${service.name}</h3>
                    ${badge}
                </div>
                <div class="package-image">
                    <img src="${service.image_url || 'images/hero-car-detailing-1920x1080.jpg'}" alt="${service.name}">
                </div>
                <div class="package-content">
                    <p class="package-description">${service.subtitle || service.description}</p>
                    
                    <h4>Wat is inbegrepen:</h4>
                    <ul class="package-includes">
                        ${window.websiteAPI.formatFeatures(service.features)}
                    </ul>
                    
                    ${service.duration_text ? `<div class="package-time">⏱️ ${service.duration_text}</div>` : ''}
                    <div class="package-price">
                        <span class="price-from">Vanaf</span>
                        <span class="price">${window.websiteAPI.formatPrice(service)}</span>
                    </div>
                    <a href="contact.html" class="package-button">Boek Nu</a>
                </div>
            </div>
        `;
        
        container.innerHTML += packageHTML;
    });
}

function loadIndividualServices(services) {
    const container = document.querySelector('.services-grid-detailed');
    if (!container || services.length === 0) return;

    console.log('Loading individual services:', services);

    // Clear existing content except if empty (keep static fallback)
    if (services.length > 0) {
        container.innerHTML = '';
    }

    services.forEach(service => {
        const categoryClass = getCategoryClass(service.category);
        
        const serviceHTML = `
            <div class="service-detailed" data-category="${service.category}">
                <div class="service-icon-large">${service.icon || '▪'}</div>
                <h3>${service.name}</h3>
                <p>${service.description}</p>
                <ul class="service-features-detailed">
                    ${window.websiteAPI.formatFeatures(service.features)}
                </ul>
                <div class="service-price-detailed">${window.websiteAPI.formatPrice(service)}</div>
            </div>
        `;
        
        container.innerHTML += serviceHTML;
    });
}

function loadServiceAddons(addons) {
    const container = document.querySelector('.addons-grid');
    if (!container || addons.length === 0) return;

    console.log('Loading service addons:', addons);

    // Clear existing content
    container.innerHTML = '';

    addons.forEach(addon => {
        const addonHTML = `
            <div class="addon-item">
                <h4>${addon.name}</h4>
                <p>${addon.description}</p>
                <span class="addon-price">+ €${addon.price}</span>
            </div>
        `;
        
        container.innerHTML += addonHTML;
    });
}

function getCategoryClass(category) {
    const categoryMap = {
        'cleaning': 'cleaning',
        'detailing': 'detailing',
        'protection': 'protection',
        'maintenance': 'maintenance'
    };
    return categoryMap[category] || 'cleaning';
}