// Vercel serverless function for chat API
const { v4: uuidv4 } = require('uuid');

// In-memory storage (shared across function calls in same instance)
global.users = global.users || new Map();
global.activeSessions = global.activeSessions || new Map();
global.chatRooms = global.chatRooms || new Map();
global.pendingChatRequests = global.pendingChatRequests || new Map();
global.blockedUsers = global.blockedUsers || new Map();
global.messages = global.messages || new Map(); // roomId -> messages array

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
};

export default function handler(req, res) {
    // Set CORS headers
    Object.keys(corsHeaders).forEach(key => {
        res.setHeader(key, corsHeaders[key]);
    });

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {
        switch (action) {
            case 'login':
                return handleLogin(req, res);
            case 'getOnlineUsers':
                return handleGetOnlineUsers(req, res);
            case 'sendMessage':
                return handleSendMessage(req, res);
            case 'getMessages':
                return handleGetMessages(req, res);
            case 'requestChat':
                return handleRequestChat(req, res);
            case 'approveChat':
                return handleApproveChat(req, res);
            case 'blockUser':
                return handleBlockUser(req, res);
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

function handleLogin(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    // Simple validation
    if (!email.includes('@') || password.length < 6) {
        return res.status(400).json({ error: 'Invalid email or password too short' });
    }

    let user = global.users.get(email);
    
    if (!user) {
        // Create new user
        const userCode = generateUserCode();
        user = {
            password,
            userCode,
            isOnline: true,
            sessionId: uuidv4()
        };
        global.users.set(email, user);
    } else if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid password' });
    } else {
        // Update existing user
        user.isOnline = true;
        user.sessionId = uuidv4();
    }

    global.activeSessions.set(user.sessionId, user.userCode);

    return res.status(200).json({
        success: true,
        userCode: user.userCode,
        sessionId: user.sessionId,
        message: 'Login successful'
    });
}

function handleGetOnlineUsers(req, res) {
    const { sessionId } = req.query;
    
    if (!sessionId || !global.activeSessions.has(sessionId)) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const currentUserCode = global.activeSessions.get(sessionId);
    const onlineUsers = [];

    for (const [email, user] of global.users.entries()) {
        if (user.isOnline && user.userCode !== currentUserCode) {
            onlineUsers.push({
                userCode: user.userCode,
                email: email.split('@')[0] // Only show username part
            });
        }
    }

    return res.status(200).json({ onlineUsers });
}

function handleSendMessage(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, targetUser, message, encrypted } = req.body;
    
    if (!sessionId || !global.activeSessions.has(sessionId)) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const senderCode = global.activeSessions.get(sessionId);
    const roomId = [senderCode, targetUser].sort().join('-');
    
    if (!global.messages.has(roomId)) {
        global.messages.set(roomId, []);
    }

    const messageObj = {
        id: uuidv4(),
        sender: senderCode,
        message,
        encrypted: encrypted || false,
        timestamp: new Date().toISOString()
    };

    global.messages.get(roomId).push(messageObj);

    return res.status(200).json({ success: true, messageId: messageObj.id });
}

function handleGetMessages(req, res) {
    const { sessionId, targetUser, lastMessageId } = req.query;
    
    if (!sessionId || !global.activeSessions.has(sessionId)) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const userCode = global.activeSessions.get(sessionId);
    const roomId = [userCode, targetUser].sort().join('-');
    
    const messages = global.messages.get(roomId) || [];
    
    // If lastMessageId is provided, only return newer messages
    let filteredMessages = messages;
    if (lastMessageId) {
        const lastIndex = messages.findIndex(m => m.id === lastMessageId);
        if (lastIndex !== -1) {
            filteredMessages = messages.slice(lastIndex + 1);
        }
    }

    return res.status(200).json({ messages: filteredMessages });
}

function handleRequestChat(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, targetUser } = req.body;
    
    if (!sessionId || !global.activeSessions.has(sessionId)) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const fromUser = global.activeSessions.get(sessionId);
    const requestId = uuidv4();
    
    global.pendingChatRequests.set(requestId, {
        from: fromUser,
        to: targetUser,
        timestamp: Date.now()
    });

    return res.status(200).json({ 
        success: true, 
        requestId,
        message: 'Chat request sent' 
    });
}

function handleApproveChat(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, requestId, approved } = req.body;
    
    if (!sessionId || !global.activeSessions.has(sessionId)) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const request = global.pendingChatRequests.get(requestId);
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }

    global.pendingChatRequests.delete(requestId);

    return res.status(200).json({ 
        success: true,
        approved,
        from: request.from,
        to: request.to
    });
}

function handleBlockUser(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, targetUser } = req.body;
    
    if (!sessionId || !global.activeSessions.has(sessionId)) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const userCode = global.activeSessions.get(sessionId);
    
    if (!global.blockedUsers.has(userCode)) {
        global.blockedUsers.set(userCode, new Set());
    }
    
    global.blockedUsers.get(userCode).add(targetUser);

    return res.status(200).json({ success: true });
}

function generateUserCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}