const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');
const cors = require('cors');
const { ExpressPeerServer } = require('peer');

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, '.')));

// Set up PeerJS server
const peerServer = ExpressPeerServer(http, {
    debug: true,
    path: '/peerjs'
});

app.use('/peerjs', peerServer);

// Store active rooms and their participants
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId, userId) => {
        // Leave previous room if any
        Array.from(socket.rooms).forEach(room => {
            if (room !== socket.id) {
                socket.leave(room);
            }
        });

        // Join new room
        socket.join(roomId);
        
        // Add user to room participants
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(userId);

        // Notify others in the room
        socket.to(roomId).emit('user-connected', userId);
        console.log('User', userId, 'joined room', roomId);

        // Handle disconnection
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
            // Remove user from room participants
            const room = rooms.get(roomId);
            if (room) {
                room.delete(userId);
                if (room.size === 0) {
                    rooms.delete(roomId);
                }
            }
        });
    });

    // Handle invite link generation
    socket.on('generate-invite', (roomId) => {
        const inviteLink = `${process.env.BASE_URL || 'http://localhost:5500'}/join.html?room=${roomId}`;
        socket.emit('invite-link', inviteLink);
    });
});

const PORT = process.env.PORT || 5500;
http.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 