require("dotenv").config();

const express = require("express");
const path = require('path');
const cors = require("cors"); 
const user_Route = require("./routes/user");
const user_transaction = require("./routes/user_transactions");

const app = express();
const port = process.env.port || 8080;


app.use(express.json());
app.use(cors());

// Routes
app.use("/auth", user_Route);
app.use("/api",user_transaction);

// Error middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is hosted on port ${port}`);
});
