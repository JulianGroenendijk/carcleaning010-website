// Simpele, robuuste JavaScript voor Carcleaning010 website
console.log('Carcleaning010 JavaScript loaded');

// Mobile Navigation - Altijd werkend
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Mobile hamburger menu
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        console.log('Mobile menu found');
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
            console.log('Mobile menu toggled');
        });
        
        // Close menu when clicking nav links
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
    
    // Header scroll effect
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 100) {
                header.style.backgroundColor = 'rgba(2, 4, 5, 0.98)';
            } else {
                header.style.backgroundColor = 'rgba(2, 4, 5, 0.95)';
            }
        });
    }
    
    // Project slider (alleen op home pagina)
    const slides = document.querySelectorAll('.project-slide');
    if (slides.length > 0) {
        console.log('Project slider found');
        let currentSlide = 0;
        
        function showSlide(n) {
            slides.forEach(function(slide) {
                slide.classList.remove('active');
            });
            if (slides[n]) {
                slides[n].classList.add('active');
            }
        }
        
        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }
        
        function prevSlide() {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
        }
        
        // Make functions global for onclick handlers
        window.nextSlide = nextSlide;
        window.prevSlide = prevSlide;
        
        // Auto advance
        setInterval(nextSlide, 5000);
    }
    
    // Service tabs (alleen op diensten pagina)
    const serviceTabs = document.querySelectorAll('.service-tab');
    const serviceItems = document.querySelectorAll('.service-detailed');
    
    if (serviceTabs.length > 0 && serviceItems.length > 0) {
        console.log('Service tabs found');
        serviceTabs.forEach(function(tab) {
            tab.addEventListener('click', function() {
                // Remove active from all tabs
                serviceTabs.forEach(function(t) {
                    t.classList.remove('active');
                });
                
                // Add active to clicked tab
                tab.classList.add('active');
                
                // Filter services
                const category = tab.getAttribute('data-category');
                serviceItems.forEach(function(item) {
                    const itemCategory = item.getAttribute('data-category');
                    if (category === 'all' || itemCategory === category) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                });
            });
        });
    }
    
    // Portfolio filter (alleen op projecten pagina)
    const filterBtns = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    if (filterBtns.length > 0 && portfolioItems.length > 0) {
        console.log('Portfolio filter found');
        filterBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                // Remove active from all buttons
                filterBtns.forEach(function(b) {
                    b.classList.remove('active');
                });
                
                // Add active to clicked button
                btn.classList.add('active');
                
                // Filter items
                const filter = btn.getAttribute('data-filter');
                portfolioItems.forEach(function(item) {
                    const category = item.getAttribute('data-category');
                    if (filter === 'all' || category === filter) {
                        item.classList.remove('hidden');
                    } else {
                        item.classList.add('hidden');
                    }
                });
            });
        });
    }
    
    // Contact forms
    const contactForms = document.querySelectorAll('form');
    contactForms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Bedankt voor uw bericht! Wij nemen zo spoedig mogelijk contact met u op.');
            form.reset();
        });
    });
    
    // Scroll animations
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Animate elements
    const animateElements = document.querySelectorAll('.service-card, .portfolio-card, .testimonial-card, .contact-option, .feature-item');
    animateElements.forEach(function(el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Handle placeholder images
    const placeholderImages = document.querySelectorAll('img[src*="placeholder"]');
    placeholderImages.forEach(function(img) {
        const altText = img.getAttribute('alt') || 'Placeholder';
        const placeholder = document.createElement('div');
        placeholder.textContent = '[' + altText + ']';
        placeholder.style.cssText = 'background: #333; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 200px; border-radius: 10px; padding: 20px; font-size: 0.9rem;';
        
        if (img.parentNode) {
            img.style.display = 'none';
            img.parentNode.appendChild(placeholder);
        }
    });
    
    console.log('All JavaScript initialized successfully');
});