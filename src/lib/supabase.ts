import { createClient } from '@supabase/supabase-js';
import type { UserProfile, CreditCardBill, MaintenanceConfig } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ==========================================
// CLEAN DATA STORE (No Dummy Data)
// ==========================================

const MOCK_USERS_KEY = 'zentopay_users_v2';
const MOCK_BILLS_KEY = 'zentopay_bills_v2';
const MOCK_MAINTENANCE_KEY = 'zentopay_maintenance_v2';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'u-admin',
    email: 'admin@zentopay.com',
    full_name: 'System Admin',
    phone: '9876543210',
    password: 'password123',
    role: 'admin',
    status: 'active',
    wallet_balance: 500000.00,
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_BILLS: CreditCardBill[] = [];

export const getStoredUsers = (): UserProfile[] => {
  const stored = localStorage.getItem(MOCK_USERS_KEY);
  if (!stored) {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_USERS;
  }
};

export const saveUsers = (users: UserProfile[]) => {
  try {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Could not save all users to localStorage quota:', e);
  }
};

export const getStoredBills = (): CreditCardBill[] => {
  const stored = localStorage.getItem(MOCK_BILLS_KEY);
  if (!stored) {
    localStorage.setItem(MOCK_BILLS_KEY, JSON.stringify(INITIAL_BILLS));
    return INITIAL_BILLS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_BILLS;
  }
};

export const saveBills = (bills: CreditCardBill[]) => {
  try {
    localStorage.setItem(MOCK_BILLS_KEY, JSON.stringify(bills));
  } catch (e) {
    console.warn('Could not save all bills to localStorage quota:', e);
  }
};

/**
 * Helper to fetch all rows from a Supabase table by chunking in batches of 1000
 * to overcome Supabase PostgREST default max-rows limit (1,000 rows).
 */
export const fetchAllSupabaseRows = async <T = any>(
  tableName: string,
  orderBy: string = 'created_at',
  ascending: boolean = false
): Promise<T[]> => {
  if (!isSupabaseConfigured || !supabase) return [];

  let allRows: T[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(orderBy, { ascending })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error(`Error fetching batch from ${tableName} (range ${from}-${from + batchSize - 1}):`, error);
        break;
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data as T[]);
        if (data.length < batchSize) {
          hasMore = false;
        } else {
          from += batchSize;
        }
      } else {
        hasMore = false;
      }
    } catch (err) {
      console.error(`Exception while fetching batch from ${tableName}:`, err);
      break;
    }
  }

  // Deduplicate by id if present to guarantee unique records across range boundaries
  const seenIds = new Set<string>();
  const uniqueRows: T[] = [];
  for (const row of allRows) {
    const id = (row as any)?.id;
    if (id) {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueRows.push(row);
      }
    } else {
      uniqueRows.push(row);
    }
  }

  return uniqueRows;
};

export const getStoredMaintenance = (): MaintenanceConfig => {
  const stored = localStorage.getItem(MOCK_MAINTENANCE_KEY);
  if (!stored) {
    const defaultConfig: MaintenanceConfig = {
      enabled: false,
      message: 'System is undergoing scheduled maintenance. Services will resume shortly.',
      eta: '45 Minutes',
    };
    localStorage.setItem(MOCK_MAINTENANCE_KEY, JSON.stringify(defaultConfig));
    return defaultConfig;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return {
      enabled: false,
      message: 'System is undergoing scheduled maintenance. Services will resume shortly.',
      eta: '45 Minutes',
    };
  }
};

export const saveMaintenance = (config: MaintenanceConfig) => {
  localStorage.setItem(MOCK_MAINTENANCE_KEY, JSON.stringify(config));
};
