import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

console.log('Testing connection to Supabase Project:', url);
const supabase = createClient(url, key);

async function main() {
  try {
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*').limit(5);
    console.log('Profiles table:', pErr ? `[Notice: ${pErr.message}]` : `[SUCCESS: ${profiles.length} records found]`, profiles);

    const { data: bills, error: bErr } = await supabase.from('credit_card_bills').select('*').limit(5);
    console.log('Credit card bills table:', bErr ? `[Notice: ${bErr.message}]` : `[SUCCESS: ${bills.length} records found]`);
    if (bills && bills.length > 0) {
      console.log('Sample bill record:', bills[0]);
    }

    const { data: settings, error: sErr } = await supabase.from('system_settings').select('*').limit(5);
    console.log('System settings table:', sErr ? `[Notice: ${sErr.message}]` : `[SUCCESS: ${settings.length} records found]`);
  } catch (e) {
    console.error('Error connecting to Supabase:', e);
  }
}

main();
