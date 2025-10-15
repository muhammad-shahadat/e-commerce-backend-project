require("dotenv").config();
const createError = require('http-errors');

const cloudinary = require("../../config/cloudinary");
const { logger } = require("../../config/logger");



/**
 * upload image in Cloudinary
 * use buffer come from multer memory storage
 * @param {object} file - in Multer, req.file is an object that contain (file.buffer and file.mimetype )
 * @returns {object} - Cloudinary upload result (secure_url, public_id)
 */

const cloudinaryImageUpload = async (file) => {
    // create Data URI: to encode buffer with base64
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    try {
        
        const result = await cloudinary.uploader.upload(dataUri, {
            folder: process.env.CLOUDINARY_FOLDER_NAME || "ecommerce-products",
            resource_type: "auto",
        });

        return {
            secure_url: result.secure_url,
            public_id: result.public_id,
        }

    } catch (error) {

        logger.error("Cloudinary Upload Error:", error);
        throw createError(400, "Failed to upload image to Cloudinary.");
        
    }


}

/**
 * delete image from Cloudinary
 * @param {string} publicId - public_id from cloudinary
 * @returns {object} - Cloudinary delete results
 */

const cloudinaryImageDelete = async (publicId) => {
    
    if (!publicId) {
        throw createError(400, "Public ID is required for deletion.");
    }

    try {

        const result = await cloudinary.uploader.destroy(publicId);
        logger.info(`Successfully deleted image from cloudinary ID: ${publicId}`)

        return result;
        
    } catch (error) {
        logger.error("Cloudinary Delete Error:", error)
        throw createError(400, "Failed to delete image from Cloudinary.");
        
    }

}





module.exports = {
    cloudinaryImageUpload,
    cloudinaryImageDelete,
}