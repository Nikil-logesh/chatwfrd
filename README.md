# 🔒 Ultra-Secure Chat Website

A highly secure, real-time chat application with end-to-end encryption, permission-based messaging, and advanced anti-hacking protection.

## 🛡️ Security Features

### **🔐 End-to-End Encryption**
- **Military-grade AES-GCM encryption** with ECDH key exchange
- **Zero-knowledge server** - server cannot read your messages
- **Perfect Forward Secrecy** - unique keys for each session
- **Client-side encryption** - messages encrypted before leaving your device

### **✋ Permission-Based Chat System**
- **No unauthorized access** - users must approve chat requests
- **Request notifications** with accept/decline options
- **2-minute auto-expiry** for pending requests
- **Visual permission indicators** in the interface

### **🚫 Anti-Harassment Protection**
- **User blocking system** - block unwanted users permanently
- **Request filtering** - blocked users cannot send chat requests
- **Real-time blocking** - effects are immediate

### **🛡️ Anti-Hacking Security**
- **Rate limiting** - blocks suspicious IP addresses (50 req/min)
- **Login attempt limiting** - 5 failed attempts = 5-minute lockout
- **Input validation** - prevents injection attacks
- **Payload size limits** - prevents DoS attacks
- **Session management** - secure user state handling

## Features

- **🔒 End-to-End Encryption**: Messages encrypted before sending
- **✋ Permission System**: Users must approve chat requests  
- **🚫 User Blocking**: Block unwanted users permanently
- **🛡️ Anti-Hacking**: Multiple layers of security protection
- **⚡ Real-time Messaging**: Instant encrypted message delivery
- **👥 User Discovery**: See online users safely
- **📱 Responsive Design**: Works on all devices
- **🔑 Unique User Codes**: 8-character secure identification

## How to Run

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Open in Browser**:
   - Go to `http://localhost:3000`
   - Login with any email and password
   - Share your user code with others to chat

## How It Works

### Login Process
1. Enter email and password on the login page
2. If you're a new user, an account is created automatically
3. You receive a unique 8-character user code
4. You're redirected to the chat interface

### Starting a Chat
1. Get another user's code (they need to be online)
2. Enter their code in the "Start New Chat" section
3. A chat room is created for both users
4. Start messaging in real-time!

### Features Overview
- **No Database Required**: All data stored in server memory
- **Auto-Registration**: New users are created automatically on first login
- **Real-time Updates**: Messages appear instantly using WebSocket
- **Online Status**: See who's currently online
- **Clean Interface**: Modern, responsive design

## Technology Stack

- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Real-time**: WebSocket connections via Socket.io
- **Storage**: In-memory (resets on server restart)

## File Structure

```
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── public/
│   ├── index.html     # Login page
│   ├── chat.html      # Chat interface
│   └── style.css      # Styling
└── README.md          # This file
```

## Usage Examples

1. **User A** logs in with `alice@example.com` and gets code `ABC12345`
2. **User B** logs in with `bob@example.com` and gets code `XYZ67890`
3. **User A** enters `XYZ67890` to start chatting with User B
4. Both users can now chat in real-time!

## Notes

- All user data is stored in memory and will be lost when server restarts
- No sensitive data is permanently stored
- Perfect for testing and development
- Can be easily extended with a database for production use

## Extending the Application

To add a database:
1. Install a database driver (e.g., `mongoose` for MongoDB)
2. Replace the `Map` objects with database models
3. Add persistence for users, messages, and chat rooms

To add more features:
- File sharing
- Group chats
- Message history
- User profiles
- Notifications