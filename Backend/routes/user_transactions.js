const { User, User_details, PendingRequest, Transaction } = require('../db/index.js');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const JWT_PASS = "B374A26A71490437AA024E4FADD5B497FDFF1A8EA6FF12F6FB65AF2720B59CCF";

// Route to handle sending money
router.post('/transaction', async (req, res) => {
    try {
        const { token, receiverId, amount } = req.body;
        if (token == null) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            const decoded = jwt.verify(token, JWT_PASS);
            const user = await User.findOne({ _id: decoded.id });
            if (user == null) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const senderId = decoded.id;
            const numericAmount = Number(amount);
            if (isNaN(numericAmount) || numericAmount <= 0) {
                throw new Error("Invalid amount. Please provide a valid number greater than zero.");
            }

            const result = await User_details.sendMoney(senderId, receiverId, numericAmount);
            console.log(result);
            if(!result.success){
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }

    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }


});


// Route to handle money requeste
router.post('/request', async (req, res) => {
    try {
        const { token, receiverId, amount, paymentMethod, description } = req.body;


        const decoded = jwt.verify(token, JWT_PASS);
        // const user = await User.findOne({ _id: decoded.id });
        // const user_details = await User_details.getUserDetails(user._id);
        const user = await User.findOne({ _id: decoded.id });

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Create a new pending request
        const newRequest = new PendingRequest({
            senderId: decoded.id,
            receiverId,
            amount,
            paymentMethod,
            description,
            status: 'Pending', // Status is 'Pending' initially
            reason: description || "No reason provided",
            createdAt: new Date(),
        });

        // Save the request
        await newRequest.save();

        res.status(200).json({ success: true, message: 'Request sent successfully!' });
    } catch (error) {
        console.error('Error processing money request:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});


router.get('/pending-requests', async (req, res) => {
    // console.log('hi');
    try {
        const token = req.headers.token?.split(' ')[1]; // Get token from Authorization header

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Decode token and verify user
        const decoded = jwt.verify(token, JWT_PASS);
        const user = await User.findOne({ _id: decoded.id });

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Find pending requests related to the logged-in user (as sender or receiver)
        const pendingRequests = await PendingRequest.find({
            $or: [
                // { senderId: user._id },  // If user is the sender
                { receiverId: user._id }  // If user is the receiver
            ]
        }).exec();
        // console.log(pendingRequests);

        res.status(200).json(pendingRequests);  // Return the pending requests
    } catch (error) {
        console.error('Error fetching pending requests:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/approve-request', async (req, res) => {
    try {
        const { token, requestId } = req.body;

        // Verify the token and get user info
        const decoded = jwt.verify(token, JWT_PASS);
        const user = await User.findOne({ _id: decoded.id });
        const user_details = await User_details.findOne({ _id: decoded.user_id });

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Find the pending request by ID
        const pendingRequest = await PendingRequest.findById({ _id: requestId });
        // console.log('Pending req approval');
        // console.log(pendingRequest);
        if (!pendingRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Ensure the recipient is the one approving the request
        if (pendingRequest.receiverId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to approve this request" });
        }

        // Check if the sender has enough balance
        const sender = await User.findOne(pendingRequest.senderId);
        if (sender.amount < pendingRequest.amount) {
            return res.status(400).json({ message: "Insufficient funds in sender's account" });
        }

        // Deduct the amount from sender's account and transfer to receiver
        sender.amount -= pendingRequest.amount;
        user.amount += pendingRequest.amount;

        // Save the updated user balances
        await sender.save();
        await user.save();

        // Update the request status to 'Approved'




        pendingRequest.status = 'Approved';
        await pendingRequest.save();
        const result = await User_details.acceptPending(pendingRequest.receiverId, pendingRequest.senderId, pendingRequest.amount);
        await PendingRequest.findOneAndDelete({ _id: requestId });

        res.status(200).json({ success: true, message: 'Payment successful and request approved' });

    } catch (error) {
        console.error('Error approving the request:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

router.post('/reject-request', async (req, res) => {
    try {
        const { token, requestId } = req.body;

        // Verify the token and get user info
        const decoded = jwt.verify(token, JWT_PASS);
        const user = await User.findOne({ _id: decoded.id });

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Find the pending request by ID
        const pendingRequest = await PendingRequest.findOne({ _id: requestId });

        if (!pendingRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Ensure the recipient is the one rejecting the request
        if (pendingRequest.receiverId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to reject this request" });
        }

        // Update the request status to 'Rejected'
        pendingRequest.status = 'Rejected';
        // await pendingRequest.delete();
        await PendingRequest.findOneAndDelete({ _id: requestId });

        res.status(200).json({ success: true, message: 'Request rejected' });

    } catch (error) {
        console.error('Error rejecting the request:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});



//sends the user data and sends to the frontend side by verifying the token
router.get('/user', async (req, res) => {
    try {
        const token = req.headers.token?.split(' ')[1];

        const decoded = jwt.verify(token, JWT_PASS);
        const user = await User.findOne({ _id: decoded.id });
        const user_details = await User_details.getUserDetails(user._id);

        res.status(200).json({ user, user_details });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

//sends the user data and sends to the frontend side by verifying the token
router.get('/transaction-history', async (req, res) => {
    try {
        const token = req.headers.token?.split(' ')[1];

        const decoded = jwt.verify(token, JWT_PASS);
        const user = await User.findOne({ _id: decoded.id });
        const transactions = await User_details.getTransactions(user._id);
        // console.log(transactions);  

        res.status(200).json(transactions);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});



const mongoose = require('mongoose');

router.post('/complete-transaction', async (req, res) => {
    let { transactionId } = req.query;
    // console.log(transactionId);
    

    // transactionId = new mongoose.Types.ObjectId(transactionId);

    // Validate transactionId
    if (!transactionId || !mongoose.Types.ObjectId.isValid(transactionId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing transactionId' });
    }

    try {
        // Convert transactionId to ObjectId
        let txn = await PendingRequest.findById(new mongoose.Types.ObjectId(transactionId));

        if (!txn) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        txn.status = "Approved";
        await User_details.acceptPending(txn.receiverId, txn.senderId, txn.amount);
        await txn.save();

        return res.status(200).json({ success: true, message: 'Transaction completed successfully' });
    } catch (error) {
        console.error("Error completing transaction:", error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;


