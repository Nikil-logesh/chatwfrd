@echo off
echo 🚀 Vercel Deployment Helper
echo ================================

echo 📦 Installing Vercel CLI...
call npm install -g vercel

if %errorlevel% neq 0 (
    echo ❌ Failed to install Vercel CLI
    echo 💡 Try running as administrator
    pause
    exit /b 1
)

echo ✅ Vercel CLI installed successfully

echo.
echo 🔐 Your secure chat app is ready for deployment!
echo.
echo 📋 Next Steps:
echo 1. Run: vercel login
echo 2. Run: vercel
echo 3. Follow the prompts
echo 4. Share the URL with friends!
echo.

echo 🌍 Starting Vercel login...
call vercel login

echo.
echo 🚀 Ready to deploy! Run 'vercel' to deploy your app.
echo.

pause