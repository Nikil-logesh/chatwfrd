#!/bin/bash

# 🚀 Quick Deploy Script for Secure Chat App

echo "🔒 Preparing Secure Chat App for deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for errors
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Get local IP address for sharing
echo ""
echo "🌐 Network Information:"
echo "=================================="

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
else
    # Windows (Git Bash)
    LOCAL_IP=$(ipconfig | grep "IPv4" | head -1 | awk '{print $NF}')
fi

echo "🏠 Local URL: http://localhost:3000"
echo "📱 Share with friends: http://$LOCAL_IP:3000"
echo ""
echo "🚀 Starting secure chat server..."
echo "=================================="

# Start the server
npm start