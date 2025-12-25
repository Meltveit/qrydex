
import dotenv from 'dotenv';
import path from 'path';

console.log('CWD:', process.cwd());
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Env Path:', envPath);
const result = dotenv.config({ path: envPath });
console.log('Dotenv parsed keys:', Object.keys(result.parsed || {}));
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
