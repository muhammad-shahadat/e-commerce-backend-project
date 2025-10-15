require("dotenv").config();
const createError = require('http-errors');
const slugify = require('slugify');
const fs = require("fs/promises");
const path = require("path");


const pool = require("../../config/db");
const { deleteUploadedFiles } = require("../helper/deleteUploadedFiles");
const { successResponse } = require("./responseController");
const { getProducts, getProduct, searchProducts, updateQuantity, updateMainImage } = require("../services/productService");
const { logger } = require("../../config/logger");
const { cloudinaryImageUpload, cloudinaryImageDelete } = require("../helper/cloudinaryHelper");
const { error } = require("console");





const generateUniqueSlug = (title) =>{
  const baseSlug = slugify(title);
  const uniqueSuffix = Date.now().toString().slice(-5);
  return `${baseSlug}-${uniqueSuffix}`;
}


const generateSku = (mainCategoryName, subCategoryName, productId) =>{

    const mainCategoryCode = mainCategoryName ? mainCategoryName.substring(0, 3).toUpperCase() : ""; 
    const subCategoryCode = subCategoryName ? subCategoryName.substring(0, 3).toUpperCase() : "";

    const idCode = String(productId).padStart(3, '0');

    let skuParts = [];

    if (mainCategoryCode) {
        skuParts.push(mainCategoryCode);
    }

    if (subCategoryCode) {
        skuParts.push(subCategoryCode);
    }
    

    skuParts.push(idCode);

    return skuParts.join('-');
}






const handleCreateProduct = async (req, res, next) =>{
    
    let connection;
    let uploadedImagePublicIds = []; // Public IDs will be saved here for Rollback
    
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let discountPercent = parseFloat(req.body.discountPercent);
        const {finalCategoryId, title, description, variants, mainImageIndex } = req.body;

        // To find out sub category (Leaf Node) and (Main Category)
        const [categoryHierarchy] = await connection.execute(
            `SELECT t1.name AS subCategoryName, t2.name AS mainCategoryName, t1.id AS subCategoryId 
            FROM categories t1
            LEFT JOIN categories t2 ON t1.parent_id = t2.id 
            WHERE t1.id = ?`, 
            [finalCategoryId]
        );

        if(categoryHierarchy.length === 0){
            await connection.rollback();
            //await deleteUploadedFiles(req.files);//this will be applicable only for local server storage

            return next(createError(404, "Category not found"));
            
        }

        const categoryId = categoryHierarchy[0].subCategoryId;

        const subCategoryName = categoryHierarchy[0].subCategoryName;

        // if parent_id is NULL, then mainCategoryName will be NULL
        const mainCategoryName = categoryHierarchy[0].mainCategoryName;

        if (!title || !categoryId || req.body.basePrice === null || req.body.basePrice === undefined || req.body.basePrice === "") {
            await connection.rollback();
            //await deleteUploadedFiles(req.files);//this will be applicable only for local server storage

            return next(createError(422, "Fill in the required fields!"));

        }

        let basePrice = parseFloat(req.body.basePrice);

        
        if (isNaN(discountPercent)){
            discountPercent = 0.00;

        } 


        if (isNaN(basePrice)){
            await connection.rollback();
            //await deleteUploadedFiles(req.files);//this will be applicable only for local server storage

            return next(createError(401, "Base Price must be a number!"));
            
        } 

        let productSlug = generateUniqueSlug(title);


        // 1. `products` table data insertion
        const [productResult] = await connection.execute(
            'INSERT INTO products (title, slug, description, base_price, discount_percent, category_id) VALUES (?, ?, ?, ?, ?, ?)',
            [title, productSlug, description, basePrice, discountPercent, categoryId]
        );

        const productId = productResult.insertId;

        let productSku = generateSku(mainCategoryName, subCategoryName, productId);

        //update sku in database
        await connection.execute(
            "UPDATE products SET sku = ? WHERE id = ?",
            [productSku, productId]
        );
        
        // Declare a new array to hold all variant SKUs
        const allVariantSkus = [];


        // 2. `product_variants`, `variant_options`, `product_images` and `inventory` table data insertion
        // 'variants' is an array consist of sending data from html form
        if (variants && Array.isArray(variants)) {
            for (const variant of variants) {

                let productVariantSku = productSku;

                if (variant.priceModifier == null || variant.priceModifier === "") {
                    variant.priceModifier = 0.00;
                }

                if(variant.color && variant.size){
                    productVariantSku += `-${variant.color.replace(/\s+/g, "").toUpperCase()}-${variant.size.replace(/\s+/g, "").toUpperCase()}`; 

                }
                else if(variant.color){
                    productVariantSku += `-${variant.color.replace(/\s+/g, "").toUpperCase()}`;
                }
                else if(variant.size){
                    productVariantSku += `-${variant.size.replace(/\s+/g, "").toUpperCase()}`;
                }
                
                // Push the newly created variant SKU into the array
                allVariantSkus.push(productVariantSku);


                //`product_variants` table data insertion
                const [productVariantResult] = await connection.execute(
                    'INSERT INTO product_variants (product_id, price_modifier, sku) VALUES (?, ?, ?)',
                    [productId, variant.priceModifier, productVariantSku]
                );
                const productVariantId = productVariantResult.insertId;

                //`variant_options` table data insertion
                const options = ["color", "size"]; //add more options in future.
                for(const key of options){
                    if(variant[key]){
                        await connection.execute(
                            'INSERT INTO variant_options (product_variant_id, option_name, option_value) VALUES (?, ?, ?)', [productVariantId, key, variant[key]]
                        )
                    }

                }
                
                // `inventory` table data insertion
                await connection.execute(
                    'INSERT INTO inventory (product_variant_id, quantity) VALUES (?, ?)',
                    [productVariantId, variant.quantity]
                );
            }
        }

        // 3. `product_images` table data insertion
        if (req.files && req.files.length > 0) {

            //this will be applicable only for local server storage
            /*const imageInserts = req.files.map((file, index) => {
                const isMain = index.toString() === mainImageIndex ? 1 : 0;
                const webAccessiblePath = file.path.replace(/\\/g, "/");
                return [productId, webAccessiblePath, isMain];
            });*/


            //cloudinary logic start from here
            const uploadPromises = req.files.map((file) => {
                return cloudinaryImageUpload(file);
            });

            // Use Promise.allSettled: Returns results for all promises, even if one fails
            const results = await Promise.allSettled(uploadPromises);
            
            
            const imageInserts = [];
            let hasFailedUpload = false;

            // Processing the results array
            results.forEach((result, index) => {

                if (result.status === 'fulfilled') {

                    // A. Successful Upload
                    const imageResult = result.value; // The successfully resolved object
                
                    // Save ID for Rollback
                    uploadedImagePublicIds.push(imageResult.public_id);
                
                    // Prepare Data for Database Insert
                    const isMain = index.toString() === mainImageIndex ? 1 : 0;
                    imageInserts.push([productId, imageResult.secure_url, imageResult.public_id, isMain]);

                } 
                else if (result.status === 'rejected') {
                    // B. Failed Upload
                    hasFailedUpload = true;
                    logger.error("Single image upload failed:", result.reason.message);
                }

            });


            //why use query: it inserts multiple row to the db
            if (imageInserts.length > 0) {
            
                await connection.query(
                    'INSERT INTO product_images (product_id, image_path, public_id, is_main) VALUES ?',
                    [imageInserts]

                );
            }

            // 4. If even one upload failed, the entire transaction must fail
            if (hasFailedUpload) {
                // Throw Error to trigger Rollback and cleanup logic in the catch block
                throw createError(400, "One or more images failed to upload. Transaction rolled back.");
            }


        }

        

        await connection.commit(); //Successful Transaction will save the changes.

        successResponse(res, {
            statusCode: 201,
            message: "The product is successfully added",
            payload: {
                productId,
                title,
                allVariantSkus,

            }
        })


    } catch (error) {

        logger.error("failed to create product:", error);
        if (connection) {
            await connection.rollback();
        }
        
        if (uploadedImagePublicIds.length > 0) {
            logger.warn(`Transaction failed. Attempting to clean up ${uploadedImagePublicIds.length} images from Cloudinary.`);
    
            const deletePromises = uploadedImagePublicIds.map(publicId => cloudinaryImageDelete(publicId).catch(error => {
        
                logger.error(`Failed to cleanup Cloudinary ID ${publicId}: ${error.message}`);
            }));

            await Promise.all(deletePromises);
        }

        //await deleteUploadedFiles(req.files);//this will be applicable for local server storage


        next(error)

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const handleGetProducts = async (req, res, next) => {

    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;

        const offset = (page - 1) * limit;

        const {totalProducts, totalPages, productResult} = await getProducts(limit, offset);


        successResponse(res, {
            statusCode: 200,
            message: "Products data fetched successfully",
            payload: {

                pagination: {
                    totalProducts,
                    totalPages,
                    currentPage: page,
                    previousPage: (page - 1) > 0 ? (page - 1) : null,
                    nextPage: (page + 1) <= totalPages ? (page + 1) : null,
                },
                productData: productResult,
                
                
            }
        })



    } catch (error) {
        next(error);
        
    }

}

const handleGetProduct = async (req, res, next) => {

    try {

        const {slug} = req.params;
        
        const {images, product, variants, categoryTree} = await getProduct(slug); //service 

        

        successResponse(res, {
            statusCode: 200,
            message: "Product data fetched successfully",
            payload: {
                images,
                product,
                variants,
                categoryTree,
            }
        })

    } catch (error) {
        next(error);
        
    }

}

const handleDeleteProduct = async (req, res, next) => {

    let connection;//use transaction for cloudinary.
    try {

        const productId = req.params.id;
        connection = await pool.getConnection();
        await connection.beginTransaction();


        const [imageResults] = await connection.execute(
            `SELECT image_path, public_id FROM product_images
            WHERE product_id = ?
            `,
            [productId]
        );

        if(imageResults.length === 0) {
            logger.warn(`No images found for product ID ${productId}`)
        }

        //delete multiple images from server.
        //this will be applicable only for local server storage
        /*const deletionPromises = imageResults.map(async (row) => {
            const absolutePath = path.join(__dirname, "..", row.image_path);

            try {

                await fs.unlink(absolutePath);
                logger.info(`Successfully deleted file: ${absolutePath}`)

            } catch (error) {

                logger.error(`Failed to delete file ${absolutePath}: ${error.message}`)
                
            }

        })*/


        

        const [results] = await connection.execute(
            `
            DELETE FROM products WHERE id = ?
            `,
            [productId]
        )

        if(results.affectedRows === 0) {
            await connection.rollback()
            return next(createError(404, `Product with ID ${productId} not found to delete`));
        }

        await connection.commit();

        const deletionPromises = imageResults.map((row) => {

            return cloudinaryImageDelete(row.public_id).catch((error) => {
                logger.error(`DB record delete, but Failed to cleanup Cloudinary ID ${publicId}: ${error.message}`);

            })

        })

        await Promise.all(deletionPromises);

        successResponse(res, {
            statusCode: 200,
            message: `Product (ID: ${productId}) and associated files deleted successfully`,
        })


    } catch (error) {
        logger.error("failed to create product:", error);

        if (connection) {
            await connection.rollback();
        }
        next(error)
        
    } finally {
        if (connection) {
            connection.release();
        }

    }

}

const handleUpdateGeneralInfo = async (req, res, next) => {

    try {

        const productId = req.params.id;
        const updates = req.body;
        if(!productId) {
            return next(createError(400, "product id  is required"));
        }

        if(Object.values(updates).length === 0) {
            return next(createError(400, "at least one field required to update"));
        }

        if(updates.sku) {
            return next(createError(400, "Product's sku can't be updated"));
        }

        const colToUpdate = Object.keys(updates).map((key) => `${key} = ?`).join(", ");

        const queryParams = [...Object.values(updates), productId];

        //must be same the object's keyname and db column name.
        let query = `UPDATE products SET`;

        if(updates.title){

            let slug = generateUniqueSlug(updates.title);
            queryParams.unshift(slug);
            query += ` slug = ?,`;

        }

        query += ` ${colToUpdate} WHERE id = ?`;


        

        const [results] = await pool.execute(query, queryParams);

        if(results.affectedRows === 0) {
            return next(createError(404, `Product not found with (ID: ${productId}) or could not be updated`));
        }



        successResponse(res, {
            statusCode: 200,
            message: `Product's (ID: ${productId}) general info updated successfully`,
            
        })


        
    } catch (error) {
        next(error);
        
    }
}

const handleSearchProducts = async (req, res, next) => {

    try {

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 5;
        const search = (req.query.search || "").trim();

        if(search.length === 0) {
            return next(createError(400, "Please provide a search keyword to find products."));
        }

        const searchQuery = `%${search}%`;
        const offset = (page - 1) * limit;

        const {totalProducts, totalPages, productResult} = await searchProducts(limit, offset, searchQuery);


        successResponse(res, {
            statusCode: 200,
            message: "Products data fetched successfully",
            payload: {

                pagination: {
                    totalProducts,
                    totalPages,
                    currentPage: page,
                    previousPage: (page - 1) > 0 ? (page - 1) : null,
                    nextPage: (page + 1) <= totalPages ? (page + 1) : null,
                },
                productData: productResult,
                
                
            }
        })
        
    } catch (error) {
        next(error);
        
    }

}

const handleUpdateQuantity = async (req, res, next) => {
    try {

        const productVariantId = req.params.id;
        const {quantity} = req.body;

        await updateQuantity(productVariantId, quantity); //service


        successResponse(res, {
            statusCode: 200,
            message: "Product's quantity updated successfully", 
     
        });

        
    } catch (error) {
        next(error);
        
    }

}

const handleUpdateMainImage = async (req, res, next) => {

    try {

        const productId = req.params.id;
        
        if(!req.file) {
            return next(createError(400, "select one main image"));
        }

        //no need for cloudinary
        /*const imagePath = req.file.path; //this path contain back slash (\)

        const webAccessiblePath = imagePath.replace(/\\/g, "/"); //replace back slash with froward slash*/
        
        const {secure_url, public_id} = await cloudinaryImageUpload(req.file);

        await updateMainImage(productId, secure_url, public_id);

        successResponse(res, {
            statusCode: 200,
            message: "Product's main image updated successfully", 
     
        });
        
        
    } catch (error) {
        next(error);
        
    }


}







module.exports = {
    handleCreateProduct,
    handleGetProducts,
    handleGetProduct,
    handleDeleteProduct,
    handleSearchProducts,
    handleUpdateGeneralInfo,
    handleUpdateQuantity,
    handleUpdateMainImage,
}


