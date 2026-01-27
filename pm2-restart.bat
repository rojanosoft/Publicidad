@echo off
REM PM2 Restart Script with .env reload (Windows)

echo ======================================
echo Restarting Publicidad with PM2...
echo ======================================
echo.

REM Stop and delete existing PM2 process
echo Stopping existing PM2 process...
pm2 stop publicidad 2>nul
pm2 delete publicidad 2>nul

REM Verify .env exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Create one from .env.example:
    echo   copy .env.example .env
    exit /b 1
)

echo SUCCESS: .env file found

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Start with ecosystem config (which now loads .env)
echo Starting with PM2...
pm2 start ecosystem.config.js

if errorlevel 1 (
    echo ERROR: Failed to start with PM2
    echo Check logs: pm2 logs publicidad
    exit /b 1
)

REM Save PM2 configuration
echo Saving PM2 configuration...
pm2 save

echo.
echo SUCCESS: PM2 restart complete!
echo.
echo Useful commands:
echo   pm2 logs publicidad      - View logs
echo   pm2 status              - Check status
echo   pm2 monit               - Monitor in real-time
echo   pm2 restart publicidad  - Restart app
echo.
pause
