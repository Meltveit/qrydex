const { Client } = require('pg');

const client = new Client({
    host: 'db.hcziqqvzochbbeurococ.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Melis2025CN',
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        console.log('Connecting via direct connection...');
        await client.connect();
        console.log('✅ Connected!');

        await client.query('ALTER TABLE crawl_queue ADD COLUMN IF NOT EXISTS details JSONB;');
        console.log('✅ Added details column to crawl_queue');

        await client.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

main();
