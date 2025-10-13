const { rateLimit } = require('express-rate-limit');



const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // convert 1 min to milliseconds
    max: 6,
    message: "Too many requests, please try again later.",
});

module.exports = limiter;