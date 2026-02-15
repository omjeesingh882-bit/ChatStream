require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store connected users (userId -> socketId)
const userSocketMap = new Map();

// Middleware to pass io and userSocketMap to routes
app.use((req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        console.log('Attempting to use local portable database...');
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const path = require('path');
            const fs = require('fs');

            const dbPath = path.join(__dirname, 'data', 'db');
            if (!fs.existsSync(dbPath)) {
                fs.mkdirSync(dbPath, { recursive: true });
            }

            // Remove mongod.lock and WiredTiger.lock if they exist
            const lockFile = path.join(dbPath, 'mongod.lock');
            const wtLock = path.join(dbPath, 'WiredTiger.lock');

            try {
                if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
                if (fs.existsSync(wtLock)) fs.unlinkSync(wtLock);
                console.log('Cleaned up lock files');
            } catch (e) {
                console.error('Failed to cleanup lock files:', e);
            }

            const mongod = await MongoMemoryServer.create({
                instance: {
                    dbPath: dbPath,
                    storageEngine: 'wiredTiger'
                },
                spawn: {
                    startupTimeout: 60000 // 60 seconds
                }
            });

            const uri = mongod.getUri();
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
            console.log('Connected to Local Portable MongoDB');
        } catch (memErr) {
            console.error('Failed to connect to local portable DB:', memErr);
        }
    }
};

connectDB().then(() => {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

// Socket.io
io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('register', (userId) => {
        if (userId) {
            userSocketMap.set(userId, socket.id);
            console.log(`User ${userId} registered with socket ${socket.id}`);
            io.emit('userStatus', { userId, status: 'online' });
        }
    });

    socket.on('disconnect', () => {
        // Find userId by socketId to remove
        for (const [userId, socketId] of userSocketMap.entries()) {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);
                console.log(`User ${userId} disconnected`);
                io.emit('userStatus', { userId, status: 'offline' });
                break;
            }
        }
    });
});

// Server started after DB connection
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });
