// Flexible migration runner - Accepts migration filename as argument
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Get migration filename from command line
const migrationName = process.argv[2];

if (!migrationName) {
    console.error('❌ Usage: node run-migration-flex.js <migration_name>');
    console.error('   Example: node run-migration-flex.js 006_news_sources');
    process.exit(1);
}

// Connection string with credentials from env
const connectionString = 'postgresql://postgres.hcziqqvzochbbeurococ:Melis2025CN@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log(`🔌 Connecting to Supabase database...`);
        await client.connect();
        console.log('✅ Connected!');

        // Build path to migration file
        const sqlPath = path.join(__dirname, 'supabase/migrations', `${migrationName}.sql`);

        if (!fs.existsSync(sqlPath)) {
            console.error(`❌ Migration file not found: ${sqlPath}`);
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log(`📝 Running migration: ${migrationName}...`);
        await client.query(sql);

        console.log(`✅ Migration ${migrationName} completed successfully!`);

    } catch (error) {
        console.error('❌ Migration error:', error.message);

        // Try alternative direct connection if pooler fails
        if (error.message.includes('Tenant or user not found') || error.message.includes('ENOTFOUND')) {
            console.log('\\n🔄 Trying alternative direct connection...');
            const altClient = new Client({
                host: 'db.hcziqqvzochbbeurococ.supabase.co',
                port: 5432,
                database: 'postgres',
                user: 'postgres',
                password: 'Melis2025CN',
                ssl: { rejectUnauthorized: false }
            });

            try {
                await altClient.connect();
                console.log('✅ Alt connection established!');

                const sqlPath = path.join(__dirname, 'supabase/migrations', `${migrationName}.sql`);
                const sql = fs.readFileSync(sqlPath, 'utf8');

                await altClient.query(sql);
                console.log(`✅ Migration ${migrationName} via direct connection completed!`);
            } catch (altError) {
                console.error('❌ Direct connection also failed:', altError.message);
                process.exit(1);
            } finally {
                await altClient.end();
            }
        } else {
            process.exit(1);
        }
    } finally {
        try { await client.end(); } catch { }
    }
}

runMigration();
