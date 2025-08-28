/**
 * Shared utility functions
 * Common functionality used across all modules
 */
class Utils {
    
    /**
     * Format price for display
     */
    static formatPrice(price, options = {}) {
        const { 
            showVATStatus = true, 
            showCurrency = true,
            decimals = 2 
        } = options;
        
        if (!price || price === 0) return showCurrency ? '€0,00' : '0,00';
        
        const formatted = parseFloat(price).toFixed(decimals).replace('.', ',');
        const priceStr = showCurrency ? `€${formatted}` : formatted;
        
        if (showVATStatus) {
            return `${priceStr} (incl. BTW)`;
        }
        
        return priceStr;
    }

    /**
     * Format service price range
     */
    static formatServicePrice(service) {
        if (service.price_range_min && service.price_range_max) {
            if (service.price_range_min === service.price_range_max) {
                return `€${parseFloat(service.price_range_min).toFixed(0)}`;
            } else {
                return `€${parseFloat(service.price_range_min).toFixed(0)} - €${parseFloat(service.price_range_max).toFixed(0)}`;
            }
        } else if (service.base_price) {
            return `€${parseFloat(service.base_price).toFixed(0)}`;
        } else {
            return 'Op aanvraag';
        }
    }

    /**
     * Get effective price for calculations (use price_range_min or fall back to base_price)
     */
    static getEffectivePrice(service) {
        return service.price_range_min || service.base_price || 0;
    }

    /**
     * Format duration
     */
    static formatDuration(service) {
        if (service.duration_text) {
            return service.duration_text;
        } else if (service.duration_minutes) {
            const hours = Math.floor(service.duration_minutes / 60);
            const minutes = service.duration_minutes % 60;
            return minutes > 0 ? `${hours}u ${minutes}m` : `${hours}u`;
        } else {
            return '';
        }
    }

    /**
     * Debounce function calls
     */
    static debounce(func, wait) {
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

    /**
     * Show toast notification
     */
    static showToast(message, type = 'info', duration = 4000) {
        // Remove existing toast
        const existingToast = document.querySelector('.admin-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new toast
        const toast = document.createElement('div');
        toast.className = `admin-toast alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 500px;
        `;
        
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.remove();
            }
        }, duration);
    }

    /**
     * Parse form data with proper type conversion
     */
    static parseFormData(formData, schema = {}) {
        const result = {};
        
        for (const [key, value] of formData.entries()) {
            const type = schema[key] || 'string';
            
            switch (type) {
                case 'number':
                case 'float':
                    result[key] = value ? parseFloat(value) : null;
                    break;
                case 'int':
                case 'integer':
                    result[key] = value ? parseInt(value) : null;
                    break;
                case 'boolean':
                    result[key] = formData.has(key);
                    break;
                case 'array':
                    result[key] = value ? value.split('\n').filter(v => v.trim()) : [];
                    break;
                default:
                    result[key] = value || null;
            }
        }
        
        return result;
    }

    /**
     * Generate UUID v4
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Safe HTML escape
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Format date for display
     */
    static formatDate(date, options = {}) {
        const { format = 'short', includeTime = false } = options;
        
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const dateOptions = {
            year: 'numeric',
            month: format === 'long' ? 'long' : '2-digit',
            day: '2-digit'
        };
        
        let formatted = d.toLocaleDateString('nl-NL', dateOptions);
        
        if (includeTime) {
            formatted += ` ${d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
        }
        
        return formatted;
    }
}

window.Utils = Utils;