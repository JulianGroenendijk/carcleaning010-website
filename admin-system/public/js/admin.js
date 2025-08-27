// Carcleaning010 Admin Dashboard JavaScript

class AdminApp {
    constructor() {
        // Base URL for production deployment
        this.baseURL = window.location.pathname.includes('/admin') ? '/admin' : '';
        
        this.token = localStorage.getItem('admin_token');
        this.user = null;
        this.currentSection = 'dashboard';
        this.systemSettings = {
            vat_enabled: true,
            vat_percentage: 21,
            company_name: 'Carcleaning010',
            company_phone: '+31 6 36 52 97 93',
            company_email: 'info@carcleaning010.nl'
        };
        
        this.init();
    }

    async init() {
        // Setup event listeners first
        this.setupEventListeners();
        
        // Check if user is already logged in
        if (this.token) {
            const isValid = await this.verifyToken();
            if (isValid) {
                // Load system settings
                await this.loadSystemSettingsToMemory();
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
        
        // Settings link (in dropdown, has different class)
        const settingsLink = document.querySelector('[data-section="settings"]');
        if (settingsLink) {
            settingsLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔧 Settings clicked via dropdown');
                this.navigateToSection('settings');
            });
        }

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
            const response = await fetch(this.baseURL + '/api/auth/login', {
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
        try {
            console.log('📄 Loading section content for:', section);
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
                case 'settings':
                    console.log('🔧 About to load settings...');
                    await this.loadSettings();
                    console.log('✅ Settings loaded successfully');
                    break;
                default:
                    console.log('⚠️ Unknown section:', section);
            }
        } catch (error) {
            console.error('❌ Error loading section content:', section, error);
            this.showToast(`❌ Fout bij laden van ${section}`, 'danger');
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
            const response = await fetch(this.baseURL + '/api/quotes', {
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
                        <button class="btn btn-outline-warning" onclick="if(window.adminApp) window.adminApp.viewQuotePDF('${quote.id}'); else alert('AdminApp not loaded yet');" title="PDF Bekijken">
                            <i class="bi bi-file-pdf"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="if(window.adminApp) window.adminApp.convertQuoteToInvoice('${quote.id}'); else alert('AdminApp not loaded yet');" title="Naar Factuur">
                            <i class="bi bi-receipt"></i>
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
            const response = await fetch(`${this.baseURL}/api/quotes/${id}`, {
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
            const response = await fetch(`${this.baseURL}/api/quotes/${id}`, {
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
                <button type="button" class="btn btn-outline-warning" onclick="adminApp.viewQuotePDF('${quote.id}')">
                    <i class="bi bi-file-pdf"></i> PDF Bekijken
                </button>
                <button type="button" class="btn btn-outline-success" onclick="adminApp.downloadQuotePDF('${quote.id}')">
                    <i class="bi bi-download"></i> PDF Downloaden
                </button>
                <button type="button" class="btn btn-outline-info" onclick="adminApp.convertQuoteToInvoice('${quote.id}')">
                    <i class="bi bi-receipt"></i> Naar Factuur
                </button>
                <button type="button" class="btn btn-primary" onclick="adminApp.editQuote(${quote.id})">
                    <i class="bi bi-pencil"></i> Bewerken
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
                        ${this.systemSettings.vat_enabled ? `
                        <tr><td>Subtotaal:</td><td class="text-end">€${((quote.amount || 0) / (1 + (this.systemSettings.vat_percentage / 100))).toFixed(2)}</td></tr>
                        <tr><td>BTW (${this.systemSettings.vat_percentage}%):</td><td class="text-end">€${((quote.amount || 0) - ((quote.amount || 0) / (1 + (this.systemSettings.vat_percentage / 100)))).toFixed(2)}</td></tr>
                        <tr class="table-active"><td><strong>Totaal:</strong></td><td class="text-end"><strong>€${(quote.amount || 0).toFixed(2)}</strong></td></tr>
                        ` : `
                        <tr class="table-active"><td><strong>Totaal:</strong></td><td class="text-end"><strong>€${(quote.amount || 0).toFixed(2)}</strong></td></tr>
                        `}
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
            const response = await fetch(`${this.baseURL}/api/quotes/${id}`, {
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
    
    async downloadQuotePDF(id) {
        console.log('📄 Download PDF for quote:', id);
        
        // Show loading animation
        const loadingToast = this.showPDFLoadingToast('Downloaden...');
        
        try {
            const response = await fetch(`${this.baseURL}/api/quotes/${id}/pdf`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Offerte-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Hide loading and show success
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('✅ PDF gedownload!', 'success');
            
        } catch (error) {
            console.error('Error downloading PDF:', error);
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('❌ Fout bij downloaden PDF', 'danger');
        }
    }
    
    async viewQuotePDF(id) {
        console.log('👁️ View PDF for quote:', id);
        
        // Show loading animation
        const loadingToast = this.showPDFLoadingToast('PDF openen...');
        
        try {
            const response = await fetch(`${this.baseURL}/api/quotes/${id}/pdf`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            
            // Clean up after a delay to ensure the PDF loads
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
            
            // Hide loading and show success
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('✅ PDF geopend in nieuw tabblad!', 'success');
            
        } catch (error) {
            console.error('Error viewing PDF:', error);
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('❌ Fout bij openen PDF', 'danger');
        }
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
    
    async convertQuoteToInvoice(id) {
        console.log('🧾 Convert quote to invoice:', id);
        
        if (!confirm('Wilt u deze offerte omzetten naar een factuur?')) {
            return;
        }
        
        // Show loading animation
        const loadingToast = this.showPDFLoadingToast('Factuur aanmaken...');
        
        try {
            const response = await fetch(`${this.baseURL}/api/quotes/${id}/convert-to-invoice`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const invoice = await response.json();
            
            this.hidePDFLoadingToast(loadingToast);
            this.showToast(`✅ Factuur ${invoice.invoice_number} succesvol aangemaakt!`, 'success');
            
            // Close any open modals
            this.closeModal();
            
            // Switch to invoices view
            this.showSection('invoices');
            
        } catch (error) {
            console.error('Error converting quote to invoice:', error);
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('❌ Fout bij omzetten naar factuur', 'danger');
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
        
        // Show loading state
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-receipt text-info"></i> Facturen Beheer</h1>
                <button class="btn btn-primary" id="add-invoice-btn">
                    <i class="bi bi-receipt"></i> Nieuwe Factuur
                </button>
            </div>
            <div class="text-center py-5">
                <div class="spinner-border text-info" role="status">
                    <span class="visually-hidden">Laden...</span>
                </div>
                <p class="text-muted mt-2">Facturen worden geladen...</p>
            </div>
        `;
        
        try {
            // Get filter values
            const searchInput = document.getElementById('invoice-search');
            const statusFilter = document.getElementById('invoice-status-filter');
            const sortFilter = document.getElementById('invoice-sort-filter');
            
            let queryParams = new URLSearchParams();
            
            if (searchInput && searchInput.value.trim()) {
                queryParams.append('search', searchInput.value.trim());
            }
            
            if (statusFilter && statusFilter.value) {
                queryParams.append('status', statusFilter.value);
            }
            
            if (sortFilter && sortFilter.value) {
                const [sort_by, sort_order] = sortFilter.value.split('-');
                queryParams.append('sort_by', sort_by);
                queryParams.append('sort_order', sort_order);
            }
            
            // Fetch invoices from API with filters
            const url = `${this.baseURL}/api/invoices${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            console.log('🔍 Loading invoices with filters:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📋 Invoices API response:', data);
            
            // Build invoices interface
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-receipt text-info"></i> Facturen Beheer</h1>
                    <button class="btn btn-primary" id="add-invoice-btn">
                        <i class="bi bi-receipt"></i> Nieuwe Factuur
                    </button>
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-4 mb-3">
                        <input type="text" class="form-control" id="invoice-search" placeholder="Zoek facturen...">
                    </div>
                    <div class="col-md-3 mb-3">
                        <select class="form-select" id="invoice-status-filter">
                            <option value="">Alle statussen</option>
                            <option value="draft">Concept</option>
                            <option value="sent">Verzonden</option>
                            <option value="paid">Betaald</option>
                            <option value="overdue">Achterstallig</option>
                            <option value="cancelled">Geannuleerd</option>
                        </select>
                    </div>
                    <div class="col-md-3 mb-3">
                        <select class="form-select" id="invoice-sort">
                            <option value="created_at-desc">Nieuwste eerst</option>
                            <option value="created_at-asc">Oudste eerst</option>
                            <option value="total_amount-desc">Hoogste bedrag</option>
                            <option value="total_amount-asc">Laagste bedrag</option>
                            <option value="due_date-asc">Vervaldatum</option>
                        </select>
                    </div>
                    <div class="col-md-2 mb-3">
                        <button class="btn btn-outline-secondary w-100" id="refresh-invoices">
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
                                        <th>Factuur #</th>
                                        <th>Klant</th>
                                        <th>Bedrag</th>
                                        <th>Status</th>
                                        <th>Vervaldatum</th>
                                        <th>Aangemaakt</th>
                                        <th>Acties</th>
                                    </tr>
                                </thead>
                                <tbody id="invoices-table-body">
                                    ${this.renderInvoicesTable(data.invoices || [])}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            // Setup event listeners for invoices section
            this.setupInvoicesEventListeners();
            
        } catch (error) {
            console.error('Error loading invoices:', error);
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-receipt text-info"></i> Facturen Beheer</h1>
                    <button class="btn btn-primary" id="add-invoice-btn">
                        <i class="bi bi-receipt"></i> Nieuwe Factuur
                    </button>
                </div>
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Fout bij het laden van facturen: ${error.message}
                    <br><small>Check de console voor meer details.</small>
                </div>
            `;
        }
    }
    
    renderInvoicesTable(invoices) {
        if (!invoices.length) {
            return `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="text-muted">
                            <i class="bi bi-receipt fs-1 d-block mb-2"></i>
                            Geen facturen gevonden
                        </div>
                    </td>
                </tr>
            `;
        }
        
        return invoices.map(invoice => `
            <tr>
                <td><strong>#${invoice.invoice_number || invoice.id}</strong></td>
                <td>${invoice.customer_name || 'Onbekend'}</td>
                <td class="text-currency">€${(parseFloat(invoice.total_amount) || 0).toFixed(2)}</td>
                <td>
                    <span class="badge status-${invoice.status || 'draft'}">
                        ${this.getInvoiceStatusText(invoice.status || 'draft')}
                    </span>
                </td>
                <td>${invoice.due_date ? this.formatDate(invoice.due_date) : '-'}</td>
                <td>${this.formatDate(invoice.created_at)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="if(window.adminApp) window.adminApp.viewInvoice('${invoice.id}');" title="Bekijken">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="if(window.adminApp) window.adminApp.viewInvoicePDF('${invoice.id}');" title="PDF Bekijken">
                            <i class="bi bi-file-pdf"></i>
                        </button>
                        <button class="btn btn-outline-success" onclick="if(window.adminApp) window.adminApp.editInvoice('${invoice.id}');" title="Bewerken">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="if(window.adminApp) window.adminApp.deleteInvoice('${invoice.id}');" title="Verwijderen">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    getInvoiceStatusText(status) {
        const statusMap = {
            'draft': 'Concept',
            'sent': 'Verzonden',
            'paid': 'Betaald',
            'overdue': 'Achterstallig',
            'cancelled': 'Geannuleerd'
        };
        return statusMap[status] || status;
    }
    
    setupInvoicesEventListeners() {
        // Add invoice button
        const addBtn = document.getElementById('add-invoice-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddInvoiceModal());
        }
        
        // Search and filter
        const searchInput = document.getElementById('invoice-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterInvoices());
        }
        
        const statusFilter = document.getElementById('invoice-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterInvoices());
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-invoices');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadInvoices());
        }
        
        console.log('✅ Invoices event listeners setup');
    }

    async loadLeads() {
        const section = document.getElementById('leads-section');
        
        // Show loading state
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
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Laden...</span>
                </div>
                <p class="text-muted mt-2">Leads worden geladen...</p>
            </div>
        `;

        try {
            // Load leads from API
            const result = await this.apiCall('GET', '/api/leads?page=1&limit=20');
            const leads = result.leads || [];

            // Status color mapping
            const statusColors = {
                'new': 'bg-primary',
                'contacted': 'bg-warning',
                'converted': 'bg-success',
                'closed': 'bg-secondary'
            };

            const statusLabels = {
                'new': 'Nieuw',
                'contacted': 'Gecontacteerd',
                'converted': 'Omgezet',
                'closed': 'Gesloten'
            };

            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-person-plus text-success"></i> Website Leads (${leads.length})</h1>
                    <div>
                        <button class="btn btn-outline-primary me-2" id="refresh-leads-btn">
                            <i class="bi bi-arrow-clockwise"></i> Verversen
                        </button>
                    </div>
                </div>

                <!-- Filter Tabs -->
                <ul class="nav nav-pills mb-3" id="leads-filter">
                    <li class="nav-item">
                        <button class="nav-link active" data-filter="all">Alle (${leads.length})</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" data-filter="new">Nieuw (${leads.filter(l => l.status === 'new').length})</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" data-filter="contacted">Gecontacteerd (${leads.filter(l => l.status === 'contacted').length})</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link" data-filter="converted">Omgezet (${leads.filter(l => l.status === 'converted').length})</button>
                    </li>
                </ul>

                <!-- Leads Table -->
                <div class="card">
                    <div class="card-body">
                        ${leads.length === 0 ? `
                            <div class="text-center py-5">
                                <i class="bi bi-inbox display-4 text-muted"></i>
                                <h5 class="mt-3 text-muted">Geen leads gevonden</h5>
                                <p class="text-muted">Er zijn nog geen website leads ontvangen.</p>
                            </div>
                        ` : `
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Datum</th>
                                            <th>Naam</th>
                                            <th>Contact</th>
                                            <th>Service</th>
                                            <th>Status</th>
                                            <th>Acties</th>
                                        </tr>
                                    </thead>
                                    <tbody id="leads-table-body">
                                        ${leads.map(lead => `
                                            <tr data-status="${lead.status}">
                                                <td>
                                                    <small class="text-muted">
                                                        ${new Date(lead.created_at).toLocaleDateString('nl-NL', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </small>
                                                </td>
                                                <td>
                                                    <div class="fw-semibold">${lead.first_name || ''} ${lead.last_name || ''}</div>
                                                    ${lead.vehicle_info ? `<small class="text-muted">${lead.vehicle_info}</small>` : ''}
                                                </td>
                                                <td>
                                                    ${lead.email ? `<div><a href="mailto:${lead.email}" class="text-decoration-none">${lead.email}</a></div>` : ''}
                                                    ${lead.phone ? `<div><a href="tel:${lead.phone}" class="text-decoration-none">${lead.phone}</a></div>` : ''}
                                                </td>
                                                <td>
                                                    <span class="badge bg-light text-dark">${lead.service_type || 'Niet opgegeven'}</span>
                                                </td>
                                                <td>
                                                    <span class="badge ${statusColors[lead.status] || 'bg-secondary'}">${statusLabels[lead.status] || lead.status}</span>
                                                </td>
                                                <td>
                                                    <div class="btn-group btn-group-sm">
                                                        <button class="btn btn-outline-primary" onclick="adminApp.viewLead('${lead.id}')" title="Bekijken">
                                                            <i class="bi bi-eye"></i>
                                                        </button>
                                                        <button class="btn btn-outline-warning" onclick="adminApp.generateQuoteFromLead('${lead.id}')" title="Offerte genereren">
                                                            <i class="bi bi-file-earmark-text"></i>
                                                        </button>
                                                        <button class="btn btn-outline-success" onclick="adminApp.updateLeadStatus('${lead.id}', 'contacted')" title="Markeer als gecontacteerd" ${lead.status !== 'new' ? 'disabled' : ''}>
                                                            <i class="bi bi-telephone"></i>
                                                        </button>
                                                        <button class="btn btn-outline-info" onclick="adminApp.convertLead('${lead.id}')" title="Omzetten naar klant" ${lead.status === 'converted' ? 'disabled' : ''}>
                                                            <i class="bi bi-arrow-right-circle"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                </div>
            `;

            // Setup filter functionality
            document.querySelectorAll('#leads-filter button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.target.dataset.filter;
                    
                    // Update active tab
                    document.querySelectorAll('#leads-filter button').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Filter rows
                    const rows = document.querySelectorAll('#leads-table-body tr');
                    rows.forEach(row => {
                        const status = row.dataset.status;
                        if (filter === 'all' || status === filter) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                });
            });

            // Setup refresh button
            document.getElementById('refresh-leads-btn').addEventListener('click', () => {
                this.loadLeads();
            });

        } catch (error) {
            console.error('Error loading leads:', error);
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-person-plus text-success"></i> Website Leads</h1>
                    <div>
                        <button class="btn btn-outline-primary me-2" id="refresh-leads-btn" onclick="adminApp.loadLeads()">
                            <i class="bi bi-arrow-clockwise"></i> Verversen
                        </button>
                    </div>
                </div>
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle"></i>
                    <strong>Fout bij laden van leads:</strong> ${error.message}
                    <button class="btn btn-outline-danger btn-sm ms-2" onclick="adminApp.loadLeads()">Opnieuw proberen</button>
                </div>
            `;
        }
    }

    // Lead Management Functions
    async viewLead(leadId) {
        try {
            const lead = await this.apiCall('GET', `/api/leads/${leadId}`);
            
            // Create modal
            const modalHtml = `
                <div class="modal fade" id="viewLeadModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-person-circle"></i> 
                                    Lead Details: ${lead.first_name || ''} ${lead.last_name || ''}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Persoonlijke Gegevens</h6>
                                        <table class="table table-sm">
                                            <tr><td><strong>Naam:</strong></td><td>${lead.first_name || ''} ${lead.last_name || ''}</td></tr>
                                            <tr><td><strong>Email:</strong></td><td>${lead.email ? `<a href="mailto:${lead.email}">${lead.email}</a>` : 'Niet opgegeven'}</td></tr>
                                            <tr><td><strong>Telefoon:</strong></td><td>${lead.phone ? `<a href="tel:${lead.phone}">${lead.phone}</a>` : 'Niet opgegeven'}</td></tr>
                                            <tr><td><strong>Status:</strong></td><td><span class="badge bg-primary">${lead.status}</span></td></tr>
                                        </table>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Service Informatie</h6>
                                        <table class="table table-sm">
                                            <tr><td><strong>Gewenste service:</strong></td><td>${lead.service_type || 'Niet opgegeven'}</td></tr>
                                            <tr><td><strong>Voertuig info:</strong></td><td>${lead.vehicle_info || 'Niet opgegeven'}</td></tr>
                                            <tr><td><strong>Aangemaakt:</strong></td><td>${new Date(lead.created_at).toLocaleString('nl-NL')}</td></tr>
                                            <tr><td><strong>Laatst bijgewerkt:</strong></td><td>${new Date(lead.updated_at).toLocaleString('nl-NL')}</td></tr>
                                        </table>
                                    </div>
                                </div>
                                ${lead.message ? `
                                    <div class="mt-3">
                                        <h6>Bericht</h6>
                                        <div class="p-3 bg-light rounded">
                                            ${lead.message.replace(/\n/g, '<br>')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-warning" onclick="adminApp.generateQuoteFromLead('${lead.id}')">
                                    <i class="bi bi-file-earmark-text"></i> Offerte Genereren
                                </button>
                                <button type="button" class="btn btn-outline-success" onclick="adminApp.updateLeadStatus('${lead.id}', 'contacted')" ${lead.status !== 'new' ? 'disabled' : ''}>
                                    <i class="bi bi-telephone"></i> Markeer als Gecontacteerd
                                </button>
                                <button type="button" class="btn btn-success" onclick="adminApp.convertLead('${lead.id}')" ${lead.status === 'converted' ? 'disabled' : ''}>
                                    <i class="bi bi-arrow-right-circle"></i> Omzetten naar Klant
                                </button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal
            document.querySelectorAll('#viewLeadModal').forEach(m => m.remove());
            
            // Add modal to DOM
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('viewLeadModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error viewing lead:', error);
            this.showToast('Fout bij laden van lead details', 'error');
        }
    }

    async updateLeadStatus(leadId, newStatus) {
        try {
            await this.apiCall('PUT', `/api/leads/${leadId}/status`, { status: newStatus });
            this.showToast('Lead status succesvol bijgewerkt', 'success');
            
            // Close modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('viewLeadModal'));
            if (modal) modal.hide();
            
            // Reload leads
            await this.loadLeads();
            
        } catch (error) {
            console.error('Error updating lead status:', error);
            this.showToast('Fout bij bijwerken van lead status', 'error');
        }
    }

    async convertLead(leadId) {
        if (!confirm('Weet je zeker dat je deze lead wilt omzetten naar een klant?')) {
            return;
        }
        
        try {
            const customer = await this.apiCall('POST', `/api/leads/${leadId}/convert-to-customer`);
            this.showToast(`Lead succesvol omgezet naar klant: ${customer.first_name} ${customer.last_name}`, 'success');
            
            // Close modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('viewLeadModal'));
            if (modal) modal.hide();
            
            // Reload leads
            await this.loadLeads();
            
        } catch (error) {
            console.error('Error converting lead:', error);
            this.showToast('Fout bij omzetten van lead naar klant', 'error');
        }
    }

    async generateQuoteFromLead(leadId) {
        try {
            // Load lead data
            const lead = await this.apiCall('GET', `/api/leads/${leadId}`);
            // Load available services
            const servicesResult = await this.apiCall('GET', '/api/services');
            const services = servicesResult.services || [];

            // Group services by category
            const servicesByCategory = services.reduce((groups, service) => {
                const category = service.category || 'other';
                if (!groups[category]) groups[category] = [];
                groups[category].push(service);
                return groups;
            }, {});

            const categoryLabels = {
                'signature': '🌟 Signature Detailing',
                'cleaning': '🧽 Reiniging & Onderhoud', 
                'correction': '✨ Paint Correction',
                'protection': '🛡️ Bescherming',
                'restoration': '🔧 Restauratie',
                'addon': '➕ Extra Services',
                'other': '📋 Overige'
            };

            // Pre-select services based on lead's service_type
            const getPreselectedServices = (serviceType) => {
                if (!serviceType) return [];
                const type = serviceType.toLowerCase();
                const preselected = [];
                
                if (type.includes('handwash') || type.includes('wash')) {
                    preselected.push(services.find(s => s.name.includes('Hand Wash')));
                }
                if (type.includes('interior')) {
                    preselected.push(services.find(s => s.name.includes('Interior Deep')));
                }
                if (type.includes('polishing') || type.includes('polish')) {
                    preselected.push(services.find(s => s.name.includes('Paint Correction')));
                }
                if (type.includes('signature')) {
                    preselected.push(services.find(s => s.name.includes('Standard Signature')));
                }
                if (type.includes('ceramic')) {
                    preselected.push(services.find(s => s.name.includes('Ceramic Coating (1 jaar)')));
                }
                if (type.includes('engine')) {
                    preselected.push(services.find(s => s.name.includes('Engine Bay')));
                }
                
                return preselected.filter(Boolean);
            };

            const preselectedServices = getPreselectedServices(lead.service_type);

            // Create quote generation modal
            const modalHtml = `
                <div class="modal fade" id="generateQuoteModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-file-earmark-text text-warning"></i> 
                                    Offerte Genereren voor ${lead.first_name || ''} ${lead.last_name || ''}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="generateQuoteForm">
                                    <input type="hidden" id="leadId" value="${leadId}">
                                    
                                    <!-- Customer Info (pre-filled from lead) -->
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <h6><i class="bi bi-person-circle"></i> Klant Gegevens</h6>
                                            <div class="mb-2">
                                                <label class="form-label">Voornaam</label>
                                                <input type="text" class="form-control" id="quoteFirstName" value="${lead.first_name || ''}" required>
                                            </div>
                                            <div class="mb-2">
                                                <label class="form-label">Achternaam</label>
                                                <input type="text" class="form-control" id="quoteLastName" value="${lead.last_name || ''}" required>
                                            </div>
                                            <div class="mb-2">
                                                <label class="form-label">Email</label>
                                                <input type="email" class="form-control" id="quoteEmail" value="${lead.email || ''}" required>
                                            </div>
                                            <div class="mb-2">
                                                <label class="form-label">Telefoon</label>
                                                <input type="tel" class="form-control" id="quotePhone" value="${lead.phone || ''}">
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <h6><i class="bi bi-car-front"></i> Voertuig Informatie</h6>
                                            <div class="mb-2">
                                                <label class="form-label">Voertuig Info (uit lead)</label>
                                                <textarea class="form-control" id="quoteVehicleInfo" rows="2">${lead.vehicle_info || ''}</textarea>
                                                <small class="text-muted">Voertuig informatie uit de originele aanvraag</small>
                                            </div>
                                            <div class="mb-2">
                                                <label class="form-label">Geldig tot</label>
                                                <input type="date" class="form-control" id="quoteValidUntil" value="${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}">
                                                <small class="text-muted">Standaard 30 dagen vanaf vandaag</small>
                                            </div>
                                            <div class="mb-2">
                                                <label class="form-label">Notities</label>
                                                <textarea class="form-control" id="quoteNotes" rows="2" placeholder="Extra notities voor deze offerte..."></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Service Selection -->
                                    <h6><i class="bi bi-list-check"></i> Services Selecteren</h6>
                                    <p class="text-muted mb-3">Selecteer de services voor deze offerte. Gebaseerd op de lead wordt automatisch voorgeselecteerd: <strong>${lead.service_type || 'Geen specifieke service'}</strong></p>
                                    
                                    <div id="serviceSelection">
                                        ${Object.entries(servicesByCategory).map(([category, categoryServices]) => `
                                            <div class="card mb-3">
                                                <div class="card-header">
                                                    <h6 class="mb-0">${categoryLabels[category] || category}</h6>
                                                </div>
                                                <div class="card-body">
                                                    <div class="row">
                                                        ${categoryServices.map(service => {
                                                            const isPreselected = preselectedServices.some(p => p && p.id === service.id);
                                                            return `
                                                                <div class="col-md-6 col-lg-4 mb-2">
                                                                    <div class="form-check">
                                                                        <input class="form-check-input service-checkbox" type="checkbox" 
                                                                               id="service_${service.id}" value="${service.id}" 
                                                                               data-price="${service.base_price}" data-name="${service.name}"
                                                                               ${isPreselected ? 'checked' : ''}>
                                                                        <label class="form-check-label w-100" for="service_${service.id}">
                                                                            <div class="d-flex justify-content-between">
                                                                                <span class="fw-semibold">${service.name}</span>
                                                                                <span class="text-success">€${parseFloat(service.base_price).toFixed(2)}</span>
                                                                            </div>
                                                                            <small class="text-muted d-block">${service.description || ''}</small>
                                                                            ${service.duration_minutes ? `<small class="text-info">~${Math.round(service.duration_minutes/60)}u</small>` : ''}
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                            `;
                                                        }).join('')}
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>

                                    <!-- Quote Summary -->
                                    <div class="card bg-light">
                                        <div class="card-body">
                                            <h6><i class="bi bi-calculator"></i> Offerte Samenvatting</h6>
                                            <div id="quoteSummary">
                                                <p class="text-muted">Selecteer services om een samenvatting te zien...</p>
                                            </div>
                                            <hr>
                                            ${this.systemSettings.vat_enabled ? `
                                            <div class="d-flex justify-content-between">
                                                <span>Subtotaal:</span>
                                                <span id="quoteSubtotal">€0.00</span>
                                            </div>
                                            <div class="d-flex justify-content-between">
                                                <span>BTW (${this.systemSettings.vat_percentage}%):</span>
                                                <span id="quoteVAT">€0.00</span>
                                            </div>
                                            <hr class="my-2">
                                            ` : ''}
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="fw-bold">${this.systemSettings.vat_enabled ? 'Totaal inkl. BTW:' : 'Totaal:'}</span>
                                                <span class="fw-bold fs-5 text-success" id="quoteTotal">€0.00</span>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-success" id="createQuoteBtn">
                                    <i class="bi bi-check-lg"></i> Offerte Aanmaken
                                </button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal
            document.querySelectorAll('#generateQuoteModal').forEach(m => m.remove());
            
            // Add modal to DOM
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('generateQuoteModal'));
            modal.show();

            // Setup event handlers
            this.setupQuoteGenerationHandlers();
            
            // Update summary with preselected items
            this.updateQuoteSummary();

        } catch (error) {
            console.error('Error generating quote from lead:', error);
            this.showToast('Fout bij laden van offerte gegevens', 'error');
        }
    }

    setupQuoteGenerationHandlers() {
        // Update summary when services are selected/deselected
        document.querySelectorAll('.service-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateQuoteSummary();
            });
        });

        // Create quote button handler
        document.getElementById('createQuoteBtn').addEventListener('click', () => {
            this.createQuoteFromForm();
        });
    }

    updateQuoteSummary() {
        const selectedServices = [];
        let subtotal = 0;

        document.querySelectorAll('.service-checkbox:checked').forEach(checkbox => {
            const price = parseFloat(checkbox.dataset.price);
            const name = checkbox.dataset.name;
            selectedServices.push({ name, price });
            subtotal += price;
        });

        const summaryEl = document.getElementById('quoteSummary');
        const totalEl = document.getElementById('quoteTotal');

        // Calculate VAT if enabled
        let vatAmount = 0;
        let totalPrice = subtotal;
        
        if (this.systemSettings.vat_enabled && subtotal > 0) {
            vatAmount = subtotal * (this.systemSettings.vat_percentage / 100);
            totalPrice = subtotal + vatAmount;
        }

        if (selectedServices.length === 0) {
            summaryEl.innerHTML = '<p class="text-muted">Selecteer services om een samenvatting te zien...</p>';
            totalEl.textContent = '€0.00';
            
            // Reset VAT elements if they exist
            const subtotalEl = document.getElementById('quoteSubtotal');
            const vatEl = document.getElementById('quoteVAT');
            if (subtotalEl) subtotalEl.textContent = '€0.00';
            if (vatEl) vatEl.textContent = '€0.00';
        } else {
            summaryEl.innerHTML = `
                <div class="row">
                    ${selectedServices.map(service => `
                        <div class="col-md-6">
                            <div class="d-flex justify-content-between">
                                <span>${service.name}</span>
                                <span class="text-success">€${service.price.toFixed(2)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Update all price elements
            totalEl.textContent = `€${totalPrice.toFixed(2)}`;
            
            const subtotalEl = document.getElementById('quoteSubtotal');
            const vatEl = document.getElementById('quoteVAT');
            if (subtotalEl) subtotalEl.textContent = `€${subtotal.toFixed(2)}`;
            if (vatEl) vatEl.textContent = `€${vatAmount.toFixed(2)}`;
        }
    }

    async createQuoteFromForm() {
        try {
            console.log('Starting quote creation...');
            const createBtn = document.getElementById('createQuoteBtn');
            const originalText = createBtn.innerHTML;
            
            // Show loading state
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="bi bi-spinner spinner-border spinner-border-sm"></i> Aanmaken...';

            // Gather form data
            const leadId = document.getElementById('leadId').value;
            const firstName = document.getElementById('quoteFirstName').value;
            const lastName = document.getElementById('quoteLastName').value;
            const email = document.getElementById('quoteEmail').value;
            const phone = document.getElementById('quotePhone').value;
            const vehicleInfo = document.getElementById('quoteVehicleInfo').value;
            const validUntil = document.getElementById('quoteValidUntil').value;
            const notes = document.getElementById('quoteNotes').value;

            // Get selected services
            const selectedServices = [];
            document.querySelectorAll('.service-checkbox:checked').forEach(checkbox => {
                selectedServices.push({
                    service_id: checkbox.value,
                    quantity: 1,
                    unit_price: parseFloat(checkbox.dataset.price),
                    total_price: parseFloat(checkbox.dataset.price),
                    description: checkbox.dataset.name
                });
            });

            console.log('Selected services:', selectedServices.length);
            if (selectedServices.length === 0) {
                throw new Error('Selecteer minimaal één service voor de offerte');
            }

            // Create or find customer first
            let customer;
            try {
                // Try to convert lead to customer first
                customer = await this.apiCall('POST', `/api/leads/${leadId}/convert-to-customer`);
            } catch (error) {
                console.log('Lead conversion error:', error.message);
                if (error.message && error.message.includes('al omgezet')) {
                    // Lead already converted, find customer by email
                    const customersResult = await this.apiCall('GET', `/api/customers?search=${encodeURIComponent(email)}`);
                    customer = customersResult.customers.find(c => c.email.toLowerCase() === email.toLowerCase());
                    if (!customer) {
                        // If not found by email, try creating a new customer
                        customer = await this.apiCall('POST', '/api/customers', {
                            first_name: firstName,
                            last_name: lastName,
                            email: email,
                            phone: phone,
                            notes: `Created from website lead ${leadId} - ${vehicleInfo || 'No vehicle info'}`
                        });
                    }
                } else {
                    throw error;
                }
            }

            // Calculate totals
            const subtotal = selectedServices.reduce((sum, item) => sum + item.total_price, 0);
            const taxAmount = subtotal * 0.21; // 21% BTW
            const totalAmount = subtotal + taxAmount;

            // Create quote
            const quoteData = {
                customer_id: customer.id,
                notes: `Offerte voor ${firstName} ${lastName}` + (notes ? `\n\n${notes}` : '') + (vehicleInfo ? `\n\nVoertuig: ${vehicleInfo}` : '') + `\n\nGegenereerd vanuit website lead`,
                valid_until: validUntil,
                services: selectedServices
            };

            console.log('Sending quote data:', JSON.stringify(quoteData, null, 2));
            
            const quote = await this.apiCall('POST', '/api/quotes', quoteData);

            alert(`✅ Offerte ${quote.quote_number} succesvol aangemaakt voor €${totalAmount.toFixed(2)}!`);

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('generateQuoteModal'));
            if (modal) modal.hide();

            // Close lead modal if open
            const leadModal = bootstrap.Modal.getInstance(document.getElementById('viewLeadModal'));
            if (leadModal) leadModal.hide();

            // Reload leads to update status
            await this.loadLeads();

            // Optionally navigate to quotes section to show the new quote
            // this.showSection('quotes');

        } catch (error) {
            console.error('Error creating quote:', error);
            alert(`❌ Fout bij aanmaken offerte: ${error.message}`);
        } finally {
            // Reset button state
            const createBtn = document.getElementById('createQuoteBtn');
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = '<i class="bi bi-check-lg"></i> Offerte Aanmaken';
            }
        }
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

    // System Settings
    async loadSettings() {
        console.log('🔧 Loading settings...');
        const section = document.getElementById('settings-section');
        
        try {
            // Load current settings
            console.log('📡 Loading system settings...');
            const settings = await this.loadSystemSettings();
            console.log('✅ Settings loaded:', settings);
            
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-gear text-secondary"></i> Systeem Instellingen</h1>
                </div>
                
                <div class="row">
                    <div class="col-md-8 mx-auto">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-calculator text-warning"></i> BTW & Belasting Instellingen
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-4">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="vat-enabled" 
                                               ${settings.vat_enabled ? 'checked' : ''}>
                                        <label class="form-check-label" for="vat-enabled">
                                            <strong>BTW inschakelen</strong>
                                        </label>
                                        <div class="form-text">
                                            Wanneer uitgeschakeld verdwijnen alle BTW vermeldingen van offertes en facturen
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-4 ${settings.vat_enabled ? '' : 'd-none'}" id="vat-settings">
                                    <label for="vat-percentage" class="form-label">BTW Percentage</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control" id="vat-percentage" 
                                               value="${settings.vat_percentage || 21}" min="0" max="100" step="0.01">
                                        <span class="input-group-text">%</span>
                                    </div>
                                    <div class="form-text">
                                        Standaard BTW percentage voor nieuwe offertes en facturen
                                    </div>
                                </div>
                                
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i>
                                    <strong>Let op:</strong> Wijzigingen worden toegepast op alle nieuwe offertes en facturen. 
                                    Bestaande documenten behouden hun oorspronkelijke BTW instellingen.
                                </div>
                                
                                <div class="d-flex justify-content-end">
                                    <button type="button" class="btn btn-primary" id="save-settings-btn">
                                        <i class="bi bi-check"></i> Instellingen Opslaan
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card mt-4">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-building text-info"></i> Bedrijfsinformatie
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Bedrijfsnaam</label>
                                        <input type="text" class="form-control" id="company-name" 
                                               value="${settings.company_name || 'Carcleaning010'}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">BTW Nummer</label>
                                        <input type="text" class="form-control" id="company-vat-number" 
                                               value="${settings.company_vat_number || ''}">
                                    </div>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Telefoon</label>
                                        <input type="text" class="form-control" id="company-phone" 
                                               value="${settings.company_phone || '+31 6 36 52 97 93'}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" id="company-email" 
                                               value="${settings.company_email || 'info@carcleaning010.nl'}">
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Adres</label>
                                    <textarea class="form-control" id="company-address" rows="2">${settings.company_address || ''}</textarea>
                                </div>
                                
                                <div class="d-flex justify-content-end">
                                    <button type="button" class="btn btn-outline-primary" id="save-company-info-btn">
                                        <i class="bi bi-check"></i> Bedrijfsinfo Opslaan
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card mt-4">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-cloud-download text-primary"></i> Deployment & Updates
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6>Huidige Versie</h6>
                                        <div class="d-flex align-items-center">
                                            <span class="badge bg-info me-2" id="current-version">Loading...</span>
                                            <button type="button" class="btn btn-sm btn-outline-secondary" id="check-version-btn">
                                                <i class="bi bi-arrow-clockwise"></i> Check
                                            </button>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Auto-Deployment</h6>
                                        <button type="button" class="btn btn-primary" id="deploy-btn">
                                            <i class="bi bi-cloud-download"></i> 
                                            <span id="deploy-text">Deploy Latest Update</span>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle"></i>
                                        <strong>Deployment:</strong> Haalt de nieuwste code van GitHub, 
                                        synchroniseert website bestanden, en restart alle services.
                                    </div>
                                </div>
                                
                                <!-- Deployment Progress -->
                                <div id="deployment-progress" class="mt-3" style="display: none;">
                                    <div class="card border-primary">
                                        <div class="card-header bg-primary text-white">
                                            <h6 class="card-title mb-0">
                                                <i class="bi bi-gear-fill"></i> Deployment Bezig...
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="progress mb-3" style="height: 20px;">
                                                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                                     id="deploy-progress-bar" role="progressbar" style="width: 0%">
                                                    <span id="deploy-progress-text">0%</span>
                                                </div>
                                            </div>
                                            <div id="deploy-steps">
                                                <div class="deploy-step" data-step="1">
                                                    <i class="bi bi-circle text-muted"></i> Git pull van GitHub...
                                                </div>
                                                <div class="deploy-step" data-step="2">
                                                    <i class="bi bi-circle text-muted"></i> Website bestanden synchroniseren...
                                                </div>
                                                <div class="deploy-step" data-step="3">
                                                    <i class="bi bi-circle text-muted"></i> Dependencies installeren...
                                                </div>
                                                <div class="deploy-step" data-step="4">
                                                    <i class="bi bi-circle text-muted"></i> Security fixes toepassen...
                                                </div>
                                                <div class="deploy-step" data-step="5">
                                                    <i class="bi bi-circle text-muted"></i> Services herstarten...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card mt-4">
                            <div class="card-header">
                                <h5 class="card-title mb-0">
                                    <i class="bi bi-shield-lock text-danger"></i> Wachtwoord Wijzigen
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i>
                                    <strong>Veiligheid:</strong> Gebruik een sterk wachtwoord van minimaal 8 karakters.
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Huidige Wachtwoord</label>
                                    <input type="password" class="form-control" id="current-password" 
                                           placeholder="Voer je huidige wachtwoord in">
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Nieuw Wachtwoord</label>
                                    <input type="password" class="form-control" id="new-password" 
                                           placeholder="Voer je nieuwe wachtwoord in (minimaal 8 karakters)">
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Bevestig Nieuw Wachtwoord</label>
                                    <input type="password" class="form-control" id="confirm-password" 
                                           placeholder="Bevestig je nieuwe wachtwoord">
                                </div>
                                
                                <div class="d-flex justify-content-end">
                                    <button type="button" class="btn btn-danger" id="change-password-btn">
                                        <i class="bi bi-shield-lock"></i> Wachtwoord Wijzigen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.setupSettingsEventListeners();
            
            // Load current version
            this.checkVersion();
            
        } catch (error) {
            console.error('Error loading settings:', error);
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-gear text-secondary"></i> Systeem Instellingen</h1>
                </div>
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Fout bij het laden van instellingen: ${error.message}
                </div>
            `;
        }
    }
    
    async loadSystemSettingsToMemory() {
        try {
            const settings = await this.loadSystemSettings();
            this.systemSettings = { ...this.systemSettings, ...settings };
            console.log('✅ System settings loaded:', this.systemSettings);
        } catch (error) {
            console.error('Error loading system settings to memory:', error);
        }
    }

    async loadSystemSettings() {
        try {
            console.log('🔄 Making API call to /api/settings...');
            const response = await fetch(this.baseURL + '/api/settings', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            console.log('📡 API response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error loading system settings:', error);
            // Return defaults if API fails
            return {
                vat_enabled: false,
                vat_percentage: 21,
                company_name: 'Carcleaning010',
                company_phone: '+31 6 36 52 97 93',
                company_email: 'info@carcleaning010.nl',
                company_vat_number: '',
                company_address: ''
            };
        }
    }
    
    setupSettingsEventListeners() {
        // VAT toggle
        const vatToggle = document.getElementById('vat-enabled');
        vatToggle?.addEventListener('change', (e) => {
            const vatSettings = document.getElementById('vat-settings');
            if (e.target.checked) {
                vatSettings?.classList.remove('d-none');
            } else {
                vatSettings?.classList.add('d-none');
            }
        });
        
        // Save settings button
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        saveSettingsBtn?.addEventListener('click', () => this.saveSettings());
        
        // Save company info button
        const saveCompanyBtn = document.getElementById('save-company-info-btn');
        saveCompanyBtn?.addEventListener('click', () => this.saveCompanyInfo());
        
        // Change password button
        const changePasswordBtn = document.getElementById('change-password-btn');
        changePasswordBtn?.addEventListener('click', () => this.changePassword());
        
        // Deployment buttons
        const deployBtn = document.getElementById('deploy-btn');
        deployBtn?.addEventListener('click', () => this.startDeployment());
        
        const checkVersionBtn = document.getElementById('check-version-btn');
        checkVersionBtn?.addEventListener('click', () => this.checkVersion());
    }
    
    async saveSettings() {
        console.log('💾 Save system settings');
        
        const vatEnabled = document.getElementById('vat-enabled').checked;
        const vatPercentage = parseFloat(document.getElementById('vat-percentage').value) || 21;
        
        const settings = {
            vat_enabled: vatEnabled,
            vat_percentage: vatPercentage
        };
        
        // Show loading
        const loadingToast = this.showPDFLoadingToast('Instellingen opslaan...');
        
        try {
            const response = await fetch(this.baseURL + '/api/settings', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('✅ Instellingen succesvol opgeslagen!', 'success');
            
            // Store in memory for immediate use
            this.systemSettings = { ...this.systemSettings, ...settings };
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('❌ Fout bij opslaan instellingen', 'danger');
        }
    }
    
    async saveCompanyInfo() {
        console.log('💾 Save company info');
        
        const companyInfo = {
            company_name: document.getElementById('company-name').value,
            company_vat_number: document.getElementById('company-vat-number').value,
            company_phone: document.getElementById('company-phone').value,
            company_email: document.getElementById('company-email').value,
            company_address: document.getElementById('company-address').value
        };
        
        // Show loading
        const loadingToast = this.showPDFLoadingToast('Bedrijfsinfo opslaan...');
        
        try {
            const response = await fetch(this.baseURL + '/api/settings', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(companyInfo)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('✅ Bedrijfsinformatie succesvol opgeslagen!', 'success');
            
            // Store in memory for immediate use
            this.systemSettings = { ...this.systemSettings, ...companyInfo };
            
        } catch (error) {
            console.error('Error saving company info:', error);
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('❌ Fout bij opslaan bedrijfsinformatie', 'danger');
        }
    }
    
    async changePassword() {
        console.log('🔐 Change password');
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Client-side validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            this.showToast('❌ Alle velden zijn verplicht', 'danger');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showToast('❌ Nieuwe wachtwoorden komen niet overeen', 'danger');
            return;
        }
        
        if (newPassword.length < 8) {
            this.showToast('❌ Nieuw wachtwoord moet minimaal 8 karakters bevatten', 'danger');
            return;
        }
        
        try {
            // Show loading
            const loadingToast = this.showPDFLoadingToast('Wachtwoord wijzigen...');
            
            const response = await fetch(this.baseURL + '/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword
                })
            });
            
            const data = await response.json();
            this.hidePDFLoadingToast(loadingToast);
            
            if (response.ok) {
                // Clear form
                document.getElementById('current-password').value = '';
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-password').value = '';
                
                this.showToast('✅ Wachtwoord succesvol gewijzigd', 'success');
            } else {
                this.showToast(`❌ ${data.error || 'Fout bij wijzigen wachtwoord'}`, 'danger');
            }
            
        } catch (error) {
            console.error('Error changing password:', error);
            this.showToast('❌ Fout bij wijzigen wachtwoord', 'danger');
        }
    }
    
    // Deployment functions
    async checkVersion() {
        console.log('🔍 Checking version against GitHub...');
        
        const checkBtn = document.getElementById('check-version-btn');
        const deployBtn = document.getElementById('deploy-btn');
        const originalHtml = checkBtn.innerHTML;
        
        // Show loading state
        checkBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Checking...';
        checkBtn.className = 'btn btn-sm btn-outline-primary';
        checkBtn.disabled = true;
        
        try {
            console.log('🔍 Checking for version endpoints...');
            
            // Try new endpoint first
            let response = await fetch(this.baseURL + '/api/deploy/check-updates');
            let data;
            let isNewEndpoint = true;
            
            // Check if we got HTML (404 page) instead of JSON
            const contentType = response.headers.get('content-type');
            if (!response.ok || (contentType && contentType.includes('text/html'))) {
                // Fallback to old endpoint
                console.log('📄 New endpoint not available, using status endpoint');
                response = await fetch(this.baseURL + '/api/deploy/status');
                isNewEndpoint = false;
                
                // Check this response too
                const statusContentType = response.headers.get('content-type');
                if (!response.ok || (statusContentType && statusContentType.includes('text/html'))) {
                    throw new Error('Both endpoints returned HTML - API not available');
                }
            }
            
            data = await response.json();
            
            if (response.ok) {
                const versionBadge = document.getElementById('current-version');
                
                if (isNewEndpoint && data.local) {
                    // New endpoint with GitHub comparison
                    versionBadge.textContent = `v${data.local.version} (${data.local.commit})`;
                } else {
                    // Old endpoint - just show version
                    versionBadge.textContent = `v${data.version}`;
                }
                
                if (isNewEndpoint && data.hasUpdates) {
                    // Updates available
                    versionBadge.className = 'badge bg-warning text-dark me-2';
                    
                    // Enable deploy button for update
                    deployBtn.innerHTML = '<i class="bi bi-download text-white me-1"></i> Update Beschikbaar';
                    deployBtn.className = 'btn btn-warning';
                    deployBtn.disabled = false;
                    deployBtn.title = `Update van v${data.local.version} naar ${data.remote.commit}`;
                    
                    // Show current version and that update is available
                    checkBtn.innerHTML = `<i class="bi bi-exclamation-triangle text-white me-1"></i> v${data.local.version} → Update Klaar!`;
                    checkBtn.className = 'btn btn-sm btn-warning';
                    
                    // Show update available message
                    setTimeout(() => {
                        this.showToast(`🆕 Update beschikbaar! Van v${data.local.version} naar nieuwere versie.`, 'warning');
                    }, 500);
                    
                    setTimeout(() => {
                        checkBtn.innerHTML = originalHtml;
                        checkBtn.className = 'btn btn-sm btn-outline-secondary';
                        checkBtn.disabled = false;
                    }, 5000);
                    
                } else {
                    // Up to date or using old endpoint
                    versionBadge.className = 'badge bg-success me-2';
                    
                    if (isNewEndpoint) {
                        // New endpoint - system is up to date, disable deploy button
                        deployBtn.innerHTML = '<i class="bi bi-check-circle text-white me-1"></i> Up-to-date';
                        deployBtn.className = 'btn btn-secondary';
                        deployBtn.disabled = true;
                        deployBtn.title = 'Systeem is al actueel - geen deployment nodig';
                        
                        // Show up-to-date status
                        const version = data.local.version;
                        checkBtn.innerHTML = `<i class="bi bi-check-circle text-white me-1"></i> v${version} - Systeem Actueel`;
                        checkBtn.className = 'btn btn-sm btn-success';
                        
                        // Show success message in the UI
                        setTimeout(() => {
                            this.showToast('✅ Systeem is volledig up-to-date! Geen deployment nodig.', 'success');
                        }, 500);
                        
                    } else {
                        // Old endpoint - can't determine if updates are needed
                        deployBtn.innerHTML = '<i class="bi bi-arrow-clockwise text-white me-1"></i> Deploy';
                        deployBtn.className = 'btn btn-success';
                        deployBtn.disabled = false;
                        deployBtn.title = 'Deploy beschikbaar';
                        
                        const version = data.version;
                        checkBtn.innerHTML = `<i class="bi bi-info-circle text-white me-1"></i> v${version} - Status Geladen`;
                        checkBtn.className = 'btn btn-sm btn-info';
                    }
                    
                    setTimeout(() => {
                        checkBtn.innerHTML = originalHtml;
                        checkBtn.className = 'btn btn-sm btn-outline-secondary';
                        checkBtn.disabled = false;
                    }, 4000);
                }
                
            } else {
                document.getElementById('current-version').textContent = 'Error';
                document.getElementById('current-version').className = 'badge bg-danger me-2';
                
                // Show error on button
                checkBtn.innerHTML = '<i class="bi bi-x-circle text-white"></i> Fout';
                checkBtn.className = 'btn btn-sm btn-danger';
                
                setTimeout(() => {
                    checkBtn.innerHTML = originalHtml;
                    checkBtn.className = 'btn btn-sm btn-outline-secondary';
                    checkBtn.disabled = false;
                }, 3000);
            }
        } catch (error) {
            console.error('Error checking version:', error);
            document.getElementById('current-version').textContent = 'Error';
            document.getElementById('current-version').className = 'badge bg-danger me-2';
            
            // Show error on button
            checkBtn.innerHTML = '<i class="bi bi-x-circle text-white"></i> Fout';
            checkBtn.className = 'btn btn-sm btn-danger';
            
            setTimeout(() => {
                checkBtn.innerHTML = originalHtml;
                checkBtn.className = 'btn btn-sm btn-outline-secondary';
                checkBtn.disabled = false;
            }, 3000);
        }
    }
    
    async startDeployment() {
        console.log('🚀 Starting deployment...');
        
        // Disable button and show progress
        const deployBtn = document.getElementById('deploy-btn');
        const deployText = document.getElementById('deploy-text');
        const progressDiv = document.getElementById('deployment-progress');
        
        if (deployBtn) {
            deployBtn.disabled = true;
        }
        if (deployText) {
            deployText.textContent = 'Deploying...';
        }
        if (progressDiv) {
            progressDiv.style.display = 'block';
        }
        
        this.resetDeploymentProgress();
        
        try {
            // Start deployment steps animation
            this.animateDeploymentProgress();
            
            const response = await fetch(this.baseURL + '/api/deploy/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            const data = await response.json();
            
            if (response.ok) {
                if (data.upToDate) {
                    // System is already up to date
                    this.completeDeploymentProgress();
                    this.showToast('✅ Systeem is al up-to-date!', 'info');
                } else {
                    // Complete all steps
                    this.completeDeploymentProgress();
                    this.showToast('🎉 Deployment succesvol voltooid!', 'success');
                    
                    // Update version
                    setTimeout(() => this.checkVersion(), 1000);
                }
                
                // Auto-hide progress after 5 seconds with countdown
                if (progressDiv) {
                    this.startProgressHideCountdown(progressDiv, 5);
                }
                
            } else {
                this.failDeploymentProgress();
                this.showToast(`❌ Deployment gefaald: ${data.error}`, 'danger');
            }
            
        } catch (error) {
            console.error('Deployment error:', error);
            this.failDeploymentProgress();
            
            if (error.name === 'AbortError') {
                this.showToast('❌ Deployment timeout - proces duurt te lang', 'warning');
            } else {
                this.showToast('❌ Deployment fout - controleer de verbinding', 'danger');
            }
        }
        
        // Re-enable button
        if (deployBtn) {
            deployBtn.disabled = false;
        }
        if (deployText) {
            deployText.textContent = 'Deploy Latest Update';
        }
    }
    
    resetDeploymentProgress() {
        const progressBar = document.getElementById('deploy-progress-bar');
        const progressText = document.getElementById('deploy-progress-text');
        const steps = document.querySelectorAll('.deploy-step');
        
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        
        steps.forEach(step => {
            const icon = step.querySelector('i');
            icon.className = 'bi bi-circle text-muted';
        });
    }
    
    animateDeploymentProgress() {
        const steps = ['1', '2', '3', '4', '5'];
        let currentStep = 0;
        
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                this.updateDeploymentStep(currentStep + 1, 'progress');
                currentStep++;
                
                const progress = (currentStep / steps.length) * 100;
                const progressBar = document.getElementById('deploy-progress-bar');
                const progressText = document.getElementById('deploy-progress-text');
                
                progressBar.style.width = progress + '%';
                progressText.textContent = Math.round(progress) + '%';
                
            } else {
                clearInterval(interval);
            }
        }, 800);
        
        // Store interval to clear if needed
        this.deploymentInterval = interval;
    }
    
    completeDeploymentProgress() {
        if (this.deploymentInterval) {
            clearInterval(this.deploymentInterval);
        }
        
        // Mark all steps as complete
        const steps = document.querySelectorAll('.deploy-step');
        steps.forEach(step => {
            const icon = step.querySelector('i');
            icon.className = 'bi bi-check-circle text-success';
        });
        
        // Complete progress bar
        const progressBar = document.getElementById('deploy-progress-bar');
        const progressText = document.getElementById('deploy-progress-text');
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        progressBar.className = 'progress-bar bg-success';
    }
    
    failDeploymentProgress() {
        if (this.deploymentInterval) {
            clearInterval(this.deploymentInterval);
        }
        
        // Mark current step as failed
        const progressSteps = document.querySelectorAll('.deploy-step');
        progressSteps.forEach(step => {
            const icon = step.querySelector('i');
            if (icon.className.includes('text-primary')) {
                icon.className = 'bi bi-x-circle text-danger';
            }
        });
        
        // Red progress bar
        const progressBar = document.getElementById('deploy-progress-bar');
        progressBar.className = 'progress-bar bg-danger';
    }
    
    updateDeploymentStep(step, status) {
        const stepElement = document.querySelector(`[data-step="${step}"]`);
        if (!stepElement) return;
        
        const icon = stepElement.querySelector('i');
        
        switch (status) {
            case 'progress':
                icon.className = 'bi bi-gear-fill text-primary';
                break;
            case 'complete':
                icon.className = 'bi bi-check-circle text-success';
                break;
            case 'error':
                icon.className = 'bi bi-x-circle text-danger';
                break;
        }
    }
    
    startProgressHideCountdown(progressDiv, seconds) {
        const headerElement = progressDiv.querySelector('.card-header h6');
        const originalText = headerElement.innerHTML;
        
        let countdown = seconds;
        const countdownInterval = setInterval(() => {
            headerElement.innerHTML = `<i class="bi bi-check-circle text-white"></i> Deployment Voltooid - Verbergt over ${countdown}s`;
            countdown--;
            
            if (countdown < 0) {
                clearInterval(countdownInterval);
                progressDiv.style.display = 'none';
                headerElement.innerHTML = originalText; // Reset for next time
            }
        }, 1000);
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

        // Add base URL prefix for production
        const url = this.baseURL + endpoint;
        const response = await fetch(url, options);
        
        if (response.status === 401) {
            this.logout();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const error = await response.json();
            console.error('API Error Response:', error);
            throw new Error(error.error || error.message || 'API call failed');
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

    // PDF Loading Animation Functions
    showPDFLoadingToast(action = 'PDF genereren...') {
        console.log(`📄 PDF Loading: ${action}`);
        
        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'pdf-loading-overlay';
        loadingOverlay.className = 'pdf-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="pdf-loading-content">
                <div class="pdf-loading-spinner">
                    <div class="spinner-border text-warning" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <div class="pdf-loading-text">
                    <h5><i class="bi bi-file-pdf text-danger"></i> ${action}</h5>
                    <p class="text-muted mb-0">Even geduld terwijl we uw offerte voorbereiden...</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
        
        // Add CSS if not already present
        if (!document.getElementById('pdf-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'pdf-loading-styles';
            style.textContent = `
                .pdf-loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.3s ease-in;
                }
                
                .pdf-loading-content {
                    background: white;
                    border-radius: 15px;
                    padding: 3rem;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                    animation: slideIn 0.4s ease-out;
                    min-width: 300px;
                }
                
                .pdf-loading-spinner {
                    margin-bottom: 2rem;
                }
                
                .pdf-loading-spinner .spinner-border {
                    width: 3rem;
                    height: 3rem;
                    border-width: 0.3em;
                }
                
                .pdf-loading-text h5 {
                    color: #020405;
                    margin-bottom: 1rem;
                    font-weight: 600;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideIn {
                    from { 
                        opacity: 0; 
                        transform: translateY(-20px) scale(0.95); 
                    }
                    to { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                }
                
                @keyframes slideOut {
                    from { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                    to { 
                        opacity: 0; 
                        transform: translateY(-20px) scale(0.95); 
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        return loadingOverlay;
    }
    
    hidePDFLoadingToast(loadingOverlay) {
        if (loadingOverlay) {
            loadingOverlay.style.animation = 'fadeIn 0.3s ease-in reverse';
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.parentNode.removeChild(loadingOverlay);
                }
            }, 300);
        }
    }

    // Invoice functionality
    async showAddInvoiceModal() {
        console.log('📋 Show add invoice modal');
        
        try {
            // Load customers for selection
            const customersResponse = await fetch(this.baseURL + '/api/customers', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!customersResponse.ok) {
                throw new Error('Fout bij laden klanten');
            }
            
            const customersData = await customersResponse.json();
            const customers = customersData.customers || [];
            
            // Show invoice creation modal
            const modal = this.createInvoiceModal(customers);
            document.body.appendChild(modal);
            
            if (typeof bootstrap !== 'undefined') {
                new bootstrap.Modal(modal).show();
            }
            
        } catch (error) {
            console.error('Error showing add invoice modal:', error);
            this.showToast('Fout bij openen nieuwe factuur', 'danger');
        }
    }
    
    createInvoiceModal(customers) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'invoiceModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-receipt text-info"></i> Nieuwe Factuur Aanmaken
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="invoice-form">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <label class="form-label">Klant *</label>
                                    <select class="form-select" name="customer_id" required>
                                        <option value="">Selecteer klant...</option>
                                        ${customers.map(customer => `
                                            <option value="${customer.id}">
                                                ${customer.first_name} ${customer.last_name} - ${customer.email}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Vervaldatum</label>
                                    <input type="date" class="form-control" name="due_date" 
                                           value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}">
                                </div>
                                ${this.systemSettings.vat_enabled ? `
                                <div class="col-md-3">
                                    <label class="form-label">BTW %</label>
                                    <input type="number" class="form-control" name="tax_percentage" 
                                           value="${this.systemSettings.vat_percentage}" min="0" max="100" step="0.01">
                                </div>
                                ` : ''}
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">Factuur beschrijving</label>
                                <input type="text" class="form-control" name="description" 
                                       placeholder="Beschrijving van de factuur" value="Detailing service">
                            </div>
                            
                            <div class="mb-4">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h6>Factuurregels</h6>
                                    <button type="button" class="btn btn-outline-primary btn-sm" id="add-invoice-item">
                                        <i class="bi bi-plus"></i> Regel Toevoegen
                                    </button>
                                </div>
                                <div id="invoice-items-container">
                                    <div class="invoice-item row align-items-center mb-2">
                                        <div class="col-md-3">
                                            <input type="text" class="form-control" name="items[0][service_name]" 
                                                   placeholder="Service naam *" required>
                                        </div>
                                        <div class="col-md-3">
                                            <input type="text" class="form-control" name="items[0][description]" 
                                                   placeholder="Omschrijving">
                                        </div>
                                        <div class="col-md-2">
                                            <input type="number" class="form-control item-quantity" name="items[0][quantity]" 
                                                   placeholder="Aantal" value="1" min="0.01" step="0.01" required>
                                        </div>
                                        <div class="col-md-2">
                                            <input type="number" class="form-control item-unit-price" name="items[0][unit_price]" 
                                                   placeholder="Prijs p/stuk" min="0.01" step="0.01" required>
                                        </div>
                                        <div class="col-md-2">
                                            <input type="text" class="form-control item-total" 
                                                   placeholder="Totaal" readonly>
                                        </div>
                                        <div class="col-md-2">
                                            <button type="button" class="btn btn-outline-danger btn-sm remove-item" 
                                                    style="display: none;">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <label class="form-label">Opmerkingen</label>
                                    <textarea class="form-control" name="notes" rows="3" 
                                              placeholder="Extra opmerkingen voor de factuur..."></textarea>
                                </div>
                                <div class="col-md-6">
                                    <div class="bg-light p-3 rounded">
                                        <h6>Factuur Totaal</h6>
                                        <div class="d-flex justify-content-between">
                                            <span>Subtotaal:</span>
                                            <span id="invoice-subtotal">€ 0,00</span>
                                        </div>
                                        ${this.systemSettings.vat_enabled ? `
                                        <div class="d-flex justify-content-between">
                                            <span>BTW:</span>
                                            <span id="invoice-tax">€ 0,00</span>
                                        </div>
                                        <hr>
                                        ` : ''}
                                        <div class="d-flex justify-content-between fw-bold">
                                            <span>Totaal:</span>
                                            <span id="invoice-total">€ 0,00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                        <button type="button" class="btn btn-primary" id="save-invoice-btn">
                            <i class="bi bi-check"></i> Factuur Aanmaken
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Setup invoice modal event listeners
        this.setupInvoiceModalEvents(modal);
        
        return modal;
    }
    
    setupInvoiceModalEvents(modal) {
        // Add item button
        const addItemBtn = modal.querySelector('#add-invoice-item');
        addItemBtn?.addEventListener('click', () => this.addInvoiceItem());
        
        // Save invoice button
        const saveBtn = modal.querySelector('#save-invoice-btn');
        saveBtn?.addEventListener('click', () => this.saveNewInvoice());
        
        // Setup calculation listeners
        this.setupInvoiceCalculations(modal);
    }
    
    addInvoiceItem() {
        const container = document.getElementById('invoice-items-container');
        const itemCount = container.children.length;
        
        const newItem = document.createElement('div');
        newItem.className = 'invoice-item row align-items-center mb-2';
        newItem.innerHTML = `
            <div class="col-md-3">
                <input type="text" class="form-control" name="items[${itemCount}][service_name]" 
                       placeholder="Service naam *" required>
            </div>
            <div class="col-md-3">
                <input type="text" class="form-control" name="items[${itemCount}][description]" 
                       placeholder="Omschrijving">
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control item-quantity" name="items[${itemCount}][quantity]" 
                       placeholder="Aantal" value="1" min="0.01" step="0.01" required>
            </div>
            <div class="col-md-2">
                <input type="number" class="form-control item-unit-price" name="items[${itemCount}][unit_price]" 
                       placeholder="Prijs p/stuk" min="0.01" step="0.01" required>
            </div>
            <div class="col-md-2">
                <input type="text" class="form-control item-total" 
                       placeholder="Totaal" readonly>
            </div>
            <div class="col-md-2">
                <button type="button" class="btn btn-outline-danger btn-sm remove-item">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(newItem);
        
        // Setup event listeners for new item
        this.setupItemCalculations(newItem);
        this.setupRemoveItemButton(newItem);
        this.toggleRemoveButtons();
    }
    
    setupInvoiceCalculations(modal) {
        // Setup calculations for existing items
        const items = modal.querySelectorAll('.invoice-item');
        items.forEach(item => {
            this.setupItemCalculations(item);
            this.setupRemoveItemButton(item);
        });
        
        // Tax percentage change
        const taxInput = modal.querySelector('[name="tax_percentage"]');
        taxInput?.addEventListener('input', () => this.calculateInvoiceTotal());
        
        this.toggleRemoveButtons();
    }
    
    setupItemCalculations(item) {
        const quantityInput = item.querySelector('.item-quantity');
        const priceInput = item.querySelector('.item-unit-price');
        
        const calculateItemTotal = () => {
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const total = quantity * price;
            
            const totalInput = item.querySelector('.item-total');
            totalInput.value = `€ ${total.toFixed(2)}`;
            
            this.calculateInvoiceTotal();
        };
        
        quantityInput?.addEventListener('input', calculateItemTotal);
        priceInput?.addEventListener('input', calculateItemTotal);
    }
    
    setupRemoveItemButton(item) {
        const removeBtn = item.querySelector('.remove-item');
        removeBtn?.addEventListener('click', () => {
            item.remove();
            this.calculateInvoiceTotal();
            this.toggleRemoveButtons();
        });
    }
    
    toggleRemoveButtons() {
        const items = document.querySelectorAll('.invoice-item');
        items.forEach((item, index) => {
            const removeBtn = item.querySelector('.remove-item');
            if (removeBtn) {
                removeBtn.style.display = items.length > 1 ? 'block' : 'none';
            }
        });
    }
    
    calculateInvoiceTotal() {
        const items = document.querySelectorAll('.invoice-item');
        let subtotal = 0;
        
        items.forEach(item => {
            const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(item.querySelector('.item-unit-price').value) || 0;
            subtotal += quantity * price;
        });
        
        let taxAmount = 0;
        let total = subtotal;
        
        if (this.systemSettings.vat_enabled) {
            const taxInput = document.querySelector('[name="tax_percentage"]');
            const taxPercentage = taxInput ? parseFloat(taxInput.value) || 0 : this.systemSettings.vat_percentage;
            taxAmount = subtotal * (taxPercentage / 100);
            total = subtotal + taxAmount;
        }
        
        document.getElementById('invoice-subtotal').textContent = `€ ${subtotal.toFixed(2).replace('.', ',')}`;
        
        const taxElement = document.getElementById('invoice-tax');
        if (taxElement) {
            taxElement.textContent = `€ ${taxAmount.toFixed(2).replace('.', ',')}`;
        }
        
        document.getElementById('invoice-total').textContent = `€ ${total.toFixed(2).replace('.', ',')}`;
    }
    
    async saveNewInvoice() {
        console.log('💾 Save new invoice');
        
        const form = document.getElementById('invoice-form');
        const formData = new FormData(form);
        
        // Collect items data
        const items = [];
        const itemElements = document.querySelectorAll('.invoice-item');
        
        itemElements.forEach((item, index) => {
            const serviceName = item.querySelector(`[name="items[${index}][service_name]"]`)?.value;
            const description = item.querySelector(`[name="items[${index}][description]"]`)?.value;
            const quantity = parseFloat(item.querySelector(`[name="items[${index}][quantity]"]`)?.value) || 0;
            const unitPrice = parseFloat(item.querySelector(`[name="items[${index}][unit_price]"]`)?.value) || 0;
            
            if (serviceName && quantity > 0 && unitPrice > 0) {
                items.push({
                    service_name: serviceName.trim(),
                    description: description?.trim() || null,
                    quantity: quantity,
                    unit_price: unitPrice,
                    total_price: quantity * unitPrice
                });
            }
        });
        
        if (items.length === 0) {
            this.showToast('Voeg minimaal één factuuregel toe', 'warning');
            return;
        }
        
        const invoiceData = {
            customer_id: formData.get('customer_id'),
            description: formData.get('description') || 'Factuur',
            due_date: formData.get('due_date') || null,
            tax_percentage: this.systemSettings.vat_enabled ? 
                (parseFloat(formData.get('tax_percentage')) || this.systemSettings.vat_percentage) : 0,
            notes: formData.get('notes') || '',
            items: items
        };
        
        if (!invoiceData.customer_id) {
            this.showToast('Selecteer een klant', 'warning');
            return;
        }
        
        // Show loading
        const loadingToast = this.showPDFLoadingToast('Factuur aanmaken...');
        
        try {
            const response = await fetch(this.baseURL + '/api/invoices', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invoiceData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const invoice = await response.json();
            
            this.hidePDFLoadingToast(loadingToast);
            this.showToast(`✅ Factuur ${invoice.invoice_number} succesvol aangemaakt!`, 'success');
            
            // Close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('invoiceModal'));
            modal?.hide();
            document.getElementById('invoiceModal')?.remove();
            
            this.loadInvoices();
            
        } catch (error) {
            console.error('Error saving invoice:', error);
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('Fout bij aanmaken factuur', 'danger');
        }
    }
    
    // Filter and action functions
    filterInvoices() {
        console.log('🔍 Filtering invoices...');
        this.loadInvoices();
    }
    
    async viewInvoice(id) {
        console.log('👁️ View invoice:', id);
        
        try {
            const invoice = await this.apiCall('GET', `/api/invoices/${id}`);
            this.showInvoiceModal(invoice);
        } catch (error) {
            console.error('Error loading invoice:', error);
            this.showToast('Fout bij laden factuur', 'error');
        }
    }
    
    showInvoiceModal(invoice) {
        console.log('📋 Showing invoice modal for:', invoice.invoice_number);
        
        const modal = `
            <div class="modal fade" id="invoiceModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-receipt"></i> Factuur ${invoice.invoice_number}
                                <span class="badge ms-2 ${this.getInvoiceStatusBadgeClass(invoice.status)}">${this.getInvoiceStatusText(invoice.status)}</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-muted">KLANTGEGEVENS</h6>
                                    <p class="mb-1"><strong>${invoice.customer_name}</strong></p>
                                    <p class="mb-1 text-muted">${invoice.customer_email || ''}</p>
                                    <p class="mb-1 text-muted">${invoice.customer_phone || ''}</p>
                                    ${invoice.address ? `<p class="mb-1 text-muted">${invoice.address}</p>` : ''}
                                    ${invoice.city || invoice.postal_code ? `<p class="mb-3 text-muted">${invoice.postal_code || ''} ${invoice.city || ''}</p>` : '<div class="mb-3"></div>'}
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-muted">FACTUURGEGEVENS</h6>
                                    <p class="mb-1">Datum: <strong>${this.formatDate(invoice.created_at)}</strong></p>
                                    <p class="mb-1">Vervaldatum: <strong>${invoice.due_date ? this.formatDate(invoice.due_date) : 'Niet opgegeven'}</strong></p>
                                    ${invoice.paid_date ? `<p class="mb-1">Betaald op: <strong>${this.formatDate(invoice.paid_date)}</strong></p>` : ''}
                                    ${invoice.payment_method ? `<p class="mb-1">Betaalmethode: <strong>${this.getPaymentMethodText(invoice.payment_method)}</strong></p>` : ''}
                                    <p class="mb-3">${invoice.is_overdue ? '<span class="badge bg-danger">Achterstallig</span>' : ''}</p>
                                </div>
                            </div>
                            
                            ${invoice.description ? `
                            <div class="row mb-3">
                                <div class="col-12">
                                    <h6 class="text-muted">OMSCHRIJVING</h6>
                                    <p>${invoice.description}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="row mb-3">
                                <div class="col-12">
                                    <h6 class="text-muted">SERVICES</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Service</th>
                                                    <th>Omschrijving</th>
                                                    <th class="text-end">Aantal</th>
                                                    <th class="text-end">Prijs</th>
                                                    <th class="text-end">Totaal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${invoice.items && invoice.items.length > 0 ? invoice.items.map(item => `
                                                    <tr>
                                                        <td><strong>${item.service_name || '-'}</strong></td>
                                                        <td>${item.description || '-'}</td>
                                                        <td class="text-end">${item.quantity || 0}</td>
                                                        <td class="text-end">€${(parseFloat(item.unit_price) || 0).toFixed(2)}</td>
                                                        <td class="text-end">€${(parseFloat(item.total_price) || 0).toFixed(2)}</td>
                                                    </tr>
                                                `).join('') : `
                                                    <tr>
                                                        <td colspan="5" class="text-center text-muted">Geen items gevonden</td>
                                                    </tr>
                                                `}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-8"></div>
                                <div class="col-md-4">
                                    <table class="table table-sm">
                                        <tr>
                                            <td>Subtotaal:</td>
                                            <td class="text-end">€${(parseFloat(invoice.subtotal) || 0).toFixed(2)}</td>
                                        </tr>
                                        ${parseFloat(invoice.discount_percentage) > 0 ? `
                                        <tr>
                                            <td>Korting (${invoice.discount_percentage}%):</td>
                                            <td class="text-end text-success">-€${(parseFloat(invoice.discount_amount) || 0).toFixed(2)}</td>
                                        </tr>
                                        ` : ''}
                                        <tr>
                                            <td>BTW (${invoice.tax_percentage}%):</td>
                                            <td class="text-end">€${(parseFloat(invoice.tax_amount) || 0).toFixed(2)}</td>
                                        </tr>
                                        <tr class="table-active">
                                            <td><strong>Totaal:</strong></td>
                                            <td class="text-end"><strong>€${(parseFloat(invoice.total_amount) || 0).toFixed(2)}</strong></td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                            
                            ${invoice.notes ? `
                            <div class="row">
                                <div class="col-12">
                                    <h6 class="text-muted">NOTITIES</h6>
                                    <p class="text-muted">${invoice.notes}</p>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>
                            <button type="button" class="btn btn-primary" onclick="if(window.adminApp) window.adminApp.editInvoice('${invoice.id}');">
                                <i class="bi bi-pencil"></i> Bewerken
                            </button>
                            ${invoice.status !== 'paid' ? `
                            <button type="button" class="btn btn-success" onclick="if(window.adminApp) window.adminApp.markInvoicePaid('${invoice.id}');">
                                <i class="bi bi-check-circle"></i> Als Betaald Markeren
                            </button>
                            ` : ''}
                            <button type="button" class="btn btn-info" onclick="if(window.adminApp) window.adminApp.viewInvoicePDF('${invoice.id}');">
                                <i class="bi bi-file-pdf"></i> PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('invoiceModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body and show
        document.body.insertAdjacentHTML('beforeend', modal);
        const modalElement = new bootstrap.Modal(document.getElementById('invoiceModal'));
        modalElement.show();
    }
    
    getInvoiceStatusBadgeClass(status) {
        switch(status) {
            case 'draft': return 'bg-secondary';
            case 'sent': return 'bg-primary';
            case 'pending': return 'bg-warning';
            case 'paid': return 'bg-success';
            case 'overdue': return 'bg-danger';
            case 'cancelled': return 'bg-dark';
            default: return 'bg-secondary';
        }
    }
    
    getPaymentMethodText(method) {
        switch(method) {
            case 'cash': return 'Contant';
            case 'bank_transfer': return 'Bankoverschrijving';
            case 'card': return 'Pinpas';
            case 'ideal': return 'iDEAL';
            default: return method;
        }
    }
    
    async markInvoicePaid(id) {
        try {
            const result = await this.apiCall('POST', `/api/invoices/${id}/mark-paid`, {
                payment_method: 'bank_transfer',
                paid_date: new Date().toISOString().split('T')[0]
            });
            
            this.showToast(`Factuur ${result.invoice_number} gemarkeerd als betaald!`, 'success');
            
            // Close modal and refresh
            const modalElement = bootstrap.Modal.getInstance(document.getElementById('invoiceModal'));
            if (modalElement) modalElement.hide();
            
            this.loadInvoices();
            
        } catch (error) {
            console.error('Error marking invoice as paid:', error);
            this.showToast('Fout bij markeren als betaald', 'error');
        }
    }
    
    async viewInvoicePDF(id) {
        console.log('📄 View invoice PDF:', id);
        
        const loadingToast = this.showPDFLoadingToast('Factuur PDF openen...');
        
        try {
            const response = await fetch(`${this.baseURL}/api/invoices/${id}/pdf`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            
            setTimeout(() => window.URL.revokeObjectURL(url), 5000);
            
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('📄 Factuur PDF geopend!', 'success');
            
        } catch (error) {
            console.error('Error viewing invoice PDF:', error);
            this.hidePDFLoadingToast(loadingToast);
            this.showToast('❌ Fout bij openen factuur PDF', 'danger');
        }
    }
    
    async editInvoice(id) {
        console.log('✏️ Edit invoice:', id);
        this.showToast('Factuur bewerken functionaliteit wordt momenteel ontwikkeld. Voor nu kun je via de API of direct in de database wijzigingen maken.', 'info');
    }
    
    async deleteInvoice(id) {
        console.log('🗑️ Delete invoice:', id);
        
        // Get invoice details for confirmation
        try {
            const invoice = await this.apiCall('GET', `/api/invoices/${id}`);
            const confirmMessage = `Weet je zeker dat je de volgende factuur wilt verwijderen?\n\nFactuur: ${invoice.invoice_number}\nKlant: ${invoice.customer_name}\nBedrag: €${parseFloat(invoice.total_amount).toFixed(2)}\nStatus: ${this.getInvoiceStatusText(invoice.status)}\n\n⚠️ Deze actie kan niet ongedaan worden gemaakt!`;
            
            if (confirm(confirmMessage)) {
                const result = await this.apiCall('DELETE', `/api/invoices/${id}`);
                this.showToast(`Factuur ${invoice.invoice_number} succesvol verwijderd`, 'success');
                this.loadInvoices(); // Refresh the list
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            this.showToast('Fout bij verwijderen factuur', 'error');
        }
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
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'addCustomerModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-person-plus text-primary"></i> Nieuwe Klant Toevoegen
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addCustomerForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="first_name" class="form-label">Voornaam *</label>
                                    <input type="text" class="form-control" id="first_name" name="first_name" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="last_name" class="form-label">Achternaam *</label>
                                    <input type="text" class="form-control" id="last_name" name="last_name" required>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="email" class="form-label">E-mail *</label>
                                    <input type="email" class="form-control" id="email" name="email" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="phone" class="form-label">Telefoonnummer</label>
                                    <input type="tel" class="form-control" id="phone" name="phone">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="address" class="form-label">Adres</label>
                                <input type="text" class="form-control" id="address" name="address">
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="city" class="form-label">Plaats</label>
                                    <input type="text" class="form-control" id="city" name="city">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="postal_code" class="form-label">Postcode</label>
                                    <input type="text" class="form-control" id="postal_code" name="postal_code">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="notes" class="form-label">Notities</label>
                                <textarea class="form-control" id="notes" name="notes" rows="3"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                        <button type="button" class="btn btn-primary" id="saveCustomerBtn">
                            <i class="bi bi-check-circle"></i> Klant Opslaan
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Initialize Bootstrap modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Handle form submission
        document.getElementById('saveCustomerBtn').addEventListener('click', async () => {
            await this.saveCustomer(modal, bsModal);
        });
        
        // Clean up when modal is hidden
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    async saveCustomer(modal, bsModal) {
        const form = document.getElementById('addCustomerForm');
        const formData = new FormData(form);
        const customerData = {};
        
        // Collect form data - only include non-empty values
        for (let [key, value] of formData.entries()) {
            const trimmedValue = value.trim();
            if (trimmedValue) {  // Only include non-empty values
                customerData[key] = trimmedValue;
            }
        }
        
        // Basic validation for required fields
        if (!customerData.first_name || !customerData.last_name || !customerData.email) {
            // Highlight missing required fields
            if (!customerData.first_name) {
                document.getElementById('first_name').classList.add('is-invalid');
            }
            if (!customerData.last_name) {
                document.getElementById('last_name').classList.add('is-invalid');
            }
            if (!customerData.email) {
                document.getElementById('email').classList.add('is-invalid');
            }
            this.showToast('Vul alle verplichte velden in (gemarkeerd in rood)', 'error');
            return;
        }
        
        // Remove invalid classes if validation passes
        document.getElementById('first_name').classList.remove('is-invalid');
        document.getElementById('last_name').classList.remove('is-invalid');
        document.getElementById('email').classList.remove('is-invalid');
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerData.email)) {
            this.showToast('Voer een geldig e-mailadres in', 'error');
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveCustomerBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Opslaan...';
        saveBtn.disabled = true;
        
        try {
            const response = await this.apiCall('POST', '/api/customers', customerData);
            
            this.showToast('Klant succesvol toegevoegd!', 'success');
            bsModal.hide();
            
            // Refresh the customers list
            await this.fetchCustomers();
            
        } catch (error) {
            console.error('Error creating customer:', error);
            console.log('Error details:', error.details || 'No details available');
            
            // Handle specific error messages
            if (error.message && error.message.includes('email adres bestaat al')) {
                this.showToast('Dit e-mailadres is al in gebruik door een andere klant', 'error');
            } else if (error.message === 'Validatie fouten' && error.details) {
                // Show specific validation errors
                const errorMessages = error.details.map(detail => detail.msg || detail).join(', ');
                this.showToast('Validatie fouten: ' + errorMessages, 'error');
            } else {
                this.showToast('Fout bij aanmaken klant: ' + (error.message || 'Onbekende fout'), 'error');
            }
            
            // Restore button state
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    async viewCustomer(id) {
        console.log('👁️ View customer:', id);
        
        try {
            const customer = await this.apiCall('GET', `/api/customers/${id}`);
            this.showCustomerModal(customer);
        } catch (error) {
            console.error('Error loading customer:', error);
            this.showToast('Fout bij laden klant', 'error');
        }
    }
    
    showCustomerModal(customer) {
        console.log('👥 Showing customer modal for:', customer.first_name, customer.last_name);
        
        const modal = `
            <div class="modal fade" id="customerModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-person"></i> ${customer.first_name} ${customer.last_name}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-muted">CONTACTGEGEVENS</h6>
                                    <p class="mb-1"><strong>Email:</strong> ${customer.email}</p>
                                    <p class="mb-1"><strong>Telefoon:</strong> ${customer.phone || 'Niet opgegeven'}</p>
                                    <p class="mb-3"><strong>Aangemaakt:</strong> ${this.formatDate(customer.created_at)}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-muted">ADRESGEGEVENS</h6>
                                    <p class="mb-1"><strong>Adres:</strong> ${customer.address || 'Niet opgegeven'}</p>
                                    <p class="mb-1"><strong>Postcode:</strong> ${customer.postal_code || 'Niet opgegeven'}</p>
                                    <p class="mb-3"><strong>Stad:</strong> ${customer.city || 'Niet opgegeven'}</p>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="card bg-primary text-white">
                                        <div class="card-body text-center">
                                            <h4>${customer.vehicle_count || 0}</h4>
                                            <small>Voertuigen</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card bg-info text-white">
                                        <div class="card-body text-center">
                                            <h4>${customer.quote_count || 0}</h4>
                                            <small>Offertes</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="card bg-success text-white">
                                        <div class="card-body text-center">
                                            <h4>${customer.appointment_count || 0}</h4>
                                            <small>Afspraken</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            ${customer.notes ? `
                            <div class="row mt-3">
                                <div class="col-12">
                                    <h6 class="text-muted">NOTITIES</h6>
                                    <div class="alert alert-info">
                                        ${customer.notes.split('\\n').map(line => `<p class="mb-1">${line}</p>`).join('')}
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>
                            <button type="button" class="btn btn-primary" onclick="if(window.adminApp) window.adminApp.editCustomer('${customer.id}');">
                                <i class="bi bi-pencil"></i> Bewerken
                            </button>
                            <button type="button" class="btn btn-success" onclick="if(window.adminApp) window.adminApp.createInvoiceForCustomer('${customer.id}');">
                                <i class="bi bi-receipt"></i> Nieuwe Factuur
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('customerModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body and show
        document.body.insertAdjacentHTML('beforeend', modal);
        const modalElement = new bootstrap.Modal(document.getElementById('customerModal'));
        modalElement.show();
    }
    
    createInvoiceForCustomer(customerId) {
        console.log('📝 Creating invoice for customer:', customerId);
        this.showToast('Nieuwe factuur voor klant - selecteer eerst services en details', 'info');
        // Close customer modal
        const modalElement = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
        if (modalElement) modalElement.hide();
        
        // Navigate to invoices section (could be enhanced to pre-fill customer)
        this.navigateToSection('invoices');
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