const createError = require('http-errors');

const pool = require("../../config/db");
const { successResponse } = require("./responseController");
const { createCategory, getCategories, getCategory, updateCategory, deleteCategory } = require('../services/categoryService');



const handleCreateCategory = async (req, res, next) => {
    try {

        const {categoryName, parentId} = req.body;

        const {results, message, categorySlug} = await createCategory(categoryName, parentId); //service
        

        successResponse(res, {
            statusCode: 201,
            message: message,
            payload: {
                name: categoryName,
                slug: categorySlug,
                id: results.insertId,

            }
        })

    } catch (error) {

        if (error.code === 'ER_DUP_ENTRY') {
            return next(createError(409, "A category with this name or slug already exists."));
        }
        next(error)
        
    }

}

const handleGetCategories = async (req, res, next) => {

    try {

        const categories = await getCategories(); //service

        if(categories.length === 0) {
            return next(createError(404, "categories not found"));
        }

        successResponse(res, {
            statusCode: 200,
            message: "Categories were fetched successfully.",
            payload: categories,
        })

    } catch (error) {
        next(error)
        
    }

}


const handleGetCategory = async (req, res, next) => {
    try {

        const {slug} = req.params;

        const category = await getCategory(slug);

        if(!category) {

            return next(createError(404, "category not found"));
        }

        successResponse(res, {
            statusCode: 200,
            message: "Category was fetched successfully.",
            payload: category,
        })


    } catch (error) {
        next(error)
        
    }
}

const handleUpdateCategory = async (req, res, next) => {

    try {

        const {categoryName, parentId} = req.body;
        const {slug} = req.params;

        const category = await updateCategory(categoryName, parentId, slug);//service


        successResponse(res, {
            statusCode: 200,
            message: "Category was updated successfully.",
            payload: category,
        })
        
    } catch (error) {
        next(error);
        
    }

}

const handleDeleteCategory = async (req, res, next) => {
    try {

        const {slug} = req.params;

        await deleteCategory(slug);

        successResponse(res, {
            statusCode: 200,
            message: "Category was deleted successfully.",
        })
        
    } catch (error) {
        next(error)
        
    }

}











module.exports = {
    handleCreateCategory,
    handleGetCategories,
    handleGetCategory,
    handleUpdateCategory,
    handleDeleteCategory,
}