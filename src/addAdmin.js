const pool = require("./config/db");
const bcrypt = require("bcrypt");
const saltRounds = 10;

(async () => {
    try {
        const name = "Rakib Islam";
        const username = "rakib_828";
        const email = "mdrakib.alpha@gmail.com";
        const password = "Rakib@242-35-828";
        const role = "admin";

        const hashPassword = await bcrypt.hash(password, saltRounds);

        const [result] = await pool.execute(
            "INSERT INTO users (name, username, email, hash_password, role) VALUES (?, ?, ?, ?, ?)",
            [name, username, email, hashPassword, role]
        );

        console.log("Admin created with ID:", result.insertId);
        process.exit(0); 
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
