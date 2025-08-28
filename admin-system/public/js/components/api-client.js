/**
 * Centralized API Client
 * Handles all HTTP requests with consistent error handling and authentication
 */
class ApiClient {
    constructor() {
        this.baseURL = window.location.origin + '/admin';
        this.token = localStorage.getItem('adminToken') || '';
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('adminToken', token);
        } else {
            localStorage.removeItem('adminToken');
        }
    }

    getToken() {
        return this.token;
    }

    isAuthenticated() {
        return !!this.token;
    }

    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                ...options.headers
            },
            ...options
        };

        if (data && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
            config.body = JSON.stringify(data);
        }

        try {
            console.log(`🌐 API ${method.toUpperCase()} ${endpoint}`, data || '');
            const response = await fetch(url, config);
            
            if (!response.ok) {
                let errorMessage;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
                    console.error('API Error Response:', errorData);
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return response;
            }
        } catch (error) {
            console.error(`❌ API Error (${method.toUpperCase()} ${endpoint}):`, error);
            throw error;
        }
    }

    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    async verifyToken() {
        if (!this.token) return false;
        try {
            await this.get('/api/auth/verify');
            return true;
        } catch (error) {
            console.warn('Token verification failed:', error.message);
            this.setToken('');
            return false;
        }
    }

    async login(email, password) {
        try {
            const response = await this.post('/api/auth/login', { email, password });
            this.setToken(response.token);
            return response;
        } catch (error) {
            this.setToken('');
            throw error;
        }
    }

    logout() {
        this.setToken('');
        window.location.href = '/admin/';
    }
}

window.ApiClient = ApiClient;