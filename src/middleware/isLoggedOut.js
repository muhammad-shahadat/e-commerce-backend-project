require("dotenv").config();
const createError = require('http-errors');
const jwt = require("jsonwebtoken");

const isLoggedOut = async (req, res, next) => {

    try {

        const secretKey = process.env.JWT_ACCESS_KEY || "kdhfielidfoej";

        const token = req.cookies.accessToken;
        if(!token) {
            return next();
        }

        const decoded = jwt.verify(token, secretKey);
        if(decoded){
            return next(createError(400, "user is already logged in!"));
        }
        
    } catch (error) {
        console.error("JWT verification failed:", error.message);
        next();
        
    }

}

module.exports = {
    isLoggedOut,
}