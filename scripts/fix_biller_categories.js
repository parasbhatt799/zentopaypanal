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

const supabase = createClient(url, key);

const updates = [
  { biller_id: 'AAVA00000NATMF', category: 'Loan Repayment' },
  { biller_id: 'ANDH00013ANPWK', category: 'eChallan' },
  { biller_id: 'BARO00000GUJ40', category: 'Broadband Postpaid' },
  { biller_id: 'MINI00000MEE5D', category: 'Municipal Taxes' },
  { biller_id: 'SMC000000GUJ01', category: 'Water' },
  { biller_id: 'STAT00000GUJ4N', category: 'eChallan' },
  { biller_id: 'TELA00000TELKA', category: 'eChallan' }
];

async function main() {
  console.log('Starting category cleanup in Supabase...');
  for (const u of updates) {
    const { data, error } = await supabase
      .from('billers')
      .update({ category: u.category })
      .eq('biller_id', u.biller_id)
      .select();
    
    if (error) {
      console.error(`Error updating biller ${u.biller_id}:`, error.message);
    } else {
      console.log(`Successfully updated biller ${u.biller_id} to category "${u.category}"`);
    }
  }
  console.log('Finished cleanup.');
}

main();
