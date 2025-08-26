// Mobile Navigation Toggle
function initMobileNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!hamburger || !navMenu) return;
    
    try {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close mobile menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-menu a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    } catch (error) {
        console.warn('Mobile navigation initialization error:', error);
    }
}


// Project Slider
function initProjectSlider() {
    const slides = document.querySelectorAll('.project-slide');
    if (slides.length === 0) return;
    
    let currentSlide = 0;
    const totalSlides = slides.length;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        if (slides[index]) {
            slides[index].classList.add('active');
        }
    }

    window.nextSlide = function() {
        currentSlide = (currentSlide + 1) % totalSlides;
        showSlide(currentSlide);
    }

    window.prevSlide = function() {
        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
        showSlide(currentSlide);
    }

    // Auto-advance slider
    setInterval(window.nextSlide, 5000);
}


// Smooth Scrolling - only for same-page anchors
function initSmoothScrolling() {
    try {
        const anchors = document.querySelectorAll('a[href^="#"]');
        anchors.forEach(anchor => {
            // Skip if it's a link to another page
            const href = anchor.getAttribute('href');
            if (!href || href.includes('.html') || href === '#') return;
            
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    } catch (error) {
        console.warn('Smooth scrolling initialization error:', error);
    }
}

// Call immediately
initSmoothScrolling();

// Header Background on Scroll
function initHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    try {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.style.backgroundColor = 'rgba(2, 4, 5, 0.98)';
            } else {
                header.style.backgroundColor = 'rgba(2, 4, 5, 0.95)';
            }
        });
    } catch (error) {
        console.warn('Header scroll initialization error:', error);
    }
}


// Original form handling for basic contact form
function initBasicContactForm() {
    const basicContactForm = document.querySelector('.contact-form form');
    if (!basicContactForm) return;
    
    try {
        basicContactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(basicContactForm);
            const formObject = {};
            formData.forEach((value, key) => {
                formObject[key] = value;
            });
            
            // Submit to admin API
            fetch('https://carcleaning010.nl/admin/api/website-leads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formObject)
            })
            .then(response => response.json())
            .then(result => {
                if (result.message) {
                    alert(result.message);
                } else {
                    alert('Bedankt voor uw bericht! Wij nemen zo spoedig mogelijk contact met u op.');
                }
                basicContactForm.reset();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Er is een fout opgetreden. Probeer het opnieuw of neem direct contact op.');
            });
        });
    } catch (error) {
        console.warn('Basic contact form initialization error:', error);
    }
}

// Call the function
initBasicContactForm();

// Add loading animation to service cards
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe service cards
document.querySelectorAll('.service-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Services Page Tab Filtering
function initServiceFiltering() {
    const serviceTabs = document.querySelectorAll('.service-tab');
    const serviceItems = document.querySelectorAll('.service-detailed');

    if (serviceTabs.length > 0 && serviceItems.length > 0) {
        serviceTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                try {
                    // Remove active class from all tabs
                    serviceTabs.forEach(t => t.classList.remove('active'));
                    // Add active class to clicked tab
                    tab.classList.add('active');
                    
                    const category = tab.getAttribute('data-category');
                    
                    // Show/hide services based on category
                    serviceItems.forEach(item => {
                        const itemCategory = item.getAttribute('data-category');
                        if (category === 'all' || itemCategory === category) {
                            item.classList.remove('hidden');
                        } else {
                            item.classList.add('hidden');
                        }
                    });
                } catch (error) {
                    console.warn('Service filtering error:', error);
                }
            });
        });
    }
}

// Call the function
initServiceFiltering();

// Portfolio Filter Functionality
function initPortfolioFiltering() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    if (filterButtons.length > 0 && portfolioItems.length > 0) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                try {
                    // Remove active class from all buttons
                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    // Add active class to clicked button
                    button.classList.add('active');
                    
                    const filter = button.getAttribute('data-filter');
                    
                    // Show/hide portfolio items based on filter
                    portfolioItems.forEach(item => {
                        const category = item.getAttribute('data-category');
                        if (filter === 'all' || category === filter) {
                            item.classList.remove('hidden');
                        } else {
                            item.classList.add('hidden');
                        }
                    });
                } catch (error) {
                    console.warn('Portfolio filtering error:', error);
                }
            });
        });
    }
}

// Call the function
initPortfolioFiltering();

// Contact Form Handling
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    
    try {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = contactForm.querySelector('.submit-button');
            const buttonText = submitButton?.querySelector('span');
            const buttonLoading = submitButton?.querySelector('.button-loading');
            
            if (submitButton && buttonText && buttonLoading) {
                // Show loading state
                buttonText.style.display = 'none';
                buttonLoading.style.display = 'flex';
                submitButton.disabled = true;
            }
            
            // Get form data
            const formData = new FormData(contactForm);
            const formObject = {};
            formData.forEach((value, key) => {
                if (formObject[key]) {
                    // Handle multiple values (checkboxes)
                    if (Array.isArray(formObject[key])) {
                        formObject[key].push(value);
                    } else {
                        formObject[key] = [formObject[key], value];
                    }
                } else {
                    formObject[key] = value;
                }
            });
            
            // Submit to admin API
            try {
                const response = await fetch('https://carcleaning010.nl/admin/api/website-leads', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formObject)
                });

                const result = await response.json();

                if (response.ok) {
                    // Success message
                    alert(result.message || 'Bedankt voor uw aanvraag! Wij nemen binnen 24 uur contact met u op.');
                } else {
                    // Error message from API
                    throw new Error(result.error || 'Er is een fout opgetreden');
                }
                contactForm.reset();
                
            } catch (error) {
                alert('Er is een fout opgetreden. Probeer het opnieuw of neem direct contact op.');
            } finally {
                // Reset button state
                if (submitButton && buttonText && buttonLoading) {
                    buttonText.style.display = 'inline';
                    buttonLoading.style.display = 'none';
                    submitButton.disabled = false;
                }
            }
        });
    } catch (error) {
        console.warn('Contact form initialization error:', error);
    }
}

// Call the function
initContactForm();

// File Upload Enhancement
function initFileUpload() {
    const fileInput = document.getElementById('photos');
    if (!fileInput) return;
    
    try {
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            const maxFiles = 5;
            
            if (files.length > maxFiles) {
                alert(`U kunt maximaal ${maxFiles} bestanden uploaden.`);
                e.target.value = '';
                return;
            }
            
            // Validate file types and sizes
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            const maxSize = 5 * 1024 * 1024; // 5MB
            
            for (let file of files) {
                if (!validTypes.includes(file.type)) {
                    alert(`${file.name} is geen geldige afbeelding. Gebruik JPG, PNG of GIF.`);
                    e.target.value = '';
                    return;
                }
                
                if (file.size > maxSize) {
                    alert(`${file.name} is te groot. Maximum bestandsgrootte is 5MB.`);
                    e.target.value = '';
                    return;
                }
            }
            
            // Show selected files count
            const label = document.querySelector('label[for="photos"]');
            if (label && files.length > 0) {
                label.textContent = `${files.length} bestand(en) geselecteerd`;
            } else if (label) {
                label.textContent = 'Upload foto\'s van uw voertuig (max. 5 foto\'s)';
            }
        });
    } catch (error) {
        console.warn('File upload initialization error:', error);
    }
}

// Call the function
initFileUpload();

// Enhanced scroll animations
function initScrollAnimations() {
    try {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe various elements for animations
        const animatedElements = document.querySelectorAll(
            '.service-card, .portfolio-card, .testimonial-card, .before-after-item, .contact-option, .faq-item, .feature-item'
        );

        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            animationObserver.observe(el);
        });
    } catch (error) {
        console.warn('Scroll animations initialization error:', error);
    }
}

// Call the function
initScrollAnimations();

// Page-specific initializations
document.addEventListener('DOMContentLoaded', () => {
    // Current page detection
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Update active navigation
    const navLinks = document.querySelectorAll('.nav-menu a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage || 
            (currentPage === '' && linkHref === 'index.html') ||
            (currentPage === 'index.html' && linkHref === 'index.html')) {
            link.classList.add('active');
        }
    });
    
    // Placeholder image handling
    const placeholderImages = document.querySelectorAll('img[src*="placeholder"]');
    placeholderImages.forEach(img => {
        const altText = img.getAttribute('alt') || 'Placeholder';
        img.style.background = '#333';
        img.style.color = '#fff';
        img.style.display = 'flex';
        img.style.alignItems = 'center';
        img.style.justifyContent = 'center';
        img.style.fontSize = '0.9rem';
        img.style.textAlign = 'center';
        img.style.minHeight = '200px';
        
        // Create placeholder text
        const placeholder = document.createElement('div');
        placeholder.textContent = `[${altText}]`;
        placeholder.style.padding = '20px';
        
        img.style.display = 'none';
        img.parentNode.appendChild(placeholder);
        placeholder.style.background = '#333';
        placeholder.style.color = '#fff';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.minHeight = '200px';
        placeholder.style.borderRadius = '10px';
    });
    
    // Initialize page-specific features
    try {
        if (currentPage === 'diensten.html') {
            // Services page specific initialization
            initServiceFiltering();
        } else if (currentPage === 'projecten.html') {
            // Projects page specific initialization
            initPortfolioFiltering();
        } else if (currentPage === 'contact.html') {
            // Contact page specific initialization
            initContactForm();
            initFileUpload();
        }
        
        // Initialize common features (called for all pages)
        initScrollAnimations();
        initProjectSlider();
        initBasicContactForm();
        initMobileNavigation();
        initHeaderScroll();
        initSmoothScrolling();
    } catch (error) {
        console.warn('Page-specific initialization error:', error);
    }
});

// Utility function for smooth scrolling to elements
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    // ESC key to close mobile menu
    if (e.key === 'Escape') {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (hamburger && navMenu) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    }
});