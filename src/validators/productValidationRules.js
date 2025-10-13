const {body, check} = require("express-validator");
const createError = require("http-errors");



const productValidationRules = [

    body("title")
    .trim()
    .notEmpty().withMessage('Product title is required.')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters.'),

    body("finalCategoryId")
    .notEmpty().withMessage('Category selection is required.')
    .isInt({ min: 1 }).withMessage('Category ID must be a valid number.'),

    body("description")
    .optional({ checkFalsy: true })
    .isLength({ max: 5000 }).withMessage('Description cannot exceed 5000 characters.'),

    body('basePrice')
    .notEmpty().withMessage('Base Price is required.')
    .isFloat({ min: 0.01 }).withMessage('Base Price must be a positive number.'),

    body('discountPercent')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100 percent.'),

    body('variants')
    .customSanitizer(value => {

        let parsedValue = value;

        if (typeof value === 'string') {
            try {
                parsedValue = JSON.parse(value);
            } catch (e) {
                return [];
            }
        }

        
        if (!Array.isArray(parsedValue)) {
            return [];
        }

        
        return parsedValue.map(item => {
            if (typeof item !== 'object' || item === null) {
                return item;
            }
            return { ...item }; 
        });
        
    }),

    // Variants Array Validation (variants[i][property] format)
    body('variants')
        .isArray().withMessage('Variants must be an array.')
        .notEmpty().withMessage('Product must have at least one variant (or default quantity).'),

    //check fields in Variants array.
    body('variants.*.quantity') //check every element of array
        .notEmpty().withMessage('Variant quantity is required.')
        .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer.'),

    body('variants.*.priceModifier')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0.01 }).withMessage('Price modifier must be a positive number.'),

    //Variant Options (Color/Size)
    body('variants.*.color')
        .optional({ checkFalsy: true })
        .isLength({ max: 100 }).withMessage('Color name is too long.'),

    body('variants.*.size')
        .optional({ checkFalsy: true })
        .isLength({ max: 100 }).withMessage('Size name is too long.'),

     body('mainImageIndex')
        .notEmpty().withMessage('Main image index is required.')
        .isInt({ min: 0 }).withMessage('Main image index must be a non-negative integer.'),

        
    check('files')
    .custom((value, { req }) => {
        
        if (!req.files || req.files.length === 0) {
           
            throw new Error('Product must have at least one image uploaded.');
        }

        if (req.files.length > 10) {
            throw new Error('You can upload a maximum of 10 images.');
        }

        return true;
    }),         


    
];

module.exports = {
    productValidationRules,
}