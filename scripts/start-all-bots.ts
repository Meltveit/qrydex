import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to run a script
const runScript = (scriptName: string, label: string, color: string) => {
    console.log(`${color}🚀[${new Date().toLocaleTimeString()}] Starting ${label}...${'\x1b[0m'} `);
    const scriptPath = path.resolve(__dirname, scriptName);

    // Using 'npx tsx' to execute typescript files directly
    const child = spawn('npx', ['tsx', scriptPath], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    child.on('close', (code) => {
        console.log(`${color}🏁[${new Date().toLocaleTimeString()}] ${label} finished(code ${code})${'\x1b[0m'} `);
    });

    return child;
};

// Colors
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const PURPLE = '\x1b[35m';
const RED = '\x1b[31m';

console.log(`\n\x1b[1m🤖 Qrydex Bot Scheduler - 24 / 7 Operations Mode\x1b[0m\n`);
console.log(`${GREEN}✅ News Bot:       Every 15 minutes${'\x1b[0m'} `);
console.log(`${CYAN}✅ Deep Scan:      Every hour${'\x1b[0m'} `);
console.log(`${PURPLE}✅ Maintenance:    Daily at 03:00${'\x1b[0m'} `);
console.log(`${YELLOW}✅ Discovery:      Daily at 04:00${'\x1b[0m'} `);
console.log('--------------------------------------------------\n');

// 1. Define Jobs
const startScheduler = () => {

    // --- News Bot (Every 15 minutes) ---
    cron.schedule('*/15 * * * *', () => {
        if (fs.existsSync(path.resolve(__dirname, 'run-news-bot.ts'))) {
            runScript('run-news-bot.ts', 'News Bot (Global)', GREEN);
        }
    });

    // --- Deep Scan (Every Hour) ---
    cron.schedule('0 * * * *', () => {
        runScript('run-deep-scan-bot.ts', 'Bot A (Deep Scan)', CYAN);
    });

    // --- Maintenance Bot (Daily at 03:00) ---
    cron.schedule('0 3 * * *', () => {
        runScript('maintenance-bot.ts', 'Maintenance Bot (Vaktmester)', PURPLE);
    });

    // --- Discovery Bot (Daily at 04:00) ---
    cron.schedule('0 4 * * *', () => {
        runScript('discovery-bot.ts', 'Discovery Bot (Oppdageren)', YELLOW);
    });

    // --- Ingestion Bot (Every hour at :00) ---
    cron.schedule('0 * * * *', () => {
        runScript('ingestion-bot.ts', 'Ingestion Bot (The Recruiter)', CYAN);
    });

    console.log('⏳ Scheduler active. Waiting for next trigger...');

    // Run everything once immediately on startup
    console.log('🔥 Performing initial run...');
    runScript('run-news-bot.ts', 'News Bot (Initial Run)', GREEN);
    // runScript('run-deep-scan-bot.ts', 'Bot A (Deep Scan)', CYAN); // Optional, maybe too heavy to run all at once?
    // Let's run just news and maintenance for now to show activity
};

startScheduler();

// Keep process alive
process.stdin.resume();
