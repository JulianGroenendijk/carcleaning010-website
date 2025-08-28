// Dynamic content loader for projecten.html
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Loading dynamic projects content...');
        
        // Get projects data from API
        const data = await window.websiteAPI.getProjects();
        console.log('Projects data loaded:', data);

        // Load projects
        loadProjects(data.projects);
        
        // Load testimonials 
        const testimonialData = await window.websiteAPI.getTestimonials(3, true);
        loadTestimonials(testimonialData.testimonials);

        // Update filter functionality
        updateProjectFilters();

    } catch (error) {
        console.error('Error loading projects content:', error);
        // Keep existing static content as fallback
    }
});

function loadProjects(projects) {
    const container = document.querySelector('.portfolio-grid');
    if (!container || projects.length === 0) return;

    console.log('Loading projects:', projects);

    // Clear existing content
    container.innerHTML = '';

    projects.forEach(project => {
        const projectHTML = `
            <div class="portfolio-item" data-category="${project.category}">
                <div class="portfolio-card">
                    <div class="portfolio-image">
                        <img src="${project.main_image_url || 'images/hero-car-detailing-1920x1080.jpg'}" alt="${project.title}">
                        <div class="portfolio-overlay">
                            <h3>${project.title}</h3>
                            <p>${project.description}</p>
                            <div class="project-rating">${window.websiteAPI.formatRating(project.rating)}</div>
                        </div>
                    </div>
                    <div class="portfolio-info">
                        <div class="project-details">
                            <span class="project-type">${project.service_type || 'Detailing'}</span>
                            <span class="project-location">${project.location || ''}</span>
                        </div>
                        ${project.testimonial ? `<p class="project-description">"${project.testimonial}"</p>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += projectHTML;
    });
}

function loadTestimonials(testimonials) {
    const container = document.querySelector('.testimonials-grid');
    if (!container || testimonials.length === 0) return;

    console.log('Loading testimonials:', testimonials);

    // Clear existing content
    container.innerHTML = '';

    testimonials.forEach(testimonial => {
        const customerTitle = testimonial.customer_title || 
            (testimonial.car_make && testimonial.car_model ? 
                `${testimonial.car_make} ${testimonial.car_model} Eigenaar` : 
                'Tevreden Klant');

        const testimonialHTML = `
            <div class="testimonial-card">
                <div class="testimonial-content">
                    <p>"${testimonial.content}"</p>
                </div>
                <div class="testimonial-author">
                    <strong>${testimonial.customer_name}</strong>
                    <span>${customerTitle}</span>
                </div>
                <div class="testimonial-rating">${window.websiteAPI.formatRating(testimonial.rating)}</div>
            </div>
        `;
        
        container.innerHTML += testimonialHTML;
    });
}

function updateProjectFilters() {
    // Get filter buttons and portfolio items
    const filterButtons = document.querySelectorAll('.filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterValue = this.getAttribute('data-filter');

            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Filter portfolio items
            portfolioItems.forEach(item => {
                const itemCategory = item.getAttribute('data-category');
                
                if (filterValue === 'all' || itemCategory === filterValue) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

// Add function to dynamically load more projects
async function loadMoreProjects(category = '', offset = 0) {
    try {
        const data = await window.websiteAPI.getProjects(category, 6); // Load 6 more
        
        if (data.projects.length > 0) {
            const container = document.querySelector('.portfolio-grid');
            data.projects.forEach(project => {
                // Add new projects to existing grid
                const projectHTML = createProjectHTML(project);
                container.innerHTML += projectHTML;
            });
        }
    } catch (error) {
        console.error('Error loading more projects:', error);
    }
}

function createProjectHTML(project) {
    return `
        <div class="portfolio-item" data-category="${project.category}">
            <div class="portfolio-card">
                <div class="portfolio-image">
                    <img src="${project.main_image_url || 'images/hero-car-detailing-1920x1080.jpg'}" alt="${project.title}">
                    <div class="portfolio-overlay">
                        <h3>${project.title}</h3>
                        <p>${project.description}</p>
                        <div class="project-rating">${window.websiteAPI.formatRating(project.rating)}</div>
                    </div>
                </div>
                <div class="portfolio-info">
                    <div class="project-details">
                        <span class="project-type">${project.service_type || 'Detailing'}</span>
                        <span class="project-location">${project.location || ''}</span>
                    </div>
                    ${project.testimonial ? `<p class="project-description">"${project.testimonial}"</p>` : ''}
                </div>
            </div>
        </div>
    `;
}