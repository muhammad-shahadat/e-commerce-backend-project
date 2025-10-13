require("dotenv").config();
const createError = require('http-errors');
const jwt = require("jsonwebtoken");


const handleProtectedRoute = async (req, res, next) => {

    try {
        const accessToken = req.cookies.accessToken;

        const jwtAccessKey = process.env.JWT_ACCESS_KEY || "kdhfielidfoej";

        const decoded = jwt.verify(accessToken, jwtAccessKey);

        req.user = decoded;

        next();


    } catch (error) {

        if (error.name === "TokenExpiredError") {

            return next(createError(401, "Refresh Token has expired. Please log in again."));
        } else if (error.name === "JsonWebTokenError") {

            return next(createError(401, "Invalid Token!"));
        } else {
            next(error);
        }
        
    }

}

module.exports = {
    handleProtectedRoute,
}