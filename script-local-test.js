// Test script for local admin API testing
console.log('Local test script loaded');

document.addEventListener('DOMContentLoaded', function() {
    // Contact forms - Test with local API
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        console.log('Contact form found for local testing');
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitButton = contactForm.querySelector('.submit-button');
            const buttonText = submitButton ? submitButton.querySelector('span') : null;
            const buttonLoading = submitButton ? submitButton.querySelector('.button-loading') : null;
            
            if (submitButton && buttonText && buttonLoading) {
                // Show loading state
                buttonText.style.display = 'none';
                buttonLoading.style.display = 'flex';
                submitButton.disabled = true;
            }
            
            // Get form data and map field names to API format
            const formData = new FormData(contactForm);
            const rawObject = {
                first_name: formData.get('firstName'),
                last_name: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                service_type: Array.from(formData.getAll('services[]')).join(', ') || undefined,
                vehicle_info: [
                    formData.get('carBrand'),
                    formData.get('carModel'),
                    formData.get('carYear'),
                    formData.get('carColor')
                ].filter(Boolean).join(', ') || undefined,
                message: [
                    formData.get('message'),
                    'Locatie: ' + formData.get('city') + (formData.get('postcode') ? ' (' + formData.get('postcode') + ')' : ''),
                    'Service locatie: ' + formData.get('serviceLocation'),
                    'Voertuig staat: ' + formData.get('carCondition'),
                    'Gewenste datum: ' + formData.get('preferredDate'),
                    'Voorkeurstijd: ' + formData.get('preferredTime')
                ].filter(Boolean).join('\n') || undefined
            };
            
            // Remove empty/null/undefined fields
            const formObject = {};
            Object.keys(rawObject).forEach(key => {
                if (rawObject[key] && rawObject[key] !== '') {
                    formObject[key] = rawObject[key];
                }
            });
            
            console.log('Sending form data to LOCAL API:', formObject);
            
            // Submit to LOCAL admin API
            console.log('Starting LOCAL API call to:', 'http://localhost:3001/api/website-leads');
            fetch('http://localhost:3001/api/website-leads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formObject)
            })
            .then(function(response) {
                console.log('LOCAL API Response status:', response.status);
                console.log('LOCAL API Response ok:', response.ok);
                console.log('LOCAL API Response headers:', response.headers.get('content-type'));
                
                if (!response.ok) {
                    // Try to get error message from response
                    return response.text().then(function(text) {
                        console.log('LOCAL API Error response text:', text);
                        let errorData;
                        try {
                            errorData = JSON.parse(text);
                            console.log('LOCAL API Error response data:', errorData);
                            throw new Error('HTTP ' + response.status + ': ' + (errorData.error || response.statusText));
                        } catch (e) {
                            throw new Error('HTTP ' + response.status + ': ' + response.statusText + ' - ' + text);
                        }
                    });
                }
                
                return response.json();
            })
            .then(function(result) {
                console.log('LOCAL API Success result:', result);
                if (result.message) {
                    alert('LOCAL TEST SUCCESS: ' + result.message);
                } else {
                    alert('LOCAL TEST SUCCESS: Bedankt voor uw aanvraag! Wij nemen binnen 24 uur contact met u op.');
                }
                contactForm.reset();
            })
            .catch(function(error) {
                console.error('LOCAL API Error:', error);
                alert('LOCAL TEST ERROR: ' + error.message);
            })
            .finally(function() {
                // Reset button state
                if (submitButton && buttonText && buttonLoading) {
                    buttonText.style.display = 'inline';
                    buttonLoading.style.display = 'none';
                    submitButton.disabled = false;
                }
            });
        });
    }
});