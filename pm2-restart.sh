#!/bin/bash
# PM2 Restart Script with .env reload

echo "🔄 Restarting Publicidad with PM2..."
echo "======================================"

# Stop and delete existing PM2 process
echo "📦 Stopping existing PM2 process..."
pm2 stop publicidad 2>/dev/null || true
pm2 delete publicidad 2>/dev/null || true

# Verify .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Create one from .env.example:"
    echo "  cp .env.example .env"
    exit 1
fi

# Check PORT is set
source .env
if [ -z "$PORT" ]; then
    echo "❌ ERROR: PORT is not set in .env!"
    exit 1
fi

echo "✅ .env loaded - PORT=$PORT"

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if process already exists
PM2_EXISTS=$(pm2 list | grep publicidad | wc -l)

if [ $PM2_EXISTS -gt 0 ]; then
    echo "🔄 Restarting existing PM2 process with updated environment..."
    pm2 restart ecosystem.config.js --update-env
else
    echo "🚀 Starting new PM2 process..."
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "✅ PM2 restart complete!"
echo ""
echo "Useful commands:"
echo "  pm2 logs publicidad      - View logs"
echo "  pm2 status              - Check status"
echo "  pm2 monit               - Monitor in real-time"
echo "  pm2 restart publicidad  - Restart app"
echo ""
