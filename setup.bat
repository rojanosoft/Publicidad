@echo off
REM Quick setup script for development environment (Windows)

echo ============================================
echo Publicidad Display System - Quick Setup
echo ============================================
echo.

REM Check if .env exists
if not exist .env (
    echo WARNING: .env file not found! Creating from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo SUCCESS: .env file created from .env.example
        echo.
        echo IMPORTANT: Edit .env and configure:
        echo    - PORT ^(default: 3001^)
        echo    - AWS credentials
        echo    - S3 bucket information
        echo    - Admin credentials
        echo.
    ) else (
        echo ERROR: .env.example not found!
        exit /b 1
    )
) else (
    echo SUCCESS: .env file exists
)

REM Install dependencies
echo.
echo Installing dependencies...
call npm install

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    exit /b 1
) else (
    echo SUCCESS: Dependencies installed
)

REM Check server configuration
echo.
echo Checking server configuration...
node check-server.js

echo.
echo SUCCESS: Setup complete!
echo.
echo To start the server:
echo   npm run start:safe   ^(recommended - auto-kills port conflicts^)
echo   npm start            ^(standard^)
echo.
echo With PM2 ^(production^):
echo   pm2 start ecosystem.config.js
echo.
pause
