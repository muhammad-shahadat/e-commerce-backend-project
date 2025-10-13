const fs = require("fs/promises");
const createError = require("http-errors");
const path = require("path");

const { logger } = require("../../config/logger");

const deleteFileByPath = async (relativePath) => {

    try {

        const absolutePath = path.join(process.cwd(), "src", relativePath);

        await fs.unlink(absolutePath);
        logger.info(`File was deleted: ${relativePath}`);

        
    } catch (error) {

        if (error.code === "ENOENT") {
                    
            logger.warn(`File not found at path: ${relativePath}. Continuing with others.`);
        }
        else {
            logger.error(`Failed to delete File: ${relativePath}`, error);
            throw createError(500, `Failed to delete file: ${relativePath}`);
        }

        
        
    }

}


const deleteUploadedFiles = async (filesOrFile) => {

    try {
        
        let filesToDelete = [];

        if(Array.isArray(filesOrFile)){

            filesToDelete = filesOrFile.filter((file) => {
                return file && file.path;
            })
        }
        else if(filesOrFile && filesOrFile.path) {
            filesToDelete = [filesOrFile];
        }
        else {
            filesToDelete = [];
        }
        
        if(filesToDelete.length === 0) {
            return;
        }

        const deletionPromises = filesToDelete.map(async (file) => {

            const relativePath = file.path;
            
            if (!relativePath) {
                return;

            } 

            await deleteFileByPath(relativePath);

        });

        await Promise.all(deletionPromises);

    } catch (error) {
        throw error;
        
    }

}



module.exports = {
    deleteUploadedFiles,
    
}