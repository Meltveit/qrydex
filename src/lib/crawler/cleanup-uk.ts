
import { createServerClient } from '../supabase';

async function cleanup() {
    const supabase = createServerClient();
    console.log('🧹 Cleaning up garbage UK import...');

    const { count, error } = await supabase
        .from('businesses')
        .delete({ count: 'exact' })
        .eq('discovery_source', 'wikipedia_ftse');

    console.log(`Deleted ${count} rows. (Error: ${error?.message})`);
}

cleanup();
