
const express = require("express");
const passport = require("../passport");
const authRole = require("../middleware/authRole");
const { getAllUsers, deleteUserById, getOneUserById, updateUserById, banUserById, unBanUserById, handleUpdatePassword, handleForgotPassword, handleResetPassword } = require("../controllers/usersController");
const { updatePasswordValidator } = require("../validators/authValidator");
const { runValidator } = require("../validators/runValidator");

const router = express.Router();






router.post("/forgot-password",
    handleForgotPassword
);

//admin -> get all users
router.get(
    "/", 
    passport.authenticate("jwt", {session: false}),
    authRole("admin"),
    getAllUsers
);

//admin -> get one user
router.get("/:id",
    passport.authenticate("jwt", {session: false}),
    authRole("admin"),
    getOneUserById
)

//admin -> delete user
router.delete("/:id",
    passport.authenticate("jwt", {session: false}),
    authRole("admin"),
    deleteUserById
)

router.put("/reset-password", handleResetPassword);

router.put("/update-password",
    passport.authenticate("jwt", {session: false}),
    updatePasswordValidator,
    runValidator,
    handleUpdatePassword //use handle keyword is professional practice for controllers.
)
router.put("/:id", updateUserById)
router.put("/ban-user/:id",
    passport.authenticate("jwt", {session: false}),
    authRole("admin"),
    banUserById
)

router.put("/unban-user/:id",
    passport.authenticate("jwt", {session: false}),
    authRole("admin"),
    unBanUserById
)










module.exports = router;