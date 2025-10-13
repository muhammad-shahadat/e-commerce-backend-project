const {body} = require("express-validator");
const createError = require("http-errors");

const userRegistrationValidator = [
    body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3, max: 32 })
    .withMessage("Name should be 3-32 characters")
    .escape(),  

    body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 8, max: 32 })
    .withMessage("Username should be 8-32 characters")
    .matches(/^[A-Za-z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscore")
    .escape(),

    body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid Email"),
    
    body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({min: 6})
    .withMessage("Password should be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .withMessage("password should contains one uppercase, one lowercae letter, one number and one specail case letter"),

    body("userImage")
    .optional()
    .isString()
    .withMessage("Image path must be a string"),
];

const userLoginValidator = [

    body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid Email"),
    
    body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({min: 6})
    .withMessage("Password should be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .withMessage("password should contains one uppercase, one lowercae letter, one number and one specail case letter"),

];

const updatePasswordValidator = [

    body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("new password is required")
    .isLength({min: 6})
    .withMessage("new password should be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&-]+$/)
    .withMessage("new password should contains one uppercase, one lowercae letter, one number and one special case letter"),

    body("confirmedPassword").custom((value, meta) => {
        const {req} = meta; // Object Destructuring
        if(value !== req.body.newPassword){
            throw createError(422, "password did not match");
        }
        return true;

    })

];

const forgotPasswordValidator = [

    body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid Email"),

];

const resetPasswordValidator = [

    body("token")
    .trim()
    .notEmpty()
    .withMessage("token is required"),

    body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("new password is required")
    .isLength({min: 6})
    .withMessage("new password should be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&-]+$/)
    .withMessage("new password should contains one uppercase, one lowercae letter, one number and one special case letter"),
    
    body("confirmedPassword").custom((value, meta) => {
        const {req} = meta; // Object Destructuring
        if(value !== req.body.newPassword){
            throw createError(422, "password did not match");
        }
        return true;

    })

]

module.exports = {
    userRegistrationValidator,
    userLoginValidator,
    updatePasswordValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
}