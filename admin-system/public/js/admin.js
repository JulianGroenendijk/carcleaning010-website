// Carcleaning010 Admin Dashboard JavaScript

class AdminApp {
    constructor() {
        this.token = localStorage.getItem('admin_token');
        this.user = null;
        this.currentSection = 'dashboard';
        
        this.init();
    }

    async init() {
        // Setup event listeners first
        this.setupEventListeners();
        
        // Check if user is already logged in
        if (this.token) {
            const isValid = await this.verifyToken();
            if (isValid) {
                this.showApp();
                await this.loadDashboard();
            } else {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        this.hideLoadingScreen();
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            // Immediately hide to prevent blocking interaction
            loadingScreen.classList.add('d-none');
            console.log('✅ Loading screen hidden');
        }
    }

    showLogin() {
        console.log('🔑 Showing login form...');
        const loginContainer = document.getElementById('login-container');
        const mainApp = document.getElementById('main-app');
        
        if (loginContainer) {
            loginContainer.classList.remove('d-none');
            console.log('✅ Login container shown');
        } else {
            console.error('❌ Login container not found');
        }
        
        if (mainApp) {
            mainApp.classList.add('d-none');
            console.log('✅ Main app hidden');
        }
        
        // Ensure login form inputs are enabled
        setTimeout(() => {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (emailInput) {
                emailInput.removeAttribute('disabled');
                emailInput.focus();
                console.log('✅ Email input enabled and focused');
            }
            if (passwordInput) {
                passwordInput.removeAttribute('disabled');
                console.log('✅ Password input enabled');
            }
        }, 100);
    }

    showApp() {
        document.getElementById('login-container').classList.add('d-none');
        document.getElementById('main-app').classList.remove('d-none');
    }

    async verifyToken() {
        try {
            const response = await this.apiCall('GET', '/api/auth/verify');
            if (response.valid) {
                this.user = response.user;
                this.updateUserInfo();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }

    updateUserInfo() {
        if (this.user) {
            document.getElementById('user-name').textContent = this.user.name;
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                console.log('📝 Login form submitted');
                e.preventDefault();
                this.handleLogin();
            });
            console.log('✅ Login form event listener registered');
        } else {
            console.error('❌ Login form element not found');
        }

        // Password toggle
        document.getElementById('toggle-password').addEventListener('click', () => {
            const passwordField = document.getElementById('password');
            const icon = document.querySelector('#toggle-password i');
            
            if (passwordField.type === 'password') {
                passwordField.type = 'text';
                icon.className = 'bi bi-eye-slash';
            } else {
                passwordField.type = 'password';
                icon.className = 'bi bi-eye';
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Navigation
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                this.navigateToSection(section);
            });
        });

        // Quick actions
        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            this.loadDashboard();
        });

        // Quick action buttons
        document.getElementById('new-customer-btn')?.addEventListener('click', () => {
            this.navigateToSection('customers');
        });

        document.getElementById('new-quote-btn')?.addEventListener('click', () => {
            this.navigateToSection('quotes');
        });

        document.getElementById('new-appointment-btn')?.addEventListener('click', () => {
            this.navigateToSection('appointments');
        });

        document.getElementById('view-calendar-btn')?.addEventListener('click', () => {
            this.navigateToSection('appointments');
        });
    }

    async handleLogin() {
        console.log('🚀 handleLogin called');
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        console.log('📧 Email:', email);
        console.log('🔐 Password length:', password.length);
        const loginBtn = document.getElementById('login-btn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnSpinner = loginBtn.querySelector('.btn-spinner');
        const errorDiv = document.getElementById('login-error');

        // Show loading state
        loginBtn.disabled = true;
        btnText.textContent = 'Bezig met inloggen...';
        btnSpinner.classList.remove('d-none');
        errorDiv.classList.add('d-none');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('admin_token', this.token);
                
                this.showApp();
                this.updateUserInfo();
                await this.loadDashboard();
                
                this.showToast('Succesvol ingelogd!', 'success');
            } else {
                errorDiv.textContent = data.error || 'Login mislukt. Probeer opnieuw.';
                errorDiv.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Login error:', error);
            console.error('Full error details:', error.message, error.stack);
            errorDiv.textContent = `Fout: ${error.message} - Check browser console voor details.`;
            errorDiv.classList.remove('d-none');
        } finally {
            // Reset button state
            loginBtn.disabled = false;
            btnText.textContent = 'Inloggen';
            btnSpinner.classList.add('d-none');
        }
    }

    logout() {
        localStorage.removeItem('admin_token');
        this.token = null;
        this.user = null;
        this.showLogin();
        this.showToast('Succesvol uitgelogd', 'info');
    }

    navigateToSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.add('d-none');
        });

        // Show target section
        document.getElementById(`${section}-section`).classList.remove('d-none');
        
        this.currentSection = section;

        // Load section content
        this.loadSectionContent(section);
    }

    async loadSectionContent(section) {
        switch (section) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'customers':
                await this.loadCustomers();
                break;
            case 'quotes':
                await this.loadQuotes();
                break;
            case 'appointments':
                await this.loadAppointments();
                break;
            case 'invoices':
                await this.loadInvoices();
                break;
            case 'leads':
                await this.loadLeads();
                break;
            case 'expenses':
                await this.loadExpenses();
                break;
            case 'suppliers':
                await this.loadSuppliers();
                break;
            case 'reports':
                await this.loadReports();
                break;
        }
    }

    async loadDashboard() {
        try {
            // Load dashboard stats
            const stats = await this.apiCall('GET', '/api/dashboard/stats');
            this.updateDashboardStats(stats);

            // Load recent activity
            const activity = await this.apiCall('GET', '/api/dashboard/activity');
            this.updateRecentActivity(activity);

            // Load new leads
            const leads = await this.apiCall('GET', '/api/leads?status=new&limit=5');
            this.updateNewLeads(leads);

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showToast('Fout bij laden dashboard', 'error');
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('stat-customers').textContent = stats.customers || '0';
        document.getElementById('stat-appointments').textContent = stats.appointments_this_month || '0';
        document.getElementById('stat-quotes').textContent = stats.open_quotes || '0';
        document.getElementById('stat-revenue').textContent = this.formatCurrency(stats.revenue_this_month || 0);
    }

    updateRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        
        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-3">
                    <i class="bi bi-info-circle text-muted"></i>
                    <p class="text-muted mb-0 mt-2">Geen recente activiteit</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon bg-${this.getActivityColor(activity.type)}">
                    <i class="bi ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                </div>
                <div class="activity-time">
                    ${this.formatTimeAgo(activity.created_at)}
                </div>
            </div>
        `).join('');
    }

    updateNewLeads(leads) {
        const container = document.getElementById('new-leads');
        const countBadge = document.getElementById('new-leads-count');
        const navBadge = document.getElementById('leads-badge');
        
        const newLeadsCount = leads.leads?.filter(lead => lead.status === 'new').length || 0;
        
        countBadge.textContent = newLeadsCount;
        
        if (newLeadsCount > 0) {
            navBadge.textContent = newLeadsCount;
            navBadge.classList.remove('d-none');
        } else {
            navBadge.classList.add('d-none');
        }

        if (!leads.leads || leads.leads.length === 0) {
            container.innerHTML = `
                <div class="text-center py-2">
                    <small class="text-muted">Geen nieuwe leads</small>
                </div>
            `;
            return;
        }

        container.innerHTML = leads.leads.slice(0, 3).map(lead => `
            <div class="list-group-item list-group-item-action border-0 px-0">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${lead.first_name || ''} ${lead.last_name || ''}</h6>
                        <p class="mb-1 small text-muted">${lead.email || lead.phone || ''}</p>
                        <small class="text-muted">${this.formatTimeAgo(lead.created_at)}</small>
                    </div>
                    <span class="badge bg-success rounded-pill">Nieuw</span>
                </div>
            </div>
        `).join('');
    }

    async loadCustomers() {
        const section = document.getElementById('customers-section');
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-people text-primary"></i> Klanten Beheer</h1>
                <button class="btn btn-primary" id="add-customer-btn">
                    <i class="bi bi-person-plus"></i> Nieuwe Klant
                </button>
            </div>
            
            <!-- Search and Filters -->
            <div class="card mb-4">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <input type="text" class="form-control" id="customers-search" placeholder="Zoek klanten...">
                        </div>
                        <div class="col-md-3">
                            <select class="form-control" id="customers-sort">
                                <option value="created_at:DESC">Nieuwste eerst</option>
                                <option value="created_at:ASC">Oudste eerst</option>
                                <option value="last_name:ASC">Naam A-Z</option>
                                <option value="last_name:DESC">Naam Z-A</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-outline-primary w-100" id="customers-refresh">
                                <i class="bi bi-arrow-clockwise"></i> Verversen
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Customers Table -->
            <div class="card">
                <div class="card-body">
                    <div id="customers-loading" class="text-center py-3">
                        <div class="spinner-border" role="status">
                            <span class="visually-hidden">Laden...</span>
                        </div>
                    </div>
                    <div id="customers-content" class="d-none">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Naam</th>
                                        <th>Email</th>
                                        <th>Telefoon</th>
                                        <th>Aangemaakt</th>
                                        <th>Acties</th>
                                    </tr>
                                </thead>
                                <tbody id="customers-table-body">
                                </tbody>
                            </table>
                        </div>
                        <div id="customers-pagination" class="d-flex justify-content-between align-items-center mt-3">
                            <span id="customers-info"></span>
                            <nav>
                                <ul class="pagination mb-0" id="customers-pagination-nav">
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load customers data
        await this.fetchCustomers();
        
        // Setup event listeners
        this.setupCustomersEvents();
    }

    async loadQuotes() {
        const section = document.getElementById('quotes-section');
        
        // Show loading state
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-file-text text-warning"></i> Offertes Beheer</h1>
                <button class="btn btn-primary" id="add-quote-btn">
                    <i class="bi bi-file-plus"></i> Nieuwe Offerte
                </button>
            </div>
            <div class="text-center py-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Laden...</span>
                </div>
                <p class="text-muted mt-2">Offertes worden geladen...</p>
            </div>
        `;
        
        try {
            // Fetch quotes from API
            const response = await fetch('/api/quotes', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Quotes API response:', data);
            
            // Build quotes interface
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-file-text text-warning"></i> Offertes Beheer</h1>
                    <button class="btn btn-primary" id="add-quote-btn">
                        <i class="bi bi-file-plus"></i> Nieuwe Offerte
                    </button>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-4 mb-3">
                        <input type="text" class="form-control" id="quote-search" placeholder="Zoek offertes...">
                    </div>
                    <div class="col-md-3 mb-3">
                        <select class="form-select" id="quote-status-filter">
                            <option value="">Alle statussen</option>
                            <option value="concept">Concept</option>
                            <option value="verzonden">Verzonden</option>
                            <option value="geaccepteerd">Geaccepteerd</option>
                            <option value="afgewezen">Afgewezen</option>
                            <option value="verlopen">Verlopen</option>
                        </select>
                    </div>
                    <div class="col-md-3 mb-3">
                        <select class="form-select" id="quote-sort">
                            <option value="created_at-desc">Nieuwste eerst</option>
                            <option value="created_at-asc">Oudste eerst</option>
                            <option value="amount-desc">Hoogste bedrag</option>
                            <option value="amount-asc">Laagste bedrag</option>
                        </select>
                    </div>
                    <div class="col-md-2 mb-3">
                        <button class="btn btn-outline-secondary w-100" id="refresh-quotes">
                            <i class="bi bi-arrow-clockwise"></i> Ververs
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Offerte #</th>
                                        <th>Klant</th>
                                        <th>Dienst</th>
                                        <th>Bedrag</th>
                                        <th>Status</th>
                                        <th>Datum</th>
                                        <th>Acties</th>
                                    </tr>
                                </thead>
                                <tbody id="quotes-table-body">
                                    ${this.renderQuotesTable(data.quotes || [])}
                                </tbody>
                            </table>
                        </div>
                        
                        ${data.totalCount > 10 ? `
                        <nav aria-label="Offertes paginering">
                            <ul class="pagination justify-content-center mb-0">
                                <li class="page-item ${data.currentPage === 1 ? 'disabled' : ''}">
                                    <a class="page-link" href="#" data-page="${data.currentPage - 1}">Vorige</a>
                                </li>
                                ${Array.from({length: Math.ceil(data.totalCount / 10)}, (_, i) => `
                                    <li class="page-item ${data.currentPage === i + 1 ? 'active' : ''}">
                                        <a class="page-link" href="#" data-page="${i + 1}">${i + 1}</a>
                                    </li>
                                `).join('')}
                                <li class="page-item ${data.currentPage === Math.ceil(data.totalCount / 10) ? 'disabled' : ''}">
                                    <a class="page-link" href="#" data-page="${data.currentPage + 1}">Volgende</a>
                                </li>
                            </ul>
                        </nav>
                        ` : ''}
                    </div>
                </div>
            `;
            
            // Setup event listeners for quotes section
            this.setupQuotesEventListeners();
            
        } catch (error) {
            console.error('Error loading quotes:', error);
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-file-text text-warning"></i> Offertes Beheer</h1>
                    <button class="btn btn-primary" id="add-quote-btn">
                        <i class="bi bi-file-plus"></i> Nieuwe Offerte
                    </button>
                </div>
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Fout bij het laden van offertes: ${error.message}
                    <br><small>Check de console voor meer details.</small>
                </div>
            `;
        }
    }
    
    renderQuotesTable(quotes) {
        if (!quotes.length) {
            return `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="text-muted">
                            <i class="bi bi-file-text fs-1 d-block mb-2"></i>
                            Geen offertes gevonden
                        </div>
                    </td>
                </tr>
            `;
        }
        
        return quotes.map(quote => `
            <tr>
                <td><strong>#${quote.quote_number || quote.id}</strong></td>
                <td>${quote.customer_name || 'Onbekend'}</td>
                <td>${quote.service_type || 'Niet gespecificeerd'}</td>
                <td class="text-currency">€${(quote.amount || 0).toFixed(2)}</td>
                <td>
                    <span class="badge status-${quote.status || 'concept'}">
                        ${this.getStatusText(quote.status || 'concept')}
                    </span>
                </td>
                <td>${this.formatDate(quote.created_at)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="alert('Button clicked for quote ${quote.id}!'); console.log('View button clicked for quote ${quote.id}'); if(window.adminApp) window.adminApp.viewQuote(${quote.id}); else alert('AdminApp not loaded yet');" title="Bekijken">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="console.log('Edit button clicked for quote ${quote.id}'); if(window.adminApp) window.adminApp.editQuote(${quote.id}); else alert('AdminApp not loaded yet');" title="Bewerken">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="console.log('Delete button clicked for quote ${quote.id}'); if(window.adminApp) window.adminApp.deleteQuote(${quote.id}); else alert('AdminApp not loaded yet');" title="Verwijderen">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    getStatusText(status) {
        const statusMap = {
            'concept': 'Concept',
            'verzonden': 'Verzonden',
            'geaccepteerd': 'Geaccepteerd',
            'afgewezen': 'Afgewezen',
            'verlopen': 'Verlopen'
        };
        return statusMap[status] || status;
    }
    
    setupQuotesEventListeners() {
        // Add quote button
        const addBtn = document.getElementById('add-quote-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddQuoteModal());
        }
        
        // Search and filter
        const searchInput = document.getElementById('quote-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterQuotes());
        }
        
        const statusFilter = document.getElementById('quote-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterQuotes());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-quotes');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadQuotes());
        }
        
        console.log('✅ Quotes event listeners setup');
    }
    
    showAddQuoteModal() {
        console.log('🎯 Add quote modal would open here');
        this.showToast('Nieuwe offerte functionaliteit komt binnenkort!', 'info');
    }
    
    filterQuotes() {
        console.log('🔍 Quote filtering would happen here');
        this.showToast('Filter functionaliteit komt binnenkort!', 'info');
    }
    
    async viewQuote(id) {
        console.log('👁️ View quote:', id);
        try {
            const response = await fetch(`/api/quotes/${id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const quote = await response.json();
            this.showQuoteModal(quote, 'view');
            
        } catch (error) {
            console.error('Error fetching quote:', error);
            this.showToast(`Fout bij het ophalen van offerte #${id}: ${error.message}`, 'error');
        }
    }
    
    async editQuote(id) {
        console.log('✏️ Edit quote:', id);
        try {
            const response = await fetch(`/api/quotes/${id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const quote = await response.json();
            this.showQuoteModal(quote, 'edit');
            
        } catch (error) {
            console.error('Error fetching quote for edit:', error);
            this.showToast(`Fout bij het ophalen van offerte #${id}: ${error.message}`, 'error');
        }
    }
    
    showQuoteModal(quote, mode = 'view') {
        const modal = document.getElementById('quoteModal');
        const title = document.getElementById('quoteModalTitle');
        const body = document.getElementById('quoteModalBody');
        const footer = document.getElementById('quoteModalFooter');
        
        // Set title based on mode
        title.textContent = mode === 'edit' ? `Offerte #${quote.quote_number || quote.id} Bewerken` : `Offerte #${quote.quote_number || quote.id}`;
        
        // Build modal body
        if (mode === 'view') {
            body.innerHTML = this.renderQuoteViewContent(quote);
            footer.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>
                <button type="button" class="btn btn-primary" onclick="adminApp.editQuote(${quote.id})">
                    <i class="bi bi-pencil"></i> Bewerken
                </button>
                <button type="button" class="btn btn-success" onclick="adminApp.downloadQuotePDF(${quote.id})">
                    <i class="bi bi-file-pdf"></i> PDF Downloaden
                </button>
            `;
        } else {
            body.innerHTML = this.renderQuoteEditForm(quote);
            footer.innerHTML = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                <button type="button" class="btn btn-primary" onclick="adminApp.saveQuote(${quote.id})">
                    <i class="bi bi-check-lg"></i> Opslaan
                </button>
            `;
        }
        
        // Show modal using Bootstrap
        if (typeof bootstrap !== 'undefined') {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        } else {
            // Fallback: show modal manually
            modal.classList.add('show');
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            
            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.id = 'modal-backdrop';
            document.body.appendChild(backdrop);
        }
    }
    
    renderQuoteViewContent(quote) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-muted mb-3">KLANT INFORMATIE</h6>
                    <table class="table table-sm table-borderless">
                        <tr><td><strong>Naam:</strong></td><td>${quote.customer_name || 'Onbekend'}</td></tr>
                        <tr><td><strong>Email:</strong></td><td>${quote.customer_email || '-'}</td></tr>
                        <tr><td><strong>Telefoon:</strong></td><td>${quote.customer_phone || '-'}</td></tr>
                        <tr><td><strong>Adres:</strong></td><td>${quote.customer_address || '-'}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted mb-3">OFFERTE INFORMATIE</h6>
                    <table class="table table-sm table-borderless">
                        <tr><td><strong>Offerte #:</strong></td><td>${quote.quote_number || quote.id}</td></tr>
                        <tr><td><strong>Status:</strong></td><td><span class="badge status-${quote.status}">${this.getStatusText(quote.status)}</span></td></tr>
                        <tr><td><strong>Aangemaakt:</strong></td><td>${this.formatDate(quote.created_at)}</td></tr>
                        <tr><td><strong>Geldig tot:</strong></td><td>${this.formatDate(quote.valid_until)}</td></tr>
                    </table>
                </div>
            </div>
            
            <hr>
            
            <div class="row">
                <div class="col-12">
                    <h6 class="text-muted mb-3">DIENST DETAILS</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Service Type:</strong></td><td>${quote.service_type || 'Niet gespecificeerd'}</td></tr>
                        <tr><td><strong>Voertuig:</strong></td><td>${quote.vehicle_info || '-'}</td></tr>
                        <tr><td><strong>Beschrijving:</strong></td><td>${quote.description || '-'}</td></tr>
                    </table>
                </div>
            </div>
            
            <hr>
            
            <div class="row">
                <div class="col-md-8">
                    <h6 class="text-muted mb-3">PRIJSOPBOUW</h6>
                    <table class="table table-sm">
                        <tbody>
                            ${quote.service_items ? quote.service_items.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td class="text-end">${item.quantity || 1}x</td>
                                    <td class="text-end">€${(item.price || 0).toFixed(2)}</td>
                                    <td class="text-end">€${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</td>
                                </tr>
                            `).join('') : `
                                <tr><td colspan="4" class="text-center text-muted">Geen service items gedefinieerd</td></tr>
                            `}
                        </tbody>
                    </table>
                </div>
                <div class="col-md-4">
                    <h6 class="text-muted mb-3">TOTAAL</h6>
                    <table class="table table-sm">
                        <tr><td>Subtotaal:</td><td class="text-end">€${((quote.amount || 0) / 1.21).toFixed(2)}</td></tr>
                        <tr><td>BTW (21%):</td><td class="text-end">€${((quote.amount || 0) - ((quote.amount || 0) / 1.21)).toFixed(2)}</td></tr>
                        <tr class="table-active"><td><strong>Totaal:</strong></td><td class="text-end"><strong>€${(quote.amount || 0).toFixed(2)}</strong></td></tr>
                    </table>
                </div>
            </div>
            
            ${quote.notes ? `
            <hr>
            <div class="row">
                <div class="col-12">
                    <h6 class="text-muted mb-3">OPMERKINGEN</h6>
                    <p class="text-muted">${quote.notes}</p>
                </div>
            </div>
            ` : ''}
        `;
    }
    
    renderQuoteEditForm(quote) {
        return `
            <form id="quote-edit-form">
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Service Type</label>
                        <select class="form-select" name="service_type">
                            <option value="">Selecteer service type...</option>
                            <option value="hand-autowas" ${quote.service_type === 'hand-autowas' ? 'selected' : ''}>Hand Autowas</option>
                            <option value="detail-cleaning" ${quote.service_type === 'detail-cleaning' ? 'selected' : ''}>Detail Cleaning</option>
                            <option value="coating" ${quote.service_type === 'coating' ? 'selected' : ''}>Coating</option>
                            <option value="interieur" ${quote.service_type === 'interieur' ? 'selected' : ''}>Interieur Reiniging</option>
                            <option value="custom" ${quote.service_type === 'custom' ? 'selected' : ''}>Maatwerk</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Status</label>
                        <select class="form-select" name="status">
                            <option value="concept" ${quote.status === 'concept' ? 'selected' : ''}>Concept</option>
                            <option value="verzonden" ${quote.status === 'verzonden' ? 'selected' : ''}>Verzonden</option>
                            <option value="geaccepteerd" ${quote.status === 'geaccepteerd' ? 'selected' : ''}>Geaccepteerd</option>
                            <option value="afgewezen" ${quote.status === 'afgewezen' ? 'selected' : ''}>Afgewezen</option>
                            <option value="verlopen" ${quote.status === 'verlopen' ? 'selected' : ''}>Verlopen</option>
                        </select>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Bedrag (€)</label>
                        <input type="number" class="form-control" name="amount" step="0.01" value="${quote.amount || ''}" placeholder="0.00">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Geldig tot</label>
                        <input type="date" class="form-control" name="valid_until" value="${quote.valid_until ? quote.valid_until.split('T')[0] : ''}">
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Voertuig Informatie</label>
                    <input type="text" class="form-control" name="vehicle_info" value="${quote.vehicle_info || ''}" placeholder="Bijv. BMW 3 Serie, 2020, Zwart">
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Beschrijving</label>
                    <textarea class="form-control" name="description" rows="3" placeholder="Beschrijving van de service...">${quote.description || ''}</textarea>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Opmerkingen</label>
                    <textarea class="form-control" name="notes" rows="2" placeholder="Interne opmerkingen...">${quote.notes || ''}</textarea>
                </div>
            </form>
        `;
    }
    
    async saveQuote(id) {
        const form = document.getElementById('quote-edit-form');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            const response = await fetch(`/api/quotes/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Close modal
            this.closeModal();
            
            // Reload quotes
            await this.loadQuotes();
            
            this.showToast('Offerte succesvol bijgewerkt!', 'success');
            
        } catch (error) {
            console.error('Error saving quote:', error);
            this.showToast(`Fout bij het opslaan: ${error.message}`, 'error');
        }
    }
    
    downloadQuotePDF(id) {
        console.log('📄 Download PDF for quote:', id);
        this.showToast('PDF download functionaliteit komt binnenkort!', 'info');
    }
    
    closeModal() {
        const modal = document.getElementById('quoteModal');
        const backdrop = document.getElementById('modal-backdrop');
        
        if (typeof bootstrap !== 'undefined') {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        } else {
            // Manual close
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            
            if (backdrop) {
                backdrop.remove();
            }
        }
    }
    
    deleteQuote(id) {
        console.log('🗑️ Delete quote:', id);
        if (confirm(`Weet je zeker dat je offerte #${id} wilt verwijderen?`)) {
            this.showToast(`Offerte #${id} verwijderen komt binnenkort!`, 'warning');
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            
            return date.toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return '-';
        }
    }

    async loadAppointments() {
        const section = document.getElementById('appointments-section');
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-calendar-check text-success"></i> Planning Beheer</h1>
                <button class="btn btn-primary" id="add-appointment-btn">
                    <i class="bi bi-calendar-plus"></i> Nieuwe Afspraak
                </button>
            </div>
            <div class="text-center py-5">
                <p class="text-muted">Planning functionaliteit wordt geladen...</p>
            </div>
        `;
    }

    async loadInvoices() {
        const section = document.getElementById('invoices-section');
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-receipt text-info"></i> Facturen Beheer</h1>
                <button class="btn btn-primary" id="add-invoice-btn">
                    <i class="bi bi-receipt"></i> Nieuwe Factuur
                </button>
            </div>
            <div class="text-center py-5">
                <p class="text-muted">Facturen functionaliteit wordt geladen...</p>
            </div>
        `;
    }

    async loadLeads() {
        const section = document.getElementById('leads-section');
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-person-plus text-success"></i> Website Leads</h1>
                <div>
                    <button class="btn btn-outline-primary me-2" id="refresh-leads-btn">
                        <i class="bi bi-arrow-clockwise"></i> Verversen
                    </button>
                </div>
            </div>
            <div class="text-center py-5">
                <p class="text-muted">Leads functionaliteit wordt geladen...</p>
            </div>
        `;
    }

    // Expenses (Inkoop) Management
    async loadExpenses() {
        const section = document.getElementById('expenses-section');
        
        // Show loading state
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-receipt text-danger"></i> Inkoop Beheer</h1>
                <button class="btn btn-primary" id="add-expense-btn">
                    <i class="bi bi-plus-lg"></i> Nieuwe Uitgave
                </button>
            </div>
            <div class="text-center py-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Laden...</span>
                </div>
                <p class="text-muted mt-2">Uitgaven worden geladen...</p>
            </div>
        `;
        
        try {
            // Mock data - later replace with API call
            const expenses = [
                {
                    id: 1,
                    expense_number: 'EXP-2025-001',
                    supplier_id: 1,
                    supplier_name: 'AutoWas Supplies B.V.',
                    description: 'Professionele shampoo en was middelen',
                    amount: 245.50,
                    category: 'materials',
                    date: '2025-01-15',
                    status: 'paid',
                    invoice_number: 'INV-12345'
                },
                {
                    id: 2,
                    expense_number: 'EXP-2025-002',
                    supplier_id: 2,
                    supplier_name: 'TechClean Equipment',
                    description: 'Hogedruk reiniger onderdelen',
                    amount: 89.95,
                    category: 'equipment',
                    date: '2025-01-20',
                    status: 'pending',
                    invoice_number: 'TC-7890'
                }
            ];
            
            // Build expenses interface
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-receipt text-danger"></i> Inkoop Beheer</h1>
                    <button class="btn btn-primary" id="add-expense-btn">
                        <i class="bi bi-plus-lg"></i> Nieuwe Uitgave
                    </button>
                </div>
                
                <!-- Summary Cards -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-danger text-white">
                            <div class="card-body">
                                <h5 class="card-title">Deze Maand</h5>
                                <h2>€${expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}</h2>
                                <small>Totale uitgaven</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-dark">
                            <div class="card-body">
                                <h5 class="card-title">Open</h5>
                                <h2>${expenses.filter(e => e.status === 'pending').length}</h2>
                                <small>Openstaande facturen</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Filters -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <select class="form-select" id="expense-category-filter">
                            <option value="">Alle categorieën</option>
                            <option value="materials">Materialen</option>
                            <option value="equipment">Apparatuur</option>
                            <option value="fuel">Brandstof</option>
                            <option value="office">Kantoor</option>
                            <option value="other">Overig</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <select class="form-select" id="expense-status-filter">
                            <option value="">Alle statussen</option>
                            <option value="pending">Openstaand</option>
                            <option value="paid">Betaald</option>
                            <option value="overdue">Vervallen</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <input type="text" class="form-control" id="expense-search" placeholder="Zoek uitgaven...">
                    </div>
                    <div class="col-md-2">
                        <button class="btn btn-outline-secondary w-100" id="refresh-expenses">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Expenses Table -->
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th>Uitgave #</th>
                                        <th>Leverancier</th>
                                        <th>Beschrijving</th>
                                        <th>Categorie</th>
                                        <th>Bedrag</th>
                                        <th>Datum</th>
                                        <th>Status</th>
                                        <th>Acties</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${expenses.map(expense => `
                                        <tr>
                                            <td><strong>${expense.expense_number}</strong></td>
                                            <td>${expense.supplier_name}</td>
                                            <td>${expense.description}</td>
                                            <td><span class="badge bg-secondary">${this.getCategoryText(expense.category)}</span></td>
                                            <td class="text-currency">€${expense.amount.toFixed(2)}</td>
                                            <td>${this.formatDate(expense.date)}</td>
                                            <td>
                                                <span class="badge bg-${expense.status === 'paid' ? 'success' : expense.status === 'pending' ? 'warning' : 'danger'}">
                                                    ${this.getExpenseStatusText(expense.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div class="btn-group btn-group-sm">
                                                    <button class="btn btn-outline-primary" onclick="if(window.adminApp) window.adminApp.viewExpense(${expense.id});" title="Bekijken">
                                                        <i class="bi bi-eye"></i>
                                                    </button>
                                                    <button class="btn btn-outline-success" onclick="if(window.adminApp) window.adminApp.editExpense(${expense.id});" title="Bewerken">
                                                        <i class="bi bi-pencil"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Setup event listeners
            this.setupExpensesEventListeners();
            
        } catch (error) {
            console.error('Error loading expenses:', error);
            section.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Fout bij het laden van uitgaven: ${error.message}
                </div>
            `;
        }
    }
    
    getCategoryText(category) {
        const categories = {
            'materials': 'Materialen',
            'equipment': 'Apparatuur',
            'fuel': 'Brandstof',
            'office': 'Kantoor',
            'other': 'Overig'
        };
        return categories[category] || category;
    }
    
    getExpenseStatusText(status) {
        const statuses = {
            'pending': 'Openstaand',
            'paid': 'Betaald',
            'overdue': 'Vervallen'
        };
        return statuses[status] || status;
    }
    
    setupExpensesEventListeners() {
        const addBtn = document.getElementById('add-expense-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddExpenseModal());
        }
        
        const refreshBtn = document.getElementById('refresh-expenses');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadExpenses());
        }
        
        console.log('✅ Expenses event listeners setup');
    }
    
    showAddExpenseModal() {
        this.showToast('Nieuwe uitgave functionaliteit komt binnenkort!', 'info');
    }
    
    viewExpense(id) {
        this.showToast(`Uitgave #${id} bekijken komt binnenkort!`, 'info');
    }
    
    editExpense(id) {
        this.showToast(`Uitgave #${id} bewerken komt binnenkort!`, 'info');
    }

    // Suppliers Management
    async loadSuppliers() {
        const section = document.getElementById('suppliers-section');
        
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-truck text-primary"></i> Leveranciers Beheer</h1>
                <button class="btn btn-primary" id="add-supplier-btn">
                    <i class="bi bi-plus-lg"></i> Nieuwe Leverancier
                </button>
            </div>
            <div class="text-center py-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Laden...</span>
                </div>
            </div>
        `;
        
        try {
            // Mock suppliers data
            const suppliers = [
                {
                    id: 1,
                    name: 'AutoWas Supplies B.V.',
                    contact_person: 'Jan Jansen',
                    email: 'jan@autowasx.nl',
                    phone: '+31201234567',
                    address: 'Industrieweg 123, 1000AB Amsterdam',
                    category: 'materials',
                    status: 'active',
                    total_spent: 2450.50
                },
                {
                    id: 2,
                    name: 'TechClean Equipment',
                    contact_person: 'Sarah de Vries',
                    email: 'sarah@techclean.com',
                    phone: '+31301234567',
                    address: 'Technopark 45, 3000CD Utrecht',
                    category: 'equipment',
                    status: 'active',
                    total_spent: 890.95
                }
            ];
            
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-truck text-primary"></i> Leveranciers Beheer</h1>
                    <button class="btn btn-primary" id="add-supplier-btn">
                        <i class="bi bi-plus-lg"></i> Nieuwe Leverancier
                    </button>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-4">
                        <input type="text" class="form-control" placeholder="Zoek leveranciers...">
                    </div>
                    <div class="col-md-3">
                        <select class="form-select">
                            <option value="">Alle categorieën</option>
                            <option value="materials">Materialen</option>
                            <option value="equipment">Apparatuur</option>
                            <option value="services">Diensten</option>
                        </select>
                    </div>
                </div>
                
                <div class="row">
                    ${suppliers.map(supplier => `
                        <div class="col-md-6 mb-4">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="card-title mb-0">${supplier.name}</h5>
                                    <span class="badge bg-${supplier.status === 'active' ? 'success' : 'secondary'}">${supplier.status === 'active' ? 'Actief' : 'Inactief'}</span>
                                </div>
                                <div class="card-body">
                                    <p class="card-text">
                                        <strong>Contact:</strong> ${supplier.contact_person}<br>
                                        <strong>Email:</strong> ${supplier.email}<br>
                                        <strong>Telefoon:</strong> ${supplier.phone}<br>
                                        <strong>Categorie:</strong> ${this.getCategoryText(supplier.category)}
                                    </p>
                                    <p class="text-muted">
                                        <small>Totaal besteed: <strong>€${supplier.total_spent.toFixed(2)}</strong></small>
                                    </p>
                                    <div class="btn-group">
                                        <button class="btn btn-outline-primary btn-sm" onclick="if(window.adminApp) window.adminApp.viewSupplier(${supplier.id});">
                                            <i class="bi bi-eye"></i> Bekijken
                                        </button>
                                        <button class="btn btn-outline-success btn-sm" onclick="if(window.adminApp) window.adminApp.editSupplier(${supplier.id});">
                                            <i class="bi bi-pencil"></i> Bewerken
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            this.setupSuppliersEventListeners();
            
        } catch (error) {
            console.error('Error loading suppliers:', error);
        }
    }
    
    setupSuppliersEventListeners() {
        const addBtn = document.getElementById('add-supplier-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddSupplierModal());
        }
    }
    
    showAddSupplierModal() {
        this.showToast('Nieuwe leverancier functionaliteit komt binnenkort!', 'info');
    }
    
    viewSupplier(id) {
        this.showToast(`Leverancier #${id} bekijken komt binnenkort!`, 'info');
    }
    
    editSupplier(id) {
        this.showToast(`Leverancier #${id} bewerken komt binnenkort!`, 'info');
    }

    // Financial Reports
    async loadReports() {
        const section = document.getElementById('reports-section');
        
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-bar-chart text-warning"></i> Financiële Rapportages</h1>
            </div>
            
            <!-- Report Cards -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <h5>Inkomsten</h5>
                            <h2>€3,240</h2>
                            <small>Deze maand</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-danger text-white">
                        <div class="card-body">
                            <h5>Uitgaven</h5>
                            <h2>€835</h2>
                            <small>Deze maand</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <h5>Netto Winst</h5>
                            <h2>€2,405</h2>
                            <small>Deze maand</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-dark">
                        <div class="card-body">
                            <h5>BTW Te Betalen</h5>
                            <h2>€680</h2>
                            <small>Q1 2025</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Report Options -->
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="bi bi-graph-up"></i> Inkomsten vs Uitgaven</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-muted">Overzicht van maandelijkse inkomsten en uitgaven</p>
                            <button class="btn btn-outline-primary">
                                <i class="bi bi-file-pdf"></i> Genereer Rapport
                            </button>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="bi bi-receipt"></i> BTW Rapportage</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-muted">Kwartaal overzicht voor BTW aangifte</p>
                            <button class="btn btn-outline-success">
                                <i class="bi bi-file-excel"></i> Export Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Utility methods
    async apiCall(method, endpoint, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (this.token) {
            options.headers.Authorization = `Bearer ${this.token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(endpoint, options);
        
        if (response.status === 401) {
            this.logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API call failed');
        }

        return response.json();
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('nl-NL', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Nu';
        if (diffMins < 60) return `${diffMins}m geleden`;
        if (diffHours < 24) return `${diffHours}u geleden`;
        if (diffDays < 7) return `${diffDays}d geleden`;
        
        return date.toLocaleDateString('nl-NL');
    }

    getActivityColor(type) {
        const colors = {
            'customer': 'primary',
            'quote': 'warning',
            'appointment': 'success',
            'invoice': 'info',
            'lead': 'success'
        };
        return colors[type] || 'secondary';
    }

    getActivityIcon(type) {
        const icons = {
            'customer': 'bi-person-plus',
            'quote': 'bi-file-text',
            'appointment': 'bi-calendar-check',
            'invoice': 'bi-receipt',
            'lead': 'bi-person-plus-fill'
        };
        return icons[type] || 'bi-info-circle';
    }

    showToast(message, type = 'info') {
        console.log(`🍞 Toast: ${message} (${type})`);
        
        // Simple alert fallback when Bootstrap is not available
        if (typeof bootstrap === 'undefined') {
            console.log('⚠️ Bootstrap not loaded, using alert fallback');
            if (type === 'success') {
                console.log('✅', message);
            } else if (type === 'error') {
                console.error('❌', message);
            }
            return;
        }
        
        const toastEl = document.getElementById('toast');
        if (!toastEl) {
            console.log('⚠️ Toast element not found, using console log');
            console.log(`Toast: ${message}`);
            return;
        }
        
        const toastBody = toastEl.querySelector('.toast-body');
        const toastHeader = toastEl.querySelector('.toast-header');
        
        // Set icon and color based on type
        const icons = {
            'success': 'bi-check-circle-fill text-success',
            'error': 'bi-exclamation-triangle-fill text-danger',
            'warning': 'bi-exclamation-triangle-fill text-warning',
            'info': 'bi-info-circle-fill text-primary'
        };
        
        if (toastHeader && toastHeader.querySelector('i')) {
            toastHeader.querySelector('i').className = icons[type] + ' me-2';
        }
        if (toastBody) {
            toastBody.textContent = message;
        }
        
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }

    // Customers functionality
    async fetchCustomers(page = 1, search = '', sortBy = 'created_at', sortOrder = 'DESC') {
        try {
            const params = new URLSearchParams({
                page,
                limit: 10,
                search,
                sort_by: sortBy,
                sort_order: sortOrder
            });

            const response = await this.apiCall('GET', `/api/customers?${params}`);
            this.displayCustomers(response);
        } catch (error) {
            console.error('Error fetching customers:', error);
            this.showToast('Fout bij laden klanten', 'error');
        }
    }

    displayCustomers(response) {
        const loading = document.getElementById('customers-loading');
        const content = document.getElementById('customers-content');
        const tableBody = document.getElementById('customers-table-body');
        const pagination = document.getElementById('customers-pagination-nav');
        const info = document.getElementById('customers-info');

        loading.classList.add('d-none');
        content.classList.remove('d-none');

        // Populate table
        tableBody.innerHTML = response.customers.map(customer => `
            <tr>
                <td>
                    <strong>${customer.first_name || ''} ${customer.last_name || ''}</strong>
                </td>
                <td>${customer.email || '-'}</td>
                <td>${customer.phone || '-'}</td>
                <td>${this.formatTimeAgo(customer.created_at)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="adminApp.viewCustomer('${customer.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning" onclick="adminApp.editCustomer('${customer.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="adminApp.deleteCustomer('${customer.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Update pagination
        this.updatePagination(pagination, response.pagination, 'customers');

        // Update info
        info.textContent = `${response.pagination.total_count} klanten gevonden`;
    }

    setupCustomersEvents() {
        // Search
        let searchTimeout;
        document.getElementById('customers-search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.fetchCustomers(1, e.target.value);
            }, 500);
        });

        // Sort
        document.getElementById('customers-sort').addEventListener('change', (e) => {
            const [sortBy, sortOrder] = e.target.value.split(':');
            const search = document.getElementById('customers-search').value;
            this.fetchCustomers(1, search, sortBy, sortOrder);
        });

        // Refresh
        document.getElementById('customers-refresh').addEventListener('click', () => {
            this.fetchCustomers();
        });

        // Add customer
        document.getElementById('add-customer-btn').addEventListener('click', () => {
            this.showAddCustomerModal();
        });
    }

    updatePagination(paginationEl, pagination, type) {
        if (!pagination || pagination.total_pages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <li class="page-item ${!pagination.has_prev ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminApp.changePage('${type}', ${pagination.current_page - 1})" 
                   ${!pagination.has_prev ? 'tabindex="-1"' : ''}>Vorige</a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, pagination.current_page - 2);
        const endPage = Math.min(pagination.total_pages, pagination.current_page + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="adminApp.changePage('${type}', ${i})">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${!pagination.has_next ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminApp.changePage('${type}', ${pagination.current_page + 1})"
                   ${!pagination.has_next ? 'tabindex="-1"' : ''}>Volgende</a>
            </li>
        `;

        paginationEl.innerHTML = paginationHTML;
    }

    changePage(type, page) {
        if (type === 'customers') {
            const search = document.getElementById('customers-search').value;
            const [sortBy, sortOrder] = document.getElementById('customers-sort').value.split(':');
            this.fetchCustomers(page, search, sortBy, sortOrder);
        }
        // Add other types as needed
    }

    showAddCustomerModal() {
        // TODO: Implement customer modal
        this.showToast('Klant toevoegen modal komt binnenkort beschikbaar', 'info');
    }

    viewCustomer(id) {
        // TODO: Implement view customer
        this.showToast(`Klant ${id} bekijken - functionaliteit komt binnenkort`, 'info');
    }

    editCustomer(id) {
        // TODO: Implement edit customer
        this.showToast(`Klant ${id} bewerken - functionaliteit komt binnenkort`, 'info');
    }

    async deleteCustomer(id) {
        if (!confirm('Weet u zeker dat u deze klant wilt verwijderen?')) {
            return;
        }

        try {
            await this.apiCall('DELETE', `/api/customers/${id}`);
            this.showToast('Klant succesvol verwijderd', 'success');
            this.fetchCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            this.showToast('Fout bij verwijderen klant', 'error');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
}