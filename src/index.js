require("dotenv").config();
const app = require("./app");
const pool = require("../config/db");
const { logger } = require("../config/logger");


const port = process.env.PORT || 6000;






(async () =>{
    try {

        await pool.execute("SELECT 1");
        logger.info("Database connected successfully");

        app.listen(port, () =>{
            
            logger.info(`server is running at http://localhost:${port}`);
        })

    } catch (error) {
        logger.error("Failed to connect to database:", error.message);
        process.exit(1);
        
    }
})();


