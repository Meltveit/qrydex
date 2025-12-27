#!/usr/bin/env node

/**
 * Bot Runner with Environment Variables
 * Loads .env.local and runs the master bot
 */

require('dotenv').config({ path: '.env.local' });

console.log('✅ Environment loaded');
console.log(`   Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)}...`);
console.log(`   Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   Gemini Key: ${process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Missing'}\n`);

// Import and run master bot
(async () => {
    try {
        const { runAllBots } = await import('./lib-external/master-bot.js');
        await runAllBots();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
