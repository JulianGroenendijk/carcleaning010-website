/**
 * Services Management Module
 * Handles all service-related functionality
 */
class ServicesModule {
    constructor(apiClient) {
        this.api = apiClient;
        this.currentServices = [];
    }

    /**
     * Initialize services module
     */
    init() {
        console.log('🔧 Services module initialized');
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add service button
        const addServiceBtn = document.getElementById('addServiceBtn');
        if (addServiceBtn) {
            addServiceBtn.addEventListener('click', () => this.showAddServiceModal());
        }

        // Refresh services button  
        const refreshServicesBtn = document.getElementById('refreshServicesBtn');
        if (refreshServicesBtn) {
            refreshServicesBtn.addEventListener('click', () => this.loadServices());
        }
    }

    /**
     * Load services from API
     */
    async loadServices() {
        try {
            console.log('📋 Loading services...');
            
            const data = await this.api.get('/api/services', {
                params: { active_only: 'false' }
            });
            
            this.currentServices = data.services || [];
            this.renderServicesTable(this.currentServices);
            
            console.log(`✅ Loaded ${this.currentServices.length} services`);
            
        } catch (error) {
            console.error('Error loading services:', error);
            Utils.showToast('Fout bij laden diensten: ' + error.message, 'error');
        }
    }

    /**
     * Render services table
     */
    renderServicesTable(services) {
        const tbody = document.querySelector('#servicesTable tbody');
        if (!tbody) {
            console.warn('Services table body not found');
            return;
        }

        if (!services || services.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-inbox"></i><br>
                        Geen diensten gevonden
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = services.map(service => {
            const priceDisplay = Utils.formatServicePrice(service);
            const durationDisplay = Utils.formatDuration(service);
            
            return `
                <tr>
                    <td>
                        <strong>${Utils.escapeHtml(service.name)}</strong>
                        ${service.description ? `<br><small class="text-muted">${Utils.escapeHtml(service.description)}</small>` : ''}
                    </td>
                    <td><span class="badge bg-primary">${Utils.escapeHtml(service.category)}</span></td>
                    <td class="text-end">${priceDisplay}</td>
                    <td class="text-center">${durationDisplay || '-'}</td>
                    <td class="text-center">
                        <span class="badge bg-${service.active ? 'success' : 'secondary'}">
                            ${service.active ? 'Actief' : 'Inactief'}
                        </span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-info" onclick="servicesModule.showWebsitePreview('${service.id}')" title="Website Preview">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="servicesModule.showWebsiteEditModal('${service.id}')" title="Website Bewerken">
                                <i class="bi bi-globe"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="servicesModule.showEditServiceModal('${service.id}')" title="Service Bewerken">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="servicesModule.confirmDeleteService('${service.id}', '${Utils.escapeHtml(service.name)}')" title="Verwijderen">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Show add service modal
     */
    async showAddServiceModal() {
        const modal = new ModalComponent({
            title: 'Nieuwe Dienst Toevoegen',
            size: 'lg'
        });

        const content = `
            <form id="addServiceForm">
                <div class="row">
                    <div class="col-md-8 mb-3">
                        <label class="form-label">Naam *</label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">Categorie *</label>
                        <select class="form-select" name="category" required>
                            <option value="">Selecteer categorie</option>
                            <option value="detailing">Detailing</option>
                            <option value="coating">Coating</option>
                            <option value="interior">Interieur</option>
                            <option value="maintenance">Onderhoud</option>
                        </select>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Beschrijving</label>
                    <textarea class="form-control" name="description" rows="3"></textarea>
                </div>
                
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Basisprijs (€)</label>
                        <input type="number" class="form-control" name="base_price" step="0.01" min="0">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">Duur (minuten)</label>
                        <input type="number" class="form-control" name="duration_minutes" min="1">
                    </div>
                </div>
                
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" name="active" id="serviceActive" checked>
                    <label class="form-check-label" for="serviceActive">Actief</label>
                </div>
            </form>
        `;

        const footer = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
            <button type="submit" form="addServiceForm" class="btn btn-primary">
                <i class="bi bi-plus-lg"></i> Dienst Toevoegen
            </button>
        `;

        modal.create(content, footer)
             .setupFormHandler(this.handleAddService.bind(this), {
                 name: 'string',
                 category: 'string', 
                 description: 'string',
                 base_price: 'float',
                 duration_minutes: 'int',
                 active: 'boolean'
             })
             .show();
    }

    /**
     * Handle add service form submission
     */
    async handleAddService(data) {
        try {
            await this.api.post('/api/services', data);
            Utils.showToast('Dienst succesvol toegevoegd! 🎉', 'success');
            this.loadServices();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.querySelector('.modal.show'));
            if (modal) modal.hide();
            
        } catch (error) {
            throw new Error('Fout bij aanmaken dienst: ' + error.message);
        }
    }

    /**
     * Show edit service modal
     */
    async showEditServiceModal(serviceId) {
        try {
            const service = await this.api.get(`/api/services/${serviceId}`);
            
            const modal = new ModalComponent({
                title: `Dienst Bewerken: ${service.name}`,
                size: 'lg'
            });

            const content = `
                <form id="editServiceForm">
                    <input type="hidden" name="id" value="${service.id}">
                    
                    <div class="row">
                        <div class="col-md-8 mb-3">
                            <label class="form-label">Naam *</label>
                            <input type="text" class="form-control" name="name" value="${Utils.escapeHtml(service.name)}" required>
                        </div>
                        <div class="col-md-4 mb-3">
                            <label class="form-label">Categorie *</label>
                            <select class="form-select" name="category" required>
                                <option value="detailing" ${service.category === 'detailing' ? 'selected' : ''}>Detailing</option>
                                <option value="coating" ${service.category === 'coating' ? 'selected' : ''}>Coating</option>
                                <option value="interior" ${service.category === 'interior' ? 'selected' : ''}>Interieur</option>
                                <option value="maintenance" ${service.category === 'maintenance' ? 'selected' : ''}>Onderhoud</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Beschrijving</label>
                        <textarea class="form-control" name="description" rows="3">${Utils.escapeHtml(service.description || '')}</textarea>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Basisprijs (€)</label>
                            <input type="number" class="form-control" name="base_price" value="${service.base_price || ''}" step="0.01" min="0">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Duur (minuten)</label>
                            <input type="number" class="form-control" name="duration_minutes" value="${service.duration_minutes || ''}" min="1">
                        </div>
                    </div>
                    
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" name="active" id="editServiceActive" ${service.active ? 'checked' : ''}>
                        <label class="form-check-label" for="editServiceActive">Actief</label>
                    </div>
                </form>
            `;

            const footer = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="submit" form="editServiceForm" class="btn btn-primary">
                    <i class="bi bi-check-lg"></i> Wijzigingen Opslaan
                </button>
            `;

            modal.create(content, footer)
                 .setupFormHandler(this.handleEditService.bind(this), {
                     name: 'string',
                     category: 'string',
                     description: 'string', 
                     base_price: 'float',
                     duration_minutes: 'int',
                     active: 'boolean'
                 })
                 .show();
                 
        } catch (error) {
            Utils.showToast('Fout bij laden dienst: ' + error.message, 'error');
        }
    }

    /**
     * Handle edit service form submission
     */
    async handleEditService(data) {
        try {
            const serviceId = data.id;
            delete data.id; // Remove ID from data object
            
            await this.api.put(`/api/services/${serviceId}`, data);
            Utils.showToast('Dienst succesvol bijgewerkt! ✅', 'success');
            this.loadServices();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.querySelector('.modal.show'));
            if (modal) modal.hide();
            
        } catch (error) {
            throw new Error('Fout bij bijwerken dienst: ' + error.message);
        }
    }

    /**
     * Confirm delete service
     */
    async confirmDeleteService(serviceId, serviceName) {
        const confirmed = await ModalComponent.confirm(
            'Dienst Verwijderen',
            `Weet je zeker dat je "${serviceName}" wilt verwijderen? Deze actie kan niet ongedaan gemaakt worden.`,
            {
                type: 'danger',
                confirmText: 'Ja, Verwijderen',
                cancelText: 'Annuleren'
            }
        );

        if (confirmed) {
            await this.deleteService(serviceId);
        }
    }

    /**
     * Delete service
     */
    async deleteService(serviceId) {
        try {
            await this.api.delete(`/api/services/${serviceId}`);
            Utils.showToast('Dienst succesvol verwijderd', 'success');
            this.loadServices();
        } catch (error) {
            Utils.showToast('Fout bij verwijderen dienst: ' + error.message, 'error');
        }
    }

    /**
     * Get services for other modules (e.g., quotes)
     */
    getServices() {
        return this.currentServices;
    }

    /**
     * Get service by ID
     */
    getServiceById(id) {
        return this.currentServices.find(service => service.id === id);
    }
}

window.ServicesModule = ServicesModule;