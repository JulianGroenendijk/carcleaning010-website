const { body, param, query, validationResult } = require('express-validator');

// Helper om validatie errors te formatteren
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validatie fouten',
            details: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

// Customer validatie rules
const validateCustomer = [
    body('email')
        .isEmail()
        .withMessage('Geldig email adres is verplicht')
        .normalizeEmail(),
    body('first_name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Voornaam is verplicht (max 100 tekens)'),
    body('last_name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Achternaam is verplicht (max 100 tekens)'),
    body('phone')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Telefoonnummer mag maximaal 50 tekens zijn'),
    body('address')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Adres mag maximaal 255 tekens zijn'),
    body('city')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Stad mag maximaal 100 tekens zijn'),
    body('postal_code')
        .optional()
        .trim()
        .isLength({ min: 1, max: 20 })
        .withMessage('Postcode mag maximaal 20 tekens zijn'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notities mogen maximaal 1000 tekens zijn'),
    handleValidationErrors
];

// Vehicle validatie rules
const validateVehicle = [
    body('make')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Merk is verplicht (max 100 tekens)'),
    body('model')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Model is verplicht (max 100 tekens)'),
    body('year')
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
        .withMessage('Geldig bouwjaar'),
    body('license_plate')
        .optional()
        .trim()
        .matches(/^[A-Z0-9-]+$/i)
        .withMessage('Geldig kenteken formaat'),
    body('color')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Kleur mag maximaal 50 tekens zijn'),
    handleValidationErrors
];

// Quote validatie rules
const validateQuote = [
    body('customer_id')
        .isUUID()
        .withMessage('Geldige klant ID is verplicht'),
    body('vehicle_id')
        .optional()
        .isUUID()
        .withMessage('Geldige voertuig ID'),
    body('services')
        .isArray({ min: 1 })
        .withMessage('Minimaal één service is verplicht'),
    body('services.*.service_id')
        .isUUID()
        .withMessage('Geldige service ID is verplicht'),
    body('services.*.quantity')
        .isInt({ min: 1 })
        .withMessage('Aantal moet minimaal 1 zijn'),
    body('services.*.unit_price')
        .isFloat({ min: 0 })
        .withMessage('Prijs moet 0 of hoger zijn'),
    body('valid_until')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Geldige datum'),
    handleValidationErrors
];

// Appointment validatie rules
const validateAppointment = [
    body('customer_id')
        .isUUID()
        .withMessage('Geldige klant ID is verplicht'),
    body('appointment_date')
        .isISO8601()
        .toDate()
        .withMessage('Geldige afspraak datum'),
    body('start_time')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Geldige start tijd (HH:MM formaat)'),
    body('end_time')
        .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Geldige eind tijd (HH:MM formaat)'),
    body('status')
        .optional()
        .isIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'])
        .withMessage('Ongeldige status'),
    // Custom validatie: eind tijd na start tijd
    body('end_time').custom((endTime, { req }) => {
        if (req.body.start_time && endTime <= req.body.start_time) {
            throw new Error('Eind tijd moet na start tijd zijn');
        }
        return true;
    }),
    handleValidationErrors
];

// Invoice validatie rules
const validateInvoice = [
    body('customer_id')
        .isUUID()
        .withMessage('Geldige klant ID is verplicht'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('Minimaal één factuuritem is verplicht'),
    body('items.*.service_name')
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Service naam is verplicht (max 200 tekens)'),
    body('items.*.quantity')
        .isFloat({ min: 0.01 })
        .withMessage('Aantal moet positief zijn'),
    body('items.*.unit_price')
        .isFloat({ min: 0.01 })
        .withMessage('Prijs per eenheid moet positief zijn'),
    body('due_date')
        .optional()
        .isISO8601()
        .toDate()
        .withMessage('Geldige vervaldatum'),
    handleValidationErrors
];

// Certificate validatie rules
const validateCertificate = [
    body('customer_id')
        .isUUID()
        .withMessage('Geldige klant ID is verplicht'),
    body('service_type')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Service type is verplicht'),
    body('service_date')
        .isISO8601()
        .toDate()
        .withMessage('Geldige service datum is verplicht'),
    body('warranty_period_months')
        .optional()
        .isInt({ min: 0, max: 60 })
        .withMessage('Garantieperiode moet tussen 0 en 60 maanden zijn'),
    handleValidationErrors
];

// Website lead validatie rules
const validateLead = [
    body('email')
        .optional()
        .isEmail()
        .withMessage('Geldig email adres')
        .normalizeEmail(),
    body('first_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Voornaam mag maximaal 100 tekens zijn'),
    body('last_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Achternaam mag maximaal 100 tekens zijn'),
    body('phone')
        .optional()
        .isMobilePhone('nl-NL')
        .withMessage('Geldig Nederlands telefoonnummer'),
    body('message')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Bericht mag maximaal 2000 tekens zijn'),
    handleValidationErrors
];

// UUID parameter validatie
const validateUUID = [
    param('id').isUUID().withMessage('Geldige ID is verplicht'),
    handleValidationErrors
];

// Pagination validatie
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Pagina moet een positief getal zijn'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limiet moet tussen 1 en 100 zijn'),
    handleValidationErrors
];

// Search validatie
const validateSearch = [
    query('q')
        .optional()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Zoekterm moet tussen 1 en 255 tekens zijn'),
    handleValidationErrors
];

// File upload validatie
const validateFileUpload = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Bestand is verplicht' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
            error: 'Bestandstype niet toegestaan. Alleen JPEG, PNG, GIF en PDF bestanden.' 
        });
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB default
    if (req.file.size > maxSize) {
        return res.status(400).json({ 
            error: `Bestand te groot. Maximum ${maxSize / 1024 / 1024}MB toegestaan.` 
        });
    }

    next();
};

module.exports = {
    handleValidationErrors,
    validateCustomer,
    validateVehicle,
    validateQuote,
    validateInvoice,
    validateCertificate,
    validateAppointment,
    validateLead,
    validateUUID,
    validatePagination,
    validateSearch,
    validateFileUpload
};