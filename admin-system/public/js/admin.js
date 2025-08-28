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

    // Utility function for debouncing input events
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
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

        // Navigation - both nav-links and dropdown-items
        document.querySelectorAll('.nav-link[data-section], .dropdown-item[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                console.log(`🔗 Navigation clicked: ${section}`);
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
        console.log(`🔗 Navigating to section: ${section}`);
        
        // Update navigation - remove active from all nav items
        document.querySelectorAll('.nav-link, .dropdown-item').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to the clicked section (try both nav-link and dropdown-item)
        const activeElements = document.querySelectorAll(`[data-section="${section}"]`);
        activeElements.forEach(el => el.classList.add('active'));

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.add('d-none');
        });

        // Show target section
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.classList.remove('d-none');
            console.log(`✅ Showing section: ${section}-section`);
        } else {
            console.error(`❌ Section not found: ${section}-section`);
        }
        
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
                case 'services':
                    await this.loadServices();
                    break;
                case 'companies':
                    await this.loadCompanies();
                    break;
                case 'persons':
                    await this.loadPersons();
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
                        <div class="col-md-4">
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
                        <div class="col-md-2">
                            <button class="btn btn-outline-primary w-100" id="customers-refresh">
                                <i class="bi bi-arrow-clockwise"></i> Verversen
                            </button>
                        </div>
                        <div class="col-md-3">
                            <button class="btn btn-outline-success w-100" id="export-customers-btn">
                                <i class="bi bi-download"></i> Export CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Bulk Actions -->
            <div class="card mb-4 d-none" id="bulk-actions-card">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <span id="selected-count">0</span> klanten geselecteerd
                        </div>
                        <div class="col-md-6 text-end">
                            <div class="btn-group">
                                <button class="btn btn-outline-primary btn-sm" id="bulk-email-btn">
                                    <i class="bi bi-envelope"></i> Email verzenden
                                </button>
                                <button class="btn btn-outline-warning btn-sm" id="bulk-export-btn">
                                    <i class="bi bi-download"></i> Export geselecteerd
                                </button>
                                <button class="btn btn-outline-danger btn-sm" id="bulk-delete-btn">
                                    <i class="bi bi-trash"></i> Verwijderen
                                </button>
                            </div>
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
                                        <th width="50">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="select-all-customers">
                                            </div>
                                        </th>
                                        <th>Naam</th>
                                        <th>Email</th>
                                        <th>Telefoon</th>
                                        <th>Aangemaakt</th>
                                        <th width="150">Acties</th>
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
            // Get filter values for quotes
            const searchInput = document.getElementById('quote-search');
            const statusFilter = document.getElementById('quote-status-filter');
            const sortFilter = document.getElementById('quote-sort-filter');
            
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
            
            // Fetch quotes from API with filters
            const url = `${this.baseURL}/api/quotes${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            console.log('🔍 Loading quotes with filters:', url);
            
            const response = await fetch(url, {
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
                <td class="text-currency">${this.formatPrice(quote.amount || 0)}</td>
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
                        <button class="btn btn-outline-info" onclick="if(window.adminApp) window.adminApp.convertQuoteToInvoice('${quote.id}'); else alert('AdminApp not loaded yet');" title="${this.getInvoiceTerminology('toInvoice')}">
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
    
    async showAddQuoteModal() {
        console.log('🎯 Opening standalone quote generator');
        await this.generateStandaloneQuote();
    }
    
    filterQuotes() {
        console.log('🔍 Filtering quotes...');
        this.loadQuotes();
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
            this.showQuoteDetailsModal(quote);
            
        } catch (error) {
            console.error('Error fetching quote:', error);
            this.showToast(`Fout bij het ophalen van offerte #${id}: ${error.message}`, 'error');
        }
    }
    
    showQuoteDetailsModal(quote) {
        console.log('📄 Showing quote details modal for:', quote.quote_number);
        
        const modal = `
            <div class="modal fade" id="quoteDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-file-text"></i> Offerte ${quote.quote_number || quote.id}
                                <span class="badge ms-2 ${this.getQuoteStatusBadgeClass(quote.status)}">${this.getQuoteStatusText(quote.status)}</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-muted">KLANTGEGEVENS</h6>
                                    <p class="mb-1"><strong>${quote.customer_name || 'Onbekend'}</strong></p>
                                    <p class="mb-1 text-muted">${quote.customer_email || ''}</p>
                                    <p class="mb-3 text-muted">${quote.customer_phone || ''}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="text-muted">OFFERTE GEGEVENS</h6>
                                    <p class="mb-1">Datum: <strong>${this.formatDate(quote.created_at)}</strong></p>
                                    <p class="mb-1">Geldig tot: <strong>${quote.valid_until ? this.formatDate(quote.valid_until) : 'Niet opgegeven'}</strong></p>
                                    <p class="mb-3">Status: <span class="badge ${this.getQuoteStatusBadgeClass(quote.status)}">${this.getQuoteStatusText(quote.status)}</span></p>
                                </div>
                            </div>
                            
                            ${quote.description ? `
                            <div class="row mb-3">
                                <div class="col-12">
                                    <h6 class="text-muted">OMSCHRIJVING</h6>
                                    <p>${quote.description}</p>
                                </div>
                            </div>
                            ` : ''}
                            
                            <div class="row mb-3">
                                <div class="col-12">
                                    <h6 class="text-muted">TOTAAL BEDRAG</h6>
                                    <h3 class="text-success">${this.formatPrice(parseFloat(quote.amount || quote.total_amount) || 0)}</h3>
                                </div>
                            </div>
                            
                            ${quote.notes ? `
                            <div class="row">
                                <div class="col-12">
                                    <h6 class="text-muted">NOTITIES</h6>
                                    <p class="text-muted">${quote.notes}</p>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>
                            <button type="button" class="btn btn-primary" onclick="if(window.adminApp) window.adminApp.editQuote('${quote.id}');">
                                <i class="bi bi-pencil"></i> Bewerken
                            </button>
                            ${quote.status === 'sent' || quote.status === 'approved' ? `
                            <button type="button" class="btn btn-success" onclick="if(window.adminApp) window.adminApp.convertQuoteToInvoice('${quote.id}');">
                                <i class="bi bi-receipt"></i> ${this.getInvoiceTerminology('toInvoice')}
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('quoteDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body and show
        document.body.insertAdjacentHTML('beforeend', modal);
        const modalElement = new bootstrap.Modal(document.getElementById('quoteDetailsModal'));
        modalElement.show();
    }
    
    getQuoteStatusBadgeClass(status) {
        switch(status) {
            case 'draft': return 'bg-secondary';
            case 'sent': return 'bg-primary';
            case 'approved': return 'bg-success';
            case 'rejected': return 'bg-danger';
            case 'expired': return 'bg-warning';
            default: return 'bg-secondary';
        }
    }
    
    getQuoteStatusText(status) {
        switch(status) {
            case 'draft': return 'Concept';
            case 'sent': return 'Verzonden';
            case 'approved': return 'Goedgekeurd';
            case 'rejected': return 'Afgewezen';
            case 'expired': return 'Verlopen';
            default: status || 'Onbekend';
        }
    }
    
    convertQuoteToInvoice(quoteId) {
        console.log('📄➡️📋 Converting quote to invoice:', quoteId);
        this.showToast(`Offerte naar ${this.getInvoiceTerminology('invoice')} conversie komt binnenkort!`, 'info');
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
                    <i class="bi bi-receipt"></i> ${this.getInvoiceTerminology('toInvoice')}
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
                                    <td class="text-end">${this.formatPrice(item.price || 0, { showVATStatus: false })}</td>
                                    <td class="text-end">${this.formatPrice((item.quantity || 1) * (item.price || 0), { showVATStatus: false })}</td>
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
                        ${(this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '') ? `
                        <tr><td>Subtotaal:</td><td class="text-end">${this.formatCurrency((quote.amount || 0) / (1 + (this.systemSettings.vat_percentage / 100)))}</td></tr>
                        <tr><td>BTW (${this.systemSettings.vat_percentage}%):</td><td class="text-end">${this.formatCurrency((quote.amount || 0) - ((quote.amount || 0) / (1 + (this.systemSettings.vat_percentage / 100))))}</td></tr>
                        <tr class="table-active"><td><strong>Totaal:</strong></td><td class="text-end"><strong>${this.formatPrice(quote.amount || 0, { showVATStatus: false })}</strong></td></tr>
                        ` : `
                        <tr class="table-active"><td><strong>Totaal:</strong></td><td class="text-end"><strong>${this.formatPrice(quote.amount || 0)}</strong></td></tr>
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
        
        if (!confirm(`Wilt u deze offerte omzetten naar een ${this.getInvoiceTerminology('invoice')}?`)) {
            return;
        }
        
        // Show loading animation
        const loadingToast = this.showPDFLoadingToast(`${this.getInvoiceTerminology('Invoice')} aanmaken...`);
        
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
            this.showToast(`✅ ${this.getInvoiceTerminology('Invoice')} ${invoice.invoice_number} succesvol aangemaakt!`, 'success');
            
            // Close any open modals
            this.closeModal();
            
            // Switch to invoices view
            this.showSection('invoices');
            
        } catch (error) {
            console.error('Error converting quote to invoice:', error);
            this.hidePDFLoadingToast(loadingToast);
            this.showToast(`❌ Fout bij omzetten naar ${this.getInvoiceTerminology('invoice')}`, 'danger');
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
        
        // Show loading state
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-calendar-check text-success"></i> Planning Beheer</h1>
                <button class="btn btn-primary" id="add-appointment-btn">
                    <i class="bi bi-calendar-plus"></i> Nieuwe Afspraak
                </button>
            </div>
            <div class="text-center py-5">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Laden...</span>
                </div>
                <p class="text-muted mt-2">Afspraken worden geladen...</p>
            </div>
        `;
        
        try {
            const appointments = await this.apiCall('GET', '/api/appointments');
            console.log('✅ Appointments loaded:', appointments);
            
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-calendar-check text-success"></i> Planning Beheer</h1>
                    <div class="d-flex gap-2">
                        <div class="btn-group" role="group">
                            <button type="button" class="btn btn-outline-secondary" id="list-view-btn">
                                <i class="bi bi-list-ul"></i> Lijst
                            </button>
                            <button type="button" class="btn btn-secondary active" id="calendar-view-btn">
                                <i class="bi bi-calendar3"></i> Agenda
                            </button>
                        </div>
                        <button class="btn btn-primary" id="add-appointment-btn">
                            <i class="bi bi-calendar-plus"></i> Nieuwe Afspraak
                        </button>
                    </div>
                </div>
                
                <!-- Time Period Selector & Filters -->
                <div class="card mb-4" id="calendar-controls">
                    <div class="card-body">
                        <div class="row g-3 mb-3">
                            <div class="col-md-12">
                                <label class="form-label"><i class="bi bi-calendar-range"></i> Periode</label>
                                <div class="btn-group w-100" role="group">
                                    <button type="button" class="btn btn-outline-primary active" data-period="today">Vandaag</button>
                                    <button type="button" class="btn btn-outline-primary" data-period="tomorrow">Morgen</button>
                                    <button type="button" class="btn btn-outline-primary" data-period="week">Deze Week</button>
                                    <button type="button" class="btn btn-outline-primary" data-period="next-week">Volgende Week</button>
                                    <button type="button" class="btn btn-outline-primary" data-period="month">Deze Maand</button>
                                    <button type="button" class="btn btn-outline-primary" data-period="next-month">Volgende Maand</button>
                                    <button type="button" class="btn btn-outline-primary" data-period="quarter">Dit Kwartaal</button>
                                </div>
                            </div>
                        </div>
                        <div class="row g-3" id="list-filters" style="display: none;">
                            <div class="col-md-3">
                                <label for="appointment-search" class="form-label">Zoeken</label>
                                <input type="text" class="form-control" id="appointment-search" 
                                       placeholder="Klant, dienst, notities...">
                            </div>
                            <div class="col-md-2">
                                <label for="appointment-status-filter" class="form-label">Status</label>
                                <select class="form-select" id="appointment-status-filter">
                                    <option value="">Alle statussen</option>
                                    <option value="scheduled">Gepland</option>
                                    <option value="in_progress">Bezig</option>
                                    <option value="completed">Voltooid</option>
                                    <option value="cancelled">Geannuleerd</option>
                                    <option value="no_show">Niet verschenen</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label for="appointment-date-from" class="form-label">Van datum</label>
                                <input type="date" class="form-control" id="appointment-date-from">
                            </div>
                            <div class="col-md-2">
                                <label for="appointment-date-to" class="form-label">Tot datum</label>
                                <input type="date" class="form-control" id="appointment-date-to">
                            </div>
                            <div class="col-md-3 d-flex align-items-end">
                                <button class="btn btn-outline-primary me-2" id="filter-appointments-btn">
                                    <i class="bi bi-funnel"></i> Filter
                                </button>
                                <button class="btn btn-outline-secondary" id="clear-appointment-filters-btn">
                                    <i class="bi bi-x-circle"></i> Wissen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- List View -->
                <div class="card" id="appointments-list-view" style="display: none;">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Datum & Tijd</th>
                                        <th>Klant</th>
                                        <th>Dienst</th>
                                        <th>Voertuig</th>
                                        <th>Status</th>
                                        <th>Duur</th>
                                        <th>Prijs</th>
                                        <th>Acties</th>
                                    </tr>
                                </thead>
                                <tbody id="appointments-table-body">
                                    ${this.renderAppointmentsTable(appointments.appointments || [])}
                                </tbody>
                            </table>
                        </div>
                        ${this.renderPagination(appointments.pagination)}
                    </div>
                </div>

                <!-- Calendar/Agenda View -->
                <div id="appointments-calendar-view">
                    <div class="calendar-container" style="height: 80vh; overflow-y: auto;">
                        <div id="calendar-grid" class="calendar-grid">
                            ${this.renderCalendarGrid(appointments.appointments || [])}
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners
            this.addAppointmentEventListeners();
            
            // Add calendar CSS
            this.addCalendarCSS();
            
        } catch (error) {
            console.error('Error loading appointments:', error);
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-calendar-check text-success"></i> Planning Beheer</h1>
                    <button class="btn btn-primary" id="add-appointment-btn">
                        <i class="bi bi-calendar-plus"></i> Nieuwe Afspraak
                    </button>
                </div>
                <div class="alert alert-danger">
                    <h4>Error</h4>
                    <p>Kon afspraken niet laden: ${error.message}</p>
                    <button class="btn btn-outline-danger" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise"></i> Opnieuw proberen
                    </button>
                </div>
            `;
        }
    }

    renderAppointmentsTable(appointments) {
        if (!appointments || appointments.length === 0) {
            return `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="text-muted">
                            <i class="bi bi-calendar-x display-1"></i>
                            <p class="mt-2">Geen afspraken gevonden</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        return appointments.map(appointment => `
            <tr>
                <td>
                    <div class="fw-bold">${this.formatDate(appointment.appointment_date)}</div>
                    <small class="text-muted">${this.formatTime(appointment.start_time)}</small>
                </td>
                <td>
                    <div class="fw-bold">${appointment.customer_name || 'Onbekend'}</div>
                    ${appointment.customer_email ? `<small class="text-muted d-block">${appointment.customer_email}</small>` : ''}
                    ${appointment.customer_phone ? `<small class="text-muted d-block">${appointment.customer_phone}</small>` : ''}
                </td>
                <td>
                    <span class="badge bg-info">Afspraak</span>
                </td>
                <td>
                    ${appointment.vehicle_info ? 
                        `<div class="small">${appointment.vehicle_info}</div>` : 
                        '<span class="text-muted">Geen info</span>'
                    }
                </td>
                <td>
                    <span class="badge ${this.getAppointmentStatusClass(appointment.status)}">
                        ${this.getAppointmentStatusText(appointment.status)}
                    </span>
                </td>
                <td>
                    ${appointment.start_time && appointment.end_time ? 
                        `${appointment.start_time} - ${appointment.end_time}` : 
                        '-'
                    }
                </td>
                <td>
                    -
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="adminApp.viewAppointment(${appointment.id})"
                                title="Bekijken">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" 
                                onclick="adminApp.editAppointment(${appointment.id})"
                                title="Bewerken">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="adminApp.deleteAppointment(${appointment.id})"
                                title="Verwijderen">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderCalendarGrid(appointments) {
        // Get the current period from UI (default to today)
        const activePeriod = document.querySelector('[data-period].active')?.dataset.period || 'today';
        const { startDate, endDate, days } = this.getPeriodDates(activePeriod);
        
        // Generate time slots (7:00 - 20:00 in 30-minute intervals)
        const timeSlots = [];
        for (let hour = 7; hour < 20; hour++) {
            timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
        
        let calendarHTML = `
            <div class="calendar-header">
                <div class="time-column-header">Tijd</div>
        `;
        
        // Add day headers with debug info
        days.forEach((day, index) => {
            const dayDate = new Date(day);
            const isToday = dayDate.toDateString() === new Date().toDateString();
            console.log(`📅 Calendar day ${index}: ${day} (${this.getDayName(dayDate)})`);
            calendarHTML += `
                <div class="day-header ${isToday ? 'today' : ''}" data-day-index="${index}" data-date="${day}">
                    <div class="day-name">${this.getDayName(dayDate)}</div>
                    <div class="day-date">${dayDate.getDate()}/${dayDate.getMonth() + 1}</div>
                </div>
            `;
        });
        
        calendarHTML += `</div><div class="calendar-body">`;
        
        // Add time slots and day columns
        timeSlots.forEach(timeSlot => {
            calendarHTML += `
                <div class="time-row">
                    <div class="time-label">${timeSlot}</div>
            `;
            
            days.forEach((day, dayIndex) => {
                const dayAppointments = this.getAppointmentsForTimeSlot(appointments, day, timeSlot);
                const isInAppointmentPeriod = this.isTimeSlotInAppointment(appointments, day, timeSlot);
                const appointmentInPeriod = appointments.find(apt => {
                    const aptDateObj = new Date(apt.appointment_date);
                    const aptDate = `${aptDateObj.getFullYear()}-${String(aptDateObj.getMonth() + 1).padStart(2, '0')}-${String(aptDateObj.getDate()).padStart(2, '0')}`;
                    if (aptDate !== day) return false;
                    const startTime = apt.start_time.substring(0, 5);
                    const endTime = apt.end_time.substring(0, 5);
                    const [startHour, startMin] = startTime.split(':').map(Number);
                    const [endHour, endMin] = endTime.split(':').map(Number);
                    const [slotHour, slotMin] = timeSlot.split(':').map(Number);
                    const startMinutes = startHour * 60 + startMin;
                    const endMinutes = endHour * 60 + endMin;
                    const slotMinutes = slotHour * 60 + slotMin;
                    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
                });
                
                calendarHTML += `
                    <div class="time-slot ${isInAppointmentPeriod ? 'has-appointment' : ''}" data-date="${day}" data-time="${timeSlot}" data-day-index="${dayIndex}"
                         ondrop="adminApp.handleAppointmentDrop(event)" 
                         ondragover="adminApp.allowDrop(event)"
                         ${isInAppointmentPeriod && appointmentInPeriod ? `onmousedown="adminApp.handleTimeSlotDrag(event, '${appointmentInPeriod.id}')"` : ''}>
                        ${dayAppointments.map(apt => this.renderAppointmentBlock(apt)).join('')}
                    </div>
                `;
            });
            
            calendarHTML += `</div>`;
        });
        
        calendarHTML += `</div>`;
        
        return calendarHTML;
    }

    getPeriodDates(period) {
        const today = new Date();
        const startOfWeek = new Date(today);
        // Fix week start calculation: Sunday is 0, Monday should be start of week
        const dayOfWeek = today.getDay();
        const daysFromMonday = (dayOfWeek === 0) ? -6 : -(dayOfWeek - 1); // Sunday: go back 6 days, other days: go back (day-1) days
        startOfWeek.setDate(today.getDate() + daysFromMonday);
        
        switch (period) {
            case 'today':
                return {
                    startDate: new Date(today),
                    endDate: new Date(today),
                    days: [today.toISOString().split('T')[0]]
                };
            case 'tomorrow':
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                return {
                    startDate: tomorrow,
                    endDate: tomorrow,
                    days: [tomorrow.toISOString().split('T')[0]]
                };
            case 'week':
                const weekEnd = new Date(startOfWeek);
                weekEnd.setDate(startOfWeek.getDate() + 6);
                const weekDays = [];
                for (let i = 0; i < 7; i++) {
                    const day = new Date(startOfWeek);
                    day.setDate(startOfWeek.getDate() + i);
                    weekDays.push(day.toISOString().split('T')[0]);
                }
                return { startDate: startOfWeek, endDate: weekEnd, days: weekDays };
            case 'next-week':
                const nextWeekStart = new Date(startOfWeek);
                nextWeekStart.setDate(startOfWeek.getDate() + 7);
                const nextWeekEnd = new Date(nextWeekStart);
                nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
                const nextWeekDays = [];
                for (let i = 0; i < 7; i++) {
                    const day = new Date(nextWeekStart);
                    day.setDate(nextWeekStart.getDate() + i);
                    nextWeekDays.push(day.toISOString().split('T')[0]);
                }
                return { startDate: nextWeekStart, endDate: nextWeekEnd, days: nextWeekDays };
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                const monthDays = [];
                for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
                    monthDays.push(new Date(d).toISOString().split('T')[0]);
                }
                return { startDate: monthStart, endDate: monthEnd, days: monthDays };
            default:
                return {
                    startDate: new Date(today),
                    endDate: new Date(today),
                    days: [today.toISOString().split('T')[0]]
                };
        }
    }

    getDayName(date) {
        const days = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
        return days[date.getDay()];
    }

    getAppointmentsForTimeSlot(appointments, date, timeSlot) {
        return appointments.filter(apt => {
            // Fix timezone conversion issue by using local date extraction
            const aptDateObj = new Date(apt.appointment_date);
            const aptDate = `${aptDateObj.getFullYear()}-${String(aptDateObj.getMonth() + 1).padStart(2, '0')}-${String(aptDateObj.getDate()).padStart(2, '0')}`;
            const aptStartTime = apt.start_time.substring(0, 5); // Get HH:MM format
            
            // Debug output - remove after debugging
            if (aptDate === date) {
                console.log(`🔍 Matching: apt(${aptDate} ${aptStartTime}) vs slot(${date} ${timeSlot})`);
            }
            
            // Only show appointment in its start time slot
            return aptDate === date && aptStartTime === timeSlot;
        });
    }

    // Check if a time slot is within an appointment period (for coloring)
    isTimeSlotInAppointment(appointments, date, timeSlot) {
        return appointments.some(apt => {
            const aptDateObj = new Date(apt.appointment_date);
            const aptDate = `${aptDateObj.getFullYear()}-${String(aptDateObj.getMonth() + 1).padStart(2, '0')}-${String(aptDateObj.getDate()).padStart(2, '0')}`;
            
            if (aptDate !== date) return false;
            
            const startTime = apt.start_time.substring(0, 5);
            const endTime = apt.end_time.substring(0, 5);
            
            // Convert times to minutes for comparison
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            const [slotHour, slotMin] = timeSlot.split(':').map(Number);
            
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            const slotMinutes = slotHour * 60 + slotMin;
            
            return slotMinutes >= startMinutes && slotMinutes < endMinutes;
        });
    }

    renderAppointmentBlock(appointment) {
        const statusClass = this.getAppointmentStatusClass(appointment.status);
        const customColor = appointment.color || '';
        const duration = this.calculateAppointmentDuration(appointment.start_time, appointment.end_time);
        
        // Debug logging for appointment data - show all properties
        console.log('🏗️ Rendering appointment block:', JSON.stringify(appointment, null, 2));
        
        // Calculate height based on duration (each 30-minute slot is 60px, so 2px per minute)
        const heightPx = Math.max(40, (duration * 2)); // Minimum 40px height
        
        return `
            <div class="appointment-block ${statusClass}" 
                 data-appointment-id="${appointment.id}"
                 data-duration="${duration}"
                 style="height: ${heightPx}px; background-color: ${customColor || '#0d6efd'} !important; cursor: grab;"
                 onmousedown="adminApp.handleAppointmentDragStart(event)"
                 title="${appointment.customer_name || appointment.customer_first_name + ' ' + appointment.customer_last_name || 'Geen klant'} - ${appointment.start_time} tot ${appointment.end_time}">
                
                <div class="appointment-content" onclick="event.stopPropagation(); adminApp.openAppointmentModal('${appointment.id}')">
                    <div class="appointment-title">${appointment.customer_name || 'Test User'}</div>
                    <div class="appointment-time">${appointment.start_time || '00:00'} - ${appointment.end_time || '00:00'}</div>
                    <div class="appointment-status">${appointment.status || 'scheduled'}</div>
                </div>
                
                <!-- View details button -->
                <div class="appointment-view-btn" onclick="event.stopPropagation(); adminApp.viewAppointmentDetails('${appointment.id}')">
                    <i class="bi bi-eye"></i>
                </div>
                
                <!-- Color picker button -->
                <div class="appointment-color-picker" onclick="event.stopPropagation(); adminApp.showColorPicker('${appointment.id}', event)">
                    <i class="bi bi-palette"></i>
                </div>
                
                <!-- Resize handles -->
                <div class="resize-handle resize-top" 
                     onmousedown="adminApp.startResize(event, '${appointment.id}', 'top')"></div>
                <div class="resize-handle resize-bottom" 
                     onmousedown="adminApp.startResize(event, '${appointment.id}', 'bottom')"></div>
            </div>
        `;
    }

    calculateAppointmentDuration(startTime, endTime) {
        const [startHours, startMins] = startTime.split(':').map(Number);
        const [endHours, endMins] = endTime.split(':').map(Number);
        return (endHours * 60 + endMins) - (startHours * 60 + startMins);
    }

    formatStatus(status) {
        const statusLabels = {
            'scheduled': 'Gepland',
            'in_progress': 'Bezig',
            'completed': 'Voltooid',
            'cancelled': 'Geannuleerd',
            'no_show': 'Niet verschenen'
        };
        return statusLabels[status] || status;
    }

    getAppointmentStatusClass(status) {
        switch (status) {
            case 'scheduled': return 'bg-primary';
            case 'confirmed': return 'bg-success';
            case 'in_progress': return 'bg-warning';
            case 'completed': return 'bg-success';
            case 'cancelled': return 'bg-danger';
            case 'no_show': return 'bg-secondary';
            default: return 'bg-secondary';
        }
    }

    getAppointmentStatusText(status) {
        switch (status) {
            case 'scheduled': return 'Gepland';
            case 'confirmed': return 'Bevestigd';
            case 'in_progress': return 'Bezig';
            case 'completed': return 'Voltooid';
            case 'cancelled': return 'Geannuleerd';
            case 'no_show': return 'Niet verschenen';
            default: return 'Onbekend';
        }
    }

    addAppointmentEventListeners() {
        // View toggle buttons
        const listViewBtn = document.getElementById('list-view-btn');
        const calendarViewBtn = document.getElementById('calendar-view-btn');
        
        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => this.toggleAppointmentView('list'));
        }
        
        if (calendarViewBtn) {
            calendarViewBtn.addEventListener('click', () => this.toggleAppointmentView('calendar'));
        }

        // Period selector buttons
        document.querySelectorAll('[data-period]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.refreshCalendarView();
            });
        });

        // Filter button
        const filterBtn = document.getElementById('filter-appointments-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => this.filterAppointments());
        }

        // Clear filters button
        const clearBtn = document.getElementById('clear-appointment-filters-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAppointmentFilters());
        }

        // Add appointment button
        const addBtn = document.getElementById('add-appointment-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddAppointmentModalV2());
        }

        // Search input real-time filtering
        const searchInput = document.getElementById('appointment-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => this.filterAppointments(), 300));
        }
    }

    toggleAppointmentView(view) {
        const listView = document.getElementById('appointments-list-view');
        const calendarView = document.getElementById('appointments-calendar-view');
        const listFilters = document.getElementById('list-filters');
        const listViewBtn = document.getElementById('list-view-btn');
        const calendarViewBtn = document.getElementById('calendar-view-btn');
        
        if (view === 'list') {
            listView.style.display = 'block';
            calendarView.style.display = 'none';
            listFilters.style.display = 'flex';
            listViewBtn.classList.add('active');
            calendarViewBtn.classList.remove('active');
        } else {
            listView.style.display = 'none';
            calendarView.style.display = 'block';
            listFilters.style.display = 'none';
            calendarViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            this.refreshCalendarView();
        }
    }

    async refreshCalendarView() {
        try {
            const appointments = await this.apiCall('GET', '/api/appointments');
            const calendarGrid = document.getElementById('calendar-grid');
            if (calendarGrid) {
                calendarGrid.innerHTML = this.renderCalendarGrid(appointments.appointments || []);
            }
        } catch (error) {
            console.error('Error refreshing calendar view:', error);
        }
    }

    // Enhanced drag-and-drop functions (Google Calendar style)
    handleTimeSlotDrag(event, appointmentId) {
        // Find the actual appointment block for this ID
        const appointmentBlock = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (appointmentBlock) {
            // Create a new event object that mimics the original
            const newEvent = {
                target: appointmentBlock,
                clientX: event.clientX,
                clientY: event.clientY,
                preventDefault: () => event.preventDefault(),
                stopPropagation: () => event.stopPropagation()
            };
            this.handleAppointmentDragStart(newEvent);
        }
    }

    openAppointmentModal(appointmentId) {
        // Find appointment data
        if (!this.appointments || !Array.isArray(this.appointments)) {
            console.warn('No appointments data available');
            return;
        }
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            this.showEditAppointmentModal(appointment);
        }
    }

    viewAppointmentDetails(appointmentId) {
        // Find appointment data
        if (!this.appointments || !Array.isArray(this.appointments)) {
            console.warn('No appointments data available');
            return;
        }
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            this.showAppointmentDetailsModal(appointment);
        }
    }

    showAppointmentDetailsModal(appointment) {
        const modalHTML = `
            <div class="modal fade" id="appointmentDetailsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Afspraak Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <p><strong>Klant:</strong> ${appointment.customer_name || 'Onbekend'}</p>
                                    <p><strong>Email:</strong> ${appointment.customer_email || 'Niet opgegeven'}</p>
                                    <p><strong>Telefoon:</strong> ${appointment.customer_phone || 'Niet opgegeven'}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Datum:</strong> ${new Date(appointment.appointment_date).toLocaleDateString('nl-NL')}</p>
                                    <p><strong>Tijd:</strong> ${this.formatTime(appointment.start_time)} - ${this.formatTime(appointment.end_time)}</p>
                                    <p><strong>Status:</strong> <span class="badge ${this.getAppointmentStatusClass(appointment.status)}">${this.formatStatus(appointment.status)}</span></p>
                                </div>
                            </div>
                            ${appointment.notes ? `
                                <div class="mt-3">
                                    <p><strong>Notities:</strong></p>
                                    <p class="text-muted">${appointment.notes}</p>
                                </div>
                            ` : ''}
                            ${appointment.location ? `
                                <p><strong>Locatie:</strong> ${appointment.location}</p>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>
                            <button type="button" class="btn btn-primary" onclick="adminApp.showEditAppointmentModal(${JSON.stringify(appointment).replace(/"/g, '&quot;')}); $('#appointmentDetailsModal').modal('hide');">Bewerken</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal
        const existingModal = document.getElementById('appointmentDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('appointmentDetailsModal'));
        modal.show();
    }

    handleAppointmentDragStart(event) {
        // Prevent click event from firing during drag
        this.dragStartTime = Date.now();
        this.hasDragged = false;
        
        // Don't start drag on resize handles or color picker
        if (event.target.classList.contains('resize-handle') || 
            event.target.closest('.appointment-color-picker')) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const appointmentBlock = event.currentTarget;
        if (!appointmentBlock || !appointmentBlock.dataset) {
            console.warn('No valid appointment block found for drag');
            return;
        }
        const appointmentId = appointmentBlock.dataset.appointmentId;
        
        // Store drag data
        this.dragData = {
            appointmentId: appointmentId,
            originalBlock: appointmentBlock,
            originalParent: appointmentBlock.parentElement,
            appointmentData: null,
            ghostElement: null,
            startX: event.clientX,
            startY: event.clientY,
            threshold: 5 // Minimum pixels to move before considering it a drag
        };
        
        // Store bound functions for proper cleanup
        this.boundHandleDragMove = this.handleDragMove.bind(this);
        this.boundHandleDragEnd = this.handleDragEnd.bind(this);
        
        // Add global drag event listeners
        document.addEventListener('mousemove', this.boundHandleDragMove);
        document.addEventListener('mouseup', this.boundHandleDragEnd);
        
        console.log('🎯 Started smooth dragging:', appointmentId);
    }

    startVisualDrag() {
        if (!this.dragData) return;
        
        // Create ghost element for smooth dragging
        const ghostElement = this.dragData.originalBlock.cloneNode(true);
        ghostElement.classList.add('appointment-ghost');
        ghostElement.style.position = 'fixed';
        ghostElement.style.pointerEvents = 'none';
        ghostElement.style.zIndex = '9999';
        ghostElement.style.opacity = '0.8';
        ghostElement.style.transform = 'rotate(2deg)';
        ghostElement.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
        document.body.appendChild(ghostElement);
        
        this.dragData.ghostElement = ghostElement;
        
        // Make original semi-transparent
        this.dragData.originalBlock.style.opacity = '0.3';
        this.dragData.originalBlock.style.transform = 'scale(0.95)';
        this.dragData.originalBlock.style.cursor = 'grabbing';
    }

    handleDragMove(event) {
        if (!this.dragData) return;
        
        const deltaX = event.clientX - this.dragData.startX;
        const deltaY = event.clientY - this.dragData.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Only start visual dragging after threshold is exceeded
        if (distance > this.dragData.threshold && !this.hasDragged) {
            this.hasDragged = true;
            this.startVisualDrag();
        }
        
        if (!this.hasDragged) return;
        
        // Update ghost position (center it better on cursor)
        if (this.dragData.ghostElement) {
            const rect = this.dragData.ghostElement.getBoundingClientRect();
            this.dragData.ghostElement.style.left = (event.clientX - rect.width / 2) + 'px';
            this.dragData.ghostElement.style.top = (event.clientY - rect.height / 2) + 'px';
        }
        
        // Temporarily hide ghost element for accurate detection
        if (this.dragData.ghostElement) {
            this.dragData.ghostElement.style.display = 'none';
        }
        
        // Highlight drop targets
        const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
        const timeSlot = elementBelow?.closest('.time-slot');
        
        // Restore ghost element
        if (this.dragData.ghostElement) {
            this.dragData.ghostElement.style.display = 'block';
        }
        
        // Clear previous highlights
        document.querySelectorAll('.time-slot.drag-highlight').forEach(slot => {
            slot.classList.remove('drag-highlight');
        });
        
        if (timeSlot && timeSlot !== this.dragData.originalParent) {
            timeSlot.classList.add('drag-highlight');
            console.log('🎯 Highlighting slot:', timeSlot.dataset.date, timeSlot.dataset.time);
        }
    }

    async handleDragEnd(event) {
        if (!this.dragData) return;
        
        // Temporarily hide ghost element to get correct element below
        if (this.dragData.ghostElement) {
            this.dragData.ghostElement.style.display = 'none';
        }
        
        // Find drop target
        const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
        const timeSlot = elementBelow?.closest('.time-slot');
        
        console.log('🎯 Drop detection:', {
            mousePos: { x: event.clientX, y: event.clientY },
            elementBelow: elementBelow?.className || elementBelow?.tagName,
            timeSlot: timeSlot ? {
                date: timeSlot.dataset.date,
                time: timeSlot.dataset.time,
                dayIndex: timeSlot.dataset.dayIndex,
                className: timeSlot.className
            } : null,
            originalParent: this.dragData.originalParent ? {
                date: this.dragData.originalParent.dataset.date,
                time: this.dragData.originalParent.dataset.time,
                dayIndex: this.dragData.originalParent.dataset.dayIndex
            } : null
        });
        
        // Clean up ghost element
        if (this.dragData.ghostElement) {
            this.dragData.ghostElement.remove();
        }
        
        // Reset original element
        this.dragData.originalBlock.style.opacity = '1';
        this.dragData.originalBlock.style.transform = '';
        this.dragData.originalBlock.style.cursor = 'grab';
        
        // Clear highlights
        document.querySelectorAll('.time-slot.drag-highlight').forEach(slot => {
            slot.classList.remove('drag-highlight');
        });
        
        // Remove event listeners
        if (this.boundHandleDragMove) {
            document.removeEventListener('mousemove', this.boundHandleDragMove);
            this.boundHandleDragMove = null;
        }
        if (this.boundHandleDragEnd) {
            document.removeEventListener('mouseup', this.boundHandleDragEnd);
            this.boundHandleDragEnd = null;
        }
        
        // Handle drop only if we actually dragged
        if (this.hasDragged && timeSlot && timeSlot !== this.dragData.originalParent) {
            await this.performAppointmentMove(timeSlot);
        } else if (!this.hasDragged && this.dragData && this.dragData.appointmentId) {
            // If we didn't drag, treat it as a click (but delay slightly to avoid conflicts)
            const appointmentId = this.dragData.appointmentId;
            setTimeout(() => {
                this.showAppointmentDetails(appointmentId);
            }, 10);
        }
        
        this.dragData = null;
        this.hasDragged = false;
    }

    async performAppointmentMove(targetSlot) {
        try {
            const appointmentId = this.dragData.appointmentId;
            const newDate = targetSlot.dataset.date;
            const newTime = targetSlot.dataset.time;
            
            // Get original appointment data to preserve duration and customer_id
            const appointment = await this.apiCall('GET', `/api/appointments/${appointmentId}`);
            const originalDuration = this.calculateAppointmentDuration(appointment.start_time, appointment.end_time);
            
            // Calculate new end time based on original duration
            const [hours, minutes] = newTime.split(':').map(Number);
            const totalStartMinutes = hours * 60 + minutes;
            const totalEndMinutes = totalStartMinutes + originalDuration;
            
            const newEndHours = Math.floor(totalEndMinutes / 60);
            const newEndMinutes = totalEndMinutes % 60;
            const newEndTime = `${String(newEndHours).padStart(2, '0')}:${String(newEndMinutes).padStart(2, '0')}`;
            
            // Show loading state
            this.dragData.originalBlock.classList.add('updating');
            
            // Perform API update with correct field names and required customer_id
            const updateData = {
                customer_id: appointment.customer_id,
                appointment_date: newDate,
                start_time: newTime,
                end_time: newEndTime
            };
            
            console.log('🔄 Sending drag update:', updateData);
            console.log('📅 Original appointment:', {
                date: appointment.appointment_date,
                start: appointment.start_time,
                end: appointment.end_time
            });
            console.log('🎯 Target slot:', {
                date: newDate,
                time: newTime,
                element: targetSlot
            });
            
            await this.apiCall('PUT', `/api/appointments/${appointmentId}`, updateData);
            
            this.showNotification('Afspraak succesvol verplaatst!', 'success');
            this.refreshCalendarView();
            
        } catch (error) {
            console.error('Error moving appointment:', error);
            this.showNotification('Fout bij verplaatsen afspraak: ' + error.message, 'error');
            
            // Remove loading state
            if (this.dragData && this.dragData.originalBlock) {
                this.dragData.originalBlock.classList.remove('updating');
            }
        }
    }

    // Legacy functions for HTML ondrop/ondragover - now redirect to new system
    allowDrop(event) {
        event.preventDefault();
    }

    async handleAppointmentDrop(event) {
        // This is now handled by the new drag system
        event.preventDefault();
    }

    // Appointment details modal
    async showAppointmentDetails(appointmentId) {
        console.log('👁️ Showing appointment details:', appointmentId);
        
        try {
            const appointment = await this.apiCall('GET', `/api/appointments/${appointmentId}`);
            
            const modalHTML = `
                <div class="modal fade" id="appointmentDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-calendar-event"></i> Afspraak Details
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <h6><i class="bi bi-person-circle"></i> Klant Informatie</h6>
                                        <p><strong>Naam:</strong> ${appointment.customer_name || 'Niet beschikbaar'}</p>
                                        <p><strong>Email:</strong> ${appointment.customer_email || 'Niet beschikbaar'}</p>
                                        <p><strong>Telefoon:</strong> ${appointment.customer_phone || 'Niet beschikbaar'}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6><i class="bi bi-calendar3"></i> Afspraak Informatie</h6>
                                        <p><strong>Datum:</strong> ${new Date(appointment.appointment_date).toLocaleDateString('nl-NL')}</p>
                                        <p><strong>Tijd:</strong> ${this.formatTime(appointment.start_time)} - ${this.formatTime(appointment.end_time)}</p>
                                        <p><strong>Status:</strong> <span class="badge ${this.getAppointmentStatusClass(appointment.status)}">${this.formatStatus(appointment.status)}</span></p>
                                        <p><strong>Locatie:</strong> ${appointment.location || 'Niet opgegeven'}</p>
                                    </div>
                                </div>
                                ${appointment.notes ? `
                                    <div class="mt-3">
                                        <h6><i class="bi bi-sticky"></i> Notities</h6>
                                        <p class="text-muted">${appointment.notes}</p>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>
                                <button type="button" class="btn btn-primary" onclick="adminApp.editAppointment('${appointmentId}')">
                                    <i class="bi bi-pencil"></i> Bewerken
                                </button>
                                <button type="button" class="btn btn-danger" onclick="adminApp.deleteAppointment('${appointmentId}')">
                                    <i class="bi bi-trash"></i> Verwijderen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal and add new one
            const existingModal = document.getElementById('appointmentDetailsModal');
            if (existingModal) existingModal.remove();
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('appointmentDetailsModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error loading appointment details:', error);
            this.showNotification('Fout bij laden afspraak details: ' + error.message, 'error');
        }
    }

    // Color picker functionality
    showColorPicker(appointmentId, event) {
        const colorPickerHTML = `
            <div class="color-picker-popup" id="colorPicker" style="position: absolute; z-index: 1000;">
                <div class="color-picker-content">
                    <div class="color-palette">
                        <div class="color-option" style="background-color: #0d6efd" onclick="adminApp.setAppointmentColor('${appointmentId}', '#0d6efd')"></div>
                        <div class="color-option" style="background-color: #198754" onclick="adminApp.setAppointmentColor('${appointmentId}', '#198754')"></div>
                        <div class="color-option" style="background-color: #fd7e14" onclick="adminApp.setAppointmentColor('${appointmentId}', '#fd7e14')"></div>
                        <div class="color-option" style="background-color: #dc3545" onclick="adminApp.setAppointmentColor('${appointmentId}', '#dc3545')"></div>
                        <div class="color-option" style="background-color: #6f42c1" onclick="adminApp.setAppointmentColor('${appointmentId}', '#6f42c1')"></div>
                        <div class="color-option" style="background-color: #d63384" onclick="adminApp.setAppointmentColor('${appointmentId}', '#d63384')"></div>
                        <div class="color-option" style="background-color: #20c997" onclick="adminApp.setAppointmentColor('${appointmentId}', '#20c997')"></div>
                        <div class="color-option" style="background-color: #ffc107" onclick="adminApp.setAppointmentColor('${appointmentId}', '#ffc107')"></div>
                    </div>
                    <input type="color" class="form-control mt-2" onchange="adminApp.setAppointmentColor('${appointmentId}', this.value)">
                    <button class="btn btn-sm btn-outline-secondary mt-2 w-100" onclick="adminApp.resetAppointmentColor('${appointmentId}')">Reset</button>
                </div>
            </div>
        `;
        
        // Remove existing color picker
        const existingPicker = document.getElementById('colorPicker');
        if (existingPicker) existingPicker.remove();
        
        // Position and show color picker
        document.body.insertAdjacentHTML('beforeend', colorPickerHTML);
        const picker = document.getElementById('colorPicker');
        picker.style.left = event.clientX + 'px';
        picker.style.top = event.clientY + 'px';
        
        // Close on click outside
        setTimeout(() => {
            document.addEventListener('click', function closeColorPicker(e) {
                if (!picker.contains(e.target)) {
                    picker.remove();
                    document.removeEventListener('click', closeColorPicker);
                }
            });
        }, 100);
    }

    async setAppointmentColor(appointmentId, color) {
        try {
            // Get current appointment data first
            const appointment = await this.apiCall('GET', `/api/appointments/${appointmentId}`);
            
            // Update with all required fields
            await this.apiCall('PUT', `/api/appointments/${appointmentId}`, {
                customer_id: appointment.customer_id,
                appointment_date: appointment.appointment_date,
                start_time: appointment.start_time,
                end_time: appointment.end_time
                // Note: color is not stored in database, only used for display
            });
            
            this.showNotification('Afspraak bijgewerkt!', 'success');
            this.refreshCalendarView();
            
            // Close color picker
            const picker = document.getElementById('colorPicker');
            if (picker) picker.remove();
            
        } catch (error) {
            console.error('Error setting appointment color:', error);
            this.showNotification('Fout bij bijwerken kleur: ' + error.message, 'error');
        }
    }

    async resetAppointmentColor(appointmentId) {
        await this.setAppointmentColor(appointmentId, null);
    }

    async editAppointment(appointmentId) {
        // Close the details modal first
        const detailsModal = bootstrap.Modal.getInstance(document.getElementById('appointmentDetailsModal'));
        if (detailsModal) detailsModal.hide();
        
        try {
            const appointment = await this.apiCall('GET', `/api/appointments/${appointmentId}`);
            
            // Create edit modal (similar to add modal but pre-filled)
            const customersResponse = await fetch(this.baseURL + '/api/customers', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const customersData = await customersResponse.json();
            const customers = customersData;
            
            const modalHTML = `
                <div class="modal fade" id="editAppointmentModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-pencil-square text-primary"></i> Afspraak Bewerken
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editAppointmentForm">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editAppointmentCustomer" class="form-label">Klant *</label>
                                                <select class="form-select" id="editAppointmentCustomer" required>
                                                    ${customers.customers.map(customer => 
                                                        `<option value="${customer.id}" ${customer.id === appointment.customer_id ? 'selected' : ''}>${customer.first_name} ${customer.last_name} - ${customer.email}</option>`
                                                    ).join('')}
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editAppointmentDate" class="form-label">Datum *</label>
                                                <input type="date" class="form-control" id="editAppointmentDate" required 
                                                       value="${appointment.appointment_date}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editAppointmentStartTime" class="form-label">Start Tijd *</label>
                                                <input type="time" class="form-control" id="editAppointmentStartTime" required 
                                                       value="${appointment.start_time}">
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editAppointmentEndTime" class="form-label">Eind Tijd *</label>
                                                <input type="time" class="form-control" id="editAppointmentEndTime" required 
                                                       value="${appointment.end_time}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editAppointmentStatus" class="form-label">Status</label>
                                                <select class="form-select" id="editAppointmentStatus">
                                                    <option value="scheduled" ${appointment.status === 'scheduled' ? 'selected' : ''}>Gepland</option>
                                                    <option value="in_progress" ${appointment.status === 'in_progress' ? 'selected' : ''}>In Behandeling</option>
                                                    <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Voltooid</option>
                                                    <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>Geannuleerd</option>
                                                    <option value="no_show" ${appointment.status === 'no_show' ? 'selected' : ''}>Niet Verschenen</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="editAppointmentLocation" class="form-label">Locatie</label>
                                                <input type="text" class="form-control" id="editAppointmentLocation" 
                                                       value="${appointment.location || ''}"
                                                       placeholder="Bijv. Thuis bij klant, Bedrijfspand, etc.">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="editAppointmentNotes" class="form-label">Notities</label>
                                        <textarea class="form-control" id="editAppointmentNotes" rows="3" 
                                                  placeholder="Aanvullende informatie over de afspraak...">${appointment.notes || ''}</textarea>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x"></i> Annuleren
                                </button>
                                <button type="button" class="btn btn-primary" onclick="adminApp.saveEditedAppointment('${appointmentId}')">
                                    <i class="bi bi-check"></i> Opslaan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal and add new one
            const existingModal = document.getElementById('editAppointmentModal');
            if (existingModal) existingModal.remove();
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = new bootstrap.Modal(document.getElementById('editAppointmentModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error loading appointment for editing:', error);
            this.showNotification('Fout bij laden afspraak voor bewerken: ' + error.message, 'error');
        }
    }

    async saveEditedAppointment(appointmentId) {
        try {
            const formData = {
                customer_id: document.getElementById('editAppointmentCustomer').value,
                appointment_date: document.getElementById('editAppointmentDate').value,
                start_time: document.getElementById('editAppointmentStartTime').value,
                end_time: document.getElementById('editAppointmentEndTime').value,
                status: document.getElementById('editAppointmentStatus').value,
                location: document.getElementById('editAppointmentLocation').value,
                notes: document.getElementById('editAppointmentNotes').value
            };
            
            await this.apiCall('PUT', `/api/appointments/${appointmentId}`, formData);
            
            this.showNotification('Afspraak succesvol bijgewerkt!', 'success');
            
            // Close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('editAppointmentModal'));
            if (modal) modal.hide();
            
            this.refreshCalendarView();
            
        } catch (error) {
            console.error('Error updating appointment:', error);
            this.showNotification('Fout bij bijwerken afspraak: ' + error.message, 'error');
        }
    }

    // Enhanced resize functionality (Google Calendar style)
    startResize(event, appointmentId, direction) {
        event.preventDefault();
        event.stopPropagation();
        
        const appointmentBlock = event.target.closest('.appointment-block');
        const originalTimeSlot = appointmentBlock.parentElement;
        
        this.resizing = {
            appointmentId: appointmentId,
            direction: direction,
            startY: event.clientY,
            originalBlock: appointmentBlock,
            originalTimeSlot: originalTimeSlot,
            originalHeight: appointmentBlock.offsetHeight,
            timeSlotHeight: 30, // Height of each 15-minute increment (30min slot / 2)
            previewElement: null,
            minDuration: 15 // Minimum 15 minutes
        };
        
        // Create preview element
        this.createResizePreview();
        
        // Add resize cursor to body
        document.body.style.cursor = 'ns-resize';
        appointmentBlock.style.userSelect = 'none';
        
        // Store bound functions for proper cleanup
        this.boundHandleSmoothResize = this.handleSmoothResize.bind(this);
        this.boundStopSmoothResize = this.stopSmoothResize.bind(this);
        
        document.addEventListener('mousemove', this.boundHandleSmoothResize);
        document.addEventListener('mouseup', this.boundStopSmoothResize);
        
        console.log('🔧 Started smooth resizing:', { appointmentId, direction });
    }

    createResizePreview() {
        const preview = this.resizing.originalBlock.cloneNode(true);
        preview.classList.add('resize-preview');
        preview.style.position = 'absolute';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = '1000';
        preview.style.opacity = '0.7';
        preview.style.border = '2px dashed #007bff';
        preview.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
        
        // Position it relative to original
        const rect = this.resizing.originalBlock.getBoundingClientRect();
        const containerRect = this.resizing.originalTimeSlot.getBoundingClientRect();
        
        preview.style.left = '2px';
        preview.style.right = '2px';
        preview.style.top = (rect.top - containerRect.top) + 'px';
        preview.style.height = this.resizing.originalHeight + 'px';
        
        this.resizing.originalTimeSlot.appendChild(preview);
        this.resizing.previewElement = preview;
        
        // Make original slightly transparent
        this.resizing.originalBlock.style.opacity = '0.5';
    }

    handleSmoothResize(event) {
        if (!this.resizing) return;
        
        const deltaY = event.clientY - this.resizing.startY;
        const slotHeight = this.resizing.timeSlotHeight;
        const slotsChanged = Math.round(deltaY / slotHeight);
        
        if (this.resizing.previewElement) {
            const currentRect = this.resizing.originalBlock.getBoundingClientRect();
            const containerRect = this.resizing.originalTimeSlot.getBoundingClientRect();
            
            if (this.resizing.direction === 'top') {
                // Resizing from top - change height and position
                const newHeight = Math.max(this.resizing.minDuration, this.resizing.originalHeight - deltaY);
                const topOffset = Math.min(deltaY, this.resizing.originalHeight - this.resizing.minDuration);
                
                this.resizing.previewElement.style.height = newHeight + 'px';
                this.resizing.previewElement.style.top = ((currentRect.top - containerRect.top) + topOffset) + 'px';
            } else {
                // Resizing from bottom - only change height
                const newHeight = Math.max(this.resizing.minDuration, this.resizing.originalHeight + deltaY);
                this.resizing.previewElement.style.height = newHeight + 'px';
            }
            
            // Show time preview
            this.updateResizeTimePreview(slotsChanged);
        }
    }

    updateResizeTimePreview(slotsChanged) {
        if (!this.resizing.timePreview) {
            this.resizing.timePreview = document.createElement('div');
            this.resizing.timePreview.style.position = 'fixed';
            this.resizing.timePreview.style.background = 'rgba(0,0,0,0.8)';
            this.resizing.timePreview.style.color = 'white';
            this.resizing.timePreview.style.padding = '4px 8px';
            this.resizing.timePreview.style.borderRadius = '4px';
            this.resizing.timePreview.style.fontSize = '12px';
            this.resizing.timePreview.style.zIndex = '10000';
            this.resizing.timePreview.style.pointerEvents = 'none';
            document.body.appendChild(this.resizing.timePreview);
        }
        
        const minutesChanged = slotsChanged * 30;
        const newDuration = Math.max(30, this.resizing.originalHeight / this.resizing.timeSlotHeight * 30 + 
                                    (this.resizing.direction === 'bottom' ? minutesChanged : -minutesChanged));
        
        this.resizing.timePreview.textContent = `Duur: ${Math.floor(newDuration / 60)}u ${newDuration % 60}m`;
        this.resizing.timePreview.style.left = (event.clientX + 10) + 'px';
        this.resizing.timePreview.style.top = (event.clientY - 10) + 'px';
    }

    async stopSmoothResize(event) {
        if (!this.resizing) return;
        
        const deltaY = event.clientY - this.resizing.startY;
        const slotHeight = this.resizing.timeSlotHeight;
        const slotsChanged = Math.round(deltaY / slotHeight);
        
        // Clean up preview elements
        if (this.resizing.previewElement) {
            this.resizing.previewElement.remove();
        }
        if (this.resizing.timePreview) {
            this.resizing.timePreview.remove();
        }
        
        // Reset styles
        document.body.style.cursor = '';
        this.resizing.originalBlock.style.opacity = '1';
        this.resizing.originalBlock.style.userSelect = '';
        
        // Remove event listeners
        if (this.boundHandleSmoothResize) {
            document.removeEventListener('mousemove', this.boundHandleSmoothResize);
            this.boundHandleSmoothResize = null;
        }
        if (this.boundStopSmoothResize) {
            document.removeEventListener('mouseup', this.boundStopSmoothResize);
            this.boundStopSmoothResize = null;
        }
        
        // Only resize if there's significant change (at least 15 minutes)
        console.log('🔧 Resize check:', { deltaY, slotsChanged, threshold: Math.abs(deltaY) });
        if (Math.abs(deltaY) > 15) { // Lower threshold for more responsive resizing
            console.log('✅ Performing resize with slotsChanged:', slotsChanged);
            await this.performResize(slotsChanged);
        } else {
            console.log('❌ Not resizing - delta too small:', Math.abs(deltaY));
            // Clear resizing state even if no resize performed
            this.resizing = null;
        }
    }

    async performResize(slotsChanged) {
        let updateData = null; // Declare at top level for error handling
        let appointment = null;
        let newStartTime = null;
        let newEndTime = null;
        let resizeData = null; // Declare at top level for error handling
        
        try {
            resizeData = this.resizing; // Store reference before clearing
            appointment = await this.apiCall('GET', `/api/appointments/${resizeData.appointmentId}`);
            const minutesChanged = slotsChanged * 15; // 15-minute increments
            
            newStartTime = appointment.start_time;
            newEndTime = appointment.end_time;
            
            console.log('🔧 Resize calculation:', {
                direction: resizeData.direction,
                slotsChanged,
                minutesChanged,
                original_start: appointment.start_time,
                original_end: appointment.end_time
            });
            
            if (resizeData.direction === 'top') {
                // Adjust start time (dragging top handle up/down)
                const [hours, minutes] = appointment.start_time.split(':').map(Number);
                const originalMinutes = hours * 60 + minutes;
                const totalMinutes = Math.max(0, originalMinutes + minutesChanged);
                const newHours = Math.floor(totalMinutes / 60);
                const newMinutes = totalMinutes % 60;
                newStartTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
                console.log('📈 Top resize:', { 
                    originalMinutes, 
                    minutesChanged, 
                    totalMinutes, 
                    newStartTime 
                });
            } else {
                // Adjust end time (dragging bottom handle up/down)
                const [hours, minutes] = appointment.end_time.split(':').map(Number);
                const originalMinutes = hours * 60 + minutes;
                const totalMinutes = Math.max(15, originalMinutes + minutesChanged);
                const newHours = Math.floor(totalMinutes / 60);
                const newMinutes = totalMinutes % 60;
                newEndTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
                console.log('📉 Bottom resize:', { 
                    originalMinutes, 
                    minutesChanged, 
                    totalMinutes, 
                    newEndTime 
                });
            }
            
            // Ensure consistent time format (HH:MM only, no seconds)
            newStartTime = newStartTime.split(':').slice(0, 2).join(':');
            newEndTime = newEndTime.split(':').slice(0, 2).join(':');
            
            // Validate minimum duration and logical order
            const startTotalMinutes = newStartTime.split(':').reduce((h, m) => h * 60 + +m);
            const endTotalMinutes = newEndTime.split(':').reduce((h, m) => h * 60 + +m);
            const duration = endTotalMinutes - startTotalMinutes;
            
            console.log('⏰ Time validation:', {
                startTime: newStartTime,
                endTime: newEndTime,
                startMinutes: startTotalMinutes,
                endMinutes: endTotalMinutes,
                duration: duration
            });
            
            if (duration < 15) {
                this.showNotification('Minimum afspraak duur is 15 minuten', 'warning');
                console.warn('❌ Validation failed: duration too short:', duration);
                if (this.resizing && this.resizing.originalBlock) {
                    this.resizing.originalBlock.classList.remove('updating');
                    this.resizing.originalBlock.style.opacity = '1';
                }
                this.resizing = null;
                return;
            }
            
            if (endTotalMinutes <= startTotalMinutes) {
                this.showNotification('Eindtijd moet na starttijd zijn', 'warning');
                console.warn('❌ Validation failed: end time before start time', {
                    startTime: newStartTime,
                    endTime: newEndTime,
                    direction: resizeData.direction,
                    slotsChanged,
                    minutesChanged
                });
                if (this.resizing && this.resizing.originalBlock) {
                    this.resizing.originalBlock.classList.remove('updating');
                    this.resizing.originalBlock.style.opacity = '1';
                }
                this.resizing = null;
                return;
            }
            
            // Show updating state
            resizeData.originalBlock.classList.add('updating');
            
            // Ensure times are in HH:MM format (remove seconds if present)
            const formatTime = (timeString) => {
                // Handle both HH:MM and HH:MM:SS formats
                if (typeof timeString === 'string') {
                    return timeString.substring(0, 5); // Take only HH:MM part
                }
                return timeString;
            };

            updateData = {
                customer_id: appointment.customer_id,
                appointment_date: appointment.appointment_date,
                start_time: formatTime(newStartTime),
                end_time: formatTime(newEndTime),
                status: appointment.status || 'scheduled'
            };
            
            console.log('📝 Formatted update data:', {
                original_start: appointment.start_time,
                original_end: appointment.end_time,
                new_start: newStartTime,
                new_end: newEndTime,
                formatted_start: formatTime(newStartTime),
                formatted_end: formatTime(newEndTime)
            });
            
            console.log('🔄 Sending resize update:', updateData);
            const result = await this.apiCall('PUT', `/api/appointments/${resizeData.appointmentId}`, updateData);
            console.log('✅ Resize API success:', result);
            
            this.showNotification('Afspraak duur succesvol aangepast!', 'success');
            console.log('🔄 Refreshing calendar view after resize...');
            await this.refreshCalendarView();
            console.log('✅ Calendar view refreshed');
            this.resizing = null;
            
        } catch (error) {
            console.error('Error resizing appointment:', error);
            console.error('Error details:', {
                updateData,
                appointmentId: resizeData.appointmentId,
                originalAppointment: appointment,
                newStartTime,
                newEndTime
            });
            this.showNotification('Fout bij aanpassen duur: ' + error.message, 'error');
            
            if (this.resizing && this.resizing.originalBlock) {
                this.resizing.originalBlock.classList.remove('updating');
                // Reset block to original state
                this.resizing.originalBlock.style.opacity = '1';
                this.resizing.originalBlock.style.height = this.resizing.originalHeight + 'px';
                console.log('🔄 Reset appointment block to original state');
            }
            this.resizing = null;
        }
    }

    addCalendarCSS() {
        // Check if calendar CSS already exists
        if (document.getElementById('calendar-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'calendar-styles';
        style.innerHTML = `
            /* Calendar Grid Styles */
            .calendar-grid {
                display: flex;
                flex-direction: column;
                min-width: 100%;
            }
            
            .calendar-header {
                display: grid;
                grid-template-columns: 80px repeat(auto-fit, minmax(120px, 1fr));
                gap: 1px;
                background-color: #dee2e6;
                border-radius: 8px 8px 0 0;
            }
            
            .time-column-header,
            .day-header {
                background-color: #495057;
                color: white;
                padding: 12px 8px;
                text-align: center;
                font-weight: 600;
                font-size: 0.875rem;
            }
            
            .day-header.today {
                background-color: #0d6efd;
            }
            
            .day-name {
                font-weight: 700;
                margin-bottom: 2px;
            }
            
            .day-date {
                font-size: 0.75rem;
                opacity: 0.9;
            }
            
            .calendar-body {
                display: flex;
                flex-direction: column;
                background-color: #f8f9fa;
            }
            
            .time-row {
                display: grid;
                grid-template-columns: 80px repeat(auto-fit, minmax(120px, 1fr));
                gap: 1px;
                min-height: 60px;
                border-bottom: 1px solid #dee2e6;
            }
            
            .time-label {
                background-color: #e9ecef;
                padding: 8px;
                text-align: center;
                font-size: 0.75rem;
                font-weight: 600;
                color: #495057;
                border-right: 2px solid #dee2e6;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .time-slot {
                background-color: white;
                border: 1px solid #f8f9fa;
                min-height: 60px;
                position: relative;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }
            
            .time-slot.has-appointment {
                background-color: rgba(13, 110, 253, 0.1);
                border: 1px solid rgba(13, 110, 253, 0.3);
                cursor: grab;
            }
            
            .time-slot.has-appointment:hover {
                background-color: rgba(13, 110, 253, 0.1);
            }
            
            .time-slot.has-appointment:active {
                cursor: grabbing;
            }
            
            .time-slot:hover {
                background-color: #e3f2fd;
            }
            
            .time-slot.drag-over {
                background-color: #bbdefb;
                border: 2px dashed #2196f3;
            }
            
            .appointment-block {
                position: absolute;
                top: 2px;
                left: 2px;
                right: 2px;
                bottom: 2px;
                border-radius: 6px;
                padding: 4px 6px;
                color: white !important;
                cursor: move;
                font-size: 0.75rem;
                line-height: 1.2;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                background-color: #0d6efd !important;
                border: 1px solid rgba(255,255,255,0.2);
            }
            
            .appointment-block:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }
            
            .appointment-block.bg-primary { background-color: #0d6efd; }
            .appointment-block.bg-success { background-color: #198754; }
            .appointment-block.bg-warning { background-color: #fd7e14; color: #000; }
            .appointment-block.bg-danger { background-color: #dc3545; }
            .appointment-block.bg-secondary { background-color: #6c757d; }
            
            .appointment-content {
                position: relative;
                z-index: 2;
                pointer-events: auto;
                cursor: pointer;
                padding: 2px;
                color: white !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            }
            
            .appointment-title {
                font-weight: 600;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: white !important;
                font-size: 0.8rem;
                line-height: 1.2;
            }
            
            .appointment-time {
                font-size: 0.65rem;
                opacity: 0.9;
                color: white !important;
            }
            
            .appointment-status {
                font-size: 0.65rem;
                opacity: 0.8;
                color: white !important;
            }
            
            /* Color picker button */
            .appointment-view-btn {
                position: absolute;
                top: 2px;
                right: 20px;
                width: 16px;
                height: 16px;
                background-color: rgba(255,255,255,0.8);
                border-radius: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: #333;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s ease;
                z-index: 3;
                pointer-events: auto;
            }
            
            .appointment-block:hover .appointment-view-btn {
                opacity: 1;
            }

            .appointment-color-picker {
                position: absolute;
                top: 2px;
                right: 2px;
                width: 16px;
                height: 16px;
                background-color: rgba(255,255,255,0.8);
                border-radius: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: #333;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s ease;
                z-index: 3;
                pointer-events: auto;
            }
            
            .appointment-block:hover .appointment-color-picker {
                opacity: 1;
            }
            
            /* Resize handles */
            .resize-handle {
                position: absolute;
                left: 2px;
                right: 2px;
                height: 6px;
                background-color: rgba(0, 123, 255, 0.4);
                cursor: ns-resize;
                opacity: 0;
                transition: all 0.2s ease;
                z-index: 50;
                pointer-events: auto;
                border-radius: 3px;
            }
            
            .resize-top {
                top: -1px;
                border-radius: 6px 6px 3px 3px;
            }
            
            .resize-bottom {
                bottom: -6px;
                border-radius: 6px 6px 3px 3px;
                height: 12px;
                background-color: rgba(0, 123, 255, 0.6);
                z-index: 50;
            }
            
            .appointment-block:hover .resize-handle {
                opacity: 0.8;
            }
            
            .appointment-block:hover .resize-bottom {
                opacity: 1;
            }
            
            .resize-top:hover {
                background-color: rgba(0, 123, 255, 0.8);
                height: 8px;
                opacity: 1 !important;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            }
            
            .resize-bottom:hover {
                background-color: rgba(0, 123, 255, 1);
                height: 16px;
                opacity: 1 !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                border: 2px solid rgba(0, 123, 255, 1);
                bottom: -8px;
                cursor: ns-resize !important;
                transform: scaleY(1.2);
                z-index: 100;
            }
            
            /* Force cursor override for bottom area */
            .resize-bottom {
                cursor: ns-resize !important;
            }
            
            /* Color picker popup */
            .color-picker-popup {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 12px;
                min-width: 200px;
            }
            
            .color-picker-content {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .color-palette {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
            }
            
            .color-option {
                width: 30px;
                height: 30px;
                border-radius: 6px;
                cursor: pointer;
                border: 2px solid #fff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: transform 0.2s ease;
            }
            
            .color-option:hover {
                transform: scale(1.1);
                box-shadow: 0 3px 6px rgba(0,0,0,0.15);
            }
            
            /* Enhanced drag-and-drop effects */
            .appointment-ghost {
                box-shadow: 0 12px 30px rgba(0,0,0,0.3);
                transform: rotate(2deg) scale(1.05);
                border: 2px solid #007bff;
                transition: none;
                cursor: grabbing;
                max-width: 200px;
                width: auto;
            }
            
            .time-slot.drag-highlight {
                background-color: rgba(0, 123, 255, 0.15);
                border: 2px dashed #007bff;
                transform: scale(1.02);
                transition: all 0.2s ease;
            }
            
            .appointment-block.updating {
                opacity: 0.7;
                transform: scale(0.95);
                transition: all 0.3s ease;
            }
            
            .appointment-block.updating::after {
                content: '⟳';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 16px;
                animation: spin 1s linear infinite;
                color: white;
                text-shadow: 0 0 3px rgba(0,0,0,0.5);
            }
            
            @keyframes spin {
                from { transform: translate(-50%, -50%) rotate(0deg); }
                to { transform: translate(-50%, -50%) rotate(360deg); }
            }
            
            /* Enhanced resize preview */
            .resize-preview {
                animation: resizePreview 0.3s ease-in-out;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            
            @keyframes resizePreview {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 0.7; transform: scale(1); }
            }
            
            
            /* Smooth transitions for all appointment interactions */
            .appointment-block {
                transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
            }
            
            .appointment-block:active {
                transform: scale(0.98);
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .calendar-header {
                    grid-template-columns: 60px repeat(auto-fit, minmax(100px, 1fr));
                }
                
                .time-row {
                    grid-template-columns: 60px repeat(auto-fit, minmax(100px, 1fr));
                }
                
                .time-label {
                    font-size: 0.65rem;
                }
                
                .day-header {
                    padding: 8px 4px;
                    font-size: 0.75rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    async filterAppointments() {
        console.log('🔍 Filtering appointments...');
        
        // Get filter values
        const search = document.getElementById('appointment-search')?.value || '';
        const status = document.getElementById('appointment-status-filter')?.value || '';
        const dateFrom = document.getElementById('appointment-date-from')?.value || '';
        const dateTo = document.getElementById('appointment-date-to')?.value || '';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status) params.append('status', status);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        
        try {
            const appointments = await this.apiCall('GET', `/api/appointments?${params}`);
            console.log('✅ Filtered appointments loaded:', appointments);
            
            // Update the table body with filtered results
            const tableBody = document.getElementById('appointments-table-body');
            if (tableBody) {
                tableBody.innerHTML = this.renderAppointmentsTable(appointments.appointments || []);
            }
            
        } catch (error) {
            console.error('Error filtering appointments:', error);
            this.showToast('Fout bij filteren afspraken: ' + error.message, 'error');
        }
    }

    clearAppointmentFilters() {
        document.getElementById('appointment-search').value = '';
        document.getElementById('appointment-status-filter').value = '';
        document.getElementById('appointment-date-from').value = '';
        document.getElementById('appointment-date-to').value = '';
        this.loadAppointments();
    }

    async viewAppointment(id) {
        console.log('👁️ Viewing appointment:', id);
        // TODO: Implement appointment view modal
        alert('Afspraak bekijken functionaliteit wordt nog geïmplementeerd');
    }

    async editAppointment(id) {
        console.log('✏️ Editing appointment:', id);
        // TODO: Implement appointment edit modal
        alert('Afspraak bewerken functionaliteit wordt nog geïmplementeerd');
    }

    async deleteAppointment(id) {
        if (confirm('Weet je zeker dat je deze afspraak wilt verwijderen?')) {
            try {
                await this.apiCall('DELETE', `/api/appointments/${id}`);
                console.log('✅ Appointment deleted');
                await this.loadAppointments(); // Reload the list
            } catch (error) {
                console.error('❌ Error deleting appointment:', error);
                alert('Fout bij verwijderen van afspraak: ' + error.message);
            }
        }
    }

    async showAddAppointmentModalV2() {
        console.log('➕ Opening add appointment modal');
        
        try {
            // Load customers for selection (same approach as invoice modal)
            const customersResponse = await fetch(this.baseURL + '/api/customers', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (!customersResponse.ok) {
                throw new Error('Fout bij laden klanten');
            }
            
            const customersData = await customersResponse.json();
            const customers = customersData;
            
            // Create modal HTML
            const modalHTML = `
                <div class="modal fade" id="addAppointmentModal" tabindex="-1" data-bs-backdrop="static">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-calendar-plus text-success"></i> Nieuwe Afspraak
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="addAppointmentForm">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="appointmentCustomer" class="form-label">Klant *</label>
                                                <select class="form-select" id="appointmentCustomer" required>
                                                    <option value="">Selecteer klant...</option>
                                                    ${customers.customers.map(customer => 
                                                        `<option value="${customer.id}">${customer.first_name} ${customer.last_name} - ${customer.email}</option>`
                                                    ).join('')}
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="appointmentDate" class="form-label">Datum *</label>
                                                <input type="date" class="form-control" id="appointmentDate" required 
                                                       min="${new Date().toISOString().split('T')[0]}">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="appointmentStartTime" class="form-label">Start Tijd *</label>
                                                <input type="time" class="form-control" id="appointmentStartTime" required value="09:00">
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="appointmentEndTime" class="form-label">Eind Tijd *</label>
                                                <input type="time" class="form-control" id="appointmentEndTime" required value="12:00">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="appointmentStatus" class="form-label">Status</label>
                                                <select class="form-select" id="appointmentStatus">
                                                    <option value="scheduled">Gepland</option>
                                                    <option value="in_progress">In Behandeling</option>
                                                    <option value="completed">Voltooid</option>
                                                    <option value="cancelled">Geannuleerd</option>
                                                    <option value="no_show">Niet Verschenen</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="appointmentLocation" class="form-label">Locatie</label>
                                                <input type="text" class="form-control" id="appointmentLocation" 
                                                       placeholder="Bijv. Thuis bij klant, Bedrijfspand, etc.">
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label for="appointmentNotes" class="form-label">Notities</label>
                                        <textarea class="form-control" id="appointmentNotes" rows="3" 
                                                  placeholder="Aanvullende informatie over de afspraak..."></textarea>
                                    </div>
                                    
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle"></i>
                                        <strong>Tip:</strong> Het systeem controleert automatisch op conflicterende afspraken.
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    <i class="bi bi-x"></i> Annuleren
                                </button>
                                <button type="button" class="btn btn-success" id="saveAppointmentBtn">
                                    <i class="bi bi-check"></i> Afspraak Aanmaken
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('addAppointmentModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add modal to body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Setup event listeners
            document.getElementById('saveAppointmentBtn').addEventListener('click', () => {
                this.saveAppointment();
            });
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('addAppointmentModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error showing add appointment modal:', error);
            this.showToast('Fout bij laden formulier: ' + error.message, 'error');
        }
    }

    async saveAppointment() {
        console.log('💾 Saving appointment...');
        
        // Get form elements
        const customer_id = document.getElementById('appointmentCustomer').value;
        const appointment_date = document.getElementById('appointmentDate').value;
        const start_time = document.getElementById('appointmentStartTime').value;
        const end_time = document.getElementById('appointmentEndTime').value;
        const status = document.getElementById('appointmentStatus').value;
        const location = document.getElementById('appointmentLocation').value;
        const notes = document.getElementById('appointmentNotes').value;
        
        // Validate required fields
        if (!customer_id) {
            this.showToast('Selecteer een klant', 'error');
            return;
        }
        
        if (!appointment_date) {
            this.showToast('Voer een datum in', 'error');
            return;
        }
        
        if (!start_time || !end_time) {
            this.showToast('Voer start en eind tijd in', 'error');
            return;
        }
        
        if (start_time >= end_time) {
            this.showToast('Eind tijd moet na start tijd zijn', 'error');
            return;
        }
        
        // Disable save button and show loading
        const saveBtn = document.getElementById('saveAppointmentBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Opslaan...';
        
        try {
            // Create appointment data
            const appointmentData = {
                customer_id,
                appointment_date,
                start_time,
                end_time,
                status,
                location: location || null,
                notes: notes || null
            };
            
            console.log('📝 Appointment data:', appointmentData);
            
            // Submit to API
            const result = await this.apiCall('POST', '/api/appointments', appointmentData);
            console.log('✅ Appointment created:', result);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addAppointmentModal'));
            modal.hide();
            
            // Show success message
            this.showToast('Afspraak succesvol aangemaakt!', 'success');
            
            // Reload appointments
            await this.loadAppointments();
            
        } catch (error) {
            console.error('❌ Error creating appointment:', error);
            if (error.message.includes('Er bestaat al een afspraak')) {
                this.showToast('Er bestaat al een afspraak op dit tijdstip', 'error');
            } else {
                this.showToast('Fout bij aanmaken afspraak: ' + error.message, 'error');
            }
        } finally {
            // Re-enable save button
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    renderPagination(pagination) {
        if (!pagination || pagination.total_pages <= 1) {
            return '';
        }

        let paginationHTML = '<div class="d-flex justify-content-between align-items-center mt-3">';
        paginationHTML += `<span>Pagina ${pagination.current_page} van ${pagination.total_pages} (${pagination.total_count} totaal)</span>`;
        paginationHTML += '<nav><ul class="pagination mb-0">';

        // Previous button
        paginationHTML += `
            <li class="page-item ${!pagination.has_prev ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminApp.changeAppointmentPage(${pagination.current_page - 1}); return false;" 
                   ${!pagination.has_prev ? 'tabindex="-1"' : ''}>Vorige</a>
            </li>
        `;

        // Page numbers
        const startPage = Math.max(1, pagination.current_page - 2);
        const endPage = Math.min(pagination.total_pages, pagination.current_page + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="adminApp.changeAppointmentPage(${i}); return false;">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${!pagination.has_next ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="adminApp.changeAppointmentPage(${pagination.current_page + 1}); return false;"
                   ${!pagination.has_next ? 'tabindex="-1"' : ''}>Volgende</a>
            </li>
        `;

        paginationHTML += '</ul></nav></div>';
        return paginationHTML;
    }

    changeAppointmentPage(page) {
        console.log('📄 Changing to appointments page:', page);
        // TODO: Implement appointment pagination
        // For now, just reload appointments
        this.loadAppointments();
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
                <td class="text-currency">${this.formatPrice(parseFloat(invoice.total_amount) || 0)}</td>
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
                                                                                <span class="text-success">${this.formatPrice(parseFloat(service.base_price))}</span>
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
                                            ${(this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '') ? `
                                            <div class="d-flex justify-content-between">
                                                <span>Subtotaal:</span>
                                                <span id="quoteSubtotal">${this.formatCurrency(0)}</span>
                                            </div>
                                            <div class="d-flex justify-content-between">
                                                <span>BTW (${this.systemSettings.vat_percentage}%):</span>
                                                <span id="quoteVAT">${this.formatCurrency(0)}</span>
                                            </div>
                                            <hr class="my-2">
                                            ` : ''}
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="fw-bold">Totaal:</span>
                                                <span class="fw-bold fs-5 text-success" id="quoteTotal">${this.formatPrice(0)}</span>
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
        
        const vatActive = this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '';
        if (vatActive && subtotal > 0) {
            vatAmount = subtotal * (this.systemSettings.vat_percentage / 100);
            totalPrice = subtotal + vatAmount;
        }

        if (selectedServices.length === 0) {
            summaryEl.innerHTML = '<p class="text-muted">Selecteer services om een samenvatting te zien...</p>';
            totalEl.textContent = this.formatCurrency(0);
            
            // Reset VAT elements if they exist
            const subtotalEl = document.getElementById('quoteSubtotal');
            const vatEl = document.getElementById('quoteVAT');
            if (subtotalEl) subtotalEl.textContent = this.formatCurrency(0);
            if (vatEl) vatEl.textContent = this.formatCurrency(0);
        } else {
            summaryEl.innerHTML = `
                <div class="row">
                    ${selectedServices.map(service => `
                        <div class="col-md-6">
                            <div class="d-flex justify-content-between">
                                <span>${service.name}</span>
                                <span class="text-success">${this.formatPrice(service.price, { showVATStatus: false })}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            // Update all price elements
            totalEl.textContent = this.formatPrice(totalPrice, { showVATStatus: false });
            
            const subtotalEl = document.getElementById('quoteSubtotal');
            const vatEl = document.getElementById('quoteVAT');
            if (subtotalEl) subtotalEl.textContent = this.formatCurrency(subtotal);
            if (vatEl) vatEl.textContent = this.formatCurrency(vatAmount);
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
            const leadIdElement = document.getElementById('leadId');
            const leadId = leadIdElement ? leadIdElement.value : null;
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

            alert(`✅ Offerte ${quote.quote_number} succesvol aangemaakt voor ${this.formatPrice(totalAmount)}!`);

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

    async generateStandaloneQuote() {
        try {
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
                'other': '📋 Overige Diensten'
            };

            // Create categories display in order
            const categoryOrder = ['signature', 'cleaning', 'correction', 'protection', 'restoration', 'addon', 'other'];
            let servicesHtml = '';

            categoryOrder.forEach(category => {
                if (servicesByCategory[category] && servicesByCategory[category].length > 0) {
                    servicesHtml += `
                        <div class="col-md-6 mb-4">
                            <div class="card h-100">
                                <div class="card-header bg-light">
                                    <h6 class="mb-0">${categoryLabels[category]}</h6>
                                </div>
                                <div class="card-body">
                                    ${servicesByCategory[category].map(service => `
                                        <div class="form-check mb-2">
                                            <input class="form-check-input service-checkbox" type="checkbox" value="${service.id}" 
                                                   data-name="${service.name}" data-price="${service.base_price}" data-duration="${service.duration_minutes || 0}">
                                            <label class="form-check-label w-100" for="service_${service.id}">
                                                <div class="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <strong>${service.name}</strong>
                                                        ${service.description ? `<br><small class="text-muted">${service.description}</small>` : ''}
                                                    </div>
                                                    <span class="badge bg-primary">${this.formatPrice(service.base_price, {showVATStatus: false})}</span>
                                                </div>
                                            </label>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            const modalHtml = `
                <div class="modal fade" id="generateQuoteModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-file-earmark-text text-warning"></i> 
                                    Nieuwe Offerte Maken
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="generateQuoteForm">
                                    
                                    <!-- Customer Info (empty for new entry) -->
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <h6><i class="bi bi-person-circle"></i> Klant Gegevens</h6>
                                            <div class="mb-2">
                                                <label class="form-label">Voornaam</label>
                                                <input type="text" class="form-control" id="quoteFirstName" required>
                                            </div>
                                            <div class="mb-2">
                                                <label class="form-label">Achternaam</label>
                                                <input type="text" class="form-control" id="quoteLastName" required>
                                            </div>
                                            <div class="mb-2">
                                                <label class="form-label">Email</label>
                                                <input type="email" class="form-control" id="quoteEmail" required>
                                            </div>
                                            <div class="mb-2">
                                                <label class="form-label">Telefoon</label>
                                                <input type="tel" class="form-control" id="quotePhone">
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <h6><i class="bi bi-geo-alt"></i> Adres Gegevens</h6>
                                            <div class="mb-2">
                                                <label class="form-label">Adres</label>
                                                <input type="text" class="form-control" id="quoteAddress">
                                            </div>
                                            <div class="row">
                                                <div class="col-md-4">
                                                    <label class="form-label">Postcode</label>
                                                    <input type="text" class="form-control" id="quotePostalCode">
                                                </div>
                                                <div class="col-md-8">
                                                    <label class="form-label">Plaats</label>
                                                    <input type="text" class="form-control" id="quoteCity">
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Vehicle Info -->
                                    <div class="row mb-4">
                                        <div class="col-12">
                                            <h6><i class="bi bi-car-front"></i> Voertuig Informatie</h6>
                                            <div class="row">
                                                <div class="col-md-3">
                                                    <label class="form-label">Merk</label>
                                                    <input type="text" class="form-control" id="quoteMake" required>
                                                </div>
                                                <div class="col-md-3">
                                                    <label class="form-label">Model</label>
                                                    <input type="text" class="form-control" id="quoteModel" required>
                                                </div>
                                                <div class="col-md-2">
                                                    <label class="form-label">Jaar</label>
                                                    <input type="number" class="form-control" id="quoteYear" min="1990" max="2030">
                                                </div>
                                                <div class="col-md-2">
                                                    <label class="form-label">Kleur</label>
                                                    <input type="text" class="form-control" id="quoteColor">
                                                </div>
                                                <div class="col-md-2">
                                                    <label class="form-label">Kenteken</label>
                                                    <input type="text" class="form-control" id="quoteLicensePlate">
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Services Selection -->
                                    <div class="mb-4">
                                        <h6><i class="bi bi-list-check"></i> Diensten Selectie</h6>
                                        <div class="row">
                                            ${servicesHtml}
                                        </div>
                                    </div>

                                    <!-- Additional Info -->
                                    <div class="row mb-4">
                                        <div class="col-md-6">
                                            <label class="form-label">Geldig tot</label>
                                            <input type="date" class="form-control" id="quoteValidUntil" 
                                                   value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label">Notities</label>
                                            <textarea class="form-control" id="quoteNotes" rows="2" placeholder="Extra informatie of opmerkingen..."></textarea>
                                        </div>
                                    </div>

                                    <!-- Quote Summary -->
                                    <div class="border rounded p-3 bg-light">
                                        <h6><i class="bi bi-calculator"></i> Offerte Samenvatting</h6>
                                        <div id="quoteSummary">
                                            <p class="text-muted">Selecteer diensten om de totale prijs te zien</p>
                                        </div>
                                        <hr>
                                        ${this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '' ? `
                                            <div class="d-flex justify-content-between">
                                                <span>BTW (${this.systemSettings.vat_percentage || 21}%):</span>
                                                <span id="quoteVAT">${this.formatPrice(0)}</span>
                                            </div>
                                            <hr>
                                        ` : ''}
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="fw-bold">Totaal:</span>
                                            <span class="fw-bold fs-5 text-success" id="quoteTotal">${this.formatPrice(0)}</span>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-success" id="createQuoteBtn" onclick="adminApp.createStandaloneQuote()">
                                    <i class="bi bi-check-circle"></i> Offerte Aanmaken
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

        } catch (error) {
            console.error('Error generating standalone quote:', error);
            this.showToast('Fout bij laden van offerte generator', 'error');
        }
    }

    async createStandaloneQuote() {
        const createBtn = document.getElementById('createQuoteBtn');
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Offerte wordt aangemaakt...';
        }

        try {
            // Get form data
            const formData = {
                customer: {
                    first_name: document.getElementById('quoteFirstName').value,
                    last_name: document.getElementById('quoteLastName').value,
                    email: document.getElementById('quoteEmail').value,
                    phone: document.getElementById('quotePhone').value || null,
                    address: document.getElementById('quoteAddress').value || null,
                    postal_code: document.getElementById('quotePostalCode').value || null,
                    city: document.getElementById('quoteCity').value || null
                },
                vehicle: {
                    make: document.getElementById('quoteMake').value,
                    model: document.getElementById('quoteModel').value,
                    year: document.getElementById('quoteYear').value || null,
                    color: document.getElementById('quoteColor').value || null,
                    license_plate: document.getElementById('quoteLicensePlate').value || null
                },
                services: [],
                valid_until: document.getElementById('quoteValidUntil').value || null,
                notes: document.getElementById('quoteNotes').value || null
            };

            // Get selected services
            document.querySelectorAll('.service-checkbox:checked').forEach(checkbox => {
                formData.services.push({
                    service_id: checkbox.value,
                    quantity: 1,
                    unit_price: parseFloat(checkbox.dataset.price)
                });
            });

            if (formData.services.length === 0) {
                alert('Selecteer minimaal één dienst voor de offerte.');
                return;
            }

            console.log('Creating quote with data:', formData);

            // First create a lead from the customer data
            console.log('Creating lead...');
            const leadData = {
                first_name: formData.customer.first_name,
                last_name: formData.customer.last_name,
                email: formData.customer.email,
                phone: formData.customer.phone,
                service_type: 'Handmatige offerte',
                vehicle_info: `${formData.vehicle.make || ''} ${formData.vehicle.model || ''} ${formData.vehicle.year || ''}`.trim(),
                message: `Handmatig aangemaakte lead voor offerte. ${formData.notes || ''}`.trim()
            };

            const lead = await this.apiCall('POST', '/api/website-leads', leadData);
            console.log('Lead created:', lead);

            // Convert lead to customer for quote creation
            console.log('Converting lead to customer...');
            const customer = await this.apiCall('POST', `/api/leads/${lead.id}/convert-to-customer`);
            console.log('Customer created from lead:', customer);

            // Create the quote with customer_id
            const quoteData = {
                customer_id: customer.id,
                services: formData.services,
                valid_until: formData.valid_until,
                notes: formData.notes
            };

            const quote = await this.apiCall('POST', '/api/quotes', quoteData);
            console.log('Quote created:', quote);

            this.showToast('✅ Offerte succesvol aangemaakt!', 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('generateQuoteModal'));
            if (modal) modal.hide();

            // Reload quotes to show the new quote
            await this.loadQuotes();

        } catch (error) {
            console.error('Error creating standalone quote:', error);
            alert(`❌ Fout bij aanmaken offerte: ${error.message}`);
        } finally {
            // Reset button state
            if (createBtn) {
                createBtn.disabled = false;
                createBtn.innerHTML = '<i class="bi bi-check-circle"></i> Offerte Aanmaken';
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
            // Fetch expenses from API
            const response = await this.apiCall('GET', '/api/expenses?limit=50');
            const expenses = response.expenses || [];
            
            // Fetch summary data
            const summaryResponse = await this.apiCall('GET', '/api/expenses/meta/summary');
            const summary = summaryResponse.summary || {};
            
            // Build expenses interface
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-receipt text-danger"></i> Inkoop Beheer</h1>
                    <div class="btn-group">
                        <button class="btn btn-outline-success" id="export-expenses-btn">
                            <i class="bi bi-download"></i> Export CSV
                        </button>
                        <button class="btn btn-primary" id="add-expense-btn">
                            <i class="bi bi-plus-lg"></i> Nieuwe Uitgave
                        </button>
                    </div>
                </div>
                
                <!-- Summary Cards -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-danger text-white">
                            <div class="card-body">
                                <h5 class="card-title">Deze Maand</h5>
                                <h2>${this.formatPrice(summary.total_amount ? parseFloat(summary.total_amount) : 0)}</h2>
                                <small>Totale uitgaven</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-dark">
                            <div class="card-body">
                                <h5 class="card-title">Open</h5>
                                <h2>${summary.pending_count || 0}</h2>
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
                                    ${expenses.length > 0 ? expenses.map(expense => `
                                        <tr>
                                            <td><strong>${expense.receipt_number || 'N/A'}</strong></td>
                                            <td>${expense.supplier_name || 'Geen leverancier'}</td>
                                            <td>${expense.description}</td>
                                            <td><span class="badge bg-secondary">${this.getCategoryText(expense.category)}</span></td>
                                            <td class="text-currency">${this.formatPrice(parseFloat(expense.amount))}</td>
                                            <td>${this.formatDate(expense.expense_date)}</td>
                                            <td>
                                                <span class="badge bg-${expense.status === 'approved' ? 'success' : expense.status === 'pending' ? 'warning' : 'danger'}">
                                                    ${this.getExpenseStatusText(expense.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div class="btn-group btn-group-sm">
                                                    <button class="btn btn-outline-primary" onclick="if(window.adminApp) window.adminApp.viewExpense('${expense.id}');" title="Bekijken">
                                                        <i class="bi bi-eye"></i>
                                                    </button>
                                                    <button class="btn btn-outline-success" onclick="if(window.adminApp) window.adminApp.editExpense('${expense.id}');" title="Bewerken">
                                                        <i class="bi bi-pencil"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="8" class="text-center text-muted py-4">
                                                <i class="bi bi-receipt fs-1 mb-2 d-block"></i>
                                                Geen uitgaven gevonden
                                            </td>
                                        </tr>
                                    `}
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
            'approved': 'Goedgekeurd',
            'rejected': 'Afgekeurd'
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

        const exportBtn = document.getElementById('export-expenses-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportExpenses());
        }
        
        console.log('✅ Expenses event listeners setup');
    }
    
    async showAddExpenseModal() {
        try {
            // Load suppliers for the dropdown
            const suppliersResult = await this.apiCall('GET', '/api/suppliers');
            const suppliers = suppliersResult.suppliers || [];

            const modalHtml = `
                <div class="modal fade" id="addExpenseModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-receipt text-danger"></i> Nieuwe Inkoopfactuur
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="addExpenseForm">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Leverancier</label>
                                                <select class="form-select" name="supplier_id">
                                                    <option value="">Selecteer leverancier</option>
                                                    ${suppliers.map(supplier => 
                                                        `<option value="${supplier.id}">${supplier.name}</option>`
                                                    ).join('')}
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Factuurnummer</label>
                                                <input type="text" class="form-control" name="invoice_number" required>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Factuurdatum</label>
                                                <input type="date" class="form-control" name="expense_date" 
                                                       value="${new Date().toISOString().split('T')[0]}" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Vervaldatum</label>
                                                <input type="date" class="form-control" name="due_date">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Beschrijving</label>
                                        <input type="text" class="form-control" name="description" required>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Bedrag excl. BTW (€)</label>
                                                <input type="number" class="form-control" name="amount_excl_vat" 
                                                       step="0.01" min="0" required onchange="adminApp.calculateExpenseTotals()">
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">BTW % <small class="text-muted">(altijd mogelijk)</small></label>
                                                <input type="number" class="form-control" name="vat_percentage" 
                                                       value="21" step="0.01" min="0" max="100" onchange="adminApp.calculateExpenseTotals()">
                                            </div>
                                        </div>
                                        <div class="col-md-4">
                                            <div class="mb-3">
                                                <label class="form-label">Totaal incl. BTW (€)</label>
                                                <input type="number" class="form-control" name="total_amount" 
                                                       step="0.01" min="0" readonly>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Categorie</label>
                                                <select class="form-select" name="category" required>
                                                    <option value="">Selecteer categorie</option>
                                                    <option value="materials">Materialen</option>
                                                    <option value="equipment">Apparatuur</option>
                                                    <option value="fuel">Brandstof</option>
                                                    <option value="office">Kantoorbenodigdheden</option>
                                                    <option value="professional_services">Professionele diensten</option>
                                                    <option value="utilities">Nutsvoorzieningen</option>
                                                    <option value="insurance">Verzekeringen</option>
                                                    <option value="other">Overig</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Status</label>
                                                <select class="form-select" name="status">
                                                    <option value="pending">Openstaand</option>
                                                    <option value="paid">Betaald</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Notities</label>
                                        <textarea class="form-control" name="notes" rows="3"></textarea>
                                    </div>

                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle"></i>
                                        <strong>BTW bij inkoopfacturen:</strong> BTW invoer is altijd mogelijk bij inkoopfacturen, 
                                        ongeacht of je bedrijf een BTW-nummer heeft. Dit is nodig voor de BTW-aangifte.
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                                <button type="button" class="btn btn-primary" onclick="adminApp.saveNewExpense()">
                                    <i class="bi bi-check"></i> Inkoopfactuur Toevoegen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('addExpenseModal'));
            
            document.getElementById('addExpenseModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
            
            modal.show();
            
            // Calculate initial totals
            this.calculateExpenseTotals();
            
        } catch (error) {
            console.error('Error showing add expense modal:', error);
            this.showToast('Fout bij openen nieuwe inkoopfactuur', 'error');
        }
    }

    calculateExpenseTotals() {
        const amountExclVat = parseFloat(document.querySelector('[name="amount_excl_vat"]')?.value || 0);
        const vatPercentage = parseFloat(document.querySelector('[name="vat_percentage"]')?.value || 0);
        
        const vatAmount = amountExclVat * (vatPercentage / 100);
        const totalAmount = amountExclVat + vatAmount;
        
        const totalField = document.querySelector('[name="total_amount"]');
        if (totalField) {
            totalField.value = totalAmount.toFixed(2);
        }
    }

    async saveNewExpense() {
        try {
            const form = document.getElementById('addExpenseForm');
            const formData = new FormData(form);
            
            const expenseData = {
                supplier_id: formData.get('supplier_id') || null,
                invoice_number: formData.get('invoice_number'),
                expense_date: formData.get('expense_date'),
                due_date: formData.get('due_date') || null,
                description: formData.get('description'),
                amount: parseFloat(formData.get('total_amount')), // Total amount including VAT
                amount_excl_vat: parseFloat(formData.get('amount_excl_vat')),
                vat_percentage: parseFloat(formData.get('vat_percentage') || 0),
                vat_amount: parseFloat(formData.get('amount_excl_vat')) * (parseFloat(formData.get('vat_percentage') || 0) / 100),
                category: formData.get('category'),
                status: formData.get('status') || 'pending',
                notes: formData.get('notes') || ''
            };

            const result = await this.apiCall('POST', '/api/expenses', expenseData);
            this.showToast('✅ Inkoopfactuur succesvol toegevoegd!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
            modal.hide();
            
            await this.loadExpenses();
            
        } catch (error) {
            console.error('Error saving expense:', error);
            this.showToast('❌ Fout bij opslaan inkoopfactuur: ' + error.message, 'error');
        }
    }
    
    viewExpense(id) {
        this.showToast(`Uitgave #${id} bekijken komt binnenkort!`, 'info');
    }
    
    editExpense(id) {
        this.showToast(`Uitgave #${id} bewerken komt binnenkort!`, 'info');
    }

    async exportExpenses() {
        try {
            console.log('📤 Exporting expenses to CSV...');
            
            // Get current date for filename
            const today = new Date().toISOString().split('T')[0];
            
            // Use the existing reports export endpoint
            const response = await fetch('/admin/api/reports/export/expenses?format=csv', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `expenses_${today}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showToast('Uitgaven succesvol geëxporteerd naar CSV', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Fout bij exporteren: ' + error.message, 'error');
        }
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
            // Fetch suppliers from API
            const response = await this.apiCall('GET', '/api/suppliers?limit=50');
            const suppliers = response.suppliers || [];
            
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
                    ${suppliers.length > 0 ? suppliers.map(supplier => `
                        <div class="col-md-6 mb-4">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="card-title mb-0">${supplier.name}</h5>
                                    <span class="badge bg-${supplier.active ? 'success' : 'secondary'}">${supplier.active ? 'Actief' : 'Inactief'}</span>
                                </div>
                                <div class="card-body">
                                    <p class="card-text">
                                        <strong>Contact:</strong> ${supplier.contact_person || 'N/A'}<br>
                                        <strong>Email:</strong> ${supplier.email || 'N/A'}<br>
                                        <strong>Telefoon:</strong> ${supplier.phone || 'N/A'}<br>
                                        <strong>Stad:</strong> ${supplier.city || 'N/A'}
                                    </p>
                                    <p class="text-muted">
                                        <small>Uitgaven: <strong>${this.formatPrice(parseFloat(supplier.total_spent || 0))}</strong></small>
                                    </p>
                                    <div class="btn-group">
                                        <button class="btn btn-outline-primary btn-sm" onclick="if(window.adminApp) window.adminApp.viewSupplier('${supplier.id}');">
                                            <i class="bi bi-eye"></i> Bekijken
                                        </button>
                                        <button class="btn btn-outline-success btn-sm" onclick="if(window.adminApp) window.adminApp.editSupplier('${supplier.id}');">
                                            <i class="bi bi-pencil"></i> Bewerken
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="col-12">
                            <div class="text-center text-muted py-5">
                                <i class="bi bi-truck fs-1 mb-2 d-block"></i>
                                Geen leveranciers gevonden
                                <br>
                                <small>Voeg je eerste leverancier toe om te beginnen</small>
                            </div>
                        </div>
                    `}
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
        
        // Show loading state first
        section.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1><i class="bi bi-bar-chart text-warning"></i> Financiële Rapportages</h1>
            </div>
            <div class="text-center py-5">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Laden...</span>
                </div>
                <p class="text-muted mt-2">Rapporten worden geladen...</p>
            </div>
        `;
        
        try {
            // Fetch financial overview from API
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            
            const response = await this.apiCall('GET', `/api/reports/financial-overview?year=${year}&month=${month}`);
            const overview = response.summary || {};
            
            section.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h1><i class="bi bi-bar-chart text-warning"></i> Financiële Rapportages</h1>
                    <div class="btn-group">
                        <button class="btn btn-outline-secondary" id="refresh-reports">
                            <i class="bi bi-arrow-clockwise"></i> Verversen
                        </button>
                        <button class="btn btn-primary" id="export-reports">
                            <i class="bi bi-download"></i> Exporteren
                        </button>
                    </div>
                </div>
                
                <!-- Report Cards -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-success text-white">
                            <div class="card-body">
                                <h5>Inkomsten</h5>
                                <h2>${this.formatPrice(parseFloat(overview.total_revenue || 0))}</h2>
                                <small>Deze maand</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-danger text-white">
                            <div class="card-body">
                                <h5>Uitgaven</h5>
                                <h2>${this.formatPrice(parseFloat(overview.total_expenses || 0))}</h2>
                                <small>Deze maand</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h5>Netto Winst</h5>
                                <h2>${this.formatPrice(parseFloat(overview.profit || 0))}</h2>
                                <small>Marge: ${parseFloat(overview.profit_margin || 0).toFixed(1)}%</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-dark">
                            <div class="card-body">
                                <h5>BTW Saldo</h5>
                                <h2>${this.formatPrice(parseFloat(overview.vat_balance || 0))}</h2>
                                <small>Te betalen/ontvangen</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Report Options -->
                <div class="row">
                    <div class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="bi bi-graph-up"></i> Inkomsten vs Uitgaven</h5>
                            </div>
                            <div class="card-body">
                                <p class="text-muted">Overzicht van maandelijkse inkomsten en uitgaven voor ${year}</p>
                                <button class="btn btn-outline-primary" onclick="if(window.adminApp) window.adminApp.generateFinancialReport('${year}');">
                                    <i class="bi bi-file-pdf"></i> Genereer Rapport
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="bi bi-receipt"></i> BTW Rapportage</h5>
                            </div>
                            <div class="card-body">
                                <p class="text-muted">Kwartaal overzicht voor BTW aangifte Q${Math.ceil(month/3)} ${year}</p>
                                <button class="btn btn-outline-success" onclick="if(window.adminApp) window.adminApp.generateVATReport('${year}', '${Math.ceil(month/3)}');">
                                    <i class="bi bi-file-excel"></i> Export BTW
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="bi bi-pie-chart"></i> Uitgaven per Categorie</h5>
                            </div>
                            <div class="card-body">
                                <p class="text-muted">Gedetailleerd overzicht van uitgaven per categorie</p>
                                <button class="btn btn-outline-info" onclick="if(window.adminApp) window.adminApp.showExpensesByCategory('${year}', '${month}');">
                                    <i class="bi bi-eye"></i> Bekijk Details
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-4">
                        <div class="card">
                            <div class="card-header">
                                <h5><i class="bi bi-person-check"></i> Klant Omzet</h5>
                            </div>
                            <div class="card-body">
                                <p class="text-muted">Top klanten op basis van gegenereerde omzet</p>
                                <button class="btn btn-outline-warning" onclick="if(window.adminApp) window.adminApp.showCustomerRevenue('${year}');">
                                    <i class="bi bi-list-ol"></i> Top Klanten
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.setupReportsEventListeners();
            
        } catch (error) {
            console.error('Error loading reports:', error);
            section.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    Fout bij het laden van rapporten: ${error.message}
                </div>
            `;
        }
    }

    // System Settings
    async loadSettings() {
        console.log('🔧 Loading settings...');
        try {
            // Load current settings
            console.log('📡 Loading system settings...');
            const settings = await this.loadSystemSettings();
            console.log('✅ Settings loaded:', settings);
            
            const section = document.getElementById('settings-section');
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
                                    <label for="vat-percentage" class="form-label">BTW Percentage</label>
                                    <div class="input-group">
                                        <input type="number" class="form-control" id="vat-percentage" 
                                               value="${settings.vat_percentage || 21}" min="0" max="100" step="0.01">
                                        <span class="input-group-text">%</span>
                                    </div>
                                    <div class="form-text">
                                        Standaard BTW percentage voor nieuwe offertes (meestal 21% in Nederland)
                                    </div>
                                </div>
                                
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i>
                                    <strong>BTW Status:</strong> BTW wordt automatisch geactiveerd zodra je een BTW-nummer invult bij de bedrijfsgegevens. 
                                    Zonder BTW-nummer worden documenten als "kwitantie" weergegeven.
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
            const section = document.getElementById('settings-section');
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
        
        const vatPercentage = parseFloat(document.getElementById('vat-percentage').value) || 21;
        
        const settings = {
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
            
            // Log validation details specifically
            if (error.details && Array.isArray(error.details)) {
                console.error('Validation details:', error.details);
                error.details.forEach((detail, index) => {
                    console.error(`  ${index + 1}. Field: ${detail.field}, Message: ${detail.message}, Value: ${detail.value}`);
                });
            }
            
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

    // Escape HTML to prevent XSS attacks
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return String(text).replace(/[&<>"']/g, (m) => map[m]);
    }

    // Format price based on VAT settings
    formatPrice(basePrice, options = {}) {
        const { showVATStatus = false, forceExclusive = false } = options;
        
        // BTW is alleen actief als er een BTW-nummer is ingevuld
        const vatActive = this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '';
        
        if (!vatActive || forceExclusive) {
            return this.formatCurrency(basePrice);
        }
        
        const vatMultiplier = 1 + (this.systemSettings.vat_percentage / 100);
        const priceIncVat = basePrice * vatMultiplier;
        const formatted = this.formatCurrency(priceIncVat);
        
        return showVATStatus ? `${formatted} incl. BTW` : formatted;
    }

    // Get price amount (with or without VAT)
    getPriceAmount(basePrice, includeVat = null) {
        // BTW is alleen actief als er een BTW-nummer is ingevuld
        const vatActive = this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '';
        
        if (includeVat === null) {
            includeVat = vatActive;
        }
        
        if (!includeVat || !vatActive) {
            return basePrice;
        }
        
        const vatMultiplier = 1 + (this.systemSettings.vat_percentage / 100);
        return basePrice * vatMultiplier;
    }

    // Get VAT status text
    getVATStatusText() {
        const vatActive = this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '';
        return vatActive ? 'incl. BTW' : '';
    }

    // Get invoice terminology based on VAT status
    getInvoiceTerminology(type = 'invoice') {
        const hasVat = this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '';
        
        const terms = {
            invoice: hasVat ? 'factuur' : 'kwitantie',
            Invoice: hasVat ? 'Factuur' : 'Kwitantie', 
            toInvoice: hasVat ? 'Naar Factuur' : 'Naar Kwitantie',
            invoiceNumber: hasVat ? 'factuurnummer' : 'kwitantienummer',
            InvoiceNumber: hasVat ? 'Factuurnummer' : 'Kwitantienummer',
            invoices: hasVat ? 'facturen' : 'kwitanties',
            Invoices: hasVat ? 'Facturen' : 'Kwitanties',
            createInvoice: hasVat ? 'Factuur Aanmaken' : 'Kwitantie Aanmaken',
            invoiceCreated: hasVat ? 'Factuur aangemaakt' : 'Kwitantie aangemaakt'
        };
        
        return terms[type] || terms.invoice;
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

    formatTime(timeString) {
        if (!timeString) return '';
        // Handle both HH:MM and HH:MM:SS formats
        const parts = timeString.split(':');
        return `${parts[0]}:${parts[1]}`;
    }

    // Load Services section
    async loadServices() {
        console.log('🔧 Loading services...');
        try {
            const services = await this.apiCall('GET', '/api/services?active_only=false');
            console.log('📋 Loaded services:', services.services?.length || 0);
            
            const section = document.getElementById('services-section');
            section.innerHTML = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <h2><i class="bi bi-list-check text-primary"></i> Prijslijst & Services</h2>
                            <p class="text-muted">Beheer je diensten en prijzen voor de offerte generator</p>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-primary" onclick="adminApp.showAddServiceModal()">
                                <i class="bi bi-plus-circle"></i> Service Toevoegen
                            </button>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <div class="row align-items-center">
                                        <div class="col-md-6">
                                            <h5 class="card-title mb-0">Services Overzicht</h5>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="row g-2">
                                                <div class="col-auto">
                                                    <select class="form-select form-select-sm" id="categoryFilter" onchange="adminApp.filterServices()">
                                                        <option value="">Alle categorieën</option>
                                                        <option value="signature">🌟 Signature Detailing</option>
                                                        <option value="cleaning">🧽 Reiniging & Onderhoud</option>
                                                        <option value="correction">✨ Paint Correction</option>
                                                        <option value="protection">🛡️ Bescherming</option>
                                                        <option value="restoration">🔧 Restauratie</option>
                                                        <option value="addon">➕ Extra Services</option>
                                                    </select>
                                                </div>
                                                <div class="col-auto">
                                                    <input type="text" class="form-control form-control-sm" id="searchServices" 
                                                           placeholder="Zoek service..." onkeyup="adminApp.filterServices()">
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover mb-0">
                                            <thead class="table-dark">
                                                <tr>
                                                    <th>Service</th>
                                                    <th>Categorie</th>
                                                    <th>Prijs</th>
                                                    <th>Duur</th>
                                                    <th>Status</th>
                                                    <th class="text-center">Acties</th>
                                                </tr>
                                            </thead>
                                            <tbody id="services-table-body">
                                                ${this.renderServicesTable(services.services || [])}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error loading services:', error);
            this.showToast('Fout bij laden services', 'error');
        }
    }

    // Render services table
    renderServicesTable(services) {
        if (!services || services.length === 0) {
            return `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="bi bi-list-check"></i><br>
                        Geen services gevonden
                    </td>
                </tr>
            `;
        }

        return services.map(service => {
            const priceDisplay = this.formatServicePrice(service);
            const durationDisplay = service.duration_minutes ? 
                `${Math.floor(service.duration_minutes / 60)}u ${service.duration_minutes % 60}m` : 
                (service.duration_text || '-');
            
            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            ${service.icon ? `<span class="me-2">${service.icon}</span>` : ''}
                            <div>
                                <strong>${service.name}</strong>
                                ${service.subtitle ? `<br><small class="text-muted">${service.subtitle}</small>` : ''}
                                ${service.package_type ? `<br><span class="badge bg-info">${service.package_type}</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${service.category || '-'}</span>
                    </td>
                    <td>${priceDisplay}</td>
                    <td>${durationDisplay}</td>
                    <td>
                        <span class="badge ${service.active ? 'bg-success' : 'bg-warning'}">
                            ${service.active ? 'Actief' : 'Inactief'}
                        </span>
                    </td>
                    <td class="text-center">
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-info" onclick="adminApp.showWebsitePreview('${service.id}')" title="Website Preview">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="adminApp.showWebsiteEditModal('${service.id}')" title="Website Bewerken">
                                <i class="bi bi-globe"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="adminApp.showEditServiceModal('${service.id}')" title="Service Bewerken">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="adminApp.confirmDeleteService('${service.id}', '${service.name.replace(/'/g, "\\'")}')" title="Verwijderen">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Format service price for display
    formatServicePrice(service) {
        if (service.price_range_min && service.price_range_max) {
            if (service.price_range_min === service.price_range_max) {
                return `€${parseFloat(service.price_range_min).toFixed(2)}`;
            } else {
                return `€${parseFloat(service.price_range_min).toFixed(2)} - €${parseFloat(service.price_range_max).toFixed(2)}`;
            }
        } else if (service.base_price) {
            return `€${parseFloat(service.base_price).toFixed(2)}`;
        } else {
            return 'Op aanvraag';
        }
    }

    // Load Companies section
    async loadCompanies() {
        console.log('🏢 Loading companies...');
        try {
            const companies = await this.apiCall('GET', '/api/companies?page=1&limit=50');
            console.log('📋 Loaded companies:', companies.companies?.length || 0);
            
            const section = document.getElementById('companies-section');
            section.innerHTML = `
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <h2><i class="bi bi-building text-primary"></i> Bedrijvenbeheer</h2>
                            <p class="text-muted">Beheer zakelijke klanten en hun contactgegevens</p>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-primary" onclick="adminApp.showAddCompanyModal()">
                                <i class="bi bi-plus-circle"></i> Bedrijf Toevoegen
                            </button>
                        </div>
                    </div>

                    <div class="row mb-3">
                        <div class="col-md-6">
                            <div class="input-group">
                                <span class="input-group-text"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control" id="searchCompanies" placeholder="Zoek bedrijven...">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="row g-2">
                                <div class="col-auto">
                                    <select class="form-select" id="sortCompanies">
                                        <option value="company_name">Naam</option>
                                        <option value="city">Stad</option>
                                        <option value="created_at">Datum toegevoegd</option>
                                    </select>
                                </div>
                                <div class="col-auto">
                                    <button class="btn btn-outline-secondary" id="refreshCompanies" onclick="adminApp.loadCompanies()">
                                        <i class="bi bi-arrow-clockwise"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="card-title mb-0">
                                        Bedrijven Overzicht 
                                        <span class="badge bg-primary">${companies.companies?.length || 0}</span>
                                    </h5>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover mb-0">
                                            <thead class="table-dark">
                                                <tr>
                                                    <th>Bedrijfsnaam</th>
                                                    <th>BTW-nummer</th>
                                                    <th>Email</th>
                                                    <th>Telefoon</th>
                                                    <th>Stad</th>
                                                    <th>Contacten</th>
                                                    <th>Voertuigen</th>
                                                    <th class="text-center">Acties</th>
                                                </tr>
                                            </thead>
                                            <tbody id="companies-table-body">
                                                ${this.renderCompaniesTable(companies.companies || [])}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                ${companies.pagination ? `
                                    <div class="card-footer">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="text-muted">
                                                Totaal: ${companies.pagination.total_count} bedrijven
                                            </span>
                                            <div class="btn-group" role="group">
                                                ${companies.pagination.has_prev ? 
                                                    `<button class="btn btn-outline-primary btn-sm" onclick="adminApp.loadCompaniesPage(${companies.pagination.current_page - 1})">
                                                        <i class="bi bi-chevron-left"></i> Vorige
                                                    </button>` : ''
                                                }
                                                <span class="btn btn-outline-secondary btn-sm disabled">
                                                    Pagina ${companies.pagination.current_page} van ${companies.pagination.total_pages}
                                                </span>
                                                ${companies.pagination.has_next ? 
                                                    `<button class="btn btn-outline-primary btn-sm" onclick="adminApp.loadCompaniesPage(${companies.pagination.current_page + 1})">
                                                        Volgende <i class="bi bi-chevron-right"></i>
                                                    </button>` : ''
                                                }
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Setup event listeners for search and filter
            this.setupCompaniesEventListeners();

        } catch (error) {
            console.error('Error loading companies:', error);
            this.showToast('Fout bij laden bedrijven', 'error');
        }
    }

    setupCompaniesEventListeners() {
        // Search input with debounce
        const searchInput = document.getElementById('searchCompanies');
        if (searchInput) {
            searchInput.removeEventListener('input', this.boundSearchCompanies);
            this.boundSearchCompanies = this.debounce(() => this.searchAndFilterCompanies(), 300);
            searchInput.addEventListener('input', this.boundSearchCompanies);
        }

        // Sort dropdown
        const sortSelect = document.getElementById('sortCompanies');
        if (sortSelect) {
            sortSelect.removeEventListener('change', this.boundSortCompanies);
            this.boundSortCompanies = () => this.searchAndFilterCompanies();
            sortSelect.addEventListener('change', this.boundSortCompanies);
        }

        console.log('✅ Companies event listeners setup');
    }

    async searchAndFilterCompanies() {
        try {
            const searchInput = document.getElementById('searchCompanies');
            const sortSelect = document.getElementById('sortCompanies');
            
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const sortBy = sortSelect ? sortSelect.value : 'company_name';
            
            console.log('Searching companies:', { searchTerm, sortBy });
            
            // Build query parameters
            const params = new URLSearchParams({
                page: 1,
                limit: 50,
                sort_by: sortBy,
                sort_order: 'ASC'
            });
            
            if (searchTerm) {
                params.append('search', searchTerm);
            }
            
            // Fetch filtered data
            const companies = await this.apiCall('GET', `/api/companies?${params.toString()}`);
            
            // Update table content
            const tableBody = document.getElementById('companies-table-body');
            if (tableBody) {
                tableBody.innerHTML = this.renderCompaniesTable(companies.companies || []);
            }

            // Update company count badge
            const countBadge = document.querySelector('#companies-section .badge');
            if (countBadge) {
                countBadge.textContent = companies.companies?.length || 0;
            }
            
            // Update pagination if exists
            const cardFooter = document.querySelector('#companies-section .card-footer');
            if (cardFooter && companies.pagination) {
                cardFooter.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-muted">
                            ${searchTerm ? `${companies.pagination.total_count} resultaten voor "${searchTerm}"` : `Totaal: ${companies.pagination.total_count} bedrijven`}
                        </span>
                        <div class="btn-group" role="group">
                            ${companies.pagination.has_prev ? 
                                `<button class="btn btn-outline-primary btn-sm" onclick="adminApp.loadCompaniesPage(${companies.pagination.current_page - 1})">
                                    <i class="bi bi-chevron-left"></i> Vorige
                                </button>` : ''
                            }
                            <span class="btn btn-outline-secondary btn-sm disabled">
                                Pagina ${companies.pagination.current_page} van ${companies.pagination.total_pages}
                            </span>
                            ${companies.pagination.has_next ? 
                                `<button class="btn btn-outline-primary btn-sm" onclick="adminApp.loadCompaniesPage(${companies.pagination.current_page + 1})">
                                    Volgende <i class="bi bi-chevron-right"></i>
                                </button>` : ''
                            }
                        </div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error searching companies:', error);
            this.showToast(`❌ Fout bij zoeken: ${error.message}`, 'error');
        }
    }

    renderCompaniesTable(companies) {
        if (!companies || companies.length === 0) {
            return '<tr><td colspan="8" class="text-center py-4 text-muted">Geen bedrijven gevonden</td></tr>';
        }

        return companies.map(company => `
            <tr data-company-id="${company.id}">
                <td>
                    <div>
                        <strong>${this.escapeHtml(company.company_name)}</strong>
                        ${company.industry ? `<br><small class="text-muted">${this.escapeHtml(company.industry)}</small>` : ''}
                    </div>
                </td>
                <td>
                    ${company.vat_number ? 
                        `<code class="text-muted">${this.escapeHtml(company.vat_number)}</code>` : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
                <td>
                    ${company.email ? 
                        `<a href="mailto:${company.email}" class="text-decoration-none">${this.escapeHtml(company.email)}</a>` : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
                <td>
                    ${company.phone ? 
                        `<a href="tel:${company.phone}" class="text-decoration-none">${this.escapeHtml(company.phone)}</a>` : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
                <td>
                    ${company.city ? 
                        this.escapeHtml(company.city) : 
                        '<span class="text-muted">-</span>'
                    }
                </td>
                <td>
                    <span class="badge bg-info">${company.contact_count || 0}</span>
                </td>
                <td>
                    <span class="badge bg-success">${company.vehicle_count || 0}</span>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary" onclick="adminApp.viewCompany('${company.id}')" title="Bekijken">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary" onclick="adminApp.editCompany('${company.id}')" title="Bewerken">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" onclick="adminApp.deleteCompany('${company.id}')" title="Deactiveren">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Company management functions
    showAddCompanyModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('addCompanyModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div class="modal fade" id="addCompanyModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-building-add text-primary"></i> Nieuw Bedrijf Toevoegen
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="addCompanyForm">
                            <div class="modal-body">
                                <div class="row">
                                    <!-- Bedrijfsgegevens -->
                                    <div class="col-md-6">
                                        <h6 class="text-muted mb-3">
                                            <i class="bi bi-info-circle"></i> Bedrijfsgegevens
                                        </h6>
                                        
                                        <div class="mb-3">
                                            <label for="companyName" class="form-label">
                                                Bedrijfsnaam <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control" id="companyName" required>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="vatNumber" class="form-label">BTW-nummer</label>
                                                    <input type="text" class="form-control" id="vatNumber" 
                                                           placeholder="NL123456789B01">
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="registrationNumber" class="form-label">KvK-nummer</label>
                                                    <input type="text" class="form-control" id="registrationNumber">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="industry" class="form-label">Bedrijfstak</label>
                                            <input type="text" class="form-control" id="industry" 
                                                   placeholder="Automotive Services">
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="website" class="form-label">Website</label>
                                            <input type="url" class="form-control" id="website" 
                                                   placeholder="https://example.com">
                                        </div>
                                    </div>
                                    
                                    <!-- Contact & Adres -->
                                    <div class="col-md-6">
                                        <h6 class="text-muted mb-3">
                                            <i class="bi bi-geo-alt"></i> Contact & Adres
                                        </h6>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="email" class="form-label">Email</label>
                                                    <input type="email" class="form-control" id="email">
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="phone" class="form-label">Telefoon</label>
                                                    <input type="tel" class="form-control" id="phone">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="address" class="form-label">Adres</label>
                                            <textarea class="form-control" id="address" rows="2"></textarea>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-4">
                                                <div class="mb-3">
                                                    <label for="postalCode" class="form-label">Postcode</label>
                                                    <input type="text" class="form-control" id="postalCode">
                                                </div>
                                            </div>
                                            <div class="col-md-8">
                                                <div class="mb-3">
                                                    <label for="city" class="form-label">Plaats</label>
                                                    <input type="text" class="form-control" id="city">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="country" class="form-label">Land</label>
                                            <input type="text" class="form-control" id="country" value="Nederland">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Facturatieadres -->
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <div class="form-check mb-3">
                                            <input class="form-check-input" type="checkbox" id="differentBillingAddress">
                                            <label class="form-check-label" for="differentBillingAddress">
                                                Afwijkend facturatieadres
                                            </label>
                                        </div>
                                        
                                        <div id="billingAddressFields" class="d-none">
                                            <h6 class="text-muted mb-3">
                                                <i class="bi bi-receipt"></i> Facturatieadres
                                            </h6>
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <div class="mb-3">
                                                        <label for="billingAddress" class="form-label">Facturatieadres</label>
                                                        <textarea class="form-control" id="billingAddress" rows="2"></textarea>
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <div class="mb-3">
                                                        <label for="billingPostalCode" class="form-label">Postcode</label>
                                                        <input type="text" class="form-control" id="billingPostalCode">
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <div class="mb-3">
                                                        <label for="billingCity" class="form-label">Plaats</label>
                                                        <input type="text" class="form-control" id="billingCity">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Notities -->
                                <div class="row">
                                    <div class="col-12">
                                        <div class="mb-3">
                                            <label for="notes" class="form-label">Notities</label>
                                            <textarea class="form-control" id="notes" rows="3" 
                                                      placeholder="Optionele notities over dit bedrijf..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Annuleren
                                </button>
                                <button type="submit" class="btn btn-primary" id="saveCompanyBtn">
                                    <i class="bi bi-check-circle"></i> Bedrijf Opslaan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup event listeners
        const modal = document.getElementById('addCompanyModal');
        const form = document.getElementById('addCompanyForm');
        const billingToggle = document.getElementById('differentBillingAddress');
        const billingFields = document.getElementById('billingAddressFields');

        // Toggle billing address fields
        billingToggle.addEventListener('change', () => {
            if (billingToggle.checked) {
                billingFields.classList.remove('d-none');
            } else {
                billingFields.classList.add('d-none');
            }
        });

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddCompanySubmit();
        });

        // Show modal
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    async handleAddCompanySubmit() {
        const saveBtn = document.getElementById('saveCompanyBtn');
        const originalText = saveBtn.innerHTML;
        const form = document.getElementById('addCompanyForm');
        
        // Check if this is an edit operation
        const isEdit = form && form.dataset.isEdit === 'true';
        const companyId = form ? form.dataset.companyId : null;
        
        try {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> ${isEdit ? 'Bijwerken...' : 'Opslaan...'}`;

            // Collect form data
            const formData = {
                company_name: document.getElementById('companyName').value.trim(),
                vat_number: document.getElementById('vatNumber').value.trim() || null,
                registration_number: document.getElementById('registrationNumber').value.trim() || null,
                industry: document.getElementById('industry').value.trim() || null,
                website: document.getElementById('website').value.trim() || null,
                email: document.getElementById('email').value.trim() || null,
                phone: document.getElementById('phone').value.trim() || null,
                address: document.getElementById('address').value.trim() || null,
                postal_code: document.getElementById('postalCode').value.trim() || null,
                city: document.getElementById('city').value.trim() || null,
                country: document.getElementById('country').value.trim() || null,
                notes: document.getElementById('notes').value.trim() || null
            };

            // Add billing address if different
            const differentBilling = document.getElementById('differentBillingAddress').checked;
            if (differentBilling) {
                formData.billing_address = document.getElementById('billingAddress').value.trim() || null;
                formData.billing_postal_code = document.getElementById('billingPostalCode').value.trim() || null;
                formData.billing_city = document.getElementById('billingCity').value.trim() || null;
            }

            // Validate required fields
            if (!formData.company_name) {
                throw new Error('Bedrijfsnaam is verplicht');
            }

            console.log(`${isEdit ? 'Updating' : 'Creating'} company with data:`, formData);

            // Submit to API
            const result = isEdit 
                ? await this.apiCall('PUT', `/api/companies/${companyId}`, formData)
                : await this.apiCall('POST', '/api/companies', formData);
            
            console.log(`Company ${isEdit ? 'updated' : 'created'}:`, result);
            this.showToast(`✅ Bedrijf succesvol ${isEdit ? 'bijgewerkt' : 'toegevoegd'}!`, 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addCompanyModal'));
            if (modal) modal.hide();

            // Reload companies list
            await this.loadCompanies();

        } catch (error) {
            console.error(`Error ${isEdit ? 'updating' : 'creating'} company:`, error);
            this.showToast(`❌ Fout bij ${isEdit ? 'bijwerken' : 'aanmaken'} bedrijf: ${error.message}`, 'error');
        } finally {
            // Reset button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    async viewCompany(companyId) {
        try {
            console.log('Loading company details for:', companyId);
            
            // Fetch company data
            const company = await this.apiCall('GET', `/api/companies/${companyId}`);
            console.log('Company data loaded:', company);

            // Remove existing modal if present
            const existingModal = document.getElementById('viewCompanyModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create modal HTML
            const modalHTML = `
                <div class="modal fade" id="viewCompanyModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-building text-primary"></i> 
                                    ${this.escapeHtml(company.company_name)}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <!-- Company Info Tabs -->
                                <ul class="nav nav-tabs" id="companyTabs" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="info-tab" data-bs-toggle="tab" data-bs-target="#info-pane" type="button" role="tab">
                                            <i class="bi bi-info-circle"></i> Bedrijfsgegevens
                                        </button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="contacts-tab" data-bs-toggle="tab" data-bs-target="#contacts-pane" type="button" role="tab">
                                            <i class="bi bi-people"></i> Contactpersonen 
                                            <span class="badge bg-primary ms-1">${company.contacts?.length || 0}</span>
                                        </button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="vehicles-tab" data-bs-toggle="tab" data-bs-target="#vehicles-pane" type="button" role="tab">
                                            <i class="bi bi-car-front"></i> Voertuigen 
                                            <span class="badge bg-success ms-1">${company.vehicles?.length || 0}</span>
                                        </button>
                                    </li>
                                </ul>

                                <div class="tab-content mt-3" id="companyTabContent">
                                    <!-- Company Info Tab -->
                                    <div class="tab-pane fade show active" id="info-pane" role="tabpanel">
                                        <div class="row">
                                            <div class="col-md-6">
                                                <h6 class="text-muted mb-3">Bedrijfsgegevens</h6>
                                                <div class="mb-3">
                                                    <strong>Bedrijfsnaam:</strong><br>
                                                    ${this.escapeHtml(company.company_name)}
                                                </div>
                                                ${company.vat_number ? `
                                                    <div class="mb-3">
                                                        <strong>BTW-nummer:</strong><br>
                                                        <code>${this.escapeHtml(company.vat_number)}</code>
                                                    </div>
                                                ` : ''}
                                                ${company.registration_number ? `
                                                    <div class="mb-3">
                                                        <strong>KvK-nummer:</strong><br>
                                                        ${this.escapeHtml(company.registration_number)}
                                                    </div>
                                                ` : ''}
                                                ${company.industry ? `
                                                    <div class="mb-3">
                                                        <strong>Bedrijfstak:</strong><br>
                                                        ${this.escapeHtml(company.industry)}
                                                    </div>
                                                ` : ''}
                                                ${company.website ? `
                                                    <div class="mb-3">
                                                        <strong>Website:</strong><br>
                                                        <a href="${this.escapeHtml(company.website)}" target="_blank" class="text-decoration-none">
                                                            ${this.escapeHtml(company.website)} <i class="bi bi-box-arrow-up-right"></i>
                                                        </a>
                                                    </div>
                                                ` : ''}
                                            </div>
                                            <div class="col-md-6">
                                                <h6 class="text-muted mb-3">Contactgegevens</h6>
                                                ${company.email ? `
                                                    <div class="mb-3">
                                                        <strong>Email:</strong><br>
                                                        <a href="mailto:${company.email}" class="text-decoration-none">
                                                            ${this.escapeHtml(company.email)}
                                                        </a>
                                                    </div>
                                                ` : ''}
                                                ${company.phone ? `
                                                    <div class="mb-3">
                                                        <strong>Telefoon:</strong><br>
                                                        <a href="tel:${company.phone}" class="text-decoration-none">
                                                            ${this.escapeHtml(company.phone)}
                                                        </a>
                                                    </div>
                                                ` : ''}
                                                ${company.address ? `
                                                    <div class="mb-3">
                                                        <strong>Adres:</strong><br>
                                                        ${this.escapeHtml(company.address)}<br>
                                                        ${company.postal_code || ''} ${company.city || ''}<br>
                                                        ${company.country || ''}
                                                    </div>
                                                ` : ''}
                                                ${(company.billing_address && company.billing_address !== company.address) ? `
                                                    <div class="mb-3">
                                                        <strong>Facturatieadres:</strong><br>
                                                        ${this.escapeHtml(company.billing_address)}<br>
                                                        ${company.billing_postal_code || ''} ${company.billing_city || ''}
                                                    </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                        ${company.notes ? `
                                            <div class="row mt-3">
                                                <div class="col-12">
                                                    <h6 class="text-muted mb-3">Notities</h6>
                                                    <div class="bg-light p-3 rounded">
                                                        ${this.escapeHtml(company.notes).replace(/\n/g, '<br>')}
                                                    </div>
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>

                                    <!-- Contacts Tab -->
                                    <div class="tab-pane fade" id="contacts-pane" role="tabpanel">
                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                            <h6 class="mb-0">Contactpersonen</h6>
                                            <button class="btn btn-sm btn-primary" onclick="adminApp.showAddContactModal('${company.id}')">
                                                <i class="bi bi-person-plus"></i> Contact Toevoegen
                                            </button>
                                        </div>
                                        ${this.renderContactsList(company.contacts || [])}
                                    </div>

                                    <!-- Vehicles Tab -->
                                    <div class="tab-pane fade" id="vehicles-pane" role="tabpanel">
                                        <div class="d-flex justify-content-between align-items-center mb-3">
                                            <h6 class="mb-0">Voertuigen</h6>
                                            <button class="btn btn-sm btn-success" onclick="adminApp.showAddVehicleModal('${company.id}')">
                                                <i class="bi bi-car-front-fill"></i> Voertuig Toevoegen
                                            </button>
                                        </div>
                                        ${this.renderVehiclesList(company.vehicles || [])}
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Sluiten
                                </button>
                                <button type="button" class="btn btn-primary" onclick="adminApp.editCompany('${company.id}')">
                                    <i class="bi bi-pencil"></i> Bewerken
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to body and show
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const bootstrapModal = new bootstrap.Modal(document.getElementById('viewCompanyModal'));
            bootstrapModal.show();

        } catch (error) {
            console.error('Error loading company details:', error);
            this.showToast(`❌ Fout bij laden bedrijfsgegevens: ${error.message}`, 'error');
        }
    }

    renderContactsList(contacts) {
        if (!contacts || contacts.length === 0) {
            return `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-person-x fs-1"></i>
                    <p>Nog geen contactpersonen toegevoegd</p>
                </div>
            `;
        }

        return `
            <div class="row">
                ${contacts.map(contact => `
                    <div class="col-md-6 mb-3">
                        <div class="card h-100">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h6 class="card-title mb-1">
                                        ${this.escapeHtml(contact.first_name)} ${this.escapeHtml(contact.last_name)}
                                        ${contact.is_primary_contact ? '<span class="badge bg-primary ms-2">Primair</span>' : ''}
                                    </h6>
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                            <i class="bi bi-three-dots-vertical"></i>
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item" onclick="adminApp.editContact('${contact.id}')">
                                                <i class="bi bi-pencil"></i> Bewerken
                                            </a></li>
                                            <li><a class="dropdown-item text-danger" onclick="adminApp.deleteContact('${contact.id}')">
                                                <i class="bi bi-trash"></i> Verwijderen
                                            </a></li>
                                        </ul>
                                    </div>
                                </div>
                                ${contact.job_title ? `<p class="text-muted mb-1">${this.escapeHtml(contact.job_title)}</p>` : ''}
                                ${contact.department ? `<p class="text-muted small mb-2">${this.escapeHtml(contact.department)}</p>` : ''}
                                ${contact.email ? `
                                    <p class="mb-1">
                                        <i class="bi bi-envelope"></i> 
                                        <a href="mailto:${contact.email}" class="text-decoration-none">${this.escapeHtml(contact.email)}</a>
                                    </p>
                                ` : ''}
                                ${contact.phone ? `
                                    <p class="mb-1">
                                        <i class="bi bi-telephone"></i> 
                                        <a href="tel:${contact.phone}" class="text-decoration-none">${this.escapeHtml(contact.phone)}</a>
                                    </p>
                                ` : ''}
                                ${contact.mobile ? `
                                    <p class="mb-1">
                                        <i class="bi bi-phone"></i> 
                                        <a href="tel:${contact.mobile}" class="text-decoration-none">${this.escapeHtml(contact.mobile)}</a>
                                    </p>
                                ` : ''}
                                <div class="mt-2">
                                    ${contact.is_billing_contact ? '<span class="badge bg-success me-1">Facturatie</span>' : ''}
                                    ${contact.is_technical_contact ? '<span class="badge bg-info">Technisch</span>' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderVehiclesList(vehicles) {
        if (!vehicles || vehicles.length === 0) {
            return `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-car-front fs-1"></i>
                    <p>Nog geen voertuigen geregistreerd</p>
                </div>
            `;
        }

        return `
            <div class="row">
                ${vehicles.map(vehicle => `
                    <div class="col-md-4 mb-3">
                        <div class="card h-100">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h6 class="card-title mb-1">
                                        ${this.escapeHtml(vehicle.make || '')} ${this.escapeHtml(vehicle.model || '')}
                                    </h6>
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                            <i class="bi bi-three-dots-vertical"></i>
                                        </button>
                                        <ul class="dropdown-menu">
                                            <li><a class="dropdown-item" onclick="adminApp.editVehicle('${vehicle.id}')">
                                                <i class="bi bi-pencil"></i> Bewerken
                                            </a></li>
                                            <li><a class="dropdown-item text-danger" onclick="adminApp.deleteVehicle('${vehicle.id}')">
                                                <i class="bi bi-trash"></i> Verwijderen
                                            </a></li>
                                        </ul>
                                    </div>
                                </div>
                                ${vehicle.year ? `<p class="text-muted mb-1">Bouwjaar: ${vehicle.year}</p>` : ''}
                                ${vehicle.license_plate ? `
                                    <p class="mb-1">
                                        <i class="bi bi-card-text"></i> 
                                        <code>${this.escapeHtml(vehicle.license_plate)}</code>
                                    </p>
                                ` : ''}
                                ${vehicle.color ? `<p class="mb-1"><i class="bi bi-palette"></i> ${this.escapeHtml(vehicle.color)}</p>` : ''}
                                ${vehicle.primary_driver ? `<p class="mb-1"><i class="bi bi-person"></i> ${this.escapeHtml(vehicle.primary_driver)}</p>` : ''}
                                ${vehicle.vehicle_type ? `
                                    <span class="badge bg-secondary">${this.escapeHtml(vehicle.vehicle_type)}</span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async editCompany(companyId) {
        try {
            // Fetch company data
            const company = await this.apiCall('GET', `/api/companies/${companyId}`);
            
            // Close any existing company view modal
            const existingViewModal = document.getElementById('viewCompanyModal');
            if (existingViewModal) {
                const modal = bootstrap.Modal.getInstance(existingViewModal);
                if (modal) modal.hide();
            }

            // Show add company modal (reuse the same modal)
            this.showAddCompanyModal();
            
            // Wait a bit for modal to be created, then populate with existing data
            setTimeout(() => {
                // Update modal title
                const modalTitle = document.querySelector('#addCompanyModal .modal-title');
                if (modalTitle) {
                    modalTitle.innerHTML = '<i class="bi bi-pencil text-warning"></i> Bedrijf Bewerken';
                }
                
                // Update save button
                const saveBtn = document.getElementById('saveCompanyBtn');
                if (saveBtn) {
                    saveBtn.innerHTML = '<i class="bi bi-check-circle"></i> Wijzigingen Opslaan';
                }
                
                // Populate form fields
                const fields = {
                    'companyName': company.company_name,
                    'vatNumber': company.vat_number,
                    'registrationNumber': company.registration_number,
                    'industry': company.industry,
                    'website': company.website,
                    'email': company.email,
                    'phone': company.phone,
                    'address': company.address,
                    'postalCode': company.postal_code,
                    'city': company.city,
                    'country': company.country,
                    'notes': company.notes
                };
                
                // Fill in the form
                Object.entries(fields).forEach(([fieldId, value]) => {
                    const field = document.getElementById(fieldId);
                    if (field && value !== null && value !== undefined) {
                        field.value = value;
                    }
                });
                
                // Handle billing address
                if (company.billing_address && company.billing_address !== company.address) {
                    const billingToggle = document.getElementById('differentBillingAddress');
                    const billingFields = document.getElementById('billingAddressFields');
                    if (billingToggle && billingFields) {
                        billingToggle.checked = true;
                        billingFields.classList.remove('d-none');
                        
                        // Fill billing address fields
                        const billingAddress = document.getElementById('billingAddress');
                        const billingPostalCode = document.getElementById('billingPostalCode');
                        const billingCity = document.getElementById('billingCity');
                        
                        if (billingAddress) billingAddress.value = company.billing_address || '';
                        if (billingPostalCode) billingPostalCode.value = company.billing_postal_code || '';
                        if (billingCity) billingCity.value = company.billing_city || '';
                    }
                }
                
                // Store company ID for update instead of create
                const form = document.getElementById('addCompanyForm');
                if (form) {
                    form.dataset.companyId = companyId;
                    form.dataset.isEdit = 'true';
                }
                
            }, 100);

        } catch (error) {
            console.error('Error loading company for edit:', error);
            this.showToast(`❌ Fout bij laden bedrijfsgegevens: ${error.message}`, 'error');
        }
    }

    async deleteCompany(companyId) {
        try {
            // Get company info for confirmation
            const company = await this.apiCall('GET', `/api/companies/${companyId}`);
            
            const confirmMessage = `
Weet je zeker dat je het bedrijf "${company.company_name}" wilt deactiveren?

• Het bedrijf wordt niet definitief verwijderd, maar gemarkeerd als inactief
• Gerelateerde gegevens blijven behouden
• Het bedrijf kan later weer geactiveerd worden

Deze actie is omkeerbaar.
            `.trim();
            
            if (!confirm(confirmMessage)) {
                return;
            }

            console.log('Deactivating company:', companyId);

            // Call API to deactivate company
            const result = await this.apiCall('DELETE', `/api/companies/${companyId}`);
            
            console.log('Company deactivated:', result);
            this.showToast('✅ Bedrijf succesvol gedeactiveerd', 'success');

            // Reload companies list to reflect changes
            await this.loadCompanies();

        } catch (error) {
            console.error('Error deactivating company:', error);
            this.showToast(`❌ Fout bij deactiveren bedrijf: ${error.message}`, 'error');
        }
    }

    async loadCompaniesPage(page) {
        try {
            console.log('Loading companies page:', page);
            
            // Get current search and sort parameters
            const searchInput = document.getElementById('searchCompanies');
            const sortSelect = document.getElementById('sortCompanies');
            
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            const sortBy = sortSelect ? sortSelect.value : 'company_name';
            
            // Build query parameters
            const params = new URLSearchParams({
                page: page,
                limit: 50,
                sort_by: sortBy,
                sort_order: 'ASC'
            });
            
            if (searchTerm) {
                params.append('search', searchTerm);
            }
            
            // Fetch data
            const companies = await this.apiCall('GET', `/api/companies?${params.toString()}`);
            
            // Update table content
            const tableBody = document.getElementById('companies-table-body');
            if (tableBody) {
                tableBody.innerHTML = this.renderCompaniesTable(companies.companies || []);
            }
            
            // Update pagination
            const cardFooter = document.querySelector('#companies-section .card-footer');
            if (cardFooter && companies.pagination) {
                cardFooter.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-muted">
                            Totaal: ${companies.pagination.total_count} bedrijven
                        </span>
                        <div class="btn-group" role="group">
                            ${companies.pagination.has_prev ? 
                                `<button class="btn btn-outline-primary btn-sm" onclick="adminApp.loadCompaniesPage(${companies.pagination.current_page - 1})">
                                    <i class="bi bi-chevron-left"></i> Vorige
                                </button>` : ''
                            }
                            <span class="btn btn-outline-secondary btn-sm disabled">
                                Pagina ${companies.pagination.current_page} van ${companies.pagination.total_pages}
                            </span>
                            ${companies.pagination.has_next ? 
                                `<button class="btn btn-outline-primary btn-sm" onclick="adminApp.loadCompaniesPage(${companies.pagination.current_page + 1})">
                                    Volgende <i class="bi bi-chevron-right"></i>
                                </button>` : ''
                            }
                        </div>
                    </div>
                `;
            }
            
            console.log(`Loaded page ${page} with ${companies.companies?.length || 0} companies`);
            
        } catch (error) {
            console.error('Error loading companies page:', error);
            this.showToast(`❌ Fout bij laden pagina ${page}: ${error.message}`, 'error');
        }
    }

    // Contact Person Management
    showAddContactModal(companyId) {
        // Remove existing modal if present
        const existingModal = document.getElementById('addContactModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create contact modal HTML
        const modalHTML = `
            <div class="modal fade" id="addContactModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-person-plus text-primary"></i> Contactpersoon Toevoegen
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="addContactForm">
                            <div class="modal-body">
                                <div class="row">
                                    <!-- Personal Info -->
                                    <div class="col-md-6">
                                        <h6 class="text-muted mb-3">
                                            <i class="bi bi-person-badge"></i> Persoonlijke Gegevens
                                        </h6>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="contactFirstName" class="form-label">
                                                        Voornaam <span class="text-danger">*</span>
                                                    </label>
                                                    <input type="text" class="form-control" id="contactFirstName" required>
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="contactLastName" class="form-label">
                                                        Achternaam <span class="text-danger">*</span>
                                                    </label>
                                                    <input type="text" class="form-control" id="contactLastName" required>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="contactJobTitle" class="form-label">Functietitel</label>
                                            <input type="text" class="form-control" id="contactJobTitle" 
                                                   placeholder="Manager, Eigenaar, etc.">
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="contactDepartment" class="form-label">Afdeling</label>
                                            <input type="text" class="form-control" id="contactDepartment" 
                                                   placeholder="Sales, Operations, etc.">
                                        </div>
                                    </div>
                                    
                                    <!-- Contact Info -->
                                    <div class="col-md-6">
                                        <h6 class="text-muted mb-3">
                                            <i class="bi bi-telephone"></i> Contactgegevens
                                        </h6>
                                        
                                        <div class="mb-3">
                                            <label for="contactEmail" class="form-label">Email</label>
                                            <input type="email" class="form-control" id="contactEmail">
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="contactPhone" class="form-label">Telefoon</label>
                                                    <input type="tel" class="form-control" id="contactPhone">
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="contactMobile" class="form-label">Mobiel</label>
                                                    <input type="tel" class="form-control" id="contactMobile">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <h6 class="text-muted mb-3 mt-4">
                                            <i class="bi bi-gear"></i> Contact Rollen
                                        </h6>
                                        
                                        <div class="form-check mb-2">
                                            <input class="form-check-input" type="checkbox" id="contactIsPrimary">
                                            <label class="form-check-label" for="contactIsPrimary">
                                                <strong>Primair contact</strong>
                                                <br><small class="text-muted">Hoofdcontactpersoon voor dit bedrijf</small>
                                            </label>
                                        </div>
                                        
                                        <div class="form-check mb-2">
                                            <input class="form-check-input" type="checkbox" id="contactIsBilling">
                                            <label class="form-check-label" for="contactIsBilling">
                                                <strong>Facturatie contact</strong>
                                                <br><small class="text-muted">Voor facturen en betalingen</small>
                                            </label>
                                        </div>
                                        
                                        <div class="form-check mb-3">
                                            <input class="form-check-input" type="checkbox" id="contactIsTechnical">
                                            <label class="form-check-label" for="contactIsTechnical">
                                                <strong>Technisch contact</strong>
                                                <br><small class="text-muted">Voor technische zaken en planning</small>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Notes -->
                                <div class="row">
                                    <div class="col-12">
                                        <div class="mb-3">
                                            <label for="contactNotes" class="form-label">Notities</label>
                                            <textarea class="form-control" id="contactNotes" rows="3" 
                                                      placeholder="Optionele notities over deze contactpersoon..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Annuleren
                                </button>
                                <button type="submit" class="btn btn-primary" id="saveContactBtn">
                                    <i class="bi bi-person-check"></i> Contact Opslaan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup form submission
        const form = document.getElementById('addContactForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddContactSubmit(companyId);
        });

        // Show modal
        const bootstrapModal = new bootstrap.Modal(document.getElementById('addContactModal'));
        bootstrapModal.show();
    }

    async handleAddContactSubmit(companyId) {
        const saveBtn = document.getElementById('saveContactBtn');
        const originalText = saveBtn.innerHTML;
        
        try {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Opslaan...';

            // Collect form data
            const formData = {
                company_id: companyId,
                first_name: document.getElementById('contactFirstName').value.trim(),
                last_name: document.getElementById('contactLastName').value.trim(),
                job_title: document.getElementById('contactJobTitle').value.trim() || null,
                department: document.getElementById('contactDepartment').value.trim() || null,
                email: document.getElementById('contactEmail').value.trim() || null,
                phone: document.getElementById('contactPhone').value.trim() || null,
                mobile: document.getElementById('contactMobile').value.trim() || null,
                is_primary_contact: document.getElementById('contactIsPrimary').checked,
                is_billing_contact: document.getElementById('contactIsBilling').checked,
                is_technical_contact: document.getElementById('contactIsTechnical').checked,
                notes: document.getElementById('contactNotes').value.trim() || null
            };

            // Validate required fields
            if (!formData.first_name || !formData.last_name) {
                throw new Error('Voor- and achternaam zijn verplicht');
            }

            console.log('Creating contact with data:', formData);

            // Submit to API
            const newContact = await this.apiCall('POST', `/api/companies/${companyId}/contacts`, formData);
            
            console.log('Contact created:', newContact);
            this.showToast('✅ Contactpersoon succesvol toegevoegd!', 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addContactModal'));
            if (modal) modal.hide();

            // Refresh company view if open
            const viewModal = document.getElementById('viewCompanyModal');
            if (viewModal && !viewModal.classList.contains('d-none')) {
                // Reload company view to show new contact
                setTimeout(() => this.viewCompany(companyId), 300);
            }

        } catch (error) {
            console.error('Error creating contact:', error);
            this.showToast(`❌ Fout bij aanmaken contactpersoon: ${error.message}`, 'error');
        } finally {
            // Reset button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // Vehicle Management
    showAddVehicleModal(companyId) {
        // Remove existing modal if present
        const existingModal = document.getElementById('addVehicleModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create vehicle modal HTML
        const modalHTML = `
            <div class="modal fade" id="addVehicleModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-car-front-fill text-success"></i> Voertuig Toevoegen
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="addVehicleForm">
                            <div class="modal-body">
                                <div class="row">
                                    <!-- Vehicle Info -->
                                    <div class="col-md-6">
                                        <h6 class="text-muted mb-3">
                                            <i class="bi bi-info-circle"></i> Voertuiggegevens
                                        </h6>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="vehicleMake" class="form-label">
                                                        Merk <span class="text-danger">*</span>
                                                    </label>
                                                    <input type="text" class="form-control" id="vehicleMake" required 
                                                           placeholder="BMW, Mercedes, Audi, etc.">
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="vehicleModel" class="form-label">
                                                        Model <span class="text-danger">*</span>
                                                    </label>
                                                    <input type="text" class="form-control" id="vehicleModel" required
                                                           placeholder="3-Serie, C-Klasse, etc.">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="vehicleYear" class="form-label">Bouwjaar</label>
                                                    <input type="number" class="form-control" id="vehicleYear" 
                                                           min="1900" max="2030" placeholder="2020">
                                                </div>
                                            </div>
                                            <div class="col-md-6">
                                                <div class="mb-3">
                                                    <label for="vehicleColor" class="form-label">Kleur</label>
                                                    <input type="text" class="form-control" id="vehicleColor"
                                                           placeholder="Zwart, Wit, Blauw, etc.">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="vehicleLicensePlate" class="form-label">
                                                Kenteken <span class="text-danger">*</span>
                                            </label>
                                            <input type="text" class="form-control" id="vehicleLicensePlate" required
                                                   placeholder="12-ABC-3" style="text-transform: uppercase;">
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="vehicleVin" class="form-label">VIN-nummer</label>
                                            <input type="text" class="form-control" id="vehicleVin"
                                                   placeholder="Chassisnummer (optioneel)">
                                        </div>
                                    </div>
                                    
                                    <!-- Additional Info -->
                                    <div class="col-md-6">
                                        <h6 class="text-muted mb-3">
                                            <i class="bi bi-gear"></i> Aanvullende Gegevens
                                        </h6>
                                        
                                        <div class="mb-3">
                                            <label for="vehicleType" class="form-label">Voertuigtype</label>
                                            <select class="form-select" id="vehicleType">
                                                <option value="car">Personenauto</option>
                                                <option value="suv">SUV</option>
                                                <option value="van">Bestelwagen</option>
                                                <option value="truck">Vrachtwagen</option>
                                                <option value="motorcycle">Motor</option>
                                                <option value="boat">Boot</option>
                                                <option value="other">Anders</option>
                                            </select>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="vehiclePrimaryDriver" class="form-label">Hoofdbestuurder</label>
                                            <input type="text" class="form-control" id="vehiclePrimaryDriver"
                                                   placeholder="Naam van hoofdbestuurder">
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="vehicleMileage" class="form-label">Kilometerstand</label>
                                            <div class="input-group">
                                                <input type="number" class="form-control" id="vehicleMileage" 
                                                       placeholder="150000">
                                                <span class="input-group-text">km</span>
                                            </div>
                                        </div>
                                        
                                        <div class="mb-3">
                                            <label for="vehicleFuelType" class="form-label">Brandstoftype</label>
                                            <select class="form-select" id="vehicleFuelType">
                                                <option value="">Selecteer brandstof...</option>
                                                <option value="petrol">Benzine</option>
                                                <option value="diesel">Diesel</option>
                                                <option value="hybrid">Hybride</option>
                                                <option value="electric">Elektrisch</option>
                                                <option value="lpg">LPG</option>
                                                <option value="other">Anders</option>
                                            </select>
                                        </div>
                                        
                                        <div class="form-check mb-3">
                                            <input class="form-check-input" type="checkbox" id="vehicleIsActive" checked>
                                            <label class="form-check-label" for="vehicleIsActive">
                                                <strong>Actief voertuig</strong>
                                                <br><small class="text-muted">Voertuig is in gebruik</small>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Notes -->
                                <div class="row">
                                    <div class="col-12">
                                        <div class="mb-3">
                                            <label for="vehicleNotes" class="form-label">Opmerkingen</label>
                                            <textarea class="form-control" id="vehicleNotes" rows="3" 
                                                      placeholder="Bijzonderheden, schades, modificaties, etc..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                    Annuleren
                                </button>
                                <button type="submit" class="btn btn-success" id="saveVehicleBtn">
                                    <i class="bi bi-check-circle"></i> Voertuig Opslaan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Setup form submission
        const form = document.getElementById('addVehicleForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddVehicleSubmit(companyId);
        });

        // Auto-format license plate input
        const licensePlateInput = document.getElementById('vehicleLicensePlate');
        licensePlateInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Show modal
        const bootstrapModal = new bootstrap.Modal(document.getElementById('addVehicleModal'));
        bootstrapModal.show();
    }

    async handleAddVehicleSubmit(companyId) {
        const saveBtn = document.getElementById('saveVehicleBtn');
        const originalText = saveBtn.innerHTML;
        
        try {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Opslaan...';

            // Collect form data
            const formData = {
                company_id: companyId,
                make: document.getElementById('vehicleMake').value.trim(),
                model: document.getElementById('vehicleModel').value.trim(),
                year: document.getElementById('vehicleYear').value || null,
                color: document.getElementById('vehicleColor').value.trim() || null,
                license_plate: document.getElementById('vehicleLicensePlate').value.trim(),
                vin: document.getElementById('vehicleVin').value.trim() || null,
                vehicle_type: document.getElementById('vehicleType').value || 'car',
                primary_driver: document.getElementById('vehiclePrimaryDriver').value.trim() || null,
                mileage: document.getElementById('vehicleMileage').value || null,
                fuel_type: document.getElementById('vehicleFuelType').value || null,
                is_active: document.getElementById('vehicleIsActive').checked,
                notes: document.getElementById('vehicleNotes').value.trim() || null
            };

            // Validate required fields
            if (!formData.make || !formData.model || !formData.license_plate) {
                throw new Error('Merk, model en kenteken zijn verplicht');
            }

            console.log('Creating vehicle with data:', formData);

            // Submit to API
            const newVehicle = await this.apiCall('POST', `/api/companies/${companyId}/vehicles`, formData);
            
            console.log('Vehicle created:', newVehicle);
            this.showToast('✅ Voertuig succesvol toegevoegd!', 'success');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('addVehicleModal'));
            if (modal) modal.hide();

            // Refresh company view if open
            const viewModal = document.getElementById('viewCompanyModal');
            if (viewModal && !viewModal.classList.contains('d-none')) {
                // Reload company view to show new vehicle
                setTimeout(() => this.viewCompany(companyId), 300);
            }

        } catch (error) {
            console.error('Error creating vehicle:', error);
            this.showToast(`❌ Fout bij aanmaken voertuig: ${error.message}`, 'error');
        } finally {
            // Reset button state
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    filterServices() {
        const categoryFilter = document.getElementById('categoryFilter').value.toLowerCase();
        const searchFilter = document.getElementById('searchServices').value.toLowerCase();
        const rows = document.querySelectorAll('#services-table-body tr[data-service-id]');

        rows.forEach(row => {
            const category = row.getAttribute('data-category');
            const name = row.getAttribute('data-name');
            
            const matchesCategory = !categoryFilter || category === categoryFilter;
            const matchesSearch = !searchFilter || name.includes(searchFilter);
            
            row.style.display = (matchesCategory && matchesSearch) ? '' : 'none';
        });
    }

    async showAddServiceModal() {
        const modalHtml = `
            <div class="modal fade" id="addServiceModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-plus-circle text-primary"></i> Nieuwe Service Toevoegen
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addServiceForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Service Naam</label>
                                            <input type="text" class="form-control" name="name" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Categorie</label>
                                            <select class="form-select" name="category" required>
                                                <option value="">Selecteer categorie</option>
                                                <option value="signature">🌟 Signature Detailing</option>
                                                <option value="cleaning">🧽 Reiniging & Onderhoud</option>
                                                <option value="correction">✨ Paint Correction</option>
                                                <option value="protection">🛡️ Bescherming</option>
                                                <option value="restoration">🔧 Restauratie</option>
                                                <option value="addon">➕ Extra Services</option>
                                                <option value="other">📋 Overige</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Beschrijving</label>
                                    <textarea class="form-control" name="description" rows="3"></textarea>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Basisprijs (€)</label>
                                            <input type="number" class="form-control" name="base_price" step="0.01" min="0" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Duur (minuten)</label>
                                            <input type="number" class="form-control" name="duration_minutes" min="0">
                                        </div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" name="active" checked>
                                        <label class="form-check-label">Service actief</label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                            <button type="button" class="btn btn-primary" onclick="adminApp.saveNewService()">
                                <i class="bi bi-check"></i> Service Toevoegen
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('addServiceModal'));
        
        document.getElementById('addServiceModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
        
        modal.show();
    }

    async saveNewService() {
        try {
            const form = document.getElementById('addServiceForm');
            const formData = new FormData(form);
            
            const serviceData = {
                name: formData.get('name'),
                description: formData.get('description'),
                category: formData.get('category'),
                base_price: parseFloat(formData.get('base_price')),
                duration_minutes: formData.get('duration_minutes') ? parseInt(formData.get('duration_minutes')) : null,
                active: formData.has('active')
            };

            const result = await this.apiCall('POST', '/api/services', serviceData);
            this.showToast('✅ Service succesvol toegevoegd!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('addServiceModal'));
            modal.hide();
            
            await this.loadServices();
            
        } catch (error) {
            console.error('Error saving service:', error);
            this.showToast('❌ Fout bij opslaan service: ' + error.message, 'error');
        }
    }

    async editService(id) {
        try {
            const service = await this.apiCall('GET', `/api/services/${id}`);
            
            const modalHtml = `
                <div class="modal fade" id="editServiceModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-pencil text-warning"></i> Service Bewerken
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editServiceForm">
                                    <input type="hidden" name="id" value="${service.id}">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Service Naam</label>
                                                <input type="text" class="form-control" name="name" value="${service.name}" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Categorie</label>
                                                <select class="form-select" name="category" required>
                                                    <option value="">Selecteer categorie</option>
                                                    <option value="signature" ${service.category === 'signature' ? 'selected' : ''}>🌟 Signature Detailing</option>
                                                    <option value="cleaning" ${service.category === 'cleaning' ? 'selected' : ''}>🧽 Reiniging & Onderhoud</option>
                                                    <option value="correction" ${service.category === 'correction' ? 'selected' : ''}>✨ Paint Correction</option>
                                                    <option value="protection" ${service.category === 'protection' ? 'selected' : ''}>🛡️ Bescherming</option>
                                                    <option value="restoration" ${service.category === 'restoration' ? 'selected' : ''}>🔧 Restauratie</option>
                                                    <option value="addon" ${service.category === 'addon' ? 'selected' : ''}>➕ Extra Services</option>
                                                    <option value="other" ${service.category === 'other' ? 'selected' : ''}>📋 Overige</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Beschrijving</label>
                                        <textarea class="form-control" name="description" rows="3">${service.description || ''}</textarea>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Basisprijs (€)</label>
                                                <input type="number" class="form-control" name="base_price" step="0.01" min="0" value="${service.base_price}" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">Duur (minuten)</label>
                                                <input type="number" class="form-control" name="duration_minutes" min="0" value="${service.duration_minutes || ''}">
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" name="active" ${service.active ? 'checked' : ''}>
                                            <label class="form-check-label">Service actief</label>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                                <button type="button" class="btn btn-warning" onclick="adminApp.updateService()">
                                    <i class="bi bi-check"></i> Service Bijwerken
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('editServiceModal'));
            
            document.getElementById('editServiceModal').addEventListener('hidden.bs.modal', function () {
                this.remove();
            });
            
            modal.show();
            
        } catch (error) {
            console.error('Error loading service for edit:', error);
            this.showToast('❌ Fout bij laden service', 'error');
        }
    }

    async updateService() {
        try {
            const form = document.getElementById('editServiceForm');
            const formData = new FormData(form);
            
            const serviceData = {
                name: formData.get('name'),
                description: formData.get('description'),
                category: formData.get('category'),
                base_price: parseFloat(formData.get('base_price')),
                duration_minutes: formData.get('duration_minutes') ? parseInt(formData.get('duration_minutes')) : null,
                active: formData.has('active')
            };

            const id = formData.get('id');
            const result = await this.apiCall('PUT', `/api/services/${id}`, serviceData);
            this.showToast('✅ Service succesvol bijgewerkt!', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('editServiceModal'));
            modal.hide();
            
            await this.loadServices();
            
        } catch (error) {
            console.error('Error updating service:', error);
            this.showToast('❌ Fout bij bijwerken service: ' + error.message, 'error');
        }
    }

    async deleteService(id) {
        try {
            const service = await this.apiCall('GET', `/api/services/${id}`);
            const confirmMessage = `Weet je zeker dat je de service "${service.name}" wilt verwijderen?\n\n⚠️ Deze actie kan niet ongedaan worden gemaakt!`;
            
            if (confirm(confirmMessage)) {
                await this.apiCall('DELETE', `/api/services/${id}`);
                this.showToast('✅ Service succesvol verwijderd', 'success');
                await this.loadServices();
            }
            
        } catch (error) {
            console.error('Error deleting service:', error);
            this.showToast('❌ Fout bij verwijderen service: ' + error.message, 'error');
        }
    }

    async toggleServiceStatus(id, newStatus) {
        try {
            await this.apiCall('PUT', `/api/services/${id}`, { active: newStatus });
            this.showToast(`✅ Service ${newStatus ? 'geactiveerd' : 'gedeactiveerd'}`, 'success');
            await this.loadServices();
            
        } catch (error) {
            console.error('Error toggling service status:', error);
            this.showToast('❌ Fout bij wijzigen status', 'error');
        }
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

    // Alias for showToast (used by drag-and-drop functions)
    showNotification(message, type = 'info') {
        this.showToast(message, type);
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
            this.showToast(`Fout bij openen nieuwe ${this.getInvoiceTerminology('invoice')}`, 'danger');
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
                            <i class="bi bi-receipt text-info"></i> Nieuwe ${this.getInvoiceTerminology('createInvoice')}
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
                                ${(this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '') ? `
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
                                            <span id="invoice-subtotal">${this.formatCurrency(0)}</span>
                                        </div>
                                        ${(this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '') ? `
                                        <div class="d-flex justify-content-between">
                                            <span>BTW:</span>
                                            <span id="invoice-tax">${this.formatCurrency(0)}</span>
                                        </div>
                                        <hr>
                                        ` : ''}
                                        <div class="d-flex justify-content-between fw-bold">
                                            <span>Totaal:</span>
                                            <span id="invoice-total">${this.formatPrice(0)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                        <button type="button" class="btn btn-primary" id="save-invoice-btn">
                            <i class="bi bi-check"></i> ${this.getInvoiceTerminology('createInvoice')}
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
            totalInput.value = this.formatCurrency(total);
            
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
        
        const vatActive = this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '';
        if (vatActive) {
            const taxInput = document.querySelector('[name="tax_percentage"]');
            const taxPercentage = taxInput ? parseFloat(taxInput.value) || 0 : this.systemSettings.vat_percentage;
            taxAmount = subtotal * (taxPercentage / 100);
            total = subtotal + taxAmount;
        }
        
        document.getElementById('invoice-subtotal').textContent = this.formatCurrency(subtotal);
        
        const taxElement = document.getElementById('invoice-tax');
        if (taxElement) {
            taxElement.textContent = this.formatCurrency(taxAmount);
        }
        
        document.getElementById('invoice-total').textContent = this.formatPrice(total);
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
            tax_percentage: (this.systemSettings.company_vat_number && this.systemSettings.company_vat_number.trim() !== '') ? 
                (parseFloat(formData.get('tax_percentage')) || this.systemSettings.vat_percentage) : 0,
            notes: formData.get('notes') || '',
            items: items
        };
        
        if (!invoiceData.customer_id) {
            this.showToast('Selecteer een klant', 'warning');
            return;
        }
        
        // Show loading
        const loadingToast = this.showPDFLoadingToast(`${this.getInvoiceTerminology('Invoice')} aanmaken...`);
        
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
            this.showToast(`✅ ${this.getInvoiceTerminology('Invoice')} ${invoice.invoice_number} succesvol aangemaakt!`, 'success');
            
            // Close modal and refresh
            const modal = bootstrap.Modal.getInstance(document.getElementById('invoiceModal'));
            modal?.hide();
            document.getElementById('invoiceModal')?.remove();
            
            this.loadInvoices();
            
        } catch (error) {
            console.error('Error saving invoice:', error);
            this.hidePDFLoadingToast(loadingToast);
            this.showToast(`Fout bij aanmaken ${this.getInvoiceTerminology('invoice')}`, 'danger');
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
            this.showToast(`Fout bij laden ${this.getInvoiceTerminology('invoice')}`, 'error');
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
                                                        <td class="text-end">${this.formatPrice(parseFloat(item.unit_price) || 0, { showVATStatus: false })}</td>
                                                        <td class="text-end">${this.formatPrice(parseFloat(item.total_price) || 0, { showVATStatus: false })}</td>
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
                                            <td class="text-end">${this.formatCurrency(parseFloat(invoice.subtotal) || 0)}</td>
                                        </tr>
                                        ${parseFloat(invoice.discount_percentage) > 0 ? `
                                        <tr>
                                            <td>Korting (${invoice.discount_percentage}%):</td>
                                            <td class="text-end text-success">-${this.formatCurrency(parseFloat(invoice.discount_amount) || 0)}</td>
                                        </tr>
                                        ` : ''}
                                        <tr>
                                            <td>BTW (${invoice.tax_percentage}%):</td>
                                            <td class="text-end">${this.formatCurrency(parseFloat(invoice.tax_amount) || 0)}</td>
                                        </tr>
                                        <tr class="table-active">
                                            <td><strong>Totaal:</strong></td>
                                            <td class="text-end"><strong>${this.formatPrice(parseFloat(invoice.total_amount) || 0, { showVATStatus: false })}</strong></td>
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
            this.showToast(`❌ Fout bij openen ${this.getInvoiceTerminology('invoice')} PDF`, 'danger');
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
            const confirmMessage = `Weet je zeker dat je de volgende ${this.getInvoiceTerminology('invoice')} wilt verwijderen?\n\n${this.getInvoiceTerminology('Invoice')}: ${invoice.invoice_number}\nKlant: ${invoice.customer_name}\nBedrag: ${this.formatPrice(parseFloat(invoice.total_amount), { showVATStatus: false })}\nStatus: ${this.getInvoiceStatusText(invoice.status)}\n\n⚠️ Deze actie kan niet ongedaan worden gemaakt!`;
            
            if (confirm(confirmMessage)) {
                const result = await this.apiCall('DELETE', `/api/invoices/${id}`);
                this.showToast(`${this.getInvoiceTerminology('Invoice')} ${invoice.invoice_number} succesvol verwijderd`, 'success');
                this.loadInvoices(); // Refresh the list
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            this.showToast(`Fout bij verwijderen ${this.getInvoiceTerminology('invoice')}`, 'error');
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
                    <div class="form-check">
                        <input class="form-check-input customer-checkbox" type="checkbox" value="${customer.id}">
                    </div>
                </td>
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

        // Export customers
        document.getElementById('export-customers-btn').addEventListener('click', () => {
            this.exportCustomers();
        });

        // Bulk actions setup
        this.setupBulkActions();
    }

    setupBulkActions() {
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all-customers');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleAllCustomers(e.target.checked);
            });
        }

        // Individual checkboxes - delegate event handling
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('customer-checkbox')) {
                this.updateBulkActionVisibility();
            }
        });

        // Bulk action buttons
        const bulkEmailBtn = document.getElementById('bulk-email-btn');
        if (bulkEmailBtn) {
            bulkEmailBtn.addEventListener('click', () => this.bulkEmailCustomers());
        }

        const bulkExportBtn = document.getElementById('bulk-export-btn');
        if (bulkExportBtn) {
            bulkExportBtn.addEventListener('click', () => this.bulkExportCustomers());
        }

        const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => this.bulkDeleteCustomers());
        }
    }

    toggleAllCustomers(checked) {
        const checkboxes = document.querySelectorAll('.customer-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBulkActionVisibility();
    }

    updateBulkActionVisibility() {
        const selectedCustomers = this.getSelectedCustomers();
        const bulkActionsCard = document.getElementById('bulk-actions-card');
        const selectedCountSpan = document.getElementById('selected-count');

        if (selectedCustomers.length > 0) {
            bulkActionsCard.classList.remove('d-none');
            selectedCountSpan.textContent = selectedCustomers.length;
        } else {
            bulkActionsCard.classList.add('d-none');
        }

        // Update select all checkbox state
        const selectAllCheckbox = document.getElementById('select-all-customers');
        const allCheckboxes = document.querySelectorAll('.customer-checkbox');
        if (selectAllCheckbox && allCheckboxes.length > 0) {
            const checkedCount = selectedCustomers.length;
            selectAllCheckbox.checked = checkedCount === allCheckboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
        }
    }

    getSelectedCustomers() {
        const checkboxes = document.querySelectorAll('.customer-checkbox:checked');
        return Array.from(checkboxes).map(checkbox => checkbox.value);
    }

    async exportCustomers() {
        try {
            console.log('📤 Exporting all customers to CSV...');
            const response = await fetch('/admin/api/customers?format=csv&limit=100', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showToast('Klanten succesvol geëxporteerd', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Fout bij exporteren: ' + error.message, 'error');
        }
    }

    async bulkEmailCustomers() {
        const selectedIds = this.getSelectedCustomers();
        console.log('📧 Bulk email to customers:', selectedIds);
        alert(`Email functionaliteit voor ${selectedIds.length} klanten wordt nog geïmplementeerd`);
    }

    async bulkExportCustomers() {
        const selectedIds = this.getSelectedCustomers();
        try {
            console.log('📤 Bulk export customers:', selectedIds);
            // TODO: Implement bulk export for selected customers
            alert(`Export van ${selectedIds.length} geselecteerde klanten wordt nog geïmplementeerd`);
        } catch (error) {
            console.error('Bulk export error:', error);
            this.showToast('Fout bij bulk export: ' + error.message, 'error');
        }
    }

    async bulkDeleteCustomers() {
        const selectedIds = this.getSelectedCustomers();
        if (confirm(`Weet je zeker dat je ${selectedIds.length} klanten wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`)) {
            try {
                console.log('🗑️ Bulk delete customers:', selectedIds);
                // TODO: Implement bulk delete API endpoint
                alert(`Bulk verwijderen van ${selectedIds.length} klanten wordt nog geïmplementeerd`);
            } catch (error) {
                console.error('Bulk delete error:', error);
                this.showToast('Fout bij bulk verwijderen: ' + error.message, 'error');
            }
        }
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

    // New expense/supplier/report functions
    setupReportsEventListeners() {
        const refreshBtn = document.getElementById('refresh-reports');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadReports());
        }
    }

    async generateFinancialReport(year) {
        try {
            this.showToast('Rapport wordt gegenereerd...', 'info');
            window.open(`${this.baseURL}/api/reports/export/invoices?year=${year}&format=csv`, '_blank');
        } catch (error) {
            this.showToast('Fout bij genereren rapport', 'error');
        }
    }

    async generateVATReport(year, quarter) {
        try {
            this.showToast('BTW rapport wordt gegenereerd...', 'info');
            const response = await this.apiCall('GET', `/api/reports/vat-report?year=${year}&quarter=${quarter}`);
            // Show in modal or download
            this.showToast('BTW rapport beschikbaar', 'success');
        } catch (error) {
            this.showToast('Fout bij genereren BTW rapport', 'error');
        }
    }

    async showExpensesByCategory(year, month) {
        try {
            const response = await this.apiCall('GET', `/api/reports/expenses-by-category?year=${year}&month=${month}`);
            // Show expenses breakdown in modal
            this.showToast(`Uitgaven per categorie voor ${month}/${year}`, 'info');
        } catch (error) {
            this.showToast('Fout bij ophalen uitgaven per categorie', 'error');
        }
    }

    async showCustomerRevenue(year) {
        try {
            const response = await this.apiCall('GET', `/api/reports/customer-revenue?year=${year}`);
            // Show top customers in modal  
            this.showToast(`Top klanten voor ${year}`, 'info');
        } catch (error) {
            this.showToast('Fout bij ophalen klant omzet', 'error');
        }
    }

    // Service management functions
    showAddServiceModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'addServiceModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-plus-circle text-primary"></i> Nieuwe Service Toevoegen
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addServiceForm">
                            <div class="row">
                                <div class="col-md-8 mb-3">
                                    <label for="service_name" class="form-label">Service Naam *</label>
                                    <input type="text" class="form-control" id="service_name" name="name" required>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label for="service_icon" class="form-label">Icon</label>
                                    <input type="text" class="form-control" id="service_icon" name="icon" placeholder="⭐">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="service_subtitle" class="form-label">Ondertitel</label>
                                <input type="text" class="form-control" id="service_subtitle" name="subtitle">
                            </div>
                            <div class="mb-3">
                                <label for="service_description" class="form-label">Beschrijving</label>
                                <textarea class="form-control" id="service_description" name="description" rows="3"></textarea>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="service_category" class="form-label">Categorie *</label>
                                    <select class="form-select" id="service_category" name="category" required>
                                        <option value="">Selecteer categorie</option>
                                        <option value="signature">Signature</option>
                                        <option value="cleaning">Reiniging</option>
                                        <option value="detailing">Detailing</option>
                                        <option value="protection">Bescherming</option>
                                        <option value="maintenance">Onderhoud</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="service_package_type" class="form-label">Package Type</label>
                                    <select class="form-select" id="service_package_type" name="package_type">
                                        <option value="">Selecteer type</option>
                                        <option value="signature">Signature Package</option>
                                        <option value="individual">Individual Service</option>
                                        <option value="addon">Add-on</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="service_price_min" class="form-label">Prijs Min (€)</label>
                                    <input type="number" class="form-control" id="service_price_min" name="price_range_min" step="0.01" min="0">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="service_price_max" class="form-label">Prijs Max (€)</label>
                                    <input type="number" class="form-control" id="service_price_max" name="price_range_max" step="0.01" min="0">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label for="service_duration" class="form-label">Duur (minuten)</label>
                                    <input type="number" class="form-control" id="service_duration" name="duration_minutes" min="0">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label for="service_duration_text" class="form-label">Duur Tekst</label>
                                    <input type="text" class="form-control" id="service_duration_text" name="duration_text" placeholder="bijv. 2-3 uur">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="service_image_url" class="form-label">Afbeelding URL</label>
                                <input type="url" class="form-control" id="service_image_url" name="image_url" placeholder="images/service-name.jpg">
                                <div class="form-text">Relatief pad vanaf website root (bijv. images/premium-detail.jpg)</div>
                            </div>
                            <div class="mb-3">
                                <label for="service_features" class="form-label">Features (één per regel)</label>
                                <textarea class="form-control" id="service_features" name="features" rows="4" placeholder="Pre-wash en snow foam&#10;Grondige handwas met premium producten&#10;Complete interieur detailing"></textarea>
                            </div>
                            <div class="form-check mb-3">
                                <input type="checkbox" class="form-check-input" id="service_active" name="active" checked>
                                <label class="form-check-label" for="service_active">Actief</label>
                            </div>
                            <div class="form-check mb-3">
                                <input type="checkbox" class="form-check-input" id="service_featured" name="featured">
                                <label class="form-check-label" for="service_featured">Featured (toont "Meest Gekozen" badge)</label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                        <button type="button" class="btn btn-primary" onclick="adminApp.saveService()">Service Opslaan</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    showEditServiceModal(serviceId) {
        // First fetch the service data
        this.apiCall('GET', `/api/services/${serviceId}`)
            .then(service => {
                const modal = document.createElement('div');
                modal.className = 'modal fade';
                modal.id = 'editServiceModal';
                modal.innerHTML = `
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-pencil text-primary"></i> Service Bewerken
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editServiceForm">
                                    <input type="hidden" id="edit_service_id" value="${service.id}">
                                    <div class="row">
                                        <div class="col-md-8 mb-3">
                                            <label for="edit_service_name" class="form-label">Service Naam *</label>
                                            <input type="text" class="form-control" id="edit_service_name" name="name" value="${service.name || ''}" required>
                                        </div>
                                        <div class="col-md-4 mb-3">
                                            <label for="edit_service_icon" class="form-label">Icon</label>
                                            <input type="text" class="form-control" id="edit_service_icon" name="icon" value="${service.icon || ''}" placeholder="⭐">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="edit_service_subtitle" class="form-label">Ondertitel</label>
                                        <input type="text" class="form-control" id="edit_service_subtitle" name="subtitle" value="${service.subtitle || ''}">
                                    </div>
                                    <div class="mb-3">
                                        <label for="edit_service_description" class="form-label">Beschrijving</label>
                                        <textarea class="form-control" id="edit_service_description" name="description" rows="3">${service.description || ''}</textarea>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="edit_service_category" class="form-label">Categorie *</label>
                                            <select class="form-select" id="edit_service_category" name="category" required>
                                                <option value="">Selecteer categorie</option>
                                                <option value="signature" ${service.category === 'signature' ? 'selected' : ''}>Signature</option>
                                                <option value="cleaning" ${service.category === 'cleaning' ? 'selected' : ''}>Reiniging</option>
                                                <option value="detailing" ${service.category === 'detailing' ? 'selected' : ''}>Detailing</option>
                                                <option value="protection" ${service.category === 'protection' ? 'selected' : ''}>Bescherming</option>
                                                <option value="maintenance" ${service.category === 'maintenance' ? 'selected' : ''}>Onderhoud</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label for="edit_service_package_type" class="form-label">Package Type</label>
                                            <select class="form-select" id="edit_service_package_type" name="package_type">
                                                <option value="">Selecteer type</option>
                                                <option value="signature" ${service.package_type === 'signature' ? 'selected' : ''}>Signature Package</option>
                                                <option value="individual" ${service.package_type === 'individual' ? 'selected' : ''}>Individual Service</option>
                                                <option value="addon" ${service.package_type === 'addon' ? 'selected' : ''}>Add-on</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="edit_service_price_min" class="form-label">Prijs Min (€)</label>
                                            <input type="number" class="form-control" id="edit_service_price_min" name="price_range_min" value="${service.price_range_min || ''}" step="0.01" min="0">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label for="edit_service_price_max" class="form-label">Prijs Max (€)</label>
                                            <input type="number" class="form-control" id="edit_service_price_max" name="price_range_max" value="${service.price_range_max || ''}" step="0.01" min="0">
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label for="edit_service_duration" class="form-label">Duur (minuten)</label>
                                            <input type="number" class="form-control" id="edit_service_duration" name="duration_minutes" value="${service.duration_minutes || ''}" min="0">
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label for="edit_service_duration_text" class="form-label">Duur Tekst</label>
                                            <input type="text" class="form-control" id="edit_service_duration_text" name="duration_text" value="${service.duration_text || ''}" placeholder="bijv. 2-3 uur">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="edit_service_image_url" class="form-label">Afbeelding URL</label>
                                        <input type="url" class="form-control" id="edit_service_image_url" name="image_url" value="${service.image_url || ''}" placeholder="images/service-name.jpg">
                                        <div class="form-text">Relatief pad vanaf website root (bijv. images/premium-detail.jpg)</div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="edit_service_features" class="form-label">Features (één per regel)</label>
                                        <textarea class="form-control" id="edit_service_features" name="features" rows="4" placeholder="Pre-wash en snow foam&#10;Grondige handwas met premium producten&#10;Complete interieur detailing">${Array.isArray(service.features) ? service.features.join('\n') : ''}</textarea>
                                    </div>
                                    <div class="form-check mb-3">
                                        <input type="checkbox" class="form-check-input" id="edit_service_active" name="active" ${service.active ? 'checked' : ''}>
                                        <label class="form-check-label" for="edit_service_active">Actief</label>
                                    </div>
                                    <div class="form-check mb-3">
                                        <input type="checkbox" class="form-check-input" id="edit_service_featured" name="featured" ${service.featured ? 'checked' : ''}>
                                        <label class="form-check-label" for="edit_service_featured">Featured (toont "Meest Gekozen" badge)</label>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                                <button type="button" class="btn btn-primary" onclick="adminApp.updateService('${service.id}')">Service Bijwerken</button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
                const bootstrapModal = new bootstrap.Modal(modal);
                bootstrapModal.show();

                modal.addEventListener('hidden.bs.modal', () => {
                    modal.remove();
                });
            })
            .catch(error => {
                console.error('Error loading service:', error);
                this.showToast('Fout bij ophalen service gegevens', 'error');
            });
    }

    async saveService() {
        const form = document.getElementById('addServiceForm');
        const formData = new FormData(form);
        
        // Process features
        const featuresText = formData.get('features');
        const features = featuresText ? featuresText.split('\n').filter(f => f.trim()) : [];
        
        const serviceData = {
            name: formData.get('name'),
            subtitle: formData.get('subtitle'),
            description: formData.get('description'),
            category: formData.get('category'),
            package_type: formData.get('package_type'),
            price_range_min: formData.get('price_range_min') ? parseFloat(formData.get('price_range_min')) : null,
            price_range_max: formData.get('price_range_max') ? parseFloat(formData.get('price_range_max')) : null,
            duration_minutes: formData.get('duration_minutes') ? parseInt(formData.get('duration_minutes')) : null,
            duration_text: formData.get('duration_text'),
            features: features,
            icon: formData.get('icon'),
            image_url: formData.get('image_url'),
            active: formData.has('active'),
            featured: formData.has('featured')
        };

        try {
            await this.apiCall('POST', '/api/services', serviceData);
            this.showToast('Service succesvol toegevoegd', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addServiceModal')).hide();
            this.loadServices(); // Refresh the table
        } catch (error) {
            console.error('Error saving service:', error);
            this.showToast('Fout bij opslaan service', 'error');
        }
    }

    async updateService(serviceId) {
        const form = document.getElementById('editServiceForm');
        const formData = new FormData(form);
        
        // Process features
        const featuresText = formData.get('features');
        const features = featuresText ? featuresText.split('\n').filter(f => f.trim()) : [];
        
        const serviceData = {
            name: formData.get('name'),
            subtitle: formData.get('subtitle'),
            description: formData.get('description'),
            category: formData.get('category'),
            package_type: formData.get('package_type'),
            price_range_min: formData.get('price_range_min') ? parseFloat(formData.get('price_range_min')) : null,
            price_range_max: formData.get('price_range_max') ? parseFloat(formData.get('price_range_max')) : null,
            duration_minutes: formData.get('duration_minutes') ? parseInt(formData.get('duration_minutes')) : null,
            duration_text: formData.get('duration_text'),
            features: features,
            icon: formData.get('icon'),
            image_url: formData.get('image_url'),
            active: formData.has('active'),
            featured: formData.has('featured')
        };

        try {
            await this.apiCall('PUT', `/api/services/${serviceId}`, serviceData);
            this.showToast('Service succesvol bijgewerkt', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editServiceModal')).hide();
            this.loadServices(); // Refresh the table
        } catch (error) {
            console.error('Error updating service:', error);
            this.showToast('Fout bij bijwerken service', 'error');
        }
    }

    confirmDeleteService(serviceId, serviceName) {
        if (confirm(`Weet je zeker dat je de service "${serviceName}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`)) {
            this.deleteService(serviceId);
        }
    }

    async deleteService(serviceId) {
        try {
            await this.apiCall('DELETE', `/api/services/${serviceId}`);
            this.showToast('Service succesvol verwijderd', 'success');
            this.loadServices(); // Refresh the table
        } catch (error) {
            console.error('Error deleting service:', error);
            this.showToast('Fout bij verwijderen service', 'error');
        }
    }

    // Website Editor Functions
    showWebsitePreview(serviceId) {
        this.apiCall('GET', `/api/website-editor/services`)
            .then(data => {
                const service = data.services.find(s => s.id === serviceId);
                if (!service) {
                    this.showToast('Service niet gevonden', 'error');
                    return;
                }

                const modal = document.createElement('div');
                modal.className = 'modal fade';
                modal.id = 'websitePreviewModal';
                modal.innerHTML = `
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-eye text-info"></i> Website Preview: ${service.name}
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-info">
                                    <i class="bi bi-info-circle"></i> Zo ziet deze service eruit op de website:
                                </div>
                                
                                ${this.renderWebsiteServicePreview(service)}
                                
                                <div class="mt-4">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <h6><i class="bi bi-database"></i> Database Waarden:</h6>
                                            <table class="table table-sm">
                                                <tr><th>Naam:</th><td>${service.name}</td></tr>
                                                <tr><th>Ondertitel:</th><td>${service.subtitle || '<em>Geen</em>'}</td></tr>
                                                <tr><th>Prijs:</th><td>${service.formatted_price}</td></tr>
                                                <tr><th>Duur:</th><td>${service.formatted_duration || '<em>Geen</em>'}</td></tr>
                                                <tr><th>Icon:</th><td>${service.icon || '<em>Geen</em>'}</td></tr>
                                                <tr><th>Featured:</th><td>${service.featured ? 'Ja (Meest Gekozen)' : 'Nee'}</td></tr>
                                                <tr><th>Features:</th><td>${service.features_list.length} items</td></tr>
                                            </table>
                                        </div>
                                        <div class="col-md-6">
                                            <h6><i class="bi bi-link-45deg"></i> Links:</h6>
                                            <div class="d-grid gap-2">
                                                <a href="/admin/diensten.html" target="_blank" class="btn btn-outline-primary btn-sm">
                                                    <i class="bi bi-arrow-up-right-square"></i> Bekijk Live Diensten Pagina
                                                </a>
                                                <button class="btn btn-success btn-sm" onclick="adminApp.showWebsiteEditModal('${service.id}')">
                                                    <i class="bi bi-pencil"></i> Bewerk Website Content
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>
                                <button type="button" class="btn btn-success" onclick="adminApp.showWebsiteEditModal('${service.id}')">
                                    <i class="bi bi-pencil"></i> Bewerk Website Content
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
                const bootstrapModal = new bootstrap.Modal(modal);
                bootstrapModal.show();

                modal.addEventListener('hidden.bs.modal', () => {
                    modal.remove();
                });
            })
            .catch(error => {
                console.error('Error loading website preview:', error);
                this.showToast('Fout bij ophalen website preview', 'error');
            });
    }

    showWebsiteEditModal(serviceId) {
        this.apiCall('GET', `/api/website-editor/services`)
            .then(data => {
                const service = data.services.find(s => s.id === serviceId);
                if (!service) {
                    this.showToast('Service niet gevonden', 'error');
                    return;
                }

                const modal = document.createElement('div');
                modal.className = 'modal fade';
                modal.id = 'websiteEditModal';
                modal.innerHTML = `
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header bg-success text-white">
                                <h5 class="modal-title">
                                    <i class="bi bi-globe"></i> Website Content Bewerken: ${service.name}
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="alert alert-success">
                                    <i class="bi bi-info-circle"></i> <strong>Website Editor:</strong> Hier pas je alleen de content aan die op de website zichtbaar is. Technische instellingen staan in de normale service editor.
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-8">
                                        <form id="websiteEditForm">
                                            <input type="hidden" id="website_service_id" value="${service.id}">
                                            
                                            <div class="mb-3">
                                                <label for="website_name" class="form-label">Service Naam (zichtbaar op website)</label>
                                                <input type="text" class="form-control" id="website_name" name="name" value="${service.name}" required>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label for="website_subtitle" class="form-label">Ondertitel / Korte beschrijving</label>
                                                <input type="text" class="form-control" id="website_subtitle" name="subtitle" value="${service.subtitle || ''}" placeholder="Bijv. Het complete detailing pakket...">
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label for="website_description" class="form-label">Volledige beschrijving</label>
                                                <textarea class="form-control" id="website_description" name="description" rows="4">${service.description || ''}</textarea>
                                            </div>
                                            
                                            <div class="row">
                                                <div class="col-md-6 mb-3">
                                                    <label for="website_price_min" class="form-label">Prijs Van (€)</label>
                                                    <input type="number" class="form-control" id="website_price_min" name="price_range_min" value="${service.price_range_min || ''}" step="1" min="0">
                                                </div>
                                                <div class="col-md-6 mb-3">
                                                    <label for="website_price_max" class="form-label">Prijs Tot (€)</label>
                                                    <input type="number" class="form-control" id="website_price_max" name="price_range_max" value="${service.price_range_max || ''}" step="1" min="0">
                                                    <div class="form-text">Zelfde waarde = vaste prijs (€225), verschillende = bereik (€45-65)</div>
                                                </div>
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label for="website_duration_text" class="form-label">Duur Tekst (zoals getoond op website)</label>
                                                <input type="text" class="form-control" id="website_duration_text" name="duration_text" value="${service.duration_text || ''}" placeholder="Bijv. Intensieve behandeling: 4-6 uur pure arbeid">
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label for="website_image_url" class="form-label">Afbeelding (website)</label>
                                                <input type="text" class="form-control" id="website_image_url" name="image_url" value="${service.image_url || ''}" placeholder="images/service-name.jpg">
                                            </div>
                                            
                                            <div class="mb-3">
                                                <label for="website_features" class="form-label">Wat is inbegrepen (één per regel)</label>
                                                <textarea class="form-control" id="website_features" name="features" rows="6" placeholder="Pre-wash en snow foam&#10;Grondige handwas met premium producten&#10;Complete interieur detailing">${service.features_list.join('\\n')}</textarea>
                                            </div>
                                            
                                            <div class="form-check mb-3">
                                                <input type="checkbox" class="form-check-input" id="website_featured" name="featured" ${service.featured ? 'checked' : ''}>
                                                <label class="form-check-label" for="website_featured">
                                                    <strong>Featured</strong> - Toon "Meest Gekozen" badge op website
                                                </label>
                                            </div>
                                            
                                            <div class="form-check mb-3">
                                                <input type="checkbox" class="form-check-input" id="website_active" name="active" ${service.active ? 'checked' : ''}>
                                                <label class="form-check-label" for="website_active">
                                                    <strong>Actief</strong> - Zichtbaar op website
                                                </label>
                                            </div>
                                        </form>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6 class="mb-0"><i class="bi bi-eye"></i> Live Preview</h6>
                                            </div>
                                            <div class="card-body" id="websitePreviewContainer">
                                                ${this.renderWebsiteServicePreview(service)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-outline-secondary" onclick="adminApp.showWebsitePreview('${service.id}')">
                                    <i class="bi bi-eye"></i> Alleen Preview
                                </button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>
                                <button type="submit" class="btn btn-success" onclick="adminApp.saveWebsiteEdit('${service.id}')">
                                    <i class="bi bi-check-lg"></i> Website Content Opslaan
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
                const bootstrapModal = new bootstrap.Modal(modal);
                bootstrapModal.show();

                modal.addEventListener('hidden.bs.modal', () => {
                    modal.remove();
                });

                // Setup form submission AFTER modal is shown
                const form = document.getElementById('websiteEditForm');
                if (form) {
                    form.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        console.log('🚀 Form submitted via event listener');
                        await this.saveWebsiteEdit(serviceId);
                    });
                    console.log('✅ Form submission event listener added');
                } else {
                    console.error('❌ websiteEditForm not found');
                }

                // Add real-time preview updates
                this.setupWebsiteEditPreview();
            })
            .catch(error => {
                console.error('Error loading website edit modal:', error);
                this.showToast('Fout bij ophalen website edit modal', 'error');
            });
    }

    renderWebsiteServicePreview(service) {
        const badge = service.featured ? '<span class="badge bg-primary">Meest Gekozen</span>' : '';
        
        return `
            <div class="card" style="max-width: 400px;">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <span style="font-size: 1.2em;">${service.icon || '📋'}</span>
                        <strong>${service.name}</strong>
                    </div>
                    ${badge}
                </div>
                ${service.image_url ? `<img src="${service.image_url}" class="card-img-top" alt="${service.name}" style="height: 150px; object-fit: cover;">` : ''}
                <div class="card-body">
                    ${service.subtitle ? `<p class="text-muted"><em>${service.subtitle}</em></p>` : ''}
                    ${service.description ? `<p class="small">${service.description}</p>` : ''}
                    
                    ${service.features_list.length > 0 ? `
                        <h6>Wat is inbegrepen:</h6>
                        <ul class="small">
                            ${service.features_list.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    ` : ''}
                    
                    ${service.formatted_duration ? `<p class="text-info small">⏱️ ${service.formatted_duration}</p>` : ''}
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="text-muted small">Vanaf</span>
                        <h5 class="text-primary mb-0">${service.formatted_price}</h5>
                    </div>
                </div>
            </div>
        `;
    }

    setupWebsiteEditPreview() {
        // Real-time preview updates when typing
        const form = document.getElementById('websiteEditForm');
        const previewContainer = document.getElementById('websitePreviewContainer');
        
        if (!form || !previewContainer) return;
        
        const updatePreview = () => {
            const formData = new FormData(form);
            const features = formData.get('features') ? formData.get('features').split('\\n').filter(f => f.trim()) : [];
            
            const previewService = {
                name: formData.get('name') || 'Service Naam',
                subtitle: formData.get('subtitle'),
                description: formData.get('description'),
                formatted_price: this.formatPreviewPrice(formData.get('price_range_min'), formData.get('price_range_max')),
                formatted_duration: formData.get('duration_text'),
                icon: '📋', // Would need to get from original service
                image_url: formData.get('image_url'),
                featured: formData.has('featured'),
                features_list: features
            };
            
            previewContainer.innerHTML = this.renderWebsiteServicePreview(previewService);
        };
        
        // Add event listeners for real-time updates
        form.addEventListener('input', updatePreview);
        form.addEventListener('change', updatePreview);
    }

    formatPreviewPrice(min, max) {
        if (!min && !max) return 'Op aanvraag';
        if (!max || min === max) return `€${min || '0'}`;
        return `€${min} - €${max}`;
    }

    async saveWebsiteEdit(serviceId) {
        const form = document.getElementById('websiteEditForm');
        const formData = new FormData(form);
        
        // Process features
        const featuresText = formData.get('features');
        const features = featuresText ? featuresText.split('\\n').filter(f => f.trim()) : [];
        
        const websiteData = {
            name: formData.get('name'),
            subtitle: formData.get('subtitle'),
            description: formData.get('description'),
            price_range_min: formData.get('price_range_min') ? parseInt(formData.get('price_range_min')) : null,
            price_range_max: formData.get('price_range_max') ? parseInt(formData.get('price_range_max')) : null,
            duration_text: formData.get('duration_text'),
            image_url: formData.get('image_url'),
            features: features,
            featured: formData.has('featured'),
            active: formData.has('active')
        };

        try {
            await this.apiCall('PUT', `/api/website-editor/services/${serviceId}`, websiteData);
            this.showToast('Website content succesvol bijgewerkt! 🎉', 'success');
            bootstrap.Modal.getInstance(document.getElementById('websiteEditModal')).hide();
            this.loadServices(); // Refresh the table
        } catch (error) {
            console.error('Error updating website content:', error);
            this.showToast('Fout bij bijwerken website content', 'error');
        }
    }

    // Placeholder functions for expenses
    showAddExpenseModal() {
        this.showToast('Nieuwe uitgave functionaliteit komt binnenkort!', 'info');
    }

    viewExpense(id) {
        this.showToast(`Uitgave ${id} bekijken komt binnenkort!`, 'info');
    }

    editExpense(id) {
        this.showToast(`Uitgave ${id} bewerken komt binnenkort!`, 'info');
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