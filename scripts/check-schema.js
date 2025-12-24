require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

async function checkSchema() {
    console.log('Checking crawl_queue schema...');

    // Try to select the 'details' column
    const { data, error } = await supabase
        .from('crawl_queue')
        .select('details')
        .limit(1);

    if (error) {
        console.log('❌ details column missing or error:', error.message);
    } else {
        console.log('✅ details column exists!');
    }
}

checkSchema();
