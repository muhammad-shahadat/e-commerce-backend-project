//user role auth middleware
const authRole = (...role) =>{
    return (req, res, next) =>{
        if(!role.includes(req.user.role)){
            return res.status(409).send({
                message: "Access Denied: Insufficient role",
            })
        }
        else{
            next();
        }

    }

}

module.exports = authRole;