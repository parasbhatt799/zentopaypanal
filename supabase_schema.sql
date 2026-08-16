-- ========================================================
-- ZentoPay Supabase Database Schema & Setup Script
-- Paste this script into your Supabase SQL Editor and click RUN
-- ========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Profiles Table (Users & Admins)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    phone TEXT,
    alt_phone TEXT,
    address TEXT,
    firm_address TEXT,
    reference TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    status TEXT CHECK (status IN ('active', 'suspended', 'pending')) DEFAULT 'active',
    password_change_required BOOLEAN DEFAULT true,
    password TEXT DEFAULT 'password123',
    b2b_agent_id TEXT,
    b2b_sync_status TEXT DEFAULT 'synced',
    x_api_key TEXT,
    x_secret_key TEXT,
    mpin TEXT,
    tpin TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Credit Card Bills / Transactions Table
CREATE TABLE IF NOT EXISTS public.credit_card_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_number TEXT NOT NULL,
    cardholder_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT CHECK (status IN ('Success', 'Pending', 'Failed')) DEFAULT 'Success',
    transaction_ref TEXT UNIQUE NOT NULL,
    payment_method TEXT DEFAULT 'UPI / NetBanking',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create System Settings Table (Maintenance Mode, Global Notices, B2B Config)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Billers Table (Synced B2B Billers database)
CREATE TABLE IF NOT EXISTS public.billers (
    biller_id TEXT PRIMARY KEY,
    biller_name TEXT NOT NULL,
    category TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Fund Requests Table
CREATE TABLE IF NOT EXISTS public.fund_requests (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    utr_number TEXT NOT NULL,
    admin_bank_account_id TEXT,
    proof_url TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_requests ENABLE ROW LEVEL SECURITY;

-- Permissive policies for public app
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update to profiles" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Allow public read access to credit_card_bills" ON public.credit_card_bills FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update to credit_card_bills" ON public.credit_card_bills FOR ALL USING (true);

CREATE POLICY "Allow public access to system_settings" ON public.system_settings FOR ALL USING (true);

CREATE POLICY "Allow public read access to billers" ON public.billers FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update to billers" ON public.billers FOR ALL USING (true);

CREATE POLICY "Allow public access to fund_requests" ON public.fund_requests FOR ALL USING (true);

-- Insert Default System Settings
INSERT INTO public.system_settings (key, value)
VALUES 
    ('maintenance_mode', '{"enabled": false, "message": "System upgrading. Back online shortly.", "eta": "30 mins"}'::jsonb),
    ('b2b_config', '{"api_url": "http://localhost:5000/api/b2b/create-agent", "api_token": "b2b_sec_token_99882233", "auto_sync": true}'::jsonb),
    ('app_info', '{"app_name": "ZentoPay", "support_email": "support@zentopay.com"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Initial Admin Account Setup
INSERT INTO public.profiles (email, full_name, phone, role, status, password_change_required, password, b2b_agent_id, wallet_balance)
VALUES 
    ('admin@zentopay.com', 'System Admin', '9876543210', 'admin', 'active', false, 'password123', 'B2B-AGT-ADMIN', 500000.00)
ON CONFLICT (email) DO NOTHING;
