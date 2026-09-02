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

async function insertEntry() {
  const billEntry = {
    user_id: 'dd9a9284-30a3-4fab-ac3c-e54392688a36',
    card_number: '•••• •••• •••• 6678',
    cardholder_name: 'PARTH RAJESHBHAI PATEL',
    bank_name: 'SBI Card',
    amount: 21199.00,
    status: 'Success',
    transaction_ref: 'BBPSU6443965946',
    payment_method: 'UPI Instant Direct|SBIC00000NATDN|8780182013',
    created_at: new Date('2026-08-31T15:19:50+05:30').toISOString()
  };

  console.log('Inserting bill entry:', billEntry);

  const { data, error } = await supabase
    .from('credit_card_bills')
    .insert([billEntry])
    .select();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Successfully inserted bill entry into Supabase:', data);
  }
}

insertEntry();
