const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

// Middleware to verify token
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

// Multer setup for image upload
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5000000 }, // 5MB
    fileFilter: (req, file, cb) => {
        checkFileType(file, cb);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Get all users (except current)
router.get('/', auth, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user.userId } }).select('-password');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Profile (Bio, Username)
router.put('/profile', auth, async (req, res) => {
    try {
        const { bio, username } = req.body;
        const user = await User.findById(req.user.userId);

        if (bio !== undefined) user.bio = bio; // Allow empty string
        if (username) user.username = username; // Note: Should check uniqueness if changing username

        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Upload Avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const avatarUrl = `/uploads/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(req.user.userId, { avatar: avatarUrl }, { new: true }).select('-password');

        res.json(user);
    } catch (err) {
        console.error('Avatar upload error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
