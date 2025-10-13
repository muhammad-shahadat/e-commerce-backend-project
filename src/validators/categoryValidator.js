const {body} = require("express-validator");




const createCategoryValidator = [
    body("categoryName")
    .trim()
    .notEmpty()
    .withMessage("category name is required")
    .isLength({min: 3})
    .withMessage("category name should be at least 3 characters"),

    body("parentId")
    .optional({checkFalsy: true})
    .isInt({min: 1})
    .withMessage("Parent ID must be a valid integer."),
];



module.exports = {
    createCategoryValidator,
}