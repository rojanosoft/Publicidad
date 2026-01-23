#!/bin/bash
# Quick setup script for development environment

echo "🚀 Publicidad Display System - Quick Setup"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found! Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created from .env.example"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env and configure:"
        echo "   - PORT (default: 3001)"
        echo "   - AWS credentials"
        echo "   - S3 bucket information"
        echo "   - Admin credentials"
        echo ""
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
else
    echo "✅ .env file exists"
fi

# Verify PORT is set
source .env 2>/dev/null
if [ -z "$PORT" ]; then
    echo "❌ ERROR: PORT is not set in .env!"
    echo "   Please add: PORT=3001 (or your desired port)"
    exit 1
else
    echo "✅ PORT is set to: $PORT"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check server configuration
echo ""
echo "🔍 Checking server configuration..."
node check-server.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  npm run start:safe   (recommended - auto-kills port conflicts)"
echo "  npm start            (standard)"
echo ""
echo "With PM2 (production):"
echo "  pm2 start ecosystem.config.js"
echo ""
