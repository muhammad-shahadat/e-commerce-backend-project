const createHttpError = require("http-errors");
const pool = require("../../config/db");

const findById = async (id, tableName) =>{

    try {
        
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw createHttpError(400, "Invalid table name provided");
        }
        const [rows] = await pool.execute(
            `SELECT id, name, username, email, role, is_banned
            FROM ${tableName}
            WHERE role != 'admin' AND id = ?`,
            [id]
        );

        if(rows.length === 0){
            throw createHttpError(404, `${tableName} not found with this id`);
        }

        return rows[0];
    } catch (error) {

        throw error;

    }

}

module.exports = {
    findById,
}