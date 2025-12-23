// Run database migration - Try with pooler
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Try different connection options
const connectionString = 'postgresql://postgres.hcziqqvzochbbeurococ:Melis2025CN@aws-0-eu-north-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to Supabase database...');
        await client.connect();
        console.log('Connected!');

        const sqlPath = path.join(__dirname, 'supabase/migrations/001_initial_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running migration...');
        await client.query(sql);

        console.log('✓ Migration completed successfully!');

        // Verify tables exist
        const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('businesses', 'verification_logs', 'premium_verifications')
    `);
        console.log('Created tables:', result.rows.map(r => r.table_name).join(', '));

    } catch (error) {
        console.error('Migration error:', error.message);
        if (error.message.includes('ENOTFOUND')) {
            console.log('\nTrying alternative connection...');
            // Fallback to direct connection
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
                console.log('Alt connected!');
                const sql = fs.readFileSync(path.join(__dirname, 'supabase/migrations/001_initial_schema.sql'), 'utf8');
                await altClient.query(sql);
                console.log('✓ Migration via alt connection completed!');
            } catch (altError) {
                console.error('Alt error:', altError.message);
            } finally {
                await altClient.end();
            }
        }
    } finally {
        try { await client.end(); } catch { }
    }
}

runMigration();
