const jwt = require("jsonwebtoken");
const createJsonWebToken = async (payload, privateKey, expiresIn) =>{

    return new Promise((resolve, reject) => {
        jwt.sign(payload, privateKey, expiresIn, (err, token) =>{
            if(err){
                return reject(err);
            }
            resolve(token);
        });
        
    })

}

module.exports = {
    createJsonWebToken,
}