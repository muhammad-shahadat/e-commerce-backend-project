const express = require("express");
const { handleCreateCategory, handleGetCategory, handleGetCategories, handleUpdateCategory, handleDeleteCategory } = require("../controllers/categoryController");
const { createCategoryValidator } = require("../validators/categoryValidator");
const { runValidator } = require("../validators/runValidator");


const router = express.Router();


//create category
router.post("/",
    createCategoryValidator, 
    runValidator, 
    handleCreateCategory
);

//Read category API
router.get("/", handleGetCategories);
router.get("/:slug", handleGetCategory);

//Update category API
router.put("/:slug", handleUpdateCategory)

//delete category API
router.delete("/:slug", handleDeleteCategory)







module.exports = router;