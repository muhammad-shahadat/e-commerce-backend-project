const createError = require("http-errors");
const fs = require("fs/promises");
const path = require("path");

const pool = require("../../config/db");
const { logger } = require("../../config/logger");



const deleteSingleImageByPath = async (relativePath) => {

    const absolutePath = path.join(__dirname, "..", relativePath);

    try {

        await fs.unlink(absolutePath)
        logger.info(`Successfully deleted image file from server: ${absolutePath}`)

    } catch (error) {
        logger.error(`Failed to delete image file from server ${absolutePath}: ${error.message}`)
  
    }

}


const countTotalProducts = async (searchQuery) => {

    try {

        const [results] = await pool.execute(
            `
            SELECT COUNT(*) AS total_products FROM products 
            WHERE title LIKE ?
            `,
            [searchQuery]
        );

        return results[0].total_products;

        
    } catch (error) {
        throw error;
        
    }


}


const getProducts = async (limit, offset) => {

    try {


        const [countResults] = await pool.execute(
            `SELECT COUNT(*) AS total_products FROM products`
        );

        const totalProducts = countResults[0].total_products;

        const totalPages = Math.ceil(totalProducts / limit);

        const productDataQuery = `
            SELECT p.id, p.title, p.slug, p.base_price, p.sold_count, p.view_count,
            p.discount_percent, c.name AS final_category_name,
            (
                SELECT pi.image_path FROM product_images pi
                WHERE 
                p.id = pi.product_id AND is_main = 1
                LIMIT 1
            ) AS main_image_path,
            (
                SELECT MIN(pv.price_modifier) FROM product_variants pv
                WHERE 
                p.id = pv.product_id
            ) AS min_price_modifier
            
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id

            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?

        `;

        const [productResult] = await pool.execute(productDataQuery, [limit, offset]);

        return {
            totalProducts, 
            totalPages,
            productResult,
        }


    } catch (error) {
        throw error;
        
    }

}

const getProduct = async (slug) => {

    try {

        try {

            // --- 1. View Count Update Query (Fire-and-Forget) ---
            //we don't await this Query, so that user get Response fast
            //it will be running in the background
            pool.execute(
                `UPDATE products
                SET view_count = view_count + 1
                WHERE slug = ?
                `,
                [slug]
            );
            
        } catch (error) {
            logger.warn("failed to update view_count: ", error.message);
            
        }

        const [productResults] = await pool.execute(
            `  SELECT 
                    p.*
                FROM products p
                WHERE p.slug = ?
                LIMIT 1
            `,
            [slug]
        );

        if (productResults.length === 0) {
            throw createError(404, `Product with slug ${slug} not found`);
        }

        
        const productId = productResults[0].id;
        const categoryId = productResults[0].category_id;
        const productData = productResults[0];

        //Run Images, Variants, AND Category Tree in Parallel ---
        const [imageResults, rawVariantResults, categoryTreeResults] = await Promise.all([

            // Get All Product Images query
            pool.execute(
                'SELECT image_path, is_main FROM product_images WHERE product_id = ? ORDER BY is_main DESC',
                [productId]
            ),

            // Variants Query (Existing SQL with CONCAT/GROUP_CONCAT)
            pool.execute(

                `SELECT 
                    pv.id AS product_variant_id, 
                    pv.price_modifier, 
                    pv.sku AS final_sku,
                    i.quantity AS stock_quantity,
                    
                    CONCAT(
                        '[', 
                        GROUP_CONCAT(
                            CONCAT(
                                '{"option_name": "', vo.option_name, 
                                '", "option_value": "', vo.option_value, '"}'
                            ) 
                            SEPARATOR ','
                        ),
                        ']'
                    ) AS options_string

                FROM product_variants pv
                LEFT JOIN inventory i ON pv.id = i.product_variant_id
                LEFT JOIN variant_options vo ON pv.id = vo.product_variant_id
                WHERE pv.product_id = ?
                GROUP BY 
                    pv.id, 
                    pv.price_modifier, 
                    pv.sku, 
                    i.quantity 
                ORDER BY pv.id`,

                [productId]

            ),

            //Category Tree Query (RECURSIVE CTE)
            pool.execute(
                `
                WITH RECURSIVE CategoryPath AS (
                    SELECT id, name, slug, parent_id
                    FROM categories 
                    WHERE id = ?
                    
                    UNION ALL
                    
                    SELECT c.id, c.name, c.slug, c.parent_id
                    FROM categories c 
                    JOIN CategoryPath cp ON c.id = cp.parent_id
                    WHERE cp.parent_id IS NOT NULL
                )
                SELECT name, slug FROM CategoryPath
                ORDER BY id ASC`,
                [categoryId]

            )
            
        ]);

        const structuredVariantResults = rawVariantResults[0].map((row) => {

            let optionsArray = [];
            const {product_variant_id, price_modifier, final_sku, stock_quantity, options_string} = row;

            try {

                if(options_string) {
                    optionsArray = JSON.parse(options_string)
                }
                
            } catch (error) {
                logger.error(`Error parsing JSON for variant ID ${product_variant_id}: ${error.message}`);
                
            }

            return {
                product_variant_id,
                price_modifier,
                final_sku,
                stock_quantity,
                options: optionsArray,
            }


        })

        return {
            images : imageResults[0],
            product: productResults[0],
            variants: structuredVariantResults,
            categoryTree: categoryTreeResults[0],
        }
        
    } catch (error) {
        throw error;
        
    }

}

const searchProducts = async (limit, offset, searchQuery) => {

    try {


        const totalProducts = await countTotalProducts(searchQuery);

        const totalPages = Math.ceil(totalProducts / limit);

        const productDataQuery = `
            SELECT p.id, p.title, p.slug, p.base_price, p.sold_count, p.view_count,
            p.discount_percent, c.name AS final_category_name,
            (
                SELECT pi.image_path FROM product_images pi
                WHERE 
                p.id = pi.product_id AND is_main = 1
                LIMIT 1
            ) AS main_image_path,
            (
                SELECT MIN(pv.price_modifier) FROM product_variants pv
                WHERE 
                p.id = pv.product_id
            ) AS min_price_modifier
            
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id

            WHERE title LIKE ?
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?

        `;

        const [productResult] = await pool.execute(productDataQuery, [searchQuery, limit, offset]);

        return {
            totalProducts, 
            totalPages,
            productResult,
        }


    } catch (error) {
        throw error;
        
    }

}

const updateQuantity = async (productVariantId, quantity) => {

    try {

        const [results] = await pool.execute(
            `UPDATE inventory SET quantity = ?
            WHERE product_variant_id = ?
            `,
            [quantity, productVariantId]

        );

        if(results.affectedRows === 0) {
            throw createError(404, "product not found or could not be updated quantity");
        }

        
    } catch (error) {
        throw error
        
    }
    
}

const updateMainImage = async (productId, webAccessiblePath) => {
    try {

        //read existing img path from DB
        const [existingImageResults] = await pool.execute(
            `SELECT image_path FROM product_images
            WHERE product_id = ? AND is_main = 1`,
            [productId]
        );

        if(existingImageResults.length > 0) {

            const relativePath = existingImageResults[0].image_path;

            await deleteSingleImageByPath(relativePath);
            
        }

        //update new image into DB
        const [imageResults] = await pool.execute(
            `UPDATE product_images SET image_path = ?
            WHERE product_id = ? AND is_main = 1`,
            [webAccessiblePath, productId]
        );

        if(imageResults.affectedRows === 0) {
            await deleteSingleImageByPath(webAccessiblePath)
            throw createError(404, "product not found or can not update main image");
        }

        
    } catch (error) {
        throw error
        
    }
}



module.exports = {
    getProducts,
    getProduct,
    searchProducts,
    updateQuantity,
    updateMainImage,
}