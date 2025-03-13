const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../db/index.js");

// Secret key for signing the JWT token
const jwt_pass = process.env.JWT_PASS;

async function auth_middleware(req, res, next) {
    // Retrieve token from Authorization header
    const get_token = req.headers.authorization;

    try {
        if (!get_token) {
            throw new Error("Token not provided");
        }

        // Extract token from "Bearer <token>"
        const token = get_token.split(" ")[1];
        if (!token) {
            throw new Error("Token format invalid");
        }

        // Verify the token
        const decoded = jwt.verify(token, jwt_pass);
        req.user = decoded; // Store decoded token in req.user for downstream use
        next(); // Proceed to the next middleware
    } catch (e) {
        console.log("Token verification failed:", e.message);

        // Check credentials if token verification fails
        const username = req.headers.username;
        const password = req.headers.password;

        if (!username || !password) {
            return res.status(401).json({ message: "Unauthorized, credentials missing" });
        }

        try {
            // Fetch user from database
            const user = await User.findOne({ username: username });
            if (!user) {
                return res.status(401).json({ message: "Unauthorized, user not found" });
            }

            // Compare the password
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(401).json({ message: "Unauthorized, incorrect password" });
            }

            // Generate a new token
            const newToken = jwt.sign({ username: user.username, id: user._id }, jwt_pass, {
                expiresIn: "1h", // Token expires in 1 hour
            });

            res.status(200).json({ message: "Token expired, new token issued", token: `Bearer ${newToken}` });
            // next();
        } catch (error) {
            console.error("Error during credential validation:", error.message);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
}

module.exports = auth_middleware;
