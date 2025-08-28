/**
 * Admin Adapter
 * Integrates new modular components with existing admin.js structure
 * Maintains existing UI while using cleaner, modular code underneath
 */

// Wait for DOM and all modules to load
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for all scripts to load
    setTimeout(() => {
        initializeModularIntegration();
    }, 100);
});

function initializeModularIntegration() {
    console.log('🔧 Initializing modular integration...');
    
    // Check if modules are available
    if (typeof ServicesModule === 'undefined' || typeof WebsiteEditorModule === 'undefined') {
        console.warn('⚠️ Modular components not loaded, falling back to original admin.js');
        return;
    }

    // Initialize API client
    const apiClient = new ApiClient();
    
    // Initialize modules
    const servicesModule = new ServicesModule(apiClient);
    const websiteEditorModule = new WebsiteEditorModule(apiClient);
    
    // Make modules globally available
    window.servicesModule = servicesModule;
    window.websiteEditorModule = websiteEditorModule;
    
    // Initialize modules
    servicesModule.init();
    websiteEditorModule.init();
    
    // Override existing AdminApp methods with modular ones
    if (window.adminApp) {
        integrateWithExistingAdmin(apiClient, servicesModule, websiteEditorModule);
    }
    
    console.log('✅ Modular integration completed');
}

function integrateWithExistingAdmin(apiClient, servicesModule, websiteEditorModule) {
    const adminApp = window.adminApp;
    
    // Override services-related methods
    adminApp.loadServices = async function() {
        console.log('📋 Loading services using modular system...');
        
        try {
            // Get services data from module
            await servicesModule.loadServices();
            const services = servicesModule.getServices();
            
            // Update the services section UI with existing layout
            const servicesSection = document.getElementById('services-section');
            if (!servicesSection) return;
            
            servicesSection.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-list-check text-primary"></i> Prijslijst Beheer</h1>
                    <div>
                        <button class="btn btn-outline-primary" onclick="servicesModule.loadServices()">
                            <i class="bi bi-arrow-clockwise"></i> Vernieuwen
                        </button>
                        <button class="btn btn-primary" onclick="servicesModule.showAddServiceModal()">
                            <i class="bi bi-plus-lg"></i> Nieuwe Dienst
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover" id="servicesTable">
                                <thead class="table-light">
                                    <tr>
                                        <th>Naam</th>
                                        <th>Categorie</th>
                                        <th class="text-end">Prijs</th>
                                        <th class="text-center">Duur</th>
                                        <th class="text-center">Status</th>
                                        <th class="text-center">Acties</th>
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Render services using the modular renderer
            servicesModule.renderServicesTable(services);
            
        } catch (error) {
            console.error('Error in modular loadServices:', error);
            Utils.showToast('Fout bij laden diensten: ' + error.message, 'error');
        }
    };
    
    // Add website editor functions to global scope for onclick handlers
    window.showWebsitePreview = function(serviceId) {
        return websiteEditorModule.showWebsitePreview(serviceId);
    };
    
    window.showWebsiteEditModal = function(serviceId) {
        return websiteEditorModule.showWebsiteEditModal(serviceId);
    };
    
    // Override existing service management functions
    window.showAddServiceModal = function() {
        return servicesModule.showAddServiceModal();
    };
    
    window.showEditServiceModal = function(serviceId) {
        return servicesModule.showEditServiceModal(serviceId);
    };
    
    window.confirmDeleteService = function(serviceId, serviceName) {
        return servicesModule.confirmDeleteService(serviceId, serviceName);
    };
    
    // Override API call method to use the centralized client
    adminApp.apiCall = function(method, endpoint, data) {
        return apiClient.request(method, endpoint, data);
    };
    
    // Override toast method to use Utils
    adminApp.showToast = function(message, type = 'info', duration = 4000) {
        return Utils.showToast(message, type, duration);
    };
    
    console.log('🔗 Successfully integrated modular components with existing admin');
}

// Global error handler for modular components
window.addEventListener('error', (event) => {
    if (event.filename && event.filename.includes('/js/modules/')) {
        console.error('Module error:', event.error);
        if (typeof Utils !== 'undefined') {
            Utils.showToast('Module fout: ' + event.error.message, 'error');
        }
        event.preventDefault();
    }
});