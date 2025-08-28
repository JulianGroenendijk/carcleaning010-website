/**
 * Reusable Modal Component
 * Provides consistent modal behavior across all modules
 */
class ModalComponent {
    constructor(options = {}) {
        this.options = {
            id: options.id || Utils.generateUUID(),
            title: options.title || '',
            size: options.size || '', // 'sm', 'lg', 'xl'
            backdrop: options.backdrop !== false,
            keyboard: options.keyboard !== false,
            ...options
        };
        
        this.modal = null;
        this.bootstrapModal = null;
    }

    /**
     * Create modal HTML structure
     */
    create(content, footerButtons = null) {
        this.remove(); // Clean up any existing modal
        
        const sizeClass = this.options.size ? `modal-${this.options.size}` : '';
        
        this.modal = document.createElement('div');
        this.modal.className = 'modal fade';
        this.modal.id = this.options.id;
        this.modal.tabIndex = -1;
        
        this.modal.innerHTML = `
            <div class="modal-dialog ${sizeClass}">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${Utils.escapeHtml(this.options.title)}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${footerButtons ? `<div class="modal-footer">${footerButtons}</div>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        
        // Initialize Bootstrap modal
        this.bootstrapModal = new bootstrap.Modal(this.modal, {
            backdrop: this.options.backdrop,
            keyboard: this.options.keyboard
        });

        // Setup cleanup on hide
        this.modal.addEventListener('hidden.bs.modal', () => {
            this.remove();
        });

        return this;
    }

    /**
     * Show the modal
     */
    show() {
        if (this.bootstrapModal) {
            this.bootstrapModal.show();
        }
        return this;
    }

    /**
     * Hide the modal
     */
    hide() {
        if (this.bootstrapModal) {
            this.bootstrapModal.hide();
        }
        return this;
    }

    /**
     * Remove modal from DOM
     */
    remove() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
        this.bootstrapModal = null;
    }

    /**
     * Get modal element
     */
    getElement() {
        return this.modal;
    }

    /**
     * Get form data from modal (if it contains a form)
     */
    getFormData(schema = {}) {
        const form = this.modal.querySelector('form');
        if (!form) return {};
        
        const formData = new FormData(form);
        return Utils.parseFormData(formData, schema);
    }

    /**
     * Setup form submission handler
     */
    setupFormHandler(callback, schema = {}) {
        const form = this.modal.querySelector('form');
        if (!form) {
            console.warn('No form found in modal for form handler setup');
            return this;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const data = this.getFormData(schema);
                await callback(data);
            } catch (error) {
                console.error('Form submission error:', error);
                Utils.showToast(error.message || 'Er is een fout opgetreden', 'error');
            }
        });

        return this;
    }

    /**
     * Create confirmation modal
     */
    static confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const modal = new ModalComponent({
                title,
                size: 'sm',
                ...options
            });

            const content = `<p>${Utils.escapeHtml(message)}</p>`;
            const footer = `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    ${options.cancelText || 'Annuleren'}
                </button>
                <button type="button" class="btn btn-${options.type || 'primary'}" id="confirmBtn">
                    ${options.confirmText || 'Bevestigen'}
                </button>
            `;

            modal.create(content, footer).show();

            // Setup button handlers
            const confirmBtn = modal.getElement().querySelector('#confirmBtn');
            confirmBtn.addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });

            modal.getElement().addEventListener('hidden.bs.modal', () => {
                resolve(false);
            });
        });
    }

    /**
     * Create alert modal
     */
    static alert(title, message, type = 'info') {
        const modal = new ModalComponent({
            title,
            size: 'sm'
        });

        const content = `
            <div class="alert alert-${type} mb-0">
                ${Utils.escapeHtml(message)}
            </div>
        `;
        
        const footer = `
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                OK
            </button>
        `;

        modal.create(content, footer).show();
    }
}

window.ModalComponent = ModalComponent;