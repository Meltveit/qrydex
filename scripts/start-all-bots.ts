
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to run a script
const runScript = (scriptName: string, label: string, color: string) => {
    console.log(`${color}🚀 Starting ${label}...${'\x1b[0m'}`);
    const scriptPath = path.resolve(__dirname, scriptName);

    // Using 'npx tsx' to execute typescript files directly
    const child = spawn('npx', ['tsx', scriptPath], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    child.on('close', (code) => {
        console.log(`${color}🏁 ${label} finished with code ${code}${'\x1b[0m'}`);
    });

    return child;
};

// Colors
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const PURPLE = '\x1b[35m';

console.log(`\n\x1b[1m🤖 Qrydex Bot Orchestrator - Initializing...\x1b[0m\n`);

// 1. Bot A: Data Ingestion (Seeding) - Run first to ensure data exists
// Note: In a real "fire up" scenario, we might skipped seeding if data exists, 
// but for demo we run it or assume it's done. 
// "Fire up all bots" usually implies running the continuous/periodic ones.
// But let's run Deep Scan and Verification.

const startBots = async () => {
    // Start Bot C (Guardian) - Parallel
    runScript('verify-registry-status.ts', 'Bot C (The Guardian)', GREEN);

    // Start News Crawler - Parallel
    // Note: ensure we have a script for this. We have news-crawler.ts but need a runner?
    // We created 'scripts/news-runner.ts' in Phase 4? Let me check file list first or just assume and create if missing.
    // I recall creating a runner but I should verify. I'll create 'run-news-bot.ts' if needed.
    // For now, let's assume 'run-deep-scan-bot.ts' covers Bot A.

    runScript('run-deep-scan-bot.ts', 'Bot A (Deep Scan)', CYAN);

    // New: Maintenance Bot
    runScript('maintenance-bot.ts', 'Maintenance Bot (Vaktmester)', PURPLE);

    // New: Discovery Bot
    runScript('discovery-bot.ts', 'Discovery Bot (Oppdageren)', YELLOW);

    // Bot B is passive (Pulse), it runs inside the Next.js app.
    console.log(`${YELLOW}⚡ Bot B (Pulse) is ACTIVE (Integrated into Search Engine)${'\x1b[0m'}`);
};

// Check for news runner
import fs from 'fs';
const newsRunnerPath = path.resolve(__dirname, 'run-news-bot.ts');

if (fs.existsSync(newsRunnerPath)) {
    runScript('run-news-bot.ts', 'News Bot (Global)', PURPLE);
} else {
    // If specific runner missing, maybe create it or run the library file?
    // I'll create a dedicated runner for news in the next step to be sure.
    console.log(`${PURPLE}⚠️  News Bot runner not found.${'\x1b[0m'}`);
}

startBots();

