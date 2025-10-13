require("dotenv").config();
const createError = require('http-errors');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const pool = require("../../config/db");
const { createJsonWebToken } = require("../helper/jsonWebToken");
const { emailWithNodemailer } = require("../helper/nodemailer");
const { successResponse } = require("./responseController");

const saltRounds = 10;
const isProduction = process.env.NODE_ENV === "production";




const handlecreateUser = async (req, res, next) =>{
    try {
        const {name, username, email, password} = req.body;


        

        let selectSql = "SELECT * FROM  users WHERE email = ?";
        const [rows] = await pool.execute(selectSql, [email]);

        if(rows.length > 0){

            return next(createError(409, "email is already exist!"));
        }

        const hashPassword = await bcrypt.hash(password, saltRounds);

        const jwtPayload = {
            name: name,
            username: username,
            email: email,
            hashPassword: hashPassword,
        }

        const expiresIn = {
            expiresIn: "30m",
        }

        const secretKey = process.env.JWT_ACTIVATION_KEY || "dkrhenfenieht";

        const token = await createJsonWebToken(jwtPayload, secretKey, expiresIn);

        //Prepare mail
        const mailData = {
            email,
            subject: "Account Activation Email",
            html: `
                <h2>Hello ${name} !</h2>
                <p>Please click here to <a href="${process.env.CLIENT_URL}/api/users/activate/${token}" target="_blank" >Verify your account</a></p>
                `
        }

        await emailWithNodemailer(mailData);

        successResponse(res, {
            statusCode: 200,
            message: `please go to your ${email} for completing registratoin process`, 
            payload: {token}
        })
                   
    } catch (error) {
        next(error)
        
    }
} 

const handleActivateUserAccount = async (req, res, next) =>{
    try {
        
        const token = req.body.token;
        if(!token){
            return next(createError(404, "token not found"));
        }

        const secretKey = process.env.JWT_ACTIVATION_KEY || "dkrhenfenieht";

        const decoded = jwt.verify(token, secretKey);
        if(!decoded){
            return next(createError(401, "unable to verify user"));
        }

        const [existingUser] = await pool.execute(
            "SELECT * FROM users WHERE email = ?", [decoded.email]
        );

        if (existingUser.length > 0) {
            return next(createError(409, "User account is already activated, Please sign in."));
        }
        

        const [result] = await pool.execute(
            "INSERT INTO users (name, username, email, hash_password) VALUES (?, ?, ?, ?)",
            [decoded.name, decoded.username, decoded.email, decoded.hashPassword]
        );

        successResponse(res, {
            statusCode: 201,
            message: "user was registered successfully",
            payload: {
                user: {
                    id: result.insertId,
                    name: decoded.name,
                    username: decoded.username,
                    email: decoded.email, 
                }

            }

        })
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return next(createError(401, "Token has expired"));
        } 
        else if (error.name === "JsonWebTokenError") {
            return next(createError(401, "Invalid Token!"));
        }
        else{
            next(error);
        }
        
    }

}


const handleloginUser = async (req, res, next) =>{
    try {
        const {email, password} = req.body;
        let sql = "SELECT * FROM users WHERE email = ?";
        const [rows] = await pool.execute(sql, [email]);

        if(rows.length === 0){
            return next(createError(401, "Invalid email or password!"))
        }

        let hashPassword = rows[0].hash_password;
        const match = await bcrypt.compare(password, hashPassword);

        if(!match){
            return next(createError(401, "Invalid email or password!"))
        }

        if(rows[0].is_banned){
            return next(createError(403, "you are banned! Please contact with authority."))
        }

        const jwtPayload = {
            id: rows[0].id,
            name: rows[0].name,
            username: rows[0].username,
            email: rows[0].email,
            role: rows[0].role,
            isBanned: rows[0].is_banned,
        }

        const expiresIn = {
            expiresIn: "10m",
        }

        const jwtAccessKey = process.env.JWT_ACCESS_KEY || "kdhfielidfoej";

        const accessToken = await createJsonWebToken(jwtPayload, jwtAccessKey, expiresIn);

        res.cookie("accessToken", accessToken, {
            //10 min same as jwt expiresIn.
            maxAge: 10 * 60 * 1000,
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        })

        const jwtRefreshKey = process.env.JWT_REFRESH_KEY || "refresh_key_@shaon";

        const refreshToken = await createJsonWebToken(jwtPayload, jwtRefreshKey, {expiresIn: "7d"});

        res.cookie("refreshToken", refreshToken, {
            //7 days same as jwt expiresIn.
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        })


        successResponse(res, {
            statusCode: 200,
            message: "login successful",
            payload: {
                user: {
                    id: rows[0].id,
                    name: rows[0].name,
                    email: rows[0].email,
                    username: rows[0].username,
                    role: rows[0].role,
                    isBanned: rows[0].is_banned
                },
                token: "Bearer " + accessToken,


            }

        })

        

    } catch (error) {
        
        next(error)
        
    }
}

const handleRefreshToken = async (req, res, next) => {
    try {

        const oldRefreshToken = req.cookies.refreshToken;

        const jwtRefreshKey = process.env.JWT_REFRESH_KEY || "refresh_key_@shaon";

        const decoded = jwt.verify(oldRefreshToken, jwtRefreshKey);

        
        /* ====================================
        in future, db check logic will be here.
        ========================================*/

        //logics are same as login handler.
        const jwtPayload = {
            id: decoded.id,
            name: decoded.name,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            isBanned: decoded.isBanned,
        }


        const jwtAccessKey = process.env.JWT_ACCESS_KEY || "kdhfielidfoej";

        const accessToken = await createJsonWebToken(jwtPayload, jwtAccessKey, {expiresIn: "10m"});

        const newRefreshToken = await createJsonWebToken(jwtPayload, jwtRefreshKey, {expiresIn: "7d"});

        /*===========================================
        in future, delete old refresh token and store new one.
        ============================================ */

        res.cookie("accessToken", accessToken, {
            //10 min same as jwt expiresIn.
            maxAge: 10 * 60 * 1000,
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        })

        res.cookie("refreshToken", newRefreshToken, {
            //7 days same as jwt expiresIn.
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        })



        successResponse(res, {
            statusCode: 200,
            message: "Tokens refreshed successfully",
            payload: {
                user:jwtPayload,
                token: accessToken,
            }

        })
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

const handlelogoutUser = async (req, res, next) => {

    try {

         /*=======================================
        in future, db logic will be as follow:

        
        const refreshTokenToInvalidate = req.cookies.refreshToken;

        if (refreshTokenToInvalidate) {
            //if 'refresh_tokens' are kept different table
            await pool.execute(`DELETE FROM refresh_tokens WHERE token = ?`, [refreshTokenToInvalidate]);
        }
        ========================================== */

        // Clear the cookie
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",

        });

       

        successResponse(res, {
            statusCode: 200,
            message: "logout successful",
            payload: {}

        })

    } catch (error) {
        next(error)
        
    }
    
}

const handleUserProfile = (req, res) =>{
    return res.status(200).send({
        user: {
            id: req.user.id,
            name: req.user.name,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role,
        }
    })
}

const handleAdminDashboard = (req, res) =>{
    return res.status(200).send({
        user: {
            id: req.user.id,
            name: req.user.name,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role,
        }
    })
} 


module.exports = {
    handlecreateUser,
    handleloginUser,
    handlelogoutUser,
    handleActivateUserAccount,
    handleUserProfile,
    handleRefreshToken,
    handleAdminDashboard,

}