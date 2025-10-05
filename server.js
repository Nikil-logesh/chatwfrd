const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure Socket.io for Vercel
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});

// In-memory storage (no database needed)
const users = new Map(); // email -> {password, userCode, socketId, isOnline, loginAttempts, lastLoginAttempt}
const activeSockets = new Map(); // socketId -> userCode
const chatRooms = new Map(); // roomId -> {users: Set, messages: [], approved: boolean}
const pendingChatRequests = new Map(); // requestId -> {from, to, timestamp, roomId}
const blockedUsers = new Map(); // userCode -> Set of blocked userCodes
const suspiciousActivity = new Map(); // IP -> {attempts, lastAttempt}

// Security middleware
app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Rate limiting
    const now = Date.now();
    if (!suspiciousActivity.has(clientIP)) {
        suspiciousActivity.set(clientIP, { attempts: 0, lastAttempt: now });
    }
    
    const activity = suspiciousActivity.get(clientIP);
    
    // Reset counter if more than 1 minute passed
    if (now - activity.lastAttempt > 60000) {
        activity.attempts = 0;
    }
    
    activity.attempts++;
    activity.lastAttempt = now;
    
    // Block if too many requests
    if (activity.attempts > 50) {
        console.log(`Blocked suspicious IP: ${clientIP}`);
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    
    next();
});

// Middleware
app.use(express.json({ limit: '10mb' })); // Prevent large payload attacks
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

app.get('/debug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'debug.html'));
});

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

app.get('/simple', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'simple.html'));
});

// Login endpoint with enhanced security
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Input validation and sanitization
    if (email.length > 100 || password.length > 100) {
        return res.status(400).json({ error: 'Input too long' });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if user exists
    if (users.has(email)) {
        const user = users.get(email);
        
        // Check for too many failed login attempts
        const now = Date.now();
        if (user.loginAttempts && user.loginAttempts >= 5 && 
            user.lastLoginAttempt && (now - user.lastLoginAttempt) < 300000) { // 5 minutes
            return res.status(429).json({ error: 'Account temporarily locked. Try again in 5 minutes.' });
        }
        
        if (user.password === password) {
            // Reset login attempts on successful login
            user.loginAttempts = 0;
            user.isOnline = true;
            user.lastLoginAttempt = now;
            
            console.log(`Successful login: ${email} from ${clientIP}`);
            return res.json({ 
                success: true, 
                userCode: user.userCode,
                message: 'Login successful' 
            });
        } else {
            // Increment failed login attempts
            user.loginAttempts = (user.loginAttempts || 0) + 1;
            user.lastLoginAttempt = now;
            
            console.log(`Failed login attempt: ${email} from ${clientIP} (${user.loginAttempts}/5)`);
            return res.status(401).json({ error: 'Invalid password' });
        }
    } else {
        // Create new user with security checks
        if (users.size >= 1000) { // Prevent spam account creation
            return res.status(429).json({ error: 'Server at capacity. Try again later.' });
        }
        
        const userCode = uuidv4().slice(0, 8).toUpperCase();
        users.set(email, {
            password,
            userCode,
            socketId: null,
            isOnline: false,
            loginAttempts: 0,
            lastLoginAttempt: Date.now()
        });
        
        console.log(`New user created: ${email} with code ${userCode} from ${clientIP}`);
        return res.json({ 
            success: true, 
            userCode,
            message: 'Account created and logged in successfully' 
        });
    }
});

// Get online users
app.get('/users', (req, res) => {
    const onlineUsers = [];
    users.forEach((user, email) => {
        if (user.isOnline) {
            onlineUsers.push({
                email: email.split('@')[0], // Hide full email for privacy
                userCode: user.userCode
            });
        }
    });
    res.json(onlineUsers);
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // User joins with their code
    socket.on('join', (userCode) => {
        activeSockets.set(socket.id, userCode);
        
        // Update user's socket ID and online status
        users.forEach((user, email) => {
            if (user.userCode === userCode) {
                user.socketId = socket.id;
                user.isOnline = true;
            }
        });
        
        socket.emit('joined', { userCode });
        console.log(`User ${userCode} joined`);
    });
    
    // Send chat request (requires permission)
    socket.on('sendChatRequest', (targetUserCode) => {
        const currentUserCode = activeSockets.get(socket.id);
        console.log(`Chat request: ${currentUserCode} -> ${targetUserCode}`);
        
        if (!currentUserCode) {
            console.log('No current user code found');
            socket.emit('error', 'User not found. Please refresh and try again.');
            return;
        }
        
        // Check if users are blocking each other
        if (blockedUsers.has(currentUserCode) && blockedUsers.get(currentUserCode).has(targetUserCode)) {
            socket.emit('error', 'You have blocked this user.');
            return;
        }
        
        if (blockedUsers.has(targetUserCode) && blockedUsers.get(targetUserCode).has(currentUserCode)) {
            socket.emit('error', 'This user has blocked you.');
            return;
        }
        
        // Check if target user exists and is online
        let targetUserExists = false;
        let targetSocketId = null;
        
        users.forEach((user, email) => {
            if (user.userCode === targetUserCode) {
                targetUserExists = true;
                if (user.isOnline && user.socketId) {
                    targetSocketId = user.socketId;
                }
            }
        });
        
        if (!targetUserExists) {
            console.log(`Target user ${targetUserCode} does not exist`);
            socket.emit('error', `User with code ${targetUserCode} does not exist`);
            return;
        }
        
        if (!targetSocketId) {
            console.log(`Target user ${targetUserCode} is not online`);
            socket.emit('error', `User ${targetUserCode} is not online`);
            return;
        }
        
        // Create pending request
        const requestId = uuidv4();
        const roomId = [currentUserCode, targetUserCode].sort().join('-');
        
        pendingChatRequests.set(requestId, {
            from: currentUserCode,
            to: targetUserCode,
            timestamp: Date.now(),
            roomId: roomId
        });
        
        // Send request to target user
        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
            targetSocket.emit('chatRequest', {
                requestId: requestId,
                from: currentUserCode,
                message: `${currentUserCode} wants to start an encrypted chat with you.`
            });
        }
        
        socket.emit('chatRequestSent', {
            targetUser: targetUserCode,
            message: 'Chat request sent. Waiting for approval...'
        });
        
        // Auto-expire request after 2 minutes
        setTimeout(() => {
            if (pendingChatRequests.has(requestId)) {
                pendingChatRequests.delete(requestId);
                socket.emit('chatRequestExpired', { targetUser: targetUserCode });
                if (targetSocket) {
                    targetSocket.emit('chatRequestExpired', { from: currentUserCode });
                }
            }
        }, 120000);
    });
    
    // Handle chat request response
    socket.on('respondToChatRequest', (data) => {
        const { requestId, accepted } = data;
        const currentUserCode = activeSockets.get(socket.id);
        
        if (!pendingChatRequests.has(requestId)) {
            socket.emit('error', 'Chat request not found or expired.');
            return;
        }
        
        const request = pendingChatRequests.get(requestId);
        
        if (request.to !== currentUserCode) {
            socket.emit('error', 'Invalid chat request.');
            return;
        }
        
        // Find requester's socket
        let requesterSocketId = null;
        users.forEach((user) => {
            if (user.userCode === request.from && user.isOnline) {
                requesterSocketId = user.socketId;
            }
        });
        
        if (accepted) {
            // Create approved chat room
            const roomId = request.roomId;
            
            if (!chatRooms.has(roomId)) {
                chatRooms.set(roomId, {
                    users: new Set([request.from, request.to]),
                    messages: [],
                    approved: true
                });
            }
            
            // Join both users to the room
            socket.join(roomId);
            
            if (requesterSocketId) {
                const requesterSocket = io.sockets.sockets.get(requesterSocketId);
                if (requesterSocket) {
                    requesterSocket.join(roomId);
                }
            }
            
            // Send chat started events
            const chatData = {
                roomId,
                targetUser: request.from,
                messages: chatRooms.get(roomId).messages
            };
            
            socket.emit('chatStarted', chatData);
            
            if (requesterSocketId) {
                const requesterSocket = io.sockets.sockets.get(requesterSocketId);
                if (requesterSocket) {
                    requesterSocket.emit('chatStarted', {
                        roomId,
                        targetUser: request.to,
                        messages: chatRooms.get(roomId).messages
                    });
                }
            }
            
            console.log(`Chat approved: ${request.from} <-> ${request.to}`);
        } else {
            // Chat request denied
            if (requesterSocketId) {
                const requesterSocket = io.sockets.sockets.get(requesterSocketId);
                if (requesterSocket) {
                    requesterSocket.emit('chatRequestDenied', { 
                        targetUser: request.to,
                        message: `${request.to} declined your chat request.`
                    });
                }
            }
            
            console.log(`Chat denied: ${request.from} -> ${request.to}`);
        }
        
        // Remove the pending request
        pendingChatRequests.delete(requestId);
    });
    
    // Block user
    socket.on('blockUser', (targetUserCode) => {
        const currentUserCode = activeSockets.get(socket.id);
        if (!currentUserCode) return;
        
        if (!blockedUsers.has(currentUserCode)) {
            blockedUsers.set(currentUserCode, new Set());
        }
        
        blockedUsers.get(currentUserCode).add(targetUserCode);
        socket.emit('userBlocked', { userCode: targetUserCode });
        
        console.log(`${currentUserCode} blocked ${targetUserCode}`);
    });
    
    // Unblock user
    socket.on('unblockUser', (targetUserCode) => {
        const currentUserCode = activeSockets.get(socket.id);
        if (!currentUserCode) return;
        
        if (blockedUsers.has(currentUserCode)) {
            blockedUsers.get(currentUserCode).delete(targetUserCode);
        }
        
        socket.emit('userUnblocked', { userCode: targetUserCode });
        
        console.log(`${currentUserCode} unblocked ${targetUserCode}`);
    });
    
    // Handle key exchange
    socket.on('exchangeKeys', (data) => {
        const { roomId, targetUser, publicKey } = data;
        const senderCode = activeSockets.get(socket.id);
        
        console.log(`Key exchange: ${senderCode} -> ${targetUser} in room ${roomId}`);
        
        if (!senderCode || !chatRooms.has(roomId)) {
            console.log('Invalid key exchange request');
            return;
        }
        
        // Find target user's socket
        let targetSocketId = null;
        users.forEach((user) => {
            if (user.userCode === targetUser && user.isOnline) {
                targetSocketId = user.socketId;
            }
        });
        
        if (targetSocketId) {
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                console.log(`Sending public key from ${senderCode} to ${targetUser}`);
                targetSocket.emit('publicKey', {
                    from: senderCode,
                    publicKey: publicKey
                });
            }
        }
    });
    
    // Handle messages (now with encryption support)
    socket.on('sendMessage', (data) => {
        const { roomId, message, encrypted = false } = data;
        const senderCode = activeSockets.get(socket.id);
        
        console.log(`Message from ${senderCode} in room ${roomId}:`, encrypted ? '[ENCRYPTED]' : `"${message}"`);
        
        if (!senderCode) {
            console.log('No sender code found');
            socket.emit('error', 'User not found. Please refresh and try again.');
            return;
        }
        
        if (!chatRooms.has(roomId)) {
            console.log(`Room ${roomId} does not exist`);
            socket.emit('error', 'Chat room not found. Please start the chat again.');
            return;
        }
        
        if (!message || message.trim() === '') {
            console.log('Empty message received');
            return;
        }
        
        const messageObj = {
            id: uuidv4(),
            sender: senderCode,
            message: message.trim(),
            encrypted: encrypted,
            timestamp: new Date().toISOString()
        };
        
        console.log('Created message object with encryption flag:', encrypted);
        
        // Store message
        chatRooms.get(roomId).messages.push(messageObj);
        console.log(`Stored message in room ${roomId}. Total messages: ${chatRooms.get(roomId).messages.length}`);
        
        // Send to all users in the room
        console.log(`Broadcasting message to room ${roomId}`);
        io.to(roomId).emit('newMessage', messageObj);
        
        // Also send confirmation to sender
        socket.emit('messageSent', { success: true, messageId: messageObj.id });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        const userCode = activeSockets.get(socket.id);
        if (userCode) {
            // Update user status
            users.forEach((user) => {
                if (user.userCode === userCode) {
                    user.isOnline = false;
                    user.socketId = null;
                }
            });
            
            activeSockets.delete(socket.id);
            console.log(`User ${userCode} disconnected`);
        }
    });
});

const PORT = process.env.PORT || 3000;

// For Vercel deployment
if (process.env.VERCEL) {
    // Export server for Vercel
    module.exports = server;
} else {
    // Start server for local development
    const HOST = process.env.HOST || '0.0.0.0';
    
    server.listen(PORT, HOST, () => {
        console.log(`🚀 Secure Chat Server running on http://localhost:${PORT}`);
        console.log(`🌐 For friends on same network: http://YOUR_IP:${PORT}`);
        console.log(`🔒 Chat website is ready with end-to-end encryption!`);
        
        if (process.env.NODE_ENV === 'production') {
            console.log(`🌍 Production server running on port ${PORT}`);
        } else {
            console.log(`💻 Development server - share with friends using IP address`);
            console.log(`📖 Check HOSTING_GUIDE.md for deployment options`);
        }
    });
}