
const {userAuthSchema} = require('../validators/user_auth.js');
const { Router } = require("express");
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const router = Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const auth_middleware = require("../middleware/user_auth.js");
const loginThresholdMiddleware = require("../middleware/loginThresholdMiddleware.js");
const { User , User_details} = require("../db/index.js");

// const jwt_pass = process.env.JWT_PASS;
const jwt_pass = "B374A26A71490437AA024E4FADD5B497FDFF1A8EA6FF12F6FB65AF2720B59CCF";
// const encryption_rounds = process.env.encryption_rounds;
const encryption_rounds = 10;


//SIGNUP ROUTE

router.post("/signup", async (req, res) => {
    
    const { 
        firstName, 
        middleName, 
        lastName, 
        mobile_no, 
        email, 
        password, 
        DOB
    } = req.body;


    if (!firstName || !lastName || !mobile_no || !email || !password || !DOB) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // Hash password
        const validation = userAuthSchema.safeParse({ email, password });

        if(!validation.success){
            return res.status(404).json({ message: validation.error.errors[0].message });
        }
        if(await User.exists({ email })){
            return res.status(400).json({ message: "Email already exists" });
        }

        const hashed_pass = await bcrypt.hash(password, encryption_rounds);

        const user = new User({
            firstName,
            middleName,
            lastName,
            mobile_no,
            email,
            password: hashed_pass,
            DOB
        });

        //creates a user details object for the user with balance 0
        const user_details = new User_details({
            user_id: user._id, 
            amount: 0
        });
        
        // Associate user details ID with the user
        user.user_details_id = user_details._id;
        
        // Save the user after updating the user_details_id
        console.log('above save');
        await user_details.save(); // Wait for user_details to save
        await user.save();
        console.log('saved');

        // Generate token expires in 1hr needs to be saved locally
        const token = jwt.sign({ email: user.email, id: user._id }, jwt_pass, {
            expiresIn: "1h"
        });

        res.status(202).json({ message: "Signup successful", token: `Bearer ${token}` });
    } catch (err) {
        console.error("Signup Error:", err.message);
        res.status(500).json({ message: "Internal server error" });
    }
});


// SIGNIN ROUTE

router.post('/signin', loginThresholdMiddleware, async (req, res) => {
    const { Email, password } = req.body;


    if (!Email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    // try {
    //     userAuthSchema.safeparse({email: Email, password});
    // } catch (error) {
    //     return res.status(400).json({ message: error.errors[0].message });
    // }

    try {
        const user = req.user; // From loginThresholdMiddleware

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await user.incrementLoginAttempts();
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // else{
            await user.resetLoginAttempts();
        // }
        
        //unlocks the accout if the lock time is over
        // if(user.lockUntil && user.lockUntil < Date.now(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))){
        //     await user.resetLoginAttempts();
        // }


        // Successful login - reset attempts
        await user.resetLoginAttempts();

        // Generate token
        let token;
        try{
            token = jwt.sign({ email: user.email, id: user._id }, jwt_pass, {
                expiresIn: "1h"
            });
        }
        catch(error){
            console.log("error in token generation");
            return res.status(500).json({ message: "Internal server error" });
        }

        res.status(202).json({ message: "Login successful", token: `Bearer ${token}` });
    } catch (error) {
        console.error("Signin Error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});



router.post('/change-pass', async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    // Find the user by token
    const user = await User.findOne({
        resetToken: token,
        tokenExpiry: { $gt: Date.now() } // Token has not expired
    });

    if (!user) {
        return res.status(400).send('Invalid or expired token.');
    }

    // Update password (hash the password before saving)
    user.password =  await bcrypt.hash(newPassword, encryption_rounds);
    user.resetToken = undefined; // Clear reset token
    user.tokenExpiry = undefined; // Clear token expiry
    await user.save();

    res.send('Password updated successfully.');
});

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Endpoint for sending emails
router.post("/reset-password", async (req, res) => {
     const { email } = req.body;

     const user=await User.findOne({email});
     if(!user){
        res.status(404).json({
            msg:"User not found "
        })
     }

    if (!email) {
        return res.status(400).send({ message: "Email is required" });
    }

    const resetToken = generateToken();
    const tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    user.resetToken = resetToken;
    user.tokenExpiry = tokenExpiry;
    await user.save();

    // Send email with reset link
    const resetLink = `http://127.0.0.1:3000/frontend/forget_pass/new_pass.html?token=${resetToken}`;

    try {
        // Configure Nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "noreply.safebank@gmail.com", // Replace with your email
                pass: "mkbcmstksmnaqtkq", // Replace with your email password or app password
            },
        });

        // Email options
        const mailOptions = {
            from: "noreply.safebank@gmail.com",
            to: email,
            subject: "Reset Your Password",
            text: `Click the link below to reset your password:\n\n${resetLink}`,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.send({ message: "Reset link sent to your email." });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to send email. Please try again later." });
    }
});


module.exports = router;

