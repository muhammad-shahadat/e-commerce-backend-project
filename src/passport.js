require("dotenv").config();
const pool = require("../config/db");
const passport = require("passport");
const JwtStrategy = require('passport-jwt').Strategy;
const opts = {}

const cookieExtractor = (req) => {
    let token = null;
    if (req && req.cookies) {
        token = req.cookies.accessToken;
    }
    return token;
};

opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = process.env.JWT_ACCESS_KEY || "kdhfielidfoej";

passport.use(new JwtStrategy(opts, async (jwtPayload, done) => {
    try {
        let sql = "SELECT id, name, username, email, role, is_banned FROM users WHERE id = ?";
        const [rows] = await pool.execute(sql, [jwtPayload.id]);

        if(rows.length > 0){
            return done(null, rows[0]);
        }
        else{
            return done(null, false);
        }
    } catch (error) {
        return done(error, false);
    }

}));

module.exports = passport; 
// Exporting the configured Passport instance.
// Can be imported with any name in the app (e.g., `myPassport`).
// No need to require the `passport` npm package again in the app.
