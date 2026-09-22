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

async function insertSkippedFundRequest() {
  const entry = {
    id: '75b0da5a-f625-4547-a7af-d62d8c635881',
    user_id: '21b27223-633a-4c01-9e73-7d4bc863701e',
    amount: 625411.00,
    utr_number: 'SMEMB26264f3363d00',
    admin_bank_account_id: '33cdc26d-6a75-4db6-b2fd-910635a3a70a', // YES BANK A/C: 084163400005191
    proof_url: 'https://hnrkngrcdtufvcvlwrgy.supabase.co/storage/v1/object/public/receipts/21b27223-633a-4c01-9e73-7d4bc863701e/1789994572287-6872.jpg',
    status: 'approved',
    created_at: '2026-09-21T12:42:53.149585+00:00',
    updated_at: '2026-09-21T12:42:53.149585+00:00'
  };

  console.log('Inserting skipped fund request:', entry);

  const { data, error } = await supabase
    .from('fund_requests')
    .upsert([entry], { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Error inserting fund request:', error);
  } else {
    console.log('Successfully inserted/upserted fund request into Supabase:', data);
  }
}

insertSkippedFundRequest();
