require("dotenv").config();
const express = require("express");


const passport = require("../passport");
const authRole = require("../middleware/authRole");
const { handleRefreshToken, handleAdminDashboard, handleUserProfile, handleActivateUserAccount, handleloginUser, handlelogoutUser, handlecreateUser } = require("../controllers/authController");
const { upload, getImagePathForDB } = require("../middleware/uploadFile");
const { userRegistrationValidator } = require("../validators/authValidator");
const { runValidator } = require("../validators/runValidator");


const router = express.Router();



//customer auth
router.post("/register",
    //upload.single("userImage"),
    //getImagePathForDB,
    //userRegistrationValidator,
    //runValidator,
    handlecreateUser
)
router.post("/verify", handleActivateUserAccount)
router.post("/login", handleloginUser)
router.post("/logout", handlelogoutUser)
router.post("/refresh-token", handleRefreshToken)


//user profile
router.get("/profile", passport.authenticate("jwt", {session: false}),  authRole("admin", "customer"), handleUserProfile)


//admin dashboard
router.get(
    "/dashboard",
    passport.authenticate("jwt", {session: false}),
    authRole("admin"),
    handleAdminDashboard,
);


module.exports = router;
