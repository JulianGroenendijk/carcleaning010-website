/**
 * Website Editor Module
 * Handles website content editing functionality
 */
class WebsiteEditorModule {
    constructor(apiClient) {
        this.api = apiClient;
        this.currentServices = [];
    }

    /**
     * Initialize website editor module
     */
    init() {
        console.log('🌐 Website Editor module initialized');
    }

    /**
     * Show website preview modal
     */
    async showWebsitePreview(serviceId) {
        try {
            const data = await this.api.get('/api/website-editor/services');
            const service = data.services.find(s => s.id === serviceId);
            
            if (!service) {
                Utils.showToast('Service niet gevonden', 'error');
                return;
            }

            const modal = new ModalComponent({
                title: `Website Preview: ${service.name}`,
                size: 'xl'
            });

            const content = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> Zo ziet deze service eruit op de website:
                </div>
                
                ${this.renderWebsiteServicePreview(service)}
                
                <div class="row mt-4">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-header">
                                <h6><i class="bi bi-link-45deg"></i> Links:</h6>
                            </div>
                            <div class="card-body">
                                <div class="d-grid gap-2">
                                    <a href="/admin/diensten.html" target="_blank" class="btn btn-outline-primary btn-sm">
                                        <i class="bi bi-arrow-up-right-square"></i> Bekijk Live Diensten Pagina
                                    </a>
                                    <button class="btn btn-success btn-sm" onclick="websiteEditorModule.showWebsiteEditModal('${service.id}')">
                                        <i class="bi bi-pencil"></i> Bewerk Website Content
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const footer = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>
                <button type="button" class="btn btn-success" onclick="websiteEditorModule.showWebsiteEditModal('${service.id}')">
                    <i class="bi bi-pencil"></i> Bewerk Website Content
                </button>
            `;

            modal.create(content, footer).show();

        } catch (error) {
            console.error('Error loading website preview:', error);
            Utils.showToast('Fout bij ophalen website preview', 'error');
        }
    }

    /**
     * Show website edit modal
     */
    async showWebsiteEditModal(serviceId) {
        try {
            const data = await this.api.get('/api/website-editor/services');
            const service = data.services.find(s => s.id === serviceId);
            
            if (!service) {
                Utils.showToast('Service niet gevonden', 'error');
                return;
            }

            const modal = new ModalComponent({
                title: `Website Content Bewerken: ${service.name}`,
                size: 'xl'
            });

            const content = `
                <div class="alert alert-success">
                    <i class="bi bi-info-circle"></i> <strong>Website Editor:</strong> Hier pas je alleen de content aan die op de website zichtbaar is. Technische instellingen staan in de normale service editor.
                </div>
                
                <div class="row">
                    <div class="col-md-8">
                        <form id="websiteEditForm">
                            <input type="hidden" name="service_id" value="${service.id}">
                            
                            <div class="mb-3">
                                <label for="website_name" class="form-label">Service Naam (zichtbaar op website)</label>
                                <input type="text" class="form-control" name="name" value="${Utils.escapeHtml(service.name)}" required>
                            </div>
                            
                            <div class="mb-3">
                                <label for="website_subtitle" class="form-label">Ondertitel / Korte beschrijving</label>
                                <input type="text" class="form-control" name="subtitle" value="${Utils.escapeHtml(service.subtitle || '')}" placeholder="Bijv. Het complete detailing pakket...">
                            </div>
                            
                            <div class="mb-3">
                                <label for="website_description" class="form-label">Volledige beschrijving</label>
                                <textarea class="form-control" name="description" rows="4">${Utils.escapeHtml(service.description || '')}</textarea>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="website_price_min" class="form-label">Prijs Van (€)</label>
                                    <input type="number" class="form-control" name="price_range_min" value="${service.price_range_min || ''}" step="1" min="0">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="website_price_max" class="form-label">Prijs Tot (€)</label>
                                    <input type="number" class="form-control" name="price_range_max" value="${service.price_range_max || ''}" step="1" min="0">
                                    <div class="form-text">Zelfde waarde = vaste prijs (€225), verschillende = bereik (€45-65)</div>
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="website_duration" class="form-label">Duur Tekst</label>
                                <input type="text" class="form-control" name="duration_text" value="${Utils.escapeHtml(service.duration_text || '')}" placeholder="Bijv. 2-3 uur">
                                <div class="form-text">Overschrijft automatische duur berekening</div>
                            </div>
                            
                            <div class="mb-3">
                                <label for="website_image" class="form-label">Afbeelding URL</label>
                                <input type="url" class="form-control" name="image_url" value="${Utils.escapeHtml(service.image_url || '')}" placeholder="https://example.com/image.jpg">
                            </div>
                            
                            <div class="mb-3">
                                <label for="website_features" class="form-label">Kenmerken / Features</label>
                                <textarea class="form-control" name="features" rows="4" placeholder="Elk kenmerk op een nieuwe regel...">${service.features ? service.features.join('\\n') : ''}</textarea>
                                <div class="form-text">Elke regel wordt een apart kenmerk met ✓ icoon</div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-check mb-3">
                                        <input type="checkbox" class="form-check-input" name="featured" ${service.featured ? 'checked' : ''}>
                                        <label class="form-check-label">
                                            <strong>Meest Gekozen</strong> (Featured badge)
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-check mb-3">
                                        <input type="checkbox" class="form-check-input" name="active" ${service.active ? 'checked' : ''}>
                                        <label class="form-check-label">
                                            Actief op website
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header">
                                <h6><i class="bi bi-eye"></i> Live Preview</h6>
                            </div>
                            <div class="card-body">
                                <div id="websitePreviewContainer">
                                    ${this.renderWebsiteServicePreview(service)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const footer = `
                <button type="button" class="btn btn-outline-secondary" onclick="websiteEditorModule.showWebsitePreview('${service.id}')">
                    <i class="bi bi-eye"></i> Alleen Preview
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="submit" form="websiteEditForm" class="btn btn-success">
                    <i class="bi bi-check-lg"></i> Website Content Opslaan
                </button>
            `;

            modal.create(content, footer)
                 .setupFormHandler(this.handleWebsiteEditSave.bind(this, serviceId), {
                     name: 'string',
                     subtitle: 'string',
                     description: 'string',
                     price_range_min: 'float',
                     price_range_max: 'float', 
                     duration_text: 'string',
                     image_url: 'string',
                     features: 'array',
                     featured: 'boolean',
                     active: 'boolean'
                 })
                 .show();

            // Setup real-time preview updates
            this.setupWebsiteEditPreview();

        } catch (error) {
            console.error('Error loading website edit modal:', error);
            Utils.showToast('Fout bij ophalen website edit modal', 'error');
        }
    }

    /**
     * Handle website edit form save
     */
    async handleWebsiteEditSave(serviceId, data) {
        try {
            await this.api.put(`/api/website-editor/services/${serviceId}`, data);
            Utils.showToast('Website content succesvol bijgewerkt! 🎉', 'success');
            
            // Refresh services table if it exists
            if (window.servicesModule) {
                window.servicesModule.loadServices();
            }
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.querySelector('.modal.show'));
            if (modal) modal.hide();
            
        } catch (error) {
            throw new Error('Fout bij bijwerken website content: ' + error.message);
        }
    }

    /**
     * Setup real-time preview updates
     */
    setupWebsiteEditPreview() {
        const form = document.getElementById('websiteEditForm');
        const previewContainer = document.getElementById('websitePreviewContainer');
        
        if (!form || !previewContainer) return;
        
        const updatePreview = Utils.debounce(() => {
            const formData = new FormData(form);
            const features = formData.get('features') ? formData.get('features').split('\\n').filter(f => f.trim()) : [];
            
            const previewService = {
                name: formData.get('name') || 'Service Naam',
                subtitle: formData.get('subtitle'),
                description: formData.get('description'),
                formatted_price: this.formatPreviewPrice(formData.get('price_range_min'), formData.get('price_range_max')),
                formatted_duration: formData.get('duration_text'),
                icon: '📋',
                features: features,
                featured: formData.has('featured')
            };
            
            previewContainer.innerHTML = this.renderWebsiteServicePreview(previewService);
        }, 500);
        
        // Add event listeners to form inputs
        form.addEventListener('input', updatePreview);
        form.addEventListener('change', updatePreview);
    }

    /**
     * Format price for preview
     */
    formatPreviewPrice(min, max) {
        if (!min && !max) return 'Op aanvraag';
        if (!max || min === max) return `€${min || '0'}`;
        return `€${min} - €${max}`;
    }

    /**
     * Render website service preview
     */
    renderWebsiteServicePreview(service) {
        const badge = service.featured ? '<span class="badge bg-primary">Meest Gekozen</span>' : '';
        
        return `
            <div class="card" style="max-width: 400px;">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <span style="font-size: 1.2em;">${service.icon || '📋'}</span>
                        <strong>${Utils.escapeHtml(service.name)}</strong>
                    </div>
                    ${badge}
                </div>
                <div class="card-body">
                    ${service.subtitle ? `<p class="text-muted small">${Utils.escapeHtml(service.subtitle)}</p>` : ''}
                    
                    ${service.description ? `<p class="small">${Utils.escapeHtml(service.description)}</p>` : ''}
                    
                    ${service.features && service.features.length > 0 ? `
                        <ul class="list-unstyled small">
                            ${service.features.map(feature => `<li class="mb-1">✓ ${Utils.escapeHtml(feature)}</li>`).join('')}
                        </ul>
                    ` : ''}
                    
                    ${service.formatted_duration ? `<p class="text-info small">⏱️ ${Utils.escapeHtml(service.formatted_duration)}</p>` : ''}
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-muted small">Vanaf</span>
                        <h5 class="text-primary mb-0">${service.formatted_price}</h5>
                    </div>
                </div>
            </div>
        `;
    }
}

window.WebsiteEditorModule = WebsiteEditorModule;