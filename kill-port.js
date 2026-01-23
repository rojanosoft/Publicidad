#!/usr/bin/env node
/**
 * Kill process using a specific port
 * Usage: node kill-port.js [port]
 */

const { execSync } = require('child_process');

// Load .env if no port argument provided
if (!process.argv[2]) {
    require('dotenv').config();
}

const port = process.argv[2] || process.env.PORT;

if (!port) {
    console.error('❌ ERROR: No port specified!');
    console.error('Usage: node kill-port.js [port]');
    console.error('Or set PORT in .env file');
    process.exit(1);
}

console.log(`🔍 Checking for processes on port ${port}...`);

try {
    // For Linux/Mac
    if (process.platform !== 'win32') {
        try {
            const pid = execSync(`lsof -ti:${port}`).toString().trim();
            if (pid) {
                console.log(`❌ Found process ${pid} using port ${port}`);
                console.log(`🔨 Killing process ${pid}...`);
                execSync(`kill -9 ${pid}`);
                console.log(`✅ Process killed successfully`);
            } else {
                console.log(`✅ Port ${port} is free`);
            }
        } catch (error) {
            console.log(`✅ Port ${port} is free (no process found)`);
        }
    } else {
        // For Windows
        try {
            const output = execSync(`netstat -ano | findstr :${port}`).toString();
            const lines = output.split('\n').filter(line => line.includes('LISTENING'));
            
            if (lines.length > 0) {
                const pid = lines[0].trim().split(/\s+/).pop();
                console.log(`❌ Found process ${pid} using port ${port}`);
                console.log(`🔨 Killing process ${pid}...`);
                execSync(`taskkill /F /PID ${pid}`);
                console.log(`✅ Process killed successfully`);
            } else {
                console.log(`✅ Port ${port} is free`);
            }
        } catch (error) {
            console.log(`✅ Port ${port} is free (no process found)`);
        }
    }
} catch (error) {
    console.error('❌ Error:', error.message);
}

console.log('\n📋 All Node processes:');
try {
    if (process.platform !== 'win32') {
        const processes = execSync('ps aux | grep node').toString();
        console.log(processes);
    } else {
        const processes = execSync('tasklist | findstr node.exe').toString();
        console.log(processes);
    }
} catch (error) {
    console.log('No node processes found');
}
