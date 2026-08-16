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
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
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
  localStorage.setItem(MOCK_BILLS_KEY, JSON.stringify(bills));
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
