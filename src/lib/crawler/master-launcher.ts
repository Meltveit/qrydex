/**
 * Qrydex Master Bot Launcher
 * Simplified bot architecture - Run 2 instances of each core bot
 * 
 * Core Bots:
 * 1. Data Collector (Registry + Discovery)
 * 2. Website Scraper (Deep Crawl) - 3 workers
 * 3. Translator (Multilingual)
 * 4. Maintenance (Quality + Trust)
 * 5. News Intelligence (Optional)
 */

import { spawn } from 'child_process';
import path from 'path';

interface BotConfig {
    name: string;
    script: string;
    instances: number;
    color: string;
}

const BOTS: BotConfig[] = [
    // --- STEP 1: Data Collection (PAUSED to process backlog of 3000 companies) ---
    // {
    //     name: 'Registry Importer',
    //     script: 'src/lib/crawler/nordic-continuous.ts',
    //     instances: 1,
    //     color: '\x1b[36m' // Cyan
    // },
    // },
    {
        name: 'Website Discovery',
        script: 'src/lib/crawler/website-discovery-cli.ts',
        instances: 2,
        color: '\x1b[34m' // Blue
    },

    // --- STEP 2: Enrichment (SCALED UP) ---
    {
        name: 'Deep Scraper',
        script: 'src/lib/crawler/website-scraper-worker.ts',
        instances: 3, // 3 parallel workers (Slow Mode)
        color: '\x1b[32m' // Green
    },

    // --- STEP 3: Verification & Localization ---
    {
        name: 'Translator',
        script: 'src/lib/crawler/translation-bot-cli.ts',
        instances: 3, // 3 parallel translation workers
        color: '\x1b[33m' // Yellow
    },
    {
        name: 'Maintenance',
        script: 'src/lib/crawler/maintenance-bot-cli.ts',
        instances: 2, // 2 parallel maintenance workers (Trust Score calculation)
        color: '\x1b[35m' // Magenta
    }
];



function launchBot(config: BotConfig, instanceNumber: number, workerConfig?: { id: number, total: number }) {
    const botName = workerConfig
        ? `${config.name} W${workerConfig.id + 1}`
        : config.instances > 1
            ? `${config.name} #${instanceNumber + 1}`
            : config.name;

    console.log(`${config.color}🚀 Starting: ${botName}\x1b[0m`);

    const args = ['--env-file=.env.local', config.script];

    // Add worker args for website scraper
    if (workerConfig) {
        args.push(workerConfig.id.toString(), workerConfig.total.toString());
    }

    const bot = spawn('npx', ['tsx', ...args], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true
    });

    bot.on('error', (err) => {
        console.error(`${config.color}❌ ${botName} error:`, err, '\x1b[0m');
    });

    bot.on('exit', (code) => {
        console.log(`${config.color}⚠️ ${botName} exited with code ${code}. Restarting in 5s...\x1b[0m`);
        setTimeout(() => launchBot(config, instanceNumber, workerConfig), 5000);
    });

    return bot;
}

function startAllBots() {
    console.log('\n' + '='.repeat(60));
    console.log('🤖 QRYDEX MASTER BOT LAUNCHER');
    console.log('='.repeat(60));
    console.log('\nStarting all core bots...\n');

    const processes: any[] = [];

    for (const config of BOTS) {
        if (config.instances > 1) {
            // Launch workers with sharding IDs
            for (let i = 0; i < config.instances; i++) {
                const bot = launchBot(config, i, { id: i, total: config.instances });
                processes.push(bot);
            }
        } else {
            // Single instance
            const bot = launchBot(config, 0);
            processes.push(bot);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ All bots started (${processes.length} processes)`);
    console.log('Press Ctrl+C to stop all bots');
    console.log('='.repeat(60) + '\n');

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Stopping all bots...');
        processes.forEach(p => p.kill());
        process.exit(0);
    });
}

// Run
startAllBots();
