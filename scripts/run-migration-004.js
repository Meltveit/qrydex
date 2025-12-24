require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

async function runMigration() {
    console.log('Running migration 004...');

    const sql = fs.readFileSync(
        path.join(__dirname, '../supabase/migrations/004_add_details_to_queue.sql'),
        'utf8'
    );

    // Split by statement if needed, but for simple ALTER it's fine
    // Using a raw SQL execution via rpc or just pg library would be better
    // But Supabase JS client doesn't expose raw SQL execution easily without postgres function
    // So we will use the 'pg' library which is likely installed or I can use the 'run-migration.js' approach if it used 'pg'

    // Checking run-migration.js content first would be smart but let's assume I need 'pg'
    // Actually, I saw 'pg' in dependencies earlier.
}

// Rewriting to use 'pg' directly
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres.hcziqqvzochbbeurococ:Melis2025CN@aws-0-eu-north-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const client = await pool.connect();
        const sql = fs.readFileSync(
            path.join(__dirname, '../supabase/migrations/004_add_details_to_queue.sql'),
            'utf8'
        );

        await client.query(sql);
        console.log('✅ Migration 004 applied successfully');
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

main();
