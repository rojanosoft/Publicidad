#!/usr/bin/env node
/**
 * Safe Start Script
 * Checks for port conflicts before starting the server
 */

const { execSync, spawn } = require('child_process');
const path = require('path');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT;

// Validate PORT is set
if (!PORT) {
    console.error('❌ ERROR: PORT is not set in .env file!');
    console.error('Please create a .env file with PORT=3001 (or your desired port)');
    process.exit(1);
}

console.log('🚀 Safe Start Script for Publicidad Display System');
console.log('=' .repeat(60));

// Function to check if port is in use
function isPortInUse(port) {
    try {
        if (process.platform !== 'win32') {
            // Linux/Mac
            const result = execSync(`lsof -ti:${port} 2>/dev/null`).toString().trim();
            return result.length > 0;
        } else {
            // Windows
            const result = execSync(`netstat -ano | findstr :${port}`).toString();
            return result.includes('LISTENING');
        }
    } catch (error) {
        return false;
    }
}

// Function to kill process on port
function killPortProcess(port) {
    try {
        console.log(`🔨 Attempting to free port ${port}...`);
        if (process.platform !== 'win32') {
            execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`);
        } else {
            const output = execSync(`netstat -ano | findstr :${port}`).toString();
            const lines = output.split('\n').filter(line => line.includes('LISTENING'));
            if (lines.length > 0) {
                const pid = lines[0].trim().split(/\s+/).pop();
                execSync(`taskkill /F /PID ${pid}`);
            }
        }
        console.log(`✅ Port ${port} freed`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to free port: ${error.message}`);
        return false;
    }
}

// Check port
console.log(`\n🔍 Checking port ${PORT}...`);
if (isPortInUse(PORT)) {
    console.log(`⚠️  Port ${PORT} is already in use!`);
    console.log('');
    console.log('Choose an option:');
    console.log('  1. Kill the process and start server (automatic in 5 seconds)');
    console.log('  2. Press Ctrl+C to cancel');
    console.log('');
    
    // Wait 5 seconds then kill
    setTimeout(() => {
        if (killPortProcess(PORT)) {
            // Wait a bit more for port to be released
            setTimeout(() => {
                startServer();
            }, 1000);
        } else {
            console.error('❌ Could not free port. Please manually kill the process.');
            process.exit(1);
        }
    }, 5000);
} else {
    console.log(`✅ Port ${PORT} is free`);
    startServer();
}

function startServer() {
    console.log('\n🚀 Starting server...\n');
    
    const serverProcess = spawn('node', ['src/app.js'], {
        stdio: 'inherit',
        env: process.env
    });

    serverProcess.on('error', (error) => {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    });

    serverProcess.on('exit', (code) => {
        if (code !== 0) {
            console.error(`\n❌ Server exited with code ${code}`);
        }
        process.exit(code);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
        serverProcess.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
        console.log('\n⚠️  Received SIGINT (Ctrl+C), shutting down gracefully...');
        serverProcess.kill('SIGINT');
    });
}
