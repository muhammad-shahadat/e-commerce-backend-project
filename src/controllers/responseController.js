const errorResponse = (res, {statusCode = 500, message = "internal server error"}) =>{

    return res.status(statusCode).json({
        success: false,
        message: message,
    })

}

const successResponse = (res, {statusCode = 200, message = "successfully done",  payload = {}}) =>{

    return res.status(statusCode).json({
        success: true,
        message,
        payload,
    })

}



module.exports = {
    errorResponse,
    successResponse,
}