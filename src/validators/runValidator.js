const createError = require('http-errors');
const { validationResult } = require("express-validator");

const { logger } = require('../../config/logger');
const { deleteUploadedFiles } = require('../helper/deleteUploadedFiles');

const runValidator = async (req, res, next) => {

    try {
        
        const errors = validationResult(req);

        if(!errors.isEmpty()){
            
            // **THIS BLOCK IS NO LONGER NECESSARY!** it will be nedd only for local server storage
            
            /*if(req.files && req.files.length > 0) {
                logger.warn("Validation Failed! Cleaning up uploaded files...");

                try {

                    await deleteUploadedFiles(req.files);
                    
                } catch (deleteError) {
                    logger.error("Critical: Failed to clean up files after validation error.", deleteError);
                    
                }

            }
            */
            
            return next(createError(422, errors.array()[0].msg));

        }

        next();
        
    } catch (error) {
        next(error);
        
    }


}

module.exports = {
    runValidator,
}