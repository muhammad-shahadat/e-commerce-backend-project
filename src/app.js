require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("./passport");
const path = require("path");
const morgan = require("morgan");
const createError = require('http-errors');


const authRouter = require("./routes/authRoute");
const productRouter = require("./routes/productRoute");
const usersRouter = require("./routes/usersRoute");
const { errorResponse } = require("./controllers/responseController");
const categoryRouter = require("./routes/categoryRoute");
const limiter = require("./middleware/limiter");


const app = express();




app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(passport.initialize());






// 2. Static File Serving
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//home route
app.get("/", limiter, (req, res) =>{
    res.status(200).send("<h2>E-commerce</h2>");
})


//users authentication route
app.use("/api/auth/users", authRouter);



//users route
app.use("/api/users", usersRouter);


//products route
app.use("/api/products", productRouter);

//category route
app.use("/api/categories", categoryRouter);




//error and bad request handling
//path not found 
app.use((req, res, next) =>{
    next(createError(404, "bad request! path not found"));
    
})

//server error & all the global errors handling
app.use((error, req, res, next) =>{
    errorResponse(res, {
        statusCode: error.status,
        message: error.message,
    })
})








module.exports = app;