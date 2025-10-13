require("dotenv").config();
const express = require("express");

const passport = require("../passport");
const authRole = require("../middleware/authRole");
const { upload, getRelativePathForDB } = require("../middleware/uploadFile");
const { handleCreateProduct, handleGetProducts, handleGetProduct, handleDeleteProduct, handleUpdateGeneralInfo, handleSearchProducts, handleUpdateQuantity, handleUpdateMainImage } = require("../controllers/productController");
const { productValidationRules } = require("../validators/productValidationRules");
const { runValidator } = require("../validators/runValidator");



const router = express.Router();




//admin create product
router.post("/create", 
    //passport.authenticate("jwt", {session: false}), 
    //authRole("admin"),
    upload.array("productImage", 10),
    getRelativePathForDB,
    ...productValidationRules,
    runValidator,
    handleCreateProduct,
);

//get all products -> API /api/products
router.get("/", handleGetProducts);

//search products -> API /api/products/search
router.get("/search", handleSearchProducts);

//get single product -> API /api/products/:slug
router.get("/:slug", handleGetProduct);

//delete single product -> API /api/products/:id
router.delete("/:id", handleDeleteProduct);

//update product's general info -> API /api/products/:id/general
router.patch("/:id/general", handleUpdateGeneralInfo)

//update product's quantity with product variant ID ->API /api/products/:id/quantity
router.patch("/:id/quantity", handleUpdateQuantity)

//update main image with product ID -> API /api/products/:id/main-image
router.put("/:id/main-image",
    upload.single("productImage"),
    getRelativePathForDB,
    handleUpdateMainImage,
);






module.exports = router;