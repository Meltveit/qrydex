#!/usr/bin/env node

/**
 * Bot Runner Wrapper
 * Executes the TypeScript master bot using tsx
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Launching Qrydex Master Bot sequence...');

const scriptPath = path.join(__dirname, 'lib-external', 'master-bot.ts');
const cmd = 'npx';
const args = ['tsx', '--env-file=.env.local', scriptPath, ...process.argv.slice(2)];

const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env
});

child.on('close', (code) => {
    console.log(`\n✅ Bot sequence finished with code ${code}`);
    process.exit(code);
});

child.on('error', (err) => {
    console.error('❌ Failed to start bots:', err);
    process.exit(1);
});
