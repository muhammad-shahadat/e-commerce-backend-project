require("dotenv").config();
const createError = require('http-errors');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } = require("../../config/fileFilterConfig");


// Multer Storage Configuration (For Cloudinary)
// [CHANGE: instead diskStorage use memoryStorage]

const storage = multer.memoryStorage();

// this config only applicable for local server storage
/*const storage = multer.diskStorage({
    destination: (req, file, cb) =>{

        const uploadDir = path.join(process.cwd(), "src", UPLOAD_DIR);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) =>{
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});*/

const fileFilter = (req, file, cb) =>{
    const fileExtname = path.extname(file.originalname).toLowerCase().substring(1);

    if(!ALLOWED_FILE_TYPES.includes(fileExtname)){
        return cb(createError(400, `Only ${ALLOWED_FILE_TYPES.join(', ')} files are allowed`));
    }

    cb(null, true);

}

const upload = multer({
    storage: storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter: fileFilter,

});


//this config also applicable for local server storage
//middleware, to store relative path in db.
/*const getRelativePathForDB = (req, res, next) => {

    // 1. Single file check (when upload.single())
    if (req.file) {

        req.file.path = path.join(UPLOAD_DIR, req.file.filename);
    } 
    
    // 2. Multiple file check (when upload.array() or upload.fields() will be used)
    else if (req.files) {
        
        // A. if  req.files is an (upload.array())
        if (Array.isArray(req.files)) {
            for (const file of req.files) {
                file.path = path.join(UPLOAD_DIR, file.filename);
            }
        } 
        
        // B. if req.files is an object (upload.fields())
        else {
            // in this case req.files is an object, like: { mainImage: [...], gallery: [...] }
            for (const key in req.files) {
                for (const file of req.files[key]) {
                    file.path = path.join(UPLOAD_DIR, file.filename);
                }
            }
        }
    }

    next();
};*/

module.exports = {
    upload,
    //getRelativePathForDB,
};
