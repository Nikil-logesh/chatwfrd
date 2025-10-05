#!/bin/bash

echo "🚀 Vercel Deployment Helper"
echo "================================"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

echo "📦 Installing Vercel CLI..."
npm install -g vercel

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Vercel CLI"
    echo "💡 Try running with sudo: sudo npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI installed successfully"
echo ""
echo "🔐 Your secure chat app is ready for deployment!"
echo ""
echo "📋 Next Steps:"
echo "1. Run: vercel login"
echo "2. Run: vercel"
echo "3. Follow the prompts"
echo "4. Share the URL with friends!"
echo ""

echo "🌍 Starting Vercel login..."
vercel login

echo ""
echo "🚀 Ready to deploy! Run 'vercel' to deploy your app."
echo ""