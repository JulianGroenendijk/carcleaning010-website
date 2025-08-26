const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class PDFGenerator {
    constructor() {
        this.browser = null;
    }

    // Browser instance beheren
    async getBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process' // Voor VPS compatibiliteit
                ]
            });
        }
        return this.browser;
    }

    // Sluit browser
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    // Genereer offerte PDF
    async generateQuotePDF(quoteData) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
            // A4 formaat instellen
            await page.setViewport({
                width: 794,
                height: 1123,
                deviceScaleFactor: 2
            });

            // HTML template voor offerte
            const html = this.getQuoteTemplate(quoteData);
            
            await page.setContent(html, {
                waitUntil: 'networkidle0'
            });

            // Genereer PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                },
                displayHeaderFooter: true,
                headerTemplate: '<div></div>', // Lege header
                footerTemplate: `
                    <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
                        Carcleaning010 - Pagina <span class="pageNumber"></span> van <span class="totalPages"></span>
                    </div>
                `
            });

            return pdfBuffer;

        } finally {
            await page.close();
        }
    }

    // Genereer factuur PDF
    async generateInvoicePDF(invoiceData) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
            await page.setViewport({
                width: 794,
                height: 1123,
                deviceScaleFactor: 2
            });

            const html = this.getInvoiceTemplate(invoiceData);
            
            await page.setContent(html, {
                waitUntil: 'networkidle0'
            });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                },
                displayHeaderFooter: true,
                headerTemplate: '<div></div>',
                footerTemplate: `
                    <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
                        Carcleaning010 - Factuur - Pagina <span class="pageNumber"></span> van <span class="totalPages"></span>
                    </div>
                `
            });

            return pdfBuffer;

        } finally {
            await page.close();
        }
    }

    // Genereer certificaat PDF
    async generateCertificatePDF(certificateData) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
            await page.setViewport({
                width: 794,
                height: 1123,
                deviceScaleFactor: 2
            });

            const html = this.getCertificateTemplate(certificateData);
            
            await page.setContent(html, {
                waitUntil: 'networkidle0'
            });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '10mm',
                    right: '10mm',
                    bottom: '10mm',
                    left: '10mm'
                }
            });

            return pdfBuffer;

        } finally {
            await page.close();
        }
    }

    // HTML template voor offerte
    getQuoteTemplate(data) {
        const formatCurrency = (amount) => `€ ${parseFloat(amount).toFixed(2).replace('.', ',')}`;
        const formatDate = (date) => new Date(date).toLocaleDateString('nl-NL');

        return `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #333;
                    background: white;
                }

                .header {
                    background: linear-gradient(135deg, #020405 0%, #333 100%);
                    color: white;
                    padding: 30px;
                    margin-bottom: 40px;
                }

                .header h1 {
                    font-size: 32px;
                    font-weight: 700;
                    margin-bottom: 5px;
                }

                .header .subtitle {
                    color: #FFF200;
                    font-size: 16px;
                    font-weight: 500;
                }

                .company-info {
                    text-align: right;
                    margin-top: 20px;
                    font-size: 12px;
                    opacity: 0.9;
                }

                .content {
                    padding: 0 30px;
                }

                .quote-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 40px;
                    background: #f8f9fa;
                    padding: 25px;
                    border-radius: 8px;
                }

                .quote-info h2 {
                    color: #020405;
                    margin-bottom: 15px;
                    font-size: 24px;
                }

                .quote-details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 30px;
                    margin-bottom: 40px;
                }

                .customer-info, .vehicle-info {
                    background: white;
                    border: 1px solid #e9ecef;
                    border-radius: 8px;
                    padding: 20px;
                }

                .customer-info h3, .vehicle-info h3 {
                    color: #020405;
                    margin-bottom: 15px;
                    font-size: 18px;
                    border-bottom: 2px solid #FFF200;
                    padding-bottom: 8px;
                }

                .services-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }

                .services-table th {
                    background: #020405;
                    color: white;
                    padding: 15px;
                    text-align: left;
                    font-weight: 600;
                }

                .services-table td {
                    padding: 12px 15px;
                    border-bottom: 1px solid #e9ecef;
                }

                .services-table tr:nth-child(even) {
                    background: #f8f9fa;
                }

                .totals {
                    text-align: right;
                    margin-bottom: 40px;
                }

                .total-row {
                    display: flex;
                    justify-content: flex-end;
                    margin-bottom: 8px;
                    font-size: 16px;
                }

                .total-row.grand-total {
                    font-size: 20px;
                    font-weight: 700;
                    color: #020405;
                    border-top: 2px solid #FFF200;
                    padding-top: 15px;
                    margin-top: 15px;
                }

                .total-label {
                    width: 200px;
                    padding-right: 20px;
                }

                .terms {
                    background: #f8f9fa;
                    padding: 25px;
                    border-radius: 8px;
                    border-left: 4px solid #FFF200;
                    margin-bottom: 30px;
                }

                .terms h3 {
                    color: #020405;
                    margin-bottom: 15px;
                }

                .footer {
                    text-align: center;
                    margin-top: 40px;
                    padding: 25px;
                    background: #020405;
                    color: white;
                    border-radius: 8px;
                }

                .footer .highlight {
                    color: #FFF200;
                    font-weight: 600;
                }

                @media print {
                    .header { margin-bottom: 20px; }
                    .content { padding: 0 15px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>OFFERTE</h1>
                <div class="subtitle">Premium auto detailing met aandacht voor elk detail</div>
                <div class="company-info">
                    <div><strong>Carcleaning010</strong></div>
                    <div>T: +31 6 36 52 97 93</div>
                    <div>E: info@carcleaning010.nl</div>
                    <div>W: carcleaning010.nl</div>
                </div>
            </div>

            <div class="content">
                <div class="quote-header">
                    <div class="quote-info">
                        <h2>Offerte ${data.quote_number}</h2>
                        <div><strong>Datum:</strong> ${formatDate(data.created_at)}</div>
                        ${data.valid_until ? `<div><strong>Geldig tot:</strong> ${formatDate(data.valid_until)}</div>` : ''}
                    </div>
                </div>

                <div class="quote-details">
                    <div class="customer-info">
                        <h3>Klantgegevens</h3>
                        <div><strong>${data.customer.first_name} ${data.customer.last_name}</strong></div>
                        <div>${data.customer.email}</div>
                        ${data.customer.phone ? `<div>${data.customer.phone}</div>` : ''}
                        ${data.customer.address ? `<div>${data.customer.address}</div>` : ''}
                        ${data.customer.city ? `<div>${data.customer.postal_code} ${data.customer.city}</div>` : ''}
                    </div>

                    ${data.vehicle ? `
                    <div class="vehicle-info">
                        <h3>Voertuiggegevens</h3>
                        <div><strong>${data.vehicle.make} ${data.vehicle.model}</strong></div>
                        ${data.vehicle.year ? `<div>Bouwjaar: ${data.vehicle.year}</div>` : ''}
                        ${data.vehicle.license_plate ? `<div>Kenteken: ${data.vehicle.license_plate}</div>` : ''}
                        ${data.vehicle.color ? `<div>Kleur: ${data.vehicle.color}</div>` : ''}
                    </div>
                    ` : ''}
                </div>

                <table class="services-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th style="width: 80px;">Aantal</th>
                            <th style="width: 100px;">Prijs per stuk</th>
                            <th style="width: 100px;">Totaal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                        <tr>
                            <td>
                                <strong>${item.service_name}</strong>
                                ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                            </td>
                            <td>${item.quantity}</td>
                            <td>${formatCurrency(item.unit_price)}</td>
                            <td><strong>${formatCurrency(item.total_price)}</strong></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="total-row">
                        <div class="total-label">Subtotaal:</div>
                        <div>${formatCurrency(data.subtotal)}</div>
                    </div>
                    <div class="total-row">
                        <div class="total-label">BTW (21%):</div>
                        <div>${formatCurrency(data.tax_amount)}</div>
                    </div>
                    <div class="total-row grand-total">
                        <div class="total-label">Totaal:</div>
                        <div>${formatCurrency(data.total_amount)}</div>
                    </div>
                </div>

                <div class="terms">
                    <h3>Voorwaarden</h3>
                    <ul>
                        <li>Deze offerte is ${data.valid_until ? `geldig tot ${formatDate(data.valid_until)}` : '30 dagen geldig'}</li>
                        <li>Alle prijzen zijn inclusief BTW</li>
                        <li>Uitsluitend werkzaam op afspraak</li>
                        <li>Betaling direct na voltooiing van de werkzaamheden</li>
                        <li>Bij annulering binnen 24 uur kunnen kosten in rekening worden gebracht</li>
                        <li>Werkzaamheden worden uitgevoerd volgens vakmanschap en met hoogwaardige producten</li>
                    </ul>
                    ${data.notes ? `<div style="margin-top: 15px;"><strong>Opmerkingen:</strong><br>${data.notes}</div>` : ''}
                </div>

                <div class="footer">
                    <div>Heeft u vragen over deze offerte?</div>
                    <div>Neem direct contact op: <span class="highlight">+31 6 36 52 97 93</span></div>
                    <div style="margin-top: 15px; font-size: 12px;">
                        Carcleaning010 - Waar perfectie en vakmanschap samenkomen
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Basis HTML template voor factuur (vergelijkbaar met offerte maar met factuur specifieke elementen)
    getInvoiceTemplate(data) {
        // Similar structure maar dan met factuur styling en velden
        // Voor beknoptheid gebruik ik een vereenvoudigde versie
        return this.getQuoteTemplate(data).replace(/OFFERTE/g, 'FACTUUR').replace(/Offerte/g, 'Factuur');
    }

    // HTML template voor certificaat
    getCertificateTemplate(data) {
        const formatDate = (date) => new Date(date).toLocaleDateString('nl-NL');

        return `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                body {
                    font-family: 'Inter', sans-serif;
                    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                    margin: 0;
                    padding: 40px;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .certificate {
                    background: white;
                    border: 8px solid #020405;
                    border-radius: 20px;
                    padding: 60px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    position: relative;
                    overflow: hidden;
                }

                .certificate::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 8px;
                    background: linear-gradient(90deg, #FFF200, #020405, #FFF200);
                }

                .certificate-header {
                    margin-bottom: 40px;
                }

                .certificate-title {
                    font-size: 48px;
                    font-weight: 700;
                    color: #020405;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                }

                .certificate-subtitle {
                    font-size: 20px;
                    color: #666;
                    margin-bottom: 30px;
                }

                .certificate-number {
                    background: #FFF200;
                    padding: 8px 20px;
                    border-radius: 25px;
                    font-weight: 600;
                    color: #020405;
                    display: inline-block;
                }

                .certificate-content {
                    margin: 40px 0;
                    font-size: 18px;
                    line-height: 1.8;
                }

                .customer-name {
                    font-size: 32px;
                    font-weight: 700;
                    color: #020405;
                    margin: 30px 0;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }

                .vehicle-info {
                    font-size: 20px;
                    color: #666;
                    margin: 20px 0;
                    font-weight: 500;
                }

                .services-performed {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    border-left: 4px solid #FFF200;
                }

                .services-performed h3 {
                    color: #020405;
                    margin-bottom: 15px;
                    font-size: 18px;
                }

                .warranty-info {
                    background: #e8f5e8;
                    border: 2px solid #4caf50;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 30px 0;
                    color: #2e7d32;
                    font-weight: 600;
                }

                .certificate-footer {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }

                .signature-section {
                    text-align: center;
                }

                .signature-line {
                    border-bottom: 2px solid #333;
                    width: 200px;
                    margin: 20px 0 10px 0;
                }

                .date-issued {
                    text-align: right;
                    color: #666;
                }

                .company-logo {
                    font-size: 24px;
                    font-weight: 700;
                    color: #020405;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="certificate">
                <div class="certificate-header">
                    <h1 class="certificate-title">Certificaat</h1>
                    <div class="certificate-subtitle">van Uitgevoerde Werkzaamheden</div>
                    <div class="certificate-number">Nr. ${data.certificate_number}</div>
                </div>

                <div class="certificate-content">
                    <div>Hierbij certificeren wij dat voor</div>
                    
                    <div class="customer-name">
                        ${data.customer.first_name} ${data.customer.last_name}
                    </div>

                    ${data.vehicle ? `
                    <div class="vehicle-info">
                        ${data.vehicle.make} ${data.vehicle.model}
                        ${data.vehicle.license_plate ? `(${data.vehicle.license_plate})` : ''}
                    </div>
                    ` : ''}

                    <div>de onderstaande werkzaamheden zijn uitgevoerd:</div>

                    <div class="services-performed">
                        <h3>${data.title}</h3>
                        <div>${data.description || ''}</div>
                        ${data.services_performed && data.services_performed.length > 0 ? `
                        <ul>
                            ${data.services_performed.map(service => `<li>${service}</li>`).join('')}
                        </ul>
                        ` : ''}
                    </div>

                    ${data.warranty_months && data.warranty_months > 0 ? `
                    <div class="warranty-info">
                        ✓ Garantie: ${data.warranty_months} ${data.warranty_months === 1 ? 'maand' : 'maanden'}
                        ${data.expires_date ? `<br>Geldig tot: ${formatDate(data.expires_date)}` : ''}
                    </div>
                    ` : ''}
                </div>

                <div class="certificate-footer">
                    <div class="signature-section">
                        <div class="signature-line"></div>
                        <div>Jordy</div>
                        <div style="font-size: 12px; color: #666;">Carcleaning010</div>
                    </div>
                    
                    <div class="date-issued">
                        <div>Uitgegeven op:</div>
                        <div><strong>${formatDate(data.issued_date || new Date())}</strong></div>
                    </div>
                </div>

                <div class="company-logo">
                    CARCLEANING010
                    <div style="font-size: 12px; font-weight: 400; color: #666; margin-top: 5px;">
                        Premium detailing met persoonlijke aandacht
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Test PDF generator
    async generateTestPDF(data) {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Test PDF</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            margin: 0;
                            padding: 40px;
                        }
                        .header {
                            text-align: center;
                            border-bottom: 3px solid #FFF200;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }
                        .logo {
                            font-size: 28px;
                            font-weight: bold;
                            color: #020405;
                        }
                        .content {
                            margin: 20px 0;
                        }
                        .footer {
                            margin-top: 40px;
                            text-align: center;
                            font-size: 12px;
                            color: #666;
                            border-top: 1px solid #eee;
                            padding-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">Carcleaning010</div>
                        <div>Test PDF Document</div>
                    </div>
                    
                    <div class="content">
                        <h2>${data.title}</h2>
                        <p>${data.content}</p>
                        <p><strong>Gegenereerd op:</strong> ${new Date(data.generated_at).toLocaleString('nl-NL')}</p>
                    </div>
                    
                    <div class="footer">
                        <p>Dit is een test document gegenereerd door het Carcleaning010 Admin Systeem</p>
                    </div>
                </body>
                </html>
            `;

            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                }
            });

            return pdfBuffer;
        } finally {
            await page.close();
        }
    }
}

// Singleton instance
const pdfGenerator = new PDFGenerator();

// Export functions that match the expected interface
const generateQuotePDF = async (quoteData) => {
    return await pdfGenerator.generateQuotePDF(quoteData);
};

const generateInvoicePDF = async (invoiceData) => {
    return await pdfGenerator.generateInvoicePDF(invoiceData);
};

const generateCertificatePDF = async (certificateData) => {
    return await pdfGenerator.generateCertificatePDF(certificateData);
};

const generateTestPDF = async (data) => {
    return await pdfGenerator.generateTestPDF(data);
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    await pdfGenerator.closeBrowser();
});

process.on('SIGINT', async () => {
    await pdfGenerator.closeBrowser();
});

module.exports = {
    generateQuotePDF,
    generateInvoicePDF,
    generateCertificatePDF,
    generateTestPDF
};