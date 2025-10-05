@echo off
echo 🚀 GitHub Upload Helper
echo ========================

echo 📋 Before running this script:
echo 1. Create a GitHub repository named 'secure-chat-app'
echo 2. Make sure it's PUBLIC (required for free Vercel)
echo 3. Don't initialize with README
echo.

set /p username="Enter your GitHub username: "
if "%username%"=="" (
    echo ❌ Username cannot be empty
    pause
    exit /b 1
)

echo.
echo 🔧 Setting up Git repository...

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed
    echo 💡 Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git is installed

echo 📦 Initializing repository...
git init

echo 📁 Adding all files...
git add .

echo 💾 Creating initial commit...
git commit -m "🔒 Secure Chat App with End-to-End Encryption"

echo 🌿 Setting main branch...
git branch -M main

echo 🔗 Adding remote origin...
git remote add origin https://github.com/%username%/secure-chat-app.git

echo 🚀 Pushing to GitHub...
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ❌ Push failed. This might be because:
    echo 1. Repository doesn't exist on GitHub
    echo 2. Username is incorrect
    echo 3. You need to authenticate with GitHub
    echo.
    echo 💡 Try creating the repository first at:
    echo    https://github.com/new
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Successfully uploaded to GitHub!
echo.
echo 🎯 Next Steps:
echo 1. Go to https://vercel.com
echo 2. Sign in with GitHub
echo 3. Click "New Project"
echo 4. Import 'secure-chat-app'
echo 5. Click "Deploy"
echo.
echo 🔗 Your repository: https://github.com/%username%/secure-chat-app
echo.

pause