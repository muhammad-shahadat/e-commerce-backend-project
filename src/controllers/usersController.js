require("dotenv").config();
const createError = require("http-errors");
const bcrypt = require("bcrypt");
const pool = require("../../config/db");
const { successResponse } = require("./responseController");
const { findUserById, findUsersBySearch, removeUserById, updateUserPasswordById, forgotPassword, resetPassword } = require("../services/userService");
const saltRounds = 10;




const getAllUsers = async (req, res, next) =>{

    try {

        const {search = "", limit = 5, page = 1} = req.query;
        const numericLimit = Number(limit);
        const offset = (Number(page) - 1) * numericLimit;

        const searchQuery = `%${search}%`;

        const {users, totalUsers, pagination} = await findUsersBySearch(page, searchQuery, numericLimit, offset);//services

        successResponse(res, {
            statusCode: 200,
            message: "users are successfully returned", 
            payload: {
                users,
                totalUsers,
                pagination,
            }
        })
        
    } catch (error) {
        next(error);
        
    }
}

const getOneUserById = async (req, res, next) =>{

    try {
        const {id} = req.params;

        const user = await findUserById(id);//service

        successResponse(res, {
            statusCode: 200,
            message: "user is returned successfully",
            payload: {
                user: user,
            }
        })

    } catch (error) {
        next(error);
        
    }

}

const deleteUserById = async (req, res, next) =>{

    try {
        const {id} = req.params;

        await removeUserById(id);//service

        successResponse(res, {
            statusCode: 200,
            message: "user is deleted successfully",
            payload: {
                id: id,
            }
        })

    } catch (error) {
        next(error);
        
    }

}

const updateUserById = async (req, res, next) => {

    try {
        const {id} = req.params;
        if(!id){
            return next(createError(400, "user id is required"));
        }

        const updates = {...req.body};

        
        if(Object.keys(updates).length === 0){
            return next(createError(400, "no fields to update"))
        }

        if (updates.email || updates.username) {
            return next(createError(400, "Email or username can't be updated"));
        }

        if(updates.password){
            const hashPassword = await bcrypt.hash(updates.password, saltRounds);

            updates.hash_password = hashPassword;
            delete updates.password; // delete old password key.
        }

        //turn into an array using the object's values.
        const values = Object.values(updates);


    
        //turn into an array using the object's keys.
        let columnsToUpdate = Object.keys(updates);
        
        //return an array with values like: ["name = ?", "password = ?"] and finally turn into a string like: "name = ?, password = ?" 
        columnsToUpdate = columnsToUpdate.map((key) => `${key} = ?`).join(", ");

        values.push(id) // push id at end of array.
        const [results] = await pool.execute(
            `UPDATE users SET ${columnsToUpdate}
            WHERE id = ?`,
            values
        )

        if(results.affectedRows === 0){
            return next(createError(404, "user not found or can't update"))
        }

        successResponse(res, {
            statusCode: 200,
            message: "user updated successfully",
            payload: {}
        })

    } catch (error) {
        next(error)
        
    }


}

const banUserById = async (req, res, next) => {
    try {
        const {id} = req.params;
        if(!id) {
            return next(createError(400, "user id is required"));
        }

        const [results] = await pool.execute(
            `UPDATE users SET is_banned = ?
            WHERE role != "admin" 
            AND id = ?`,
            [1, id]
        )

        if(results.affectedRows === 0) {
            return next(createError(404, "user not found or can't be banned"))
        }

        successResponse(res, {
            statusCode: 200,
            message: "user was banned successfully",
            payload: {}
        })
        


    } catch (error) {
        next(error)
        
    }

}

const unBanUserById = async (req, res, next) => {
    try {
        const {id} = req.params;
        if(!id) {
            return next(createError(400, "user id is required"));
        }

        const [results] = await pool.execute(
            `UPDATE users SET is_banned = ?
            WHERE role != "admin" 
            AND id = ?`,
            [0, id]
        )

        if(results.affectedRows === 0) {
            return next(createError(404, "user not found or can't be unbanned"))
        }

        successResponse(res, {
            statusCode: 200,
            message: "user was unbanned successfully",
            payload: {}
        })
        


    } catch (error) {
        next(error)
        
    }

}

const handleUpdatePassword = async (req, res, next) => {
    try {

        const {id} = req.user; //from passport auth jwt token 

        const {oldPassword, newPassword, confirmedPassword} = req.body;

        const rows = await updateUserPasswordById(id, oldPassword, newPassword, confirmedPassword); // service

        
        successResponse(res, {
            statusCode: 200,
            message: "password was updated successfully",
            payload: {
                user: {
                    id: rows[0].id,
                    name: rows[0].name,
                    username: rows[0].username,
                    role: rows[0].role,
                    isBanned: rows[0].is_banned,
                },
            }
        })
    } catch (error) {
        next(error);
        
    }
    


}

const handleForgotPassword = async (req, res, next) => {
    try {

        const {email} = req.body;

        const token = await forgotPassword(email); //service


        successResponse(res, {
            statusCode: 200,
            message: `please go to your ${email} for completing your forgot password process`, 
            payload: {token}
        })

    } catch (error) {
        next(error);
        
    }


}

const handleResetPassword = async (req, res, next) => {
    try {

        const {token, newPassword, confirmedPassword} = req.body;

        await resetPassword(token, newPassword, confirmedPassword);
        

        successResponse(res, {
            statusCode: 200,
            message: "password reset successfully",
            payload: {}
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

module.exports = {
    getAllUsers,
    getOneUserById,
    deleteUserById,
    updateUserById,
    banUserById,
    unBanUserById,
    handleUpdatePassword,
    handleForgotPassword,
    handleResetPassword,
}