/**
 * Main Admin Application
 * Coordinates all modules and handles initialization
 */
class AdminApp {
    constructor() {
        this.api = new ApiClient();
        this.modules = {};
        this.currentSection = 'dashboard';
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🚀 AdminApp initializing...');

        try {
            // Check authentication
            const isAuthenticated = await this.verifyToken();
            
            if (!isAuthenticated) {
                this.showLoginScreen();
                return;
            }

            // Show main application
            this.showMainApplication();

            // Initialize modules
            await this.initializeModules();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial content
            await this.loadSectionContent(this.currentSection);

            this.isInitialized = true;
            console.log('✅ AdminApp initialized successfully');

        } catch (error) {
            console.error('❌ AdminApp initialization failed:', error);
            Utils.showToast('Fout bij laden applicatie: ' + error.message, 'error');
        }
    }

    /**
     * Verify authentication token
     */
    async verifyToken() {
        return await this.api.verifyToken();
    }

    /**
     * Show login screen
     */
    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('d-none');
        document.getElementById('mainApp').classList.add('d-none');
        this.setupLoginEventListeners();
    }

    /**
     * Show main application
     */
    showMainApplication() {
        document.getElementById('loginScreen').classList.add('d-none');
        document.getElementById('mainApp').classList.remove('d-none');
    }

    /**
     * Initialize all modules
     */
    async initializeModules() {
        console.log('📦 Initializing modules...');

        // Initialize modules
        this.modules.services = new ServicesModule(this.api);
        this.modules.websiteEditor = new WebsiteEditorModule(this.api);
        // Add more modules here as they are created

        // Initialize each module
        for (const [name, module] of Object.entries(this.modules)) {
            if (typeof module.init === 'function') {
                module.init();
                console.log(`✅ ${name} module initialized`);
            }
        }

        // Make modules globally accessible for onclick handlers
        window.servicesModule = this.modules.services;
        window.websiteEditorModule = this.modules.websiteEditor;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('data-section');
                this.loadSectionContent(section);
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    /**
     * Setup login event listeners
     */
    setupLoginEventListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    /**
     * Handle login form submission
     */
    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            Utils.showToast('Vul beide velden in', 'error');
            return;
        }

        try {
            await this.api.login(email, password);
            Utils.showToast('Succesvol ingelogd! 🎉', 'success');
            
            // Reload the page to reinitialize everything
            window.location.reload();
            
        } catch (error) {
            console.error('Login failed:', error);
            Utils.showToast('Inloggen mislukt: ' + error.message, 'error');
        }
    }

    /**
     * Load content for a specific section
     */
    async loadSectionContent(section) {
        console.log(`📄 Loading section: ${section}`);
        
        this.currentSection = section;
        
        // Update active navigation
        this.updateActiveNavigation(section);
        
        // Update page title
        this.updatePageTitle(section);
        
        // Load section content
        try {
            switch (section) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'services':
                    await this.loadServices();
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
                default:
                    this.showNotImplemented(section);
            }
        } catch (error) {
            console.error(`Error loading ${section}:`, error);
            Utils.showToast(`Fout bij laden ${section}: ` + error.message, 'error');
        }
    }

    /**
     * Update active navigation
     */
    updateActiveNavigation(section) {
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current section
        const activeLink = document.querySelector(`[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    /**
     * Update page title
     */
    updatePageTitle(section) {
        const titles = {
            'dashboard': 'Dashboard',
            'services': 'Diensten',
            'customers': 'Klanten',
            'quotes': 'Offertes',
            'appointments': 'Afspraken',
            'invoices': 'Facturen'
        };
        
        document.title = `${titles[section] || section} - CarCleaning010 Admin`;
        
        const breadcrumb = document.getElementById('currentSection');
        if (breadcrumb) {
            breadcrumb.textContent = titles[section] || section;
        }
    }

    /**
     * Load dashboard
     */
    async loadDashboard() {
        document.getElementById('contentArea').innerHTML = `
            <div class="row">
                <div class="col-12">
                    <h2>Dashboard</h2>
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> Dashboard wordt momenteel ontwikkeld...
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load services section
     */
    async loadServices() {
        document.getElementById('contentArea').innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2>Diensten Beheer</h2>
                <div>
                    <button class="btn btn-outline-primary" id="refreshServicesBtn">
                        <i class="bi bi-arrow-clockwise"></i> Vernieuwen
                    </button>
                    <button class="btn btn-primary" id="addServiceBtn">
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
                            <tbody>
                                <tr>
                                    <td colspan="6" class="text-center py-4">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Laden...</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Load services through the services module
        await this.modules.services.loadServices();
    }

    /**
     * Show not implemented message
     */
    showNotImplemented(section) {
        document.getElementById('contentArea').innerHTML = `
            <div class="row">
                <div class="col-12">
                    <h2>${section.charAt(0).toUpperCase() + section.slice(1)}</h2>
                    <div class="alert alert-warning">
                        <i class="bi bi-construction"></i> Deze sectie wordt momenteel ontwikkeld...
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Placeholder methods for other sections
     */
    async loadCustomers() {
        this.showNotImplemented('customers');
    }

    async loadQuotes() {
        this.showNotImplemented('quotes');
    }

    async loadAppointments() {
        this.showNotImplemented('appointments');
    }

    async loadInvoices() {
        this.showNotImplemented('invoices');
    }

    /**
     * Logout user
     */
    logout() {
        this.api.logout();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Create global app instance
    window.adminApp = new AdminApp();
    
    // Initialize the app
    await window.adminApp.init();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Utils.showToast('Er is een onverwachte fout opgetreden', 'error');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Utils.showToast('Er is een onverwachte fout opgetreden', 'error');
    event.preventDefault();
});