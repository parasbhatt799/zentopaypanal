export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'suspended' | 'pending';
export type TransactionStatus = 'Success' | 'Pending' | 'Failed';
export type B2BSyncStatus = 'synced' | 'pending' | 'failed';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  alt_phone?: string;
  address?: string;
  firm_address?: string;
  reference?: string;
  avatar_url?: string;
  password?: string;
  password_change_required?: boolean;
  mpin?: string;
  tpin?: string;
  b2b_agent_id?: string;
  b2b_sync_status?: B2BSyncStatus;
  x_api_key?: string;
  x_secret_key?: string;
  role: UserRole;
  status: UserStatus;
  wallet_balance: number;
  created_at: string;
}

export interface CreditCardBill {
  id: string;
  user_id: string;
  card_number: string;
  cardholder_name: string;
  bank_name: string;
  amount: number;
  status: TransactionStatus;
  transaction_ref: string;
  payment_method: string;
  created_at: string;
}

export interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  eta: string;
}

export interface B2BConfig {
  api_url: string;
  api_token: string;
  auto_sync: boolean;
}

export interface SystemSettings {
  maintenance_mode: MaintenanceConfig;
  b2b_config?: B2BConfig;
  app_info?: {
    app_name: string;
    support_email: string;
  };
}

export interface FundRequest {
  id: string; // matches request_id
  user_id: string;
  amount: number;
  utr_number: string;
  admin_bank_account_id?: string | null;
  proof_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}
