require("dotenv").config();
const createError = require("http-errors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../../config/db");
const { emailWithNodemailer } = require("../helper/nodemailer");
const { createJsonWebToken } = require("../helper/jsonWebToken");

const saltRounds = 10;



const countTotalUsers = async (searchQuery) =>{
    const countQuery = `SELECT COUNT(*) AS total_users FROM users 
    WHERE  role != 'admin' AND (name LIKE ? OR email LIKE ?)`;
    const [results] = await pool.execute(countQuery, [searchQuery, searchQuery]);


    return results[0].total_users;

}

const findUsersBySearch = async (page, searchQuery, numericLimit, offset) => {

    try {
        const totalUsers = await countTotalUsers(searchQuery);

        if(!totalUsers){
            throw createError(404, "users not found");
        }

        const [results] = await pool.execute(
            `SELECT id, name, username, email, role, is_banned FROM users
            WHERE role != 'admin' 
            AND (name LIKE ? OR email LIKE ?)
            LIMIT ? 
            OFFSET ?`,
            [searchQuery, searchQuery, numericLimit, offset]
        );

        if(results.length === 0){
            throw createError(404, "users not found");
        }

        const totalPages = Math.ceil(totalUsers / numericLimit);

        return {
            users: results,
            totalUsers,
            pagination: {
                currentPage: Number(page),
                totalPages,
                previousPage: (Number(page) - 1) > 0 ? (Number(page) -1) : null,
                nextPage: (Number(page) + 1) <= totalPages ? (Number(page) + 1) : null,
            },

        }
        
    } catch (error) {
        throw createError(error);
        
    }

}

const findUserById = async (id) =>{

    try {
        
        const [rows] = await pool.execute(
            `SELECT id, name, username, email, role, is_banned
            FROM users
            WHERE role != 'admin' AND id = ?`,
            [id]
        );

        if(rows.length === 0){
            throw createError(404, `user not found with this id`);
        }

        return rows[0];

    } catch (error) {
        throw error;

    }

}

const removeUserById = async (id) => {
    try {

        const [rows] = await pool.execute(
            `DELETE FROM users 
            WHERE role != "admin" AND id = ?`,
            [id]
        )


        if(rows.affectedRows === 0){
            throw createError(404, "User not found or could not be deleted");
        }

    } catch (error) {
        throw error;
        
    }


}

const updateUserPasswordById = async (id, oldPassword, newPassword, confirmedPassword) => {
    try {
        const [rows] = await pool.execute(
            `SELECT * FROM users
            WHERE id = ?`,
            [id]
        );

        if(rows.length === 0){
            throw createError(404, "user not found with this id");
        }

        const oldHashPassword = rows[0].hash_password;

        const match = await bcrypt.compare(oldPassword, oldHashPassword);

        if(!match){
            throw createError(409, "invalid old password");
        }

        if(newPassword !== confirmedPassword){
            throw createError(409, "password did not mathc");
        }
        const newHashPassword = await bcrypt.hash(newPassword, saltRounds);

        const [results] = await pool.execute(
            `UPDATE users 
            SET hash_password = ?
            WHERE id = ?`,
            [newHashPassword, id]   
        )
        if(results.affectedRows === 0){
            throw createError(500, "password could not be updated");
        }

        return rows;
    } catch (error) {
        throw error;
        
    }

}

const forgotPassword = async (email) => {
    try {

        const [rows] = await pool.execute(
            `SELECT * FROM users
            WHERE email = ?`,
            [email]
        )

        if(rows.length === 0) {
            throw createError(404, "user not found");
        }

        const secretKey = process.env.JWT_FORGOT_PASS_KEY || "forget_pass-word@key";

        const jwtPayload = {
            id: rows[0].id,
            name: rows[0].id,
            username: rows[0].username,
            email,
        }

        const expiresIn = {
            expiresIn: "30m",
        }

        const token = await createJsonWebToken(jwtPayload, secretKey, expiresIn);

        //Prepare mail
        const mailData = {
            email,
            subject: "Forgot Password Activation Email",
            html: `
                <h2>Hello ${rows[0].name} !</h2>
                <p>Please click here to <a href="${process.env.CLIENT_URL}/api/users/reset-password/${token}" target="_blank" >Reset your password</a></p>
                `
        }

        await emailWithNodemailer(mailData);

        return token;

    } catch (error) {
        throw error;
        
    }
}

const resetPassword = async (token, newPassword, confirmedPassword) => {

    try {

        const secretKey = process.env.JWT_FORGOT_PASS_KEY || "forget_pass-word@key"; // same as forgot password

        const decoded = jwt.verify(token, secretKey);

        if(newPassword !== confirmedPassword) {
            throw createError(422, "password did not match"); // best practice is validation using express vaidator. 
        }

        const hashPassword = await bcrypt.hash(newPassword, saltRounds);

        const [results] = await pool.execute(
            `UPDATE users SET hash_password = ?
            WHERE id = ?`,
            [hashPassword, decoded.id]
        )

        if(results.affectedRows === 0) {
            throw createError(404, "user not found or password could not be reset");
        }
    } catch (error) {
        throw error;
        
    }
}

module.exports = {
    findUserById,
    findUsersBySearch,
    removeUserById,
    updateUserPasswordById,
    forgotPassword,
    resetPassword,
}