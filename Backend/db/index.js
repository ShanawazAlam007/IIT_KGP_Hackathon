const mongoose = require("mongoose");

const { Schema } = mongoose;

mongoose.connect(`mongodb+srv://<username>:<password>/iit-kgp-db`);

// User schema  
const userSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    middleName: {
        type: String,
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    mobile_no: {
        type: String,
        required: true
    },
    DOB: {
        type: Date,
        required: true
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    },
    user_details: {
        // required:true,
        type: Schema.Types.ObjectId,
        ref: 'User_details'
    },
    resetToken: {
        type: String,
        default: null // Token will be null by default until it's generated
    },
    tokenExpiry: {
        type: Date,
        default: null // Expiry will be null by default
    }
});


userSchema.methods.incrementLoginAttempts = async function () {
    if (this.lockUntil && this.lockUntil > Date.now()) {
        return;
    }
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
        this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
    }
    await this.save();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
    this.loginAttempts = 0;
    this.lockUntil = null;
    await this.save();
};




const user_details = new Schema({
    amount: {
        type: Number,
        required: true
    },
    transactions: [{
        type: Schema.Types.ObjectId,
        ref: 'Transaction'
    }],
    transaction_limit: {
        type: Number,
        default: 100000
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

const fetch = require('node-fetch'); // or any fetch polyfill if needed
const nodemailer = require('nodemailer');
// const Transaction = require('./Transaction'); // Adjust according to your project structure

// Helper function to send a verification email.
async function sendVerificationEmail(recipientEmail, verificationLink) {
    // Configure the transporter (update with your actual email provider details)
    let transporter = nodemailer.createTransport({
        service: 'gmail', // Example using Gmail; adjust as needed.
        auth: {
            user: `noreply.safebank@gmail.com`, // Your email address (set in environment variables)
            pass: `kyxmjytaupdnktsa`  // Your email password or app-specific password
        }
    });

    let mailOptions = {
        from: `noreply.safebank@gmail.com`,
        to: recipientEmail,
        subject: 'Verify Your Identity for Transaction Approval',
        text: `Your transaction has been flagged as suspicious. 
                Please verify your identity by clicking the link below to complete the transaction:
  
            ${verificationLink}

            If you did not initiate this transaction, please contact support immediately.`
    };

    await transporter.sendMail(mailOptions);
}

// Updated sendMoney function.
user_details.statics.sendMoney = async function (senderId, receiverId, amount) {
    try {
        if (amount <= 0) {
            throw new Error("Amount must be greater than zero.");
        }

        // Fetch sender and receiver details from User_details (this model)
        const senderDetails = await this.findOne({ user_id: senderId });
        const receiverDetails = await this.findOne({ user_id: receiverId });

        const sender = await User.findOne({ _id: senderId });

        console.log("Sender details:", senderDetails);
        console.log("Receiver details:", receiverDetails);

        if (!senderDetails) {
            throw new Error("Sender details not found.");
        }
        if (!receiverDetails) {
            throw new Error("Receiver details not found.");
        }

        // Ensure the amounts are numbers.
        senderDetails.amount = Number(senderDetails.amount);
        receiverDetails.amount = Number(receiverDetails.amount);

        if (senderDetails.amount < amount) {
            throw new Error("Insufficient balance.");
        }

        // Call the AI model to predict possible fraud.
        let aiResult;
        try {
            const aiResponse = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    oldbalanceOrg: senderDetails.amount,
                    newbalanceOrig: senderDetails.amount - amount,
                    oldbalanceDest: receiverDetails.amount,
                    newbalanceDest: receiverDetails.amount + amount,
                }),
            });
            aiResult = await aiResponse.json();
            console.log("AI Result:", aiResult);
        } catch (error) {
            console.error("Error calling AI service:", error.message);
            throw new Error("Unable to verify transaction at this time.");
        }

        // If the AI predicts fraud, mark the transaction as pending.
        if (aiResult.prediction === 'Fraud') {
            // console.alert('Transaction flagged as suspicious. Marking as pending verification. Verify through mail!!');

            // Create a pending transaction record.
            const pendingTransaction = await PendingRequest.create({
                senderId: receiverId,
                receiverId: senderId,
                amount: amount,
                date: new Date(),
                status: "pending - AI"
            });
        
            const verificationLink = `http://127.0.0.1:5050/verify-transaction?transactionId=${pendingTransaction._id}`;

            // Send a verification email to the sender.
            console.log("Sender email:", sender.email);
            await sendVerificationEmail(sender.email, verificationLink);

            return {
                success: false,
                pending: true,
                message: "Transaction flagged as suspicious. A verification email has been sent to your email address. Please verify your identity to complete the transaction."
            };
        }

        // If no fraud is detected, proceed with the transaction.
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Deduct and add amounts.
            senderDetails.amount -= amount;
            receiverDetails.amount += amount;

            // Create transaction records for both sender and receiver.
            const debitTransactions = await Transaction.create(
                [{
                    user_id: senderId,
                    amount: amount,
                    type: "Debit",
                    date: new Date(),
                    status: "completed"
                }],
                { session }
            );

            const creditTransactions = await Transaction.create(
                [{
                    user_id: receiverId,
                    amount: amount,
                    type: "Credit",
                    date: new Date(),
                    status: "completed"
                }],
                { session }
            );

            // Update transactions arrays.
            // Assuming senderDetails.transactions and receiverDetails.transactions are arrays.
            senderDetails.transactions.push(debitTransactions[0]._id);
            receiverDetails.transactions.push(creditTransactions[0]._id);

            // Save the updated sender and receiver details within the session.
            await senderDetails.save({ session });
            await receiverDetails.save({ session });

            // Commit the transaction.
            await session.commitTransaction();
            session.endSession();

            return { success: true, message: "Transaction successful!" };
        } catch (error) {
            // Abort the transaction on error.
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error("Error in sendMoney:", error.message);
        throw error;
    }
};





user_details.statics.acceptPending = async function (senderId, receiverId, amount) {
    try {
        if (amount <= 0) {
            throw new Error("Amount must be greater than zero.");
        }

        console.log("Sender ID:", senderId);  // Debugging log

        // Find sender and receiver
        const sender = await this.findOne({ user_id: senderId });
        const receiver = await this.findOne({ user_id: receiverId });

        if (!sender) {
            throw new Error(`Sender not found with ID: ${senderId}`);
        }

        if (!receiver) {
            throw new Error(`Receiver not found with ID: ${receiverId}`);
        }

        sender.amount = Number(sender.amount);
        receiver.amount = Number(receiver.amount);

        if (sender.amount < amount) {
            throw new Error("Insufficient balance.");
        }

        // Start a transaction session
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            sender.amount -= amount;
            receiver.amount += amount;

            await sender.save({ session });
            await receiver.save({ session });

            const debitTransaction = await Transaction.create([{
                user_id: senderId,
                amount: amount,
                type: "Debit",
                date: new Date()
            }], { session });

            const creditTransaction = await Transaction.create([{
                user_id: receiverId,
                amount: amount,
                type: "Credit",
                date: new Date()
            }], { session });

            sender.transactions.push(debitTransaction[0]._id);
            receiver.transactions.push(creditTransaction[0]._id);

            await sender.save({ session });
            await receiver.save({ session });

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            return { success: true, message: "Transaction successful!" };
        } catch (error) {
            // Abort the transaction on error
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error) {
        console.error("Error in acceptPending:", error.message);
        throw error;
    }
};



user_details.statics.getTransactions = async function (userId) {
    try {
        return await this.findOne({ user_id: userId }).populate('transactions').exec();
    } catch (error) {
        console.error('Error in getTransactions:', error.message);
        throw error;
    }
};




const transactionSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: "",
        required: false
    },
    date: {
        type: Date,
        required: true
    }
});

// Get user details
user_details.statics.getUserDetails = async function (userId) {
    return await this.find({ user_id: userId });
}






// Create models
const User = mongoose.model("User", userSchema);
const User_details = mongoose.model("User_details", user_details);
const Transaction = mongoose.model("Transaction", transactionSchema);

const PendingRequestSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        default: 'bank-transfer',
        required: true
    },
    description: String,
    status: {
        type: String,
        default: 'Pending'
    },
    reason: {
        type: String,
        default: 'none',
        required: true   // Adjust according to your model's validation rules
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // required: true  // Make sure this field is included and required
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const PendingRequest = mongoose.model('PendingRequest', PendingRequestSchema);



// Export models
module.exports = {
    User,
    User_details,
    Transaction,
    PendingRequest
};
