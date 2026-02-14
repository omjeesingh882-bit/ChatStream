const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

// Middleware to verify token (duplicated for now, could move to separate middleware file)
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Get messages between current user and another user
router.get('/:userId', auth, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user.userId;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: otherUserId },
                { sender: otherUserId, recipient: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send a message
router.post('/:userId', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const recipientId = req.params.userId;
        const senderId = req.user.userId;

        const newMessage = new Message({
            sender: senderId,
            recipient: recipientId,
            content
        });

        await newMessage.save();

        // Emit socket event
        const recipientSocketId = req.userSocketMap.get(recipientId);
        if (recipientSocketId) {
            req.io.to(recipientSocketId).emit('newMessage', newMessage);
        }

        res.json(newMessage);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
