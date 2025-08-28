// Unified Persons Management System
// Part of Carcleaning010 Admin Dashboard

// Extend AdminApp class with persons management functionality
AdminApp.prototype.personsCurrentPage = 1;
AdminApp.prototype.personsPerPage = 20;
AdminApp.prototype.personsFilters = {
    search: '',
    type: 'all',
    company_id: ''
};

// =====================================================
// PERSONS MANAGEMENT - MAIN FUNCTIONS
// =====================================================

// Load persons section
AdminApp.prototype.loadPersons = async function() {
    try {
        console.log('🔄 Loading unified persons management...');
        
        this.currentSection = 'persons';
        
        // Setup event listeners for this section
        this.setupPersonsEventListeners();
        
        // Load initial data
        await Promise.all([
            this.loadPersonsData(),
            this.loadCompaniesForFilter(),
            this.updatePersonsStats()
        ]);
        
        console.log('✅ Persons section loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading persons section:', error);
        this.showToast('Fout bij laden personen', 'error');
    }
};

// Setup event listeners for persons section
AdminApp.prototype.setupPersonsEventListeners = function() {
    // Prevent duplicate event listeners
    const elements = [
        'personTypeFilter', 'searchPersons', 'companyFilter', 
        'addPersonBtn', 'refreshPersonsBtn', 'bulkConvertLeadsBtn', 
        'bulkExportBtn', 'selectAllPersons'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            // Remove existing listeners by cloning element
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        }
    });
    
    // Type filter
    document.getElementById('personTypeFilter')?.addEventListener('change', (e) => {
        this.personsFilters.type = e.target.value;
        this.personsCurrentPage = 1;
        this.loadPersonsData();
    });
    
    // Search filter with debounce
    document.getElementById('searchPersons')?.addEventListener('input', 
        this.debounce((e) => {
            this.personsFilters.search = e.target.value;
            this.personsCurrentPage = 1;
            this.loadPersonsData();
        }, 300)
    );
    
    // Company filter
    document.getElementById('companyFilter')?.addEventListener('change', (e) => {
        this.personsFilters.company_id = e.target.value;
        this.personsCurrentPage = 1;
        this.loadPersonsData();
    });
    
    // Add person button
    document.getElementById('addPersonBtn')?.addEventListener('click', () => {
        this.showAddPersonModal();
    });
    
    // Refresh button
    document.getElementById('refreshPersonsBtn')?.addEventListener('click', () => {
        this.loadPersonsData();
        this.updatePersonsStats();
    });
    
    // Bulk convert leads button
    document.getElementById('bulkConvertLeadsBtn')?.addEventListener('click', () => {
        this.showBulkConvertModal();
    });
    
    // Export button
    document.getElementById('bulkExportBtn')?.addEventListener('click', () => {
        this.exportPersonsToCSV();
    });
    
    // Select all checkbox
    document.getElementById('selectAllPersons')?.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('#personsTableBody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        this.updateBulkButtons();
    });
};

// Load persons data with filters and pagination
AdminApp.prototype.loadPersonsData = async function() {
    try {
        const params = new URLSearchParams({
            search: this.personsFilters.search,
            type: this.personsFilters.type,
            company_id: this.personsFilters.company_id,
            limit: this.personsPerPage,
            offset: (this.personsCurrentPage - 1) * this.personsPerPage
        });
        
        const response = await this.apiCall('GET', `/api/persons?${params}`);
        
        if (response.persons) {
            this.renderPersonsTable(response.persons);
            this.renderPersonsPagination(response.pagination);
        } else {
            throw new Error('Invalid response format');
        }
        
    } catch (error) {
        console.error('Error loading persons data:', error);
        this.showToast('Fout bij laden personen data', 'error');
        document.getElementById('personsTableBody').innerHTML = 
            '<tr><td colspan="10" class="text-center text-danger">Fout bij laden data</td></tr>';
    }
};

// Render persons table
AdminApp.prototype.renderPersonsTable = function(persons) {
    const tbody = document.getElementById('personsTableBody');
    
    if (persons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">Geen personen gevonden</td></tr>';
        return;
    }
    
    tbody.innerHTML = persons.map(person => {
        // Determine person type badges
        const badges = [];
        if (person.is_individual_customer) badges.push('<span class="badge bg-success">Particuliere Klant</span>');
        if (person.is_business_customer) badges.push('<span class="badge bg-primary">Zakelijke Klant</span>');
        if (person.is_individual_lead) badges.push('<span class="badge bg-warning">Particuliere Lead</span>');
        if (person.is_business_lead) badges.push('<span class="badge bg-info">Zakelijke Lead</span>');
        
        // Company relationships
        const companies = Array.isArray(person.companies) && person.companies.length > 0 
            ? person.companies.map(c => `<small class="d-block">${c.company_name} (${c.role_type})</small>`).join('')
            : '<small class="text-muted">Geen</small>';
        
        // Format last activity
        const lastActivity = person.last_activity 
            ? new Date(person.last_activity).toLocaleDateString('nl-NL')
            : '<small class="text-muted">Geen</small>';
        
        // Lead status
        const statusBadge = person.lead_status 
            ? `<span class="badge bg-secondary">${person.lead_status}</span>`
            : '';
        
        return `
            <tr data-person-id="${person.id}">
                <td>
                    <input type="checkbox" class="form-check-input person-checkbox" value="${person.id}">
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div>
                            <strong>${person.first_name} ${person.last_name}</strong>
                            ${person.email ? `<br><small class="text-muted">${person.email}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>${person.email || '<small class="text-muted">Geen</small>'}</td>
                <td>
                    ${person.phone ? person.phone : ''}
                    ${person.mobile ? (person.phone ? `<br><small>${person.mobile}</small>` : person.mobile) : ''}
                    ${!person.phone && !person.mobile ? '<small class="text-muted">Geen</small>' : ''}
                </td>
                <td>${badges.length > 0 ? badges.join('<br>') : '<small class="text-muted">Onbekend</small>'}</td>
                <td>${statusBadge}</td>
                <td>${companies}</td>
                <td>
                    <span class="badge bg-dark">${person.vehicle_count || 0}</span>
                </td>
                <td>${lastActivity}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="app.viewPerson('${person.id}')" title="Bekijken">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="app.editPerson('${person.id}')" title="Bewerken">
                            <i class="bi bi-pencil"></i>
                        </button>
                        ${(person.is_individual_lead || person.is_business_lead) ? 
                            `<button class="btn btn-outline-warning" onclick="app.convertPersonToCustomer('${person.id}')" title="Converteer naar klant">
                                <i class="bi bi-arrow-right-circle"></i>
                            </button>` : ''
                        }
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" title="Meer acties">
                                <i class="bi bi-three-dots"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="app.addVehicleToPerson('${person.id}')">
                                    <i class="bi bi-car-front"></i> Voertuig Toevoegen
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="app.addPersonToCompany('${person.id}')">
                                    <i class="bi bi-building"></i> Aan Bedrijf Koppelen
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="app.deletePerson('${person.id}')">
                                    <i class="bi bi-trash"></i> Verwijderen
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add event listeners for checkboxes
    document.querySelectorAll('.person-checkbox').forEach(cb => {
        cb.addEventListener('change', () => this.updateBulkButtons());
    });
    
    this.updateBulkButtons();
};

// Render pagination
AdminApp.prototype.renderPersonsPagination = function(pagination) {
    const nav = document.getElementById('personsPagination');
    
    if (pagination.pages <= 1) {
        nav.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    if (pagination.offset > 0) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="app.goToPersonsPage(${this.personsCurrentPage - 1})">
                    <i class="bi bi-chevron-left"></i>
                </a>
            </li>
        `;
    }
    
    // Page numbers
    const startPage = Math.max(1, this.personsCurrentPage - 2);
    const endPage = Math.min(pagination.pages, this.personsCurrentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === this.personsCurrentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="app.goToPersonsPage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    if (this.personsCurrentPage < pagination.pages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="app.goToPersonsPage(${this.personsCurrentPage + 1})">
                    <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;
    }
    
    nav.innerHTML = paginationHTML;
};

// Go to specific page
AdminApp.prototype.goToPersonsPage = function(page) {
    this.personsCurrentPage = page;
    this.loadPersonsData();
};

// Update bulk action buttons
AdminApp.prototype.updateBulkButtons = function() {
    const selectedBoxes = document.querySelectorAll('.person-checkbox:checked');
    const bulkConvertBtn = document.getElementById('bulkConvertLeadsBtn');
    
    if (bulkConvertBtn) {
        bulkConvertBtn.disabled = selectedBoxes.length === 0;
    }
};

// Load companies for filter dropdown
AdminApp.prototype.loadCompaniesForFilter = async function() {
    try {
        const response = await this.apiCall('GET', '/api/companies?limit=100');
        const select = document.getElementById('companyFilter');
        
        if (select && response.companies) {
            const options = response.companies.map(company => 
                `<option value="${company.id}">${company.name}</option>`
            ).join('');
            
            select.innerHTML = '<option value="">Alle Bedrijven</option>' + options;
        }
        
    } catch (error) {
        console.error('Error loading companies for filter:', error);
    }
};

// Update statistics
AdminApp.prototype.updatePersonsStats = async function() {
    try {
        // Get different counts
        const [allPersons, customers, leads, contacts] = await Promise.all([
            this.apiCall('GET', '/api/persons?type=all&limit=1'),
            this.apiCall('GET', '/api/persons?type=customers&limit=1'),
            this.apiCall('GET', '/api/persons?type=leads&limit=1'),
            this.apiCall('GET', '/api/persons?type=contacts&limit=1')
        ]);
        
        document.getElementById('totalPersons').textContent = allPersons.pagination?.total || 0;
        document.getElementById('totalCustomers').textContent = customers.pagination?.total || 0;
        document.getElementById('totalLeads').textContent = leads.pagination?.total || 0;
        document.getElementById('totalContacts').textContent = contacts.pagination?.total || 0;
        
    } catch (error) {
        console.error('Error updating persons stats:', error);
        // Set default values on error
        ['totalPersons', 'totalCustomers', 'totalLeads', 'totalContacts'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
    }
};

// =====================================================
// PERSONS ACTIONS
// =====================================================

// View person details
AdminApp.prototype.viewPerson = async function(personId) {
    try {
        const person = await this.apiCall('GET', `/api/persons/${personId}`);
        this.showPersonDetailsModal(person);
    } catch (error) {
        console.error('Error loading person details:', error);
        this.showToast('Fout bij laden persoongegevens', 'error');
    }
};

// Edit person
AdminApp.prototype.editPerson = async function(personId) {
    try {
        const person = await this.apiCall('GET', `/api/persons/${personId}`);
        this.showEditPersonModal(person);
    } catch (error) {
        console.error('Error loading person for edit:', error);
        this.showToast('Fout bij laden persoongegevens', 'error');
    }
};

// Delete person
AdminApp.prototype.deletePerson = async function(personId) {
    if (!confirm('Weet je zeker dat je deze persoon wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
        return;
    }
    
    try {
        await this.apiCall('DELETE', `/api/persons/${personId}`);
        this.showToast('Persoon succesvol verwijderd', 'success');
        this.loadPersonsData();
        this.updatePersonsStats();
    } catch (error) {
        console.error('Error deleting person:', error);
        this.showToast(`Fout bij verwijderen persoon: ${error.message}`, 'error');
    }
};

// Convert person to customer
AdminApp.prototype.convertPersonToCustomer = function(personId) {
    this.showConvertLeadModal(personId);
};

// Show add person modal
AdminApp.prototype.showAddPersonModal = function() {
    const modalHTML = `
        <div class="modal fade" id="addPersonModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-person-plus"></i> Nieuwe Persoon Toevoegen
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="addPersonForm">
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Voornaam *</label>
                                        <input type="text" class="form-control" name="first_name" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Achternaam *</label>
                                        <input type="text" class="form-control" name="last_name" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">E-mail</label>
                                        <input type="email" class="form-control" name="email">
                                        <div class="form-text">Uniek e-mailadres (optioneel voor contactpersonen)</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="mb-3">
                                        <label class="form-label">Telefoon</label>
                                        <input type="tel" class="form-control" name="phone">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="mb-3">
                                        <label class="form-label">Mobiel</label>
                                        <input type="tel" class="form-control" name="mobile">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-8">
                                    <div class="mb-3">
                                        <label class="form-label">Adres</label>
                                        <input type="text" class="form-control" name="address">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label class="form-label">Postcode</label>
                                        <input type="text" class="form-control" name="postal_code">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Plaats</label>
                                        <input type="text" class="form-control" name="city">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="mb-3">
                                        <label class="form-label">Geboortedatum</label>
                                        <input type="date" class="form-control" name="date_of_birth">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="mb-3">
                                        <label class="form-label">Geslacht</label>
                                        <select class="form-select" name="gender">
                                            <option value="">Selecteer...</option>
                                            <option value="male">Man</option>
                                            <option value="female">Vrouw</option>
                                            <option value="other">Anders</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Lead Status</label>
                                        <select class="form-select" name="lead_status">
                                            <option value="new">Nieuw</option>
                                            <option value="contacted">Contact opgenomen</option>
                                            <option value="qualified">Gekwalificeerd</option>
                                            <option value="proposal_sent">Voorstel verzonden</option>
                                            <option value="closed_won">Gesloten (gewonnen)</option>
                                            <option value="closed_lost">Gesloten (verloren)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Lead Bron</label>
                                        <input type="text" class="form-control" name="lead_source" placeholder="bijv. website, referral, cold_call">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-12">
                                    <div class="mb-3">
                                        <label class="form-label">Type Persoon</label>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="is_individual_lead" value="1" id="individualLead">
                                                    <label class="form-check-label" for="individualLead">
                                                        Particuliere Lead
                                                    </label>
                                                </div>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="is_business_lead" value="1" id="businessLead">
                                                    <label class="form-check-label" for="businessLead">
                                                        Zakelijke Lead
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="marketing_consent" value="1" id="marketingConsent">
                                                    <label class="form-check-label" for="marketingConsent">
                                                        Marketing toestemming
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Opmerkingen</label>
                                <textarea class="form-control" name="notes" rows="3"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle"></i> Annuleren
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="bi bi-check-circle"></i> Persoon Toevoegen
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if present
    const existingModal = document.getElementById('addPersonModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Setup form submission
    document.getElementById('addPersonForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCreatePerson(e.target);
    });

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('addPersonModal'));
    modal.show();
};

// Handle create person form submission
AdminApp.prototype.handleCreatePerson = async function(form) {
    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Bezig...';
        
        // Collect form data
        const formData = new FormData(form);
        const personData = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email') || null,
            phone: formData.get('phone') || null,
            mobile: formData.get('mobile') || null,
            address: formData.get('address') || null,
            city: formData.get('city') || null,
            postal_code: formData.get('postal_code') || null,
            date_of_birth: formData.get('date_of_birth') || null,
            gender: formData.get('gender') || null,
            lead_source: formData.get('lead_source') || null,
            lead_status: formData.get('lead_status') || 'new',
            is_individual_lead: formData.has('is_individual_lead'),
            is_business_lead: formData.has('is_business_lead'),
            marketing_consent: formData.has('marketing_consent'),
            notes: formData.get('notes') || null
        };
        
        // Create person via API
        const result = await this.apiCall('POST', '/api/persons', personData);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('addPersonModal'));
        modal.hide();
        
        // Refresh data
        await this.loadPersonsData();
        await this.updatePersonsStats();
        
        this.showToast(`Persoon "${result.first_name} ${result.last_name}" succesvol toegevoegd`, 'success');
        
    } catch (error) {
        console.error('Error creating person:', error);
        this.showToast(`Fout bij aanmaken persoon: ${error.message}`, 'error');
        
        // Reset button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Persoon Toevoegen';
    }
};

// Show edit person modal
AdminApp.prototype.showEditPersonModal = function(person) {
    const modalHTML = `
        <div class="modal fade" id="editPersonModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil"></i> Persoon Bewerken: ${person.first_name} ${person.last_name}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form id="editPersonForm">
                        <input type="hidden" name="person_id" value="${person.id}">
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Voornaam *</label>
                                        <input type="text" class="form-control" name="first_name" value="${person.first_name || ''}" required>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Achternaam *</label>
                                        <input type="text" class="form-control" name="last_name" value="${person.last_name || ''}" required>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">E-mail</label>
                                        <input type="email" class="form-control" name="email" value="${person.email || ''}">
                                        <div class="form-text">Uniek e-mailadres (optioneel voor contactpersonen)</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="mb-3">
                                        <label class="form-label">Telefoon</label>
                                        <input type="tel" class="form-control" name="phone" value="${person.phone || ''}">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="mb-3">
                                        <label class="form-label">Mobiel</label>
                                        <input type="tel" class="form-control" name="mobile" value="${person.mobile || ''}">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-8">
                                    <div class="mb-3">
                                        <label class="form-label">Adres</label>
                                        <input type="text" class="form-control" name="address" value="${person.address || ''}">
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label class="form-label">Postcode</label>
                                        <input type="text" class="form-control" name="postal_code" value="${person.postal_code || ''}">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Plaats</label>
                                        <input type="text" class="form-control" name="city" value="${person.city || ''}">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="mb-3">
                                        <label class="form-label">Geboortedatum</label>
                                        <input type="date" class="form-control" name="date_of_birth" value="${person.date_of_birth || ''}">
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="mb-3">
                                        <label class="form-label">Geslacht</label>
                                        <select class="form-select" name="gender">
                                            <option value="">Selecteer...</option>
                                            <option value="male" ${person.gender === 'male' ? 'selected' : ''}>Man</option>
                                            <option value="female" ${person.gender === 'female' ? 'selected' : ''}>Vrouw</option>
                                            <option value="other" ${person.gender === 'other' ? 'selected' : ''}>Anders</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Lead Status</label>
                                        <select class="form-select" name="lead_status">
                                            <option value="new" ${person.lead_status === 'new' ? 'selected' : ''}>Nieuw</option>
                                            <option value="contacted" ${person.lead_status === 'contacted' ? 'selected' : ''}>Contact opgenomen</option>
                                            <option value="qualified" ${person.lead_status === 'qualified' ? 'selected' : ''}>Gekwalificeerd</option>
                                            <option value="proposal_sent" ${person.lead_status === 'proposal_sent' ? 'selected' : ''}>Voorstel verzonden</option>
                                            <option value="closed_won" ${person.lead_status === 'closed_won' ? 'selected' : ''}>Gesloten (gewonnen)</option>
                                            <option value="closed_lost" ${person.lead_status === 'closed_lost' ? 'selected' : ''}>Gesloten (verloren)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Lead Bron</label>
                                        <input type="text" class="form-control" name="lead_source" value="${person.lead_source || ''}" placeholder="bijv. website, referral, cold_call">
                                    </div>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-12">
                                    <div class="mb-3">
                                        <label class="form-label">Status Informatie</label>
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" disabled ${person.is_individual_customer ? 'checked' : ''}>
                                                    <label class="form-check-label">
                                                        Particuliere Klant ${person.is_individual_customer ? '✓' : ''}
                                                    </label>
                                                </div>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" disabled ${person.is_business_customer ? 'checked' : ''}>
                                                    <label class="form-check-label">
                                                        Zakelijke Klant ${person.is_business_customer ? '✓' : ''}
                                                    </label>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" name="marketing_consent" value="1" ${person.marketing_consent ? 'checked' : ''} id="editMarketingConsent">
                                                    <label class="form-check-label" for="editMarketingConsent">
                                                        Marketing toestemming
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="form-text">
                                            <i class="bi bi-info-circle"></i> 
                                            Klant status wordt automatisch bijgewerkt bij betaalde facturen.
                                            ${person.first_paid_invoice_date ? `Eerste betaling: ${new Date(person.first_paid_invoice_date).toLocaleDateString('nl-NL')}` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Opmerkingen</label>
                                <textarea class="form-control" name="notes" rows="3">${person.notes || ''}</textarea>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle"></i> Annuleren
                            </button>
                            <button type="submit" class="btn btn-success">
                                <i class="bi bi-check-circle"></i> Wijzigingen Opslaan
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if present
    const existingModal = document.getElementById('editPersonModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Setup form submission
    document.getElementById('editPersonForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleUpdatePerson(e.target);
    });

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editPersonModal'));
    modal.show();
};

// Handle update person form submission
AdminApp.prototype.handleUpdatePerson = async function(form) {
    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Bezig...';
        
        // Collect form data
        const formData = new FormData(form);
        const personId = formData.get('person_id');
        const personData = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name'),
            email: formData.get('email') || null,
            phone: formData.get('phone') || null,
            mobile: formData.get('mobile') || null,
            address: formData.get('address') || null,
            city: formData.get('city') || null,
            postal_code: formData.get('postal_code') || null,
            date_of_birth: formData.get('date_of_birth') || null,
            gender: formData.get('gender') || null,
            lead_source: formData.get('lead_source') || null,
            lead_status: formData.get('lead_status'),
            marketing_consent: formData.has('marketing_consent'),
            notes: formData.get('notes') || null
        };
        
        // Update person via API
        const result = await this.apiCall('PUT', `/api/persons/${personId}`, personData);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editPersonModal'));
        modal.hide();
        
        // Refresh data
        await this.loadPersonsData();
        await this.updatePersonsStats();
        
        this.showToast(`Persoon "${result.first_name} ${result.last_name}" succesvol bijgewerkt`, 'success');
        
    } catch (error) {
        console.error('Error updating person:', error);
        this.showToast(`Fout bij bijwerken persoon: ${error.message}`, 'error');
        
        // Reset button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Wijzigingen Opslaan';
    }
};

// Show person details modal
AdminApp.prototype.showPersonDetailsModal = function(person) {
    // This would show detailed person view
    console.log('Person details modal - to be implemented', person);
    this.showToast('Person Details functionaliteit wordt nog ontwikkeld', 'info');
};

// Show convert lead modal
AdminApp.prototype.showConvertLeadModal = async function(personId) {
    try {
        // Load companies for conversion options
        const companiesResponse = await this.apiCall('GET', '/api/companies?limit=100');
        const companies = companiesResponse.companies || [];
        
        const modalHTML = `
            <div class="modal fade" id="convertLeadModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-arrow-right-circle"></i> Lead Naar Klant Converteren
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="convertLeadForm">
                            <input type="hidden" name="person_id" value="${personId}">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Type Conversie *</label>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="conversion_type" value="individual" id="individualConversion" checked>
                                        <label class="form-check-label" for="individualConversion">
                                            <i class="bi bi-person"></i> Particuliere Klant
                                        </label>
                                        <div class="form-text">Persoon wordt directe particuliere klant</div>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="conversion_type" value="business" id="businessConversion">
                                        <label class="form-check-label" for="businessConversion">
                                            <i class="bi bi-building"></i> Zakelijke Klant
                                        </label>
                                        <div class="form-text">Persoon wordt klant via een bedrijf</div>
                                    </div>
                                </div>
                                
                                <div class="mb-3" id="companySelection" style="display: none;">
                                    <label class="form-label">Selecteer Bedrijf *</label>
                                    <select class="form-select" name="company_id">
                                        <option value="">Selecteer een bedrijf...</option>
                                        ${companies.map(company => 
                                            `<option value="${company.id}">${company.name}</option>`
                                        ).join('')}
                                    </select>
                                    <div class="form-text">Persoon wordt gekoppeld aan dit bedrijf als contactpersoon</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Reden voor Conversie</label>
                                    <textarea class="form-control" name="reason" rows="3" placeholder="Bijv. Eerste opdracht bevestigd, contract getekend, etc.">Handmatige conversie via admin interface</textarea>
                                </div>
                                
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i>
                                    <strong>Let op:</strong> Deze actie converteert de lead naar een actieve klant. 
                                    De lead status wordt automatisch bijgewerkt naar "closed_won".
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Annuleren
                                </button>
                                <button type="submit" class="btn btn-success">
                                    <i class="bi bi-arrow-right-circle"></i> Lead Converteren
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('convertLeadModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup form interactivity
        const form = document.getElementById('convertLeadForm');
        const companySelection = document.getElementById('companySelection');
        const conversionTypeRadios = form.querySelectorAll('input[name="conversion_type"]');
        
        conversionTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'business') {
                    companySelection.style.display = 'block';
                    companySelection.querySelector('select').required = true;
                } else {
                    companySelection.style.display = 'none';
                    companySelection.querySelector('select').required = false;
                }
            });
        });

        // Setup form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleConvertLead(e.target);
        });

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('convertLeadModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading convert lead modal:', error);
        this.showToast('Fout bij laden conversie formulier', 'error');
    }
};

// Handle convert lead form submission
AdminApp.prototype.handleConvertLead = async function(form) {
    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Bezig...';
        
        // Collect form data
        const formData = new FormData(form);
        const personId = formData.get('person_id');
        const conversionData = {
            conversion_type: formData.get('conversion_type'),
            company_id: formData.get('company_id') || null,
            reason: formData.get('reason') || 'Handmatige conversie via admin interface'
        };
        
        // Convert lead via API
        const result = await this.apiCall('POST', `/api/persons/${personId}/convert-to-customer`, conversionData);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('convertLeadModal'));
        modal.hide();
        
        // Refresh data
        await this.loadPersonsData();
        await this.updatePersonsStats();
        
        this.showToast(result.message || 'Lead succesvol geconverteerd naar klant', 'success');
        
    } catch (error) {
        console.error('Error converting lead:', error);
        this.showToast(`Fout bij conversie: ${error.message}`, 'error');
        
        // Reset button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-arrow-right-circle"></i> Lead Converteren';
    }
};

// Show bulk convert modal
AdminApp.prototype.showBulkConvertModal = async function() {
    const selectedBoxes = document.querySelectorAll('.person-checkbox:checked');
    if (selectedBoxes.length === 0) return;
    
    const personIds = Array.from(selectedBoxes).map(cb => cb.value);
    
    try {
        // Load companies for conversion options
        const companiesResponse = await this.apiCall('GET', '/api/companies?limit=100');
        const companies = companiesResponse.companies || [];
        
        const modalHTML = `
            <div class="modal fade" id="bulkConvertModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-arrow-right-circle"></i> Bulk Lead Conversie
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="bulkConvertForm">
                            <div class="modal-body">
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i>
                                    Je gaat <strong>${personIds.length} geselecteerde leads</strong> converteren naar klanten.
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Type Conversie *</label>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="conversion_type" value="individual" id="bulkIndividualConversion" checked>
                                        <label class="form-check-label" for="bulkIndividualConversion">
                                            <i class="bi bi-person"></i> Particuliere Klanten
                                        </label>
                                        <div class="form-text">Alle leads worden directe particuliere klanten</div>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="conversion_type" value="business" id="bulkBusinessConversion">
                                        <label class="form-check-label" for="bulkBusinessConversion">
                                            <i class="bi bi-building"></i> Zakelijke Klanten
                                        </label>
                                        <div class="form-text">Alle leads worden gekoppeld aan één bedrijf</div>
                                    </div>
                                </div>
                                
                                <div class="mb-3" id="bulkCompanySelection" style="display: none;">
                                    <label class="form-label">Selecteer Bedrijf *</label>
                                    <select class="form-select" name="company_id">
                                        <option value="">Selecteer een bedrijf...</option>
                                        ${companies.map(company => 
                                            `<option value="${company.id}">${company.name}</option>`
                                        ).join('')}
                                    </select>
                                    <div class="form-text">Alle geselecteerde personen worden aan dit bedrijf gekoppeld</div>
                                </div>
                                
                                <div class="alert alert-warning">
                                    <i class="bi bi-exclamation-triangle"></i>
                                    <strong>Let op:</strong> Deze actie kan niet ongedaan worden gemaakt. 
                                    Alle geselecteerde leads worden geconverteerd naar actieve klanten.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x-circle"></i> Annuleren
                                </button>
                                <button type="submit" class="btn btn-warning">
                                    <i class="bi bi-arrow-right-circle"></i> ${personIds.length} Leads Converteren
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('bulkConvertModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup form interactivity
        const form = document.getElementById('bulkConvertForm');
        const companySelection = document.getElementById('bulkCompanySelection');
        const conversionTypeRadios = form.querySelectorAll('input[name="conversion_type"]');
        
        conversionTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'business') {
                    companySelection.style.display = 'block';
                    companySelection.querySelector('select').required = true;
                } else {
                    companySelection.style.display = 'none';
                    companySelection.querySelector('select').required = false;
                }
            });
        });

        // Setup form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleBulkConvertLeads(e.target, personIds);
        });

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('bulkConvertModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error loading bulk convert modal:', error);
        this.showToast('Fout bij laden bulk conversie formulier', 'error');
    }
};

// Handle bulk convert leads form submission
AdminApp.prototype.handleBulkConvertLeads = async function(form, personIds) {
    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Bezig...';
        
        // Collect form data
        const formData = new FormData(form);
        const conversionData = {
            person_ids: personIds,
            conversion_type: formData.get('conversion_type'),
            company_id: formData.get('company_id') || null
        };
        
        // Convert leads via API
        const result = await this.apiCall('POST', '/api/persons/bulk-convert', conversionData);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('bulkConvertModal'));
        modal.hide();
        
        // Clear selections
        document.getElementById('selectAllPersons').checked = false;
        document.querySelectorAll('.person-checkbox').forEach(cb => cb.checked = false);
        
        // Refresh data
        await this.loadPersonsData();
        await this.updatePersonsStats();
        
        // Show detailed result
        const successCount = result.successful_conversions || 0;
        const failCount = result.failed_conversions || 0;
        
        if (failCount === 0) {
            this.showToast(`🎉 Alle ${successCount} leads succesvol geconverteerd!`, 'success');
        } else {
            this.showToast(`⚠️ ${successCount} leads geconverteerd, ${failCount} gefaald`, 'warning');
            if (result.errors && result.errors.length > 0) {
                console.error('Bulk conversion errors:', result.errors);
            }
        }
        
    } catch (error) {
        console.error('Error bulk converting leads:', error);
        this.showToast(`Fout bij bulk conversie: ${error.message}`, 'error');
        
        // Reset button
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
};

// Export persons to CSV
AdminApp.prototype.exportPersonsToCSV = function() {
    // This would export filtered persons to CSV
    console.log('Export to CSV - to be implemented');
    this.showToast('Export functionaliteit wordt nog ontwikkeld', 'info');
};

// Add vehicle to person
AdminApp.prototype.addVehicleToPerson = function(personId) {
    console.log('Add vehicle to person - to be implemented', personId);
    this.showToast('Add Vehicle functionaliteit wordt nog ontwikkeld', 'info');
};

// Add person to company
AdminApp.prototype.addPersonToCompany = function(personId) {
    console.log('Add person to company - to be implemented', personId);
    this.showToast('Add Person to Company functionaliteit wordt nog ontwikkeld', 'info');
};

console.log('✅ Persons Management System loaded successfully');