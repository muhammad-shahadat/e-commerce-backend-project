const {createLogger, format, transports} = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.errors({ stack: true }),
        format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.json(),

    ),

    transports: [
        new transports.Console({
            format: format.combine(format.colorize(), format.simple()),
        }),
        new transports.File({
            filename: "logs/combined.log", 
            level: "info",
        }),
        
        new transports.File({
            filename: "logs/error.log",
            level: "error",
        })

    ],
});

module.exports = {
    logger,
}