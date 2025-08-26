const express = require('express');
const { verifyToken: authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Alle routes vereisen authenticatie
router.use(authMiddleware);

// Deze route wordt gebruikt door andere modules voor PDF generatie
// De eigenlijke PDF generatie gebeurt in de specifieke route modules
// (quotes.js, invoices.js, certificates.js) via hun eigen /pdf endpoints

// GET /api/pdf/test - Test PDF generatie
router.get('/test', async (req, res) => {
    try {
        const { generateTestPDF } = require('../utils/pdfGenerator');
        
        const testData = {
            title: 'Test PDF Document',
            content: 'Dit is een test PDF gegenereerd door het Carcleaning010 admin systeem.',
            generated_at: new Date().toISOString()
        };

        const pdfBuffer = await generateTestPDF(testData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating test PDF:', error);
        res.status(500).json({ error: 'Fout bij genereren test PDF' });
    }
});

module.exports = router;