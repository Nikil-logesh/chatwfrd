@echo off
echo 🔒 Preparing Secure Chat App for deployment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Get local IP address
echo.
echo 🌐 Network Information:
echo ==================================
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    set LOCAL_IP=%%a
    goto :found
)
:found
set LOCAL_IP=%LOCAL_IP: =%

echo 🏠 Local URL: http://localhost:3000
echo 📱 Share with friends: http://%LOCAL_IP%:3000
echo.
echo 🚀 Starting secure chat server...
echo ==================================

REM Start the server
call npm start

pause