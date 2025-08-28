// Website API functions for retrieving content from backend
class WebsiteAPI {
    constructor() {
        this.baseURL = window.location.protocol + '//' + window.location.host;
        // Check if we're on the admin path and adjust accordingly
        if (window.location.pathname.startsWith('/admin')) {
            this.apiURL = this.baseURL + '/admin/api/website-content';
        } else {
            // Production or local development
            this.apiURL = this.baseURL + '/api/website-content';
        }
    }

    // Fetch services data for diensten.html
    async getServices() {
        try {
            const response = await fetch(`${this.apiURL}/services`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching services:', error);
            // Return fallback data or empty structure
            return {
                services: [],
                addons: [],
                total_services: 0,
                total_addons: 0
            };
        }
    }

    // Fetch projects data for projecten.html
    async getProjects(category = '', limit = '') {
        try {
            const params = new URLSearchParams();
            if (category && category !== 'all') params.append('category', category);
            if (limit) params.append('limit', limit);

            const response = await fetch(`${this.apiURL}/projects?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching projects:', error);
            return {
                projects: [],
                total_count: 0
            };
        }
    }

    // Fetch testimonials
    async getTestimonials(limit = 3, featuredOnly = false) {
        try {
            const params = new URLSearchParams();
            if (limit) params.append('limit', limit);
            if (featuredOnly) params.append('featured_only', 'true');

            const response = await fetch(`${this.apiURL}/testimonials?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching testimonials:', error);
            return {
                testimonials: [],
                total_count: 0
            };
        }
    }

    // Fetch project categories for filters
    async getProjectCategories() {
        try {
            const response = await fetch(`${this.apiURL}/project-categories`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching project categories:', error);
            return {
                categories: [],
                total_categories: 0
            };
        }
    }

    // Format price range for display
    formatPrice(service) {
        if (service.price_range_min && service.price_range_max) {
            if (service.price_range_min === service.price_range_max) {
                return `€${service.price_range_min}`;
            } else {
                return `€${service.price_range_min} - €${service.price_range_max}`;
            }
        } else if (service.base_price) {
            return `€${service.base_price}`;
        } else {
            return 'Op aanvraag';
        }
    }

    // Format rating stars
    formatRating(rating) {
        return '⭐'.repeat(rating || 5);
    }

    // Create service features HTML
    formatFeatures(features) {
        if (!features || !Array.isArray(features)) return '';
        
        return features.map(feature => `<li>${feature}</li>`).join('');
    }
}

// Initialize global API instance
window.websiteAPI = new WebsiteAPI();