const createError = require("http-errors");
const slugify = require('slugify');

const pool = require("../../config/db");

const createCategory = async (categoryName, parentId) => {
    try {

        const categorySlug = slugify(categoryName, {lower: true, strict: true});

        const finalParentId = parentId || null;

        const [results] = await pool.execute(
            `INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)`,
            [categoryName, categorySlug, finalParentId]
        )

        
        if(results.affectedRows === 0) {
            throw createError(500, "category could not be created");
        }

        const message = finalParentId ? "Subcategory created successfully" : "Main Category created successfully";

        return {
            results,
            message,
            categorySlug,
        }

    } catch (error) {
        throw error;
        
    }
}

const getCategories = async () => {
    try {

        const [rows] = await pool.execute(
            `SELECT id, name, slug, parent_id FROM categories`
        )

        if(rows.length === 0) {
            return [];
        }

        return rows;
        

    } catch (error) {
        throw error;
        
    }

}

const getCategory = async (slug) => {
    try {

        const [rows] = await pool.execute(
            `SELECT id, name, slug, parent_id FROM categories
            WHERE slug = ?`,
            [slug]
        )

        if(rows.length === 0) {
            return null;
        }

        return rows[0];
        

    } catch (error) {
        throw error;
        
    }

}

const updateCategory = async (categoryName, parentId, slug) => {

    try {
        
        const oldSlug = slug;
        const newSlug = slugify(categoryName, {lower: true, strict: true}); 

        let params = [categoryName, newSlug];
        let query = `UPDATE categories SET name = ?, slug = ?`;

        if(parentId !== undefined && parentId !== "") {
            let finalParentId = parentId || null;
            query += `, parent_id = ?`;
            params.push(finalParentId);
        }

        query += ` WHERE slug = ?`;
        params.push(oldSlug);

        const [results] = await pool.execute(query, params);

        if(results.affectedRows === 0) {
            throw createError(404, "category not found or no change made");
        }

        return {
            newName: categoryName,
            newSlug: newSlug,
        }


    } catch (error) {
        throw error;
        
    }

}

const deleteCategory = async (slug) => {

    try {

        const [results] = await pool.execute(
            `DELETE FROM categories WHERE slug = ?`,
            [slug]
        )

        if(results.affectedRows === 0) {
            throw createError(404, "category not found or could't be deleted");
        }
        
    } catch (error) {
        throw error;
        
    }

}


module.exports = {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory,
}