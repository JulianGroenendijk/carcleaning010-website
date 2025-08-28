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
    // This would open a modal for adding a new person
    // Implementation depends on your modal system
    console.log('Add person modal - to be implemented');
    this.showToast('Add Person functionaliteit wordt nog ontwikkeld', 'info');
};

// Show edit person modal
AdminApp.prototype.showEditPersonModal = function(person) {
    // This would open a modal for editing person
    console.log('Edit person modal - to be implemented', person);
    this.showToast('Edit Person functionaliteit wordt nog ontwikkeld', 'info');
};

// Show person details modal
AdminApp.prototype.showPersonDetailsModal = function(person) {
    // This would show detailed person view
    console.log('Person details modal - to be implemented', person);
    this.showToast('Person Details functionaliteit wordt nog ontwikkeld', 'info');
};

// Show convert lead modal
AdminApp.prototype.showConvertLeadModal = function(personId) {
    // This would show conversion options
    console.log('Convert lead modal - to be implemented', personId);
    this.showToast('Convert Lead functionaliteit wordt nog ontwikkeld', 'info');
};

// Show bulk convert modal
AdminApp.prototype.showBulkConvertModal = function() {
    const selectedBoxes = document.querySelectorAll('.person-checkbox:checked');
    if (selectedBoxes.length === 0) return;
    
    const personIds = Array.from(selectedBoxes).map(cb => cb.value);
    console.log('Bulk convert modal - to be implemented', personIds);
    this.showToast('Bulk Convert functionaliteit wordt nog ontwikkeld', 'info');
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