import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { UserProfile, CreditCardBill, MaintenanceConfig, B2BConfig, UserRole, TransactionStatus, FundRequest } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  getStoredUsers,
  saveUsers,
  getStoredBills,
  saveBills,
  getStoredMaintenance,
  saveMaintenance,
  fetchAllSupabaseRows,
} from '../lib/supabase';

const MOCK_B2B_CONFIG_KEY = 'zentopay_b2b_config';

const DEFAULT_B2B_CONFIG: B2BConfig = {
  api_url: 'http://localhost:5000/api/b2b/create-agent',
  api_token: 'b2b_sec_token_99882233',
  auto_sync: true,
};

export const getStoredB2BConfig = (): B2BConfig => {
  const stored = localStorage.getItem(MOCK_B2B_CONFIG_KEY);
  if (!stored) {
    localStorage.setItem(MOCK_B2B_CONFIG_KEY, JSON.stringify(DEFAULT_B2B_CONFIG));
    return DEFAULT_B2B_CONFIG;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return DEFAULT_B2B_CONFIG;
  }
};

interface AuthContextType {
  currentUser: UserProfile | null;
  role: UserRole | null;
  users: UserProfile[];
  bills: CreditCardBill[];
  maintenance: MaintenanceConfig;
  b2bConfig: B2BConfig;
  isLoading: boolean;
  login: (identifier: string, passwordText?: string, role?: UserRole, mpinText?: string) => void;
  logout: () => void;
  createNewUser: (data: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    phone: string;
    alt_phone?: string;
    address?: string;
    firm_address?: string;
    reference?: string;
    avatar_url?: string;
    email?: string;
    role?: UserRole;
    wallet_balance?: number;
    x_api_key?: string;
    x_secret_key?: string;
    b2b_agent_id?: string;
  }) => Promise<{ user: UserProfile; generatedPassword: string }>;
  changePassword: (newPassword: string) => Promise<void>;
  changeMPIN: (newMpin: string) => Promise<void>;
  changeTPIN: (newTpin: string) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  updateUser: (userId: string, data: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    phone: string;
    alt_phone?: string;
    address?: string;
    firm_address?: string;
    reference?: string;
    avatar_url?: string;
    email: string;
    role: UserRole;
    wallet_balance?: number;
    b2b_agent_id?: string;
    x_api_key?: string;
    x_secret_key?: string;
    password?: string;
  }) => Promise<void>;
  updateMaintenance: (config: MaintenanceConfig) => Promise<void>;
  updateB2BConfig: (config: B2BConfig) => Promise<void>;
  syncUserToB2B: (userId: string) => Promise<UserProfile>;
  payBill: (billData: Omit<CreditCardBill, 'id' | 'created_at' | 'status' | 'transaction_ref'>, extra?: {
    billerId: string;
    customerParams: Array<{ name: string; value: string }>;
    billerResponseInfo?: any;
    mobile?: string;
    customerPan?: string;
  }) => Promise<CreditCardBill>;
  addManualBill: (billData: {
    user_id: string;
    card_number: string;
    cardholder_name: string;
    bank_name: string;
    amount: number;
    status: TransactionStatus;
    transaction_ref: string;
    payment_method: string;
    created_at?: string;
  }) => Promise<CreditCardBill>;
  refreshData: () => Promise<void>;
  checkBillStatus: (billId: string, customId?: string) => Promise<{ success: boolean; status: TransactionStatus; message: string; data?: any }>;
  checkFundRequestStatus: (requestId: string) => Promise<{ success: boolean; status: 'pending' | 'approved' | 'rejected'; message: string }>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  fundRequests: FundRequest[];
  submitFundRequest: (amount: number, utrNumber: string, proofUrl?: string | null, adminBankAccountId?: string | null) => Promise<FundRequest>;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const users = getStoredUsers();
    const savedId = sessionStorage.getItem('zentopay_active_user_id') || localStorage.getItem('zentopay_active_user_id');
    if (savedId) {
      const match = users.find((u) => u.id === savedId || u.phone === savedId || u.email === savedId);
      if (match) {
        if (match.role === 'user' && !sessionStorage.getItem('zentopay_active_user_id')) {
          localStorage.removeItem('zentopay_active_user_id');
          return null;
        }
        try {
          const storedPasswords = JSON.parse(localStorage.getItem('zentopay_user_passwords') || '{}');
          match.password = match.password || storedPasswords[match.id];
        } catch (e) {
          console.error(e);
        }
        try {
          const storedMpins = JSON.parse(localStorage.getItem('zentopay_user_mpins') || '{}');
          match.mpin = match.mpin || storedMpins[match.id] || undefined;
        } catch (e) {
          console.error(e);
        }
        try {
          const storedTpins = JSON.parse(localStorage.getItem('zentopay_user_tpins') || '{}');
          match.tpin = match.tpin || storedTpins[match.id] || undefined;
        } catch (e) {
          console.error(e);
        }
        return match;
      }
    }
    return null;
  });

  const [users, setUsers] = useState<UserProfile[]>(getStoredUsers);
  const [bills, setBills] = useState<CreditCardBill[]>(getStoredBills);
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(getStoredMaintenance);
  const [b2bConfig, setB2BConfig] = useState<B2BConfig>(getStoredB2BConfig);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>(() => {
    try {
      const stored = localStorage.getItem('zentopay_user_fund_requests_v3');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('zentopay_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('zentopay_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    saveUsers(users);

    const savedId = sessionStorage.getItem('zentopay_active_user_id') || localStorage.getItem('zentopay_active_user_id');
    if (savedId) {
      const match = users.find((u) => u.id === savedId || u.phone === savedId || u.email === savedId);
      if (match) {
        if (match.role === 'user' && !sessionStorage.getItem('zentopay_active_user_id')) {
          localStorage.removeItem('zentopay_active_user_id');
          if (currentUser !== null) {
            setCurrentUser(null);
          }
          return;
        }
        if (JSON.stringify(match) !== JSON.stringify(currentUser)) {
          setCurrentUser(match);
        }
      }
    }
  }, [users, currentUser]);

  useEffect(() => {
    saveBills(bills);
  }, [bills]);

  useEffect(() => {
    saveMaintenance(maintenance);
  }, [maintenance]);

  useEffect(() => {
    localStorage.setItem(MOCK_B2B_CONFIG_KEY, JSON.stringify(b2bConfig));
  }, [b2bConfig]);

  useEffect(() => {
    localStorage.setItem('zentopay_user_fund_requests_v3', JSON.stringify(fundRequests));
  }, [fundRequests]);

  const refreshData = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsLoading(true);
    let activeProfiles: UserProfile[] = [];
    try {
      const { data: profilesData } = await supabase.from('profiles').select('*');
      if (profilesData && profilesData.length > 0) {
        try {
          const storedPasswords = JSON.parse(localStorage.getItem('zentopay_user_passwords') || '{}');
          const storedMpins = JSON.parse(localStorage.getItem('zentopay_user_mpins') || '{}');
          activeProfiles = profilesData.map((p) => ({
            ...p,
            password: p.password || storedPasswords[p.id],
            mpin: p.mpin || storedMpins[p.id] || undefined
          }));
          setUsers(activeProfiles);
        } catch (e) {
          activeProfiles = profilesData.map(p => ({ ...p, password: p.password || '' }));
          setUsers(activeProfiles);
        }
      }

      const billsData = await fetchAllSupabaseRows<CreditCardBill>('credit_card_bills', 'created_at', false);
      if (billsData && billsData.length > 0) {
        setBills(billsData);
      }

      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'maintenance_mode')
        .single();
      if (settingsData && settingsData.value) {
        setMaintenance(settingsData.value as MaintenanceConfig);
      }

      const { data: b2bSettings } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'b2b_config')
        .single();
      if (b2bSettings && b2bSettings.value) {
        setB2BConfig(b2bSettings.value as B2BConfig);
      }

      const fundRequestsData = await fetchAllSupabaseRows<FundRequest>('fund_requests', 'created_at', false);
      if (fundRequestsData && fundRequestsData.length > 0) {
        setFundRequests(fundRequestsData);
      }

      // Check statuses of pending requests
      if (currentUser && currentUser.x_api_key && currentUser.x_secret_key) {
        await checkPendingFundRequests(
          currentUser.id,
          currentUser.x_api_key.trim(),
          currentUser.x_secret_key.trim(),
          fundRequestsData || undefined,
          activeProfiles.length > 0 ? activeProfiles : undefined
        );
      }
    } catch (err) {
      console.warn('Supabase fetch notice: using local state fallback', err);
      // Even in fallback, sync pending requests if keys are available
      if (currentUser && currentUser.x_api_key && currentUser.x_secret_key) {
        await checkPendingFundRequests(currentUser.id, currentUser.x_api_key.trim(), currentUser.x_secret_key.trim());
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const login = (identifier: string, passwordText?: string, role?: UserRole, mpinText?: string) => {
    const cleanId = identifier.trim().toLowerCase();
    let target = users.find(
      (u) =>
        (u.email.toLowerCase() === cleanId ||
          (u.phone && u.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, '')) ||
          u.id === cleanId ||
          (u.b2b_agent_id && u.b2b_agent_id.toLowerCase() === cleanId)) &&
        (role ? u.role === role : true)
    );

    if (!target) {
      target = users.find(
        (u) =>
          u.email.toLowerCase() === cleanId ||
          (u.phone && u.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, '')) ||
          (u.b2b_agent_id && u.b2b_agent_id.toLowerCase() === cleanId)
      );
    }

    if (target) {
      // Validate password if user exists
      try {
        const storedPasswords = JSON.parse(localStorage.getItem('zentopay_user_passwords') || '{}');
        const activePassword = target.password || storedPasswords[target.id] || '';
        if (passwordText && passwordText !== activePassword) {
          throw new Error('Incorrect password. Please try again.');
        }
      } catch (e: any) {
        if (e.message.includes('Incorrect password')) throw e;
      }

      // If mpinText is provided, save it as their MPIN
      if (mpinText) {
        try {
          const storedMpins = JSON.parse(localStorage.getItem('zentopay_user_mpins') || '{}');
          storedMpins[target.id] = mpinText;
          localStorage.setItem('zentopay_user_mpins', JSON.stringify(storedMpins));
          target.mpin = mpinText;

          // Update users state list
          const userId = target.id;
          setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, mpin: mpinText } : u));

          // Sync to Supabase database if configured
          if (isSupabaseConfigured && supabase) {
            supabase
              .from('profiles')
              .update({ mpin: mpinText })
              .eq('id', userId)
              .then(({ error }) => {
                if (error) {
                  console.error('Failed to sync MPIN to database:', error);
                } else {
                  console.log('Successfully synced MPIN to database.');
                }
              });
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!target) {
      throw new Error('Account not found. Please verify User ID.');
    }

    if (target) {
      try {
        const storedTpins = JSON.parse(localStorage.getItem('zentopay_user_tpins') || '{}');
        target.tpin = target.tpin || storedTpins[target.id];
      } catch (e) {
        console.error(e);
      }
    }

    setCurrentUser(target);
    if (target.role === 'user') {
      sessionStorage.setItem('zentopay_active_user_id', target.id);
      localStorage.removeItem('zentopay_active_user_id');
    } else {
      localStorage.setItem('zentopay_active_user_id', target.id);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('zentopay_active_user_id');
    sessionStorage.removeItem('zentopay_active_user_id');
  };

  const createNewUser = async (data: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    phone: string;
    alt_phone?: string;
    address?: string;
    firm_address?: string;
    reference?: string;
    avatar_url?: string;
    email?: string;
    role?: UserRole;
    wallet_balance?: number;
    x_api_key?: string;
    x_secret_key?: string;
    b2b_agent_id?: string;
  }) => {
    const cleanPhone = data.phone.replace(/\D/g, '');
    const cleanAltPhone = data.alt_phone ? data.alt_phone.replace(/\D/g, '') : '';
    const generatedPassword = `ZP#${Math.floor(10000 + Math.random() * 90000)}`;
    const userEmail = data.email && data.email.trim() ? data.email.trim() : `${cleanPhone}@zentopay.com`;

    // Generate B2B Agent ID automatically if not provided
    let assignedB2BAgentId = data.b2b_agent_id || '';
    if (!assignedB2BAgentId) {
      const randDigits = Math.floor(10000 + Math.random() * 90000);
      assignedB2BAgentId = `zentopay${randDigits}`;
    }

    const constructedFullName = `${data.first_name} ${data.middle_name || ''} ${data.last_name}`.replace(/\s+/g, ' ').trim();

    const newUser: UserProfile = {
      id: `u-${Date.now()}`,
      full_name: constructedFullName,
      first_name: data.first_name,
      middle_name: data.middle_name || '',
      last_name: data.last_name,
      phone: cleanPhone,
      alt_phone: cleanAltPhone,
      address: data.address || '',
      firm_address: data.firm_address || '',
      reference: data.reference || '',
      avatar_url: data.avatar_url || '',
      email: userEmail,
      password: generatedPassword,
      password_change_required: true,
      b2b_agent_id: assignedB2BAgentId,
      b2b_sync_status: 'synced',
      role: data.role || 'user',
      status: 'active',
      wallet_balance: 0,
      x_api_key: data.x_api_key,
      x_secret_key: data.x_secret_key,
      created_at: new Date().toISOString(),
    };

    setUsers((prev) => [newUser, ...prev]);

    // Optional B2B External Webhook / API Sync Attempt
    if (b2bConfig.auto_sync && b2bConfig.api_url) {
      try {
        fetch(b2bConfig.api_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${b2bConfig.api_token}`,
          },
          body: JSON.stringify({
            b2b_agent_id: newUser.b2b_agent_id,
            user_id: newUser.id,
            full_name: newUser.full_name,
            phone: newUser.phone,
            email: newUser.email,
            role: newUser.role,
            x_api_key: newUser.x_api_key,
            x_secret_key: newUser.x_secret_key,
          }),
        }).catch((err) => console.log('B2B API Sync Notice:', err.message));
      } catch (e) {
        console.warn('B2B Sync Exception:', e);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').insert({
          email: newUser.email,
          full_name: newUser.full_name,
          first_name: newUser.first_name,
          middle_name: newUser.middle_name,
          last_name: newUser.last_name,
          phone: newUser.phone,
          alt_phone: newUser.alt_phone,
          address: newUser.address,
          firm_address: newUser.firm_address,
          reference: newUser.reference,
          avatar_url: newUser.avatar_url,
          password: newUser.password,
          password_change_required: newUser.password_change_required,
          b2b_agent_id: newUser.b2b_agent_id,
          b2b_sync_status: newUser.b2b_sync_status,
          role: newUser.role,
          status: newUser.status,
          x_api_key: newUser.x_api_key,
          x_secret_key: newUser.x_secret_key,
        }).select();

        if (error) {
          console.error('Supabase create profile error:', error);
          if (error.message.includes('column') || error.code === '42703') {
            alert('Supabase Schema Error: Please run the SQL migration to add x_api_key and x_secret_key columns in your Supabase SQL Editor!');
          }
        } else if (data && data[0]) {
          const dbUser = data[0];
          const dbUserProfile: UserProfile = {
            ...dbUser,
            password: newUser.password
          };
          setUsers((prev) => prev.map((u) => u.email === newUser.email ? dbUserProfile : u));
          newUser.id = dbUserProfile.id;
        }
      } catch (dbErr) {
        console.error('Database connection failed:', dbErr);
      }
    }

    return { user: newUser, generatedPassword };
  };

  const changePassword = async (newPassword: string) => {
    if (!currentUser) return;

    const updatedUser: UserProfile = {
      ...currentUser,
      password: newPassword,
      password_change_required: false,
    };

    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));

    // Save password change to local storage map
    try {
      const storedPasswords = JSON.parse(localStorage.getItem('zentopay_user_passwords') || '{}');
      storedPasswords[currentUser.id] = newPassword;
      localStorage.setItem('zentopay_user_passwords', JSON.stringify(storedPasswords));
    } catch (e) {
      console.error('Failed to save password locally:', e);
    }

    setUsers(updatedUsers);
    setCurrentUser(updatedUser);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({
          password: newPassword,
          password_change_required: false
        })
        .eq('id', currentUser.id);

      if (error) {
        console.warn('Failed to update password column in database, updating fallback:', error.message);
        await supabase
          .from('profiles')
          .update({ password_change_required: false })
          .eq('id', currentUser.id);
      }
    }
  };

  const changeMPIN = async (newMpin: string) => {
    if (!currentUser) return;

    const updatedUser: UserProfile = {
      ...currentUser,
      mpin: newMpin,
    };

    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));

    // Save MPIN locally
    try {
      const storedMpins = JSON.parse(localStorage.getItem('zentopay_user_mpins') || '{}');
      storedMpins[currentUser.id] = newMpin;
      localStorage.setItem('zentopay_user_mpins', JSON.stringify(storedMpins));
    } catch (e) {
      console.error('Failed to save MPIN locally:', e);
    }

    setUsers(updatedUsers);
    setCurrentUser(updatedUser);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ mpin: newMpin })
        .eq('id', currentUser.id);

      if (error) {
        console.warn('Failed to update mpin column in Supabase profiles (schema cache may not have it yet):', error.message);
      }
    }
  };

  const changeTPIN = async (newTpin: string) => {
    if (!currentUser) return;

    const updatedUser: UserProfile = {
      ...currentUser,
      tpin: newTpin,
    };

    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));

    // Save T-PIN locally
    try {
      const storedTpins = JSON.parse(localStorage.getItem('zentopay_user_tpins') || '{}');
      storedTpins[currentUser.id] = newTpin;
      localStorage.setItem('zentopay_user_tpins', JSON.stringify(storedTpins));
    } catch (e) {
      console.error('Failed to save T-PIN locally:', e);
    }

    setUsers(updatedUsers);
    setCurrentUser(updatedUser);

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('profiles')
        .update({ tpin: newTpin })
        .eq('id', currentUser.id);

      if (error) {
        console.warn('Failed to update tpin column in Supabase profiles:', error.message);
      }
    }
  };

  const updateB2BConfig = async (config: B2BConfig) => {
    setB2BConfig(config);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('system_settings').upsert({
        key: 'b2b_config',
        value: config,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const syncUserToB2B = async (userId: string): Promise<UserProfile> => {
    const target = users.find((u) => u.id === userId);
    if (!target) throw new Error('User not found');

    const agentId = target.b2b_agent_id || `B2B-AGT-${target.phone || Math.floor(10000 + Math.random() * 90000)}`;

    const updated: UserProfile = {
      ...target,
      b2b_agent_id: agentId,
      b2b_sync_status: 'synced',
    };

    const updatedUsers = users.map((u) => (u.id === userId ? updated : u));
    setUsers(updatedUsers);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').update({
        b2b_agent_id: agentId,
        b2b_sync_status: 'synced',
      }).eq('id', userId);
    }

    return updated;
  };

  const toggleUserStatus = async (userId: string) => {
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        const nextStatus: UserProfile['status'] = u.status === 'active' ? 'suspended' : 'active';
        return { ...u, status: nextStatus };
      }
      return u;
    });
    setUsers(updatedUsers);

    if (currentUser?.id === userId) {
      const updatedSelf = updatedUsers.find((u) => u.id === userId);
      if (updatedSelf) setCurrentUser(updatedSelf);
    }

    if (isSupabaseConfigured && supabase) {
      const target = updatedUsers.find((u) => u.id === userId);
      if (target) {
        await supabase.from('profiles').update({ status: target.status }).eq('id', userId);
      }
    }
  };

  const deleteUser = async (userId: string) => {
    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);

    if (currentUser?.id === userId) {
      setCurrentUser(null);
      localStorage.removeItem('zentopay_active_user_id');
      sessionStorage.removeItem('zentopay_active_user_id');
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('profiles').delete().eq('id', userId);
    }
  };

  const updateUser = async (
    userId: string,
    data: {
      first_name?: string;
      middle_name?: string;
      last_name?: string;
      phone: string;
      alt_phone?: string;
      address?: string;
      firm_address?: string;
      reference?: string;
      avatar_url?: string;
      email: string;
      role: UserRole;
      wallet_balance?: number;
      b2b_agent_id?: string;
      x_api_key?: string;
      x_secret_key?: string;
      password?: string;
    }
  ) => {
    const cleanPhone = data.phone.replace(/\D/g, '');
    const cleanAltPhone = data.alt_phone ? data.alt_phone.replace(/\D/g, '') : '';
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        const fName = typeof data.first_name !== 'undefined' ? data.first_name : (u.first_name || '');
        const mName = typeof data.middle_name !== 'undefined' ? data.middle_name : (u.middle_name || '');
        const lName = typeof data.last_name !== 'undefined' ? data.last_name : (u.last_name || '');
        const constructedFullName = `${fName} ${mName} ${lName}`.replace(/\s+/g, ' ').trim();

        return {
          ...u,
          full_name: constructedFullName,
          first_name: fName,
          middle_name: mName,
          last_name: lName,
          phone: cleanPhone,
          alt_phone: cleanAltPhone,
          address: typeof data.address !== 'undefined' ? data.address : u.address,
          firm_address: typeof data.firm_address !== 'undefined' ? data.firm_address : u.firm_address,
          reference: typeof data.reference !== 'undefined' ? data.reference : u.reference,
          avatar_url: typeof data.avatar_url !== 'undefined' ? data.avatar_url : u.avatar_url,
          email: data.email,
          role: data.role,
          wallet_balance: typeof data.wallet_balance !== 'undefined' ? data.wallet_balance : u.wallet_balance,
          b2b_agent_id: typeof data.b2b_agent_id !== 'undefined' ? data.b2b_agent_id : u.b2b_agent_id,
          x_api_key: data.x_api_key,
          x_secret_key: data.x_secret_key,
          ...(data.password ? { password: data.password } : {}),
        };
      }
      return u;
    });
    setUsers(updatedUsers);

    const updatedUser = updatedUsers.find((u) => u.id === userId);
    if (currentUser?.id === userId && updatedUser) {
      setCurrentUser(updatedUser);
    }

    if (isSupabaseConfigured && supabase && updatedUser) {
      try {
        const updatePayload: any = {
          full_name: updatedUser.full_name,
          first_name: updatedUser.first_name,
          middle_name: updatedUser.middle_name,
          last_name: updatedUser.last_name,
          phone: updatedUser.phone,
          alt_phone: updatedUser.alt_phone,
          address: updatedUser.address,
          firm_address: updatedUser.firm_address,
          reference: updatedUser.reference,
          avatar_url: updatedUser.avatar_url,
          email: updatedUser.email,
          role: updatedUser.role,
          b2b_agent_id: updatedUser.b2b_agent_id,
          x_api_key: updatedUser.x_api_key,
          x_secret_key: updatedUser.x_secret_key,
        };
        if (data.password) {
          updatePayload.password = data.password;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId);
        if (error) {
          console.error('Supabase update profile error:', error);
          if (error.message.includes('column') || error.code === '42703') {
            alert('Supabase Schema Error: Please run the SQL migration to add x_api_key and x_secret_key columns in your Supabase SQL Editor!');
          }
        }
      } catch (dbErr) {
        console.error('Database connection failed:', dbErr);
      }
    }
  };

  const updateMaintenance = async (config: MaintenanceConfig) => {
    setMaintenance(config);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('system_settings').upsert({
        key: 'maintenance_mode',
        value: config,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const payBill = async (
    billData: Omit<CreditCardBill, 'id' | 'created_at' | 'status' | 'transaction_ref'>,
    extra?: { billerId: string; customerParams: Array<{ name: string; value: string }>; billerResponseInfo?: any; mobile?: string; customerPan?: string }
  ) => {
    // 1. Get current user profile to fetch keys
    const userProfile = users.find((u) => u.id === billData.user_id);
    if (!userProfile) throw new Error('User not found.');

    const apiKey = userProfile.x_api_key?.trim();
    const secretKey = userProfile.x_secret_key?.trim();

    if (!apiKey || !secretKey) {
      throw new Error('API Credentials (x-api-key, x-secret-key) missing! Please configure them in your User Profile first.');
    }

    // 2. Map or use BBPS biller ID
    const billerId = extra?.billerId || 'GENERIC_CC_BILLER';

    // 3. Prepare customer params
    const cleanCard = billData.card_number.replace(/\s/g, '');
    const defaultParams = [{ name: 'Card Number', value: cleanCard }];
    const customerParams = extra?.customerParams || defaultParams;
    const userPhone = extra?.mobile || userProfile.phone || '9876543210';

    const finalBillerResponseInfo = extra?.billerResponseInfo?.billFetchResponse?.billerResponse
      || extra?.billerResponseInfo?.billerResponse
      || extra?.billerResponseInfo
      || {
      customerName: userProfile.full_name || 'N/A',
      billAmount: (parseFloat(billData.amount.toString()) * 100).toFixed(0).toString(),
      billDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0]
    };

    const fetchRequestId = extra?.billerResponseInfo?.requestId
      || extra?.billerResponseInfo?.billFetchResponse?.requestId
      || extra?.billerResponseInfo?.billId;

    const requestPayload: any = {
      billerId: billerId,
      amount: parseFloat(billData.amount.toFixed(2)),
      mobile: userPhone,
      customerParams: customerParams,
      billerResponseInfo: finalBillerResponseInfo
    };

    if (extra?.customerPan) {
      requestPayload.customerPan = extra.customerPan;
    }

    if (fetchRequestId) {
      requestPayload.fetchRequestId = fetchRequestId;
    }

    const additionalInfo = extra?.billerResponseInfo?.billFetchResponse?.additionalInfo?.info
      || extra?.billerResponseInfo?.additionalInfo?.info
      || extra?.billerResponseInfo?.additionalInfo;

    if (additionalInfo) {
      requestPayload.additionalInfo = additionalInfo;
    }

    // Generate unique Custom Client Order ID upfront (e.g. TXN_ORD_20260921123456_789)
    const now = new Date();
    const datePart = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const clientTxnId = `TXN_ORD_${datePart}_${randPart}`;

    requestPayload.client_transaction_id = clientTxnId;

    console.log(">>> [UsePay API Request] PAYLOAD SENT:", requestPayload);

    let resData: any = null;
    let networkOrTimeoutError: any = null;

    try {
      const response = await fetch('/api/v1/b2b/pay-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-secret-key': secretKey,
        },
        body: JSON.stringify(requestPayload),
      });

      try {
        resData = await response.json();
      } catch (jsonErr) {
        console.warn('Could not parse JSON response from UsePay:', jsonErr);
      }
      console.log("<<< [UsePay API Response] RECEIVED:", resData);

      if (!response.ok) {
        networkOrTimeoutError = new Error(`HTTP ${response.status}: ${resData?.message || response.statusText || 'Gateway timeout or server error'}`);
      }
    } catch (fetchErr: any) {
      console.error('UsePay Network/Fetch Error:', fetchErr);
      networkOrTimeoutError = fetchErr;
    }

    // 1. Timeout / Network Failure Protection (NEVER SKIP ENTRY)
    if (networkOrTimeoutError || !resData) {
      console.warn(">>> [payBill] Network timeout or connection drop detected. Creating PENDING transaction with Client Order ID:", clientTxnId);
      const pendingBill: CreditCardBill = {
        ...billData,
        id: `b-${Date.now()}`,
        status: 'Pending',
        transaction_ref: clientTxnId,
        created_at: new Date().toISOString(),
        payment_method: `${billData.payment_method}|${billerId}|${userPhone}|${clientTxnId}`,
        client_transaction_id: clientTxnId,
      };

      setBills((prev) => [pendingBill, ...prev.filter(b => b.id !== pendingBill.id)]);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('credit_card_bills').insert({
            user_id: pendingBill.user_id,
            card_number: pendingBill.card_number,
            cardholder_name: pendingBill.cardholder_name,
            bank_name: pendingBill.bank_name,
            amount: pendingBill.amount,
            status: pendingBill.status,
            transaction_ref: pendingBill.transaction_ref,
            payment_method: pendingBill.payment_method,
          });
        } catch (dbErr) {
          console.error("Failed to insert pending bill to Supabase:", dbErr);
        }
      }

      return pendingBill;
    }

    // 2. Gateway Response Handling
    const extError = resData.ExtBillPayResponse?.errorInfo?.error?.errorMessage;
    const gatewayError = resData.message || resData.data?.message;
    const apiTxnId = resData.transaction_id || resData.data?.billPayResponse?.txnReferenceId;
    const approvalRef = resData.ExtBillPayResponse?.approvalRefNumber;
    const baseRef = apiTxnId || clientTxnId;
    const finalRef = approvalRef ? `${baseRef} (Approval: ${approvalRef})` : baseRef;

    const isApiError = resData.status === 'error' || resData.status === 'failed' || resData.payment_status === 'failed' || Boolean(extError);

    // If API returned error/failure, save as 'Pending' so status check can query and resolve it live
    if (isApiError) {
      console.warn(">>> [payBill] Gateway returned failure/pending message. Saving as 'Pending' for live verification:", extError || gatewayError);
      const pendingBill: CreditCardBill = {
        ...billData,
        id: `b-${Date.now()}`,
        status: 'Pending',
        transaction_ref: finalRef,
        created_at: new Date().toISOString(),
        payment_method: `${billData.payment_method}|${billerId}|${userPhone}|${clientTxnId}`,
        client_transaction_id: clientTxnId,
        api_transaction_id: apiTxnId || undefined,
        bbps_ref_id: approvalRef || undefined,
      };

      setBills((prev) => [pendingBill, ...prev.filter(b => b.id !== pendingBill.id)]);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('credit_card_bills').insert({
            user_id: pendingBill.user_id,
            card_number: pendingBill.card_number,
            cardholder_name: pendingBill.cardholder_name,
            bank_name: pendingBill.bank_name,
            amount: pendingBill.amount,
            status: pendingBill.status,
            transaction_ref: pendingBill.transaction_ref,
            payment_method: pendingBill.payment_method,
          });
        } catch (dbErr) {
          console.error("Failed to insert pending bill to Supabase:", dbErr);
        }
      }

      return pendingBill;
    }

    // 3. Normal / Success API Response
    let initialStatus: TransactionStatus = 'Success';
    const responseStatus = (resData.payment_status || resData.status || resData.data?.current_status || '').toLowerCase();
    if (responseStatus === 'pending') {
      initialStatus = 'Pending';
    }

    const newBill: CreditCardBill = {
      ...billData,
      id: `b-${Date.now()}`,
      status: initialStatus,
      transaction_ref: finalRef,
      created_at: new Date().toISOString(),
      payment_method: `${billData.payment_method}|${billerId}|${userPhone}|${clientTxnId}`,
      client_transaction_id: clientTxnId,
      api_transaction_id: apiTxnId || undefined,
      bbps_ref_id: approvalRef || undefined,
    };

    setBills((prev) => [newBill, ...prev.filter(b => b.id !== newBill.id)]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('credit_card_bills').insert({
          user_id: newBill.user_id,
          card_number: newBill.card_number,
          cardholder_name: newBill.cardholder_name,
          bank_name: newBill.bank_name,
          amount: newBill.amount,
          status: newBill.status,
          transaction_ref: newBill.transaction_ref,
          payment_method: newBill.payment_method,
        });
      } catch (dbErr) {
        console.error("Failed to insert new bill to Supabase:", dbErr);
      }
    }

    return newBill;
  };

  const addManualBill = async (billData: {
    user_id: string;
    card_number: string;
    cardholder_name: string;
    bank_name: string;
    amount: number;
    status: TransactionStatus;
    transaction_ref: string;
    payment_method: string;
    created_at?: string;
  }): Promise<CreditCardBill> => {
    const newBill: CreditCardBill = {
      id: `b-${Date.now()}`,
      user_id: billData.user_id,
      card_number: billData.card_number,
      cardholder_name: billData.cardholder_name,
      bank_name: billData.bank_name,
      amount: Number(billData.amount),
      status: billData.status,
      transaction_ref: billData.transaction_ref.trim(),
      payment_method: billData.payment_method,
      created_at: billData.created_at || new Date().toISOString(),
    };

    setBills((prev) => [newBill, ...prev]);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('credit_card_bills').insert({
        user_id: newBill.user_id,
        card_number: newBill.card_number,
        cardholder_name: newBill.cardholder_name,
        bank_name: newBill.bank_name,
        amount: newBill.amount,
        status: newBill.status,
        transaction_ref: newBill.transaction_ref,
        payment_method: newBill.payment_method,
        created_at: newBill.created_at,
      }).select();

      if (error) {
        console.error('Supabase manual bill insert error:', error);
        throw new Error(error.message || 'Failed to save bill to database.');
      }

      if (data && data[0]) {
        newBill.id = data[0].id;
      }
    }

    return newBill;
  };

  const submitFundRequest = async (
    amount: number,
    utrNumber: string,
    proofUrl?: string | null,
    adminBankAccountId?: string | null
  ): Promise<FundRequest> => {
    if (!currentUser) throw new Error('You must be logged in to submit a fund request.');

    const apiKey = currentUser.x_api_key?.trim();
    const secretKey = currentUser.x_secret_key?.trim();

    if (!apiKey || !secretKey) {
      throw new Error('API Credentials (x-api-key, x-secret-key) missing! Please configure them in your User Profile first.');
    }

    const payload: any = {
      amount: parseFloat(amount.toString()),
      utr_number: utrNumber.trim(),
      proof_url: proofUrl || null
    };

    if (adminBankAccountId) {
      payload.admin_bank_account_id = adminBankAccountId.trim();
    }

    const cleanUtr = payload.utr_number;
    const existing = fundRequests.find(r => r.utr_number.toLowerCase() === cleanUtr.toLowerCase());
    if (existing) {
      if (existing.status === 'approved') {
        throw new Error('This UTR Number has already been approved and credited.');
      }
      if (existing.status === 'pending') {
        throw new Error('This UTR Number is already pending approval.');
      }
    }

    try {
      const response = await fetch('/api/v1/b2b/fund-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'x-secret-key': secretKey
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (!response.ok || resData.status === 'error' || resData.status === 'failed') {
        throw new Error(resData.message || 'Failed to submit fund request to UsePay.');
      }

      const reqData = resData.data;
      const newRequest: FundRequest = {
        id: reqData.request_id,
        user_id: currentUser.id,
        amount: parseFloat((reqData.amount || amount).toString()),
        utr_number: reqData.utr_number || utrNumber,
        admin_bank_account_id: adminBankAccountId || null,
        proof_url: proofUrl || null,
        status: reqData.status || 'pending',
        created_at: reqData.submitted_at || new Date().toISOString(),
        updated_at: reqData.submitted_at || new Date().toISOString()
      };

      setFundRequests(prev => [newRequest, ...prev]);

      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('fund_requests').upsert({
            id: newRequest.id,
            user_id: newRequest.user_id,
            amount: newRequest.amount,
            utr_number: newRequest.utr_number,
            admin_bank_account_id: newRequest.admin_bank_account_id,
            proof_url: newRequest.proof_url,
            status: newRequest.status,
            created_at: newRequest.created_at,
            updated_at: newRequest.updated_at,
          }, { onConflict: 'id' });
          if (error) {
            console.error('Failed to insert fund request to database:', error);
          }
        } catch (dbErr) {
          console.warn('Failed to insert fund request to database:', dbErr);
        }
      }

      return newRequest;
    } catch (err: any) {
      console.error('UsePay Fund Request API Error:', err);
      throw new Error(err.message || 'Connection timeout with UsePay API.');
    }
  };

  const lastFundRequestCheckRef = useRef<Record<string, number>>({});

  const checkPendingFundRequests = async (
    activeUserId: string,
    apiKey: string,
    secretKey: string,
    customRequests?: FundRequest[],
    customUsers?: UserProfile[]
  ) => {
    const requestsToUse = customRequests || fundRequestsRef.current;
    const usersToUse = customUsers || usersRef.current;

    const currentUserProfile = usersToUse.find(u => u.id === activeUserId);
    const isAdmin = currentUserProfile?.role === 'admin';

    // Auto-recover any missed/skipped entries directly from UsePay Gateway list API
    if (!isAdmin && apiKey && secretKey) {
      try {
        const listResponse = await fetch('/api/v1/b2b/fund-requests?page=1&limit=50', {
          headers: {
            'x-api-key': apiKey,
            'x-secret-key': secretKey
          }
        });
        if (listResponse.ok) {
          const listData = await listResponse.json();
          if (listData.status === 'success' && Array.isArray(listData.data)) {
            const missingEntries: FundRequest[] = [];
            for (const item of listData.data) {
              let rawStatus = item.status?.toString().toLowerCase().trim();
              let normStatus: 'pending' | 'approved' | 'rejected' = 'pending';
              if (rawStatus === 'reject' || rawStatus === 'rejected' || rawStatus === 'failed') {
                normStatus = 'rejected';
              } else if (rawStatus === 'approve' || rawStatus === 'approved' || rawStatus === 'success') {
                normStatus = 'approved';
              }

              const exists = fundRequestsRef.current.some(
                r => r.id === item.request_id || (r.utr_number && item.utr_number && r.utr_number.toLowerCase() === item.utr_number.toLowerCase())
              );

              if (!exists) {
                missingEntries.push({
                  id: item.request_id,
                  user_id: activeUserId,
                  amount: parseFloat(item.amount.toString()),
                  utr_number: item.utr_number,
                  admin_bank_account_id: item.admin_bank_account_id || null,
                  proof_url: item.proof_url || null,
                  status: normStatus,
                  created_at: item.created_at || new Date().toISOString(),
                  updated_at: item.created_at || new Date().toISOString()
                });
              }
            }

            if (missingEntries.length > 0) {
              console.log(`>>> [Gateway Fund Sync] Recovered ${missingEntries.length} skipped entry/entries from UsePay!`, missingEntries);
              setFundRequests(prev => [...missingEntries, ...prev]);
              if (isSupabaseConfigured && supabase) {
                await supabase.from('fund_requests').upsert(missingEntries, { onConflict: 'id' });
              }
            }
          }
        }
      } catch (listErr) {
        console.warn('[Gateway Fund Sync] Notice:', listErr);
      }
    }

    const now = Date.now();
    const RECENT_MONITOR_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days window to catch reversals / rejections
    const COMPLETED_CHECK_INTERVAL_MS = 3 * 60 * 1000; // Throttle already completed requests to check at most once every 3 minutes

    // 1. Check all pending requests
    // 2. Also check recent (last 7 days) approved/rejected requests if due, to catch any gateway reversals/rejections
    const candidates = requestsToUse.filter((r) => {
      const isOwnerOrAdmin = isAdmin ? true : r.user_id === activeUserId;
      if (!isOwnerOrAdmin) return false;

      if (r.status === 'pending') return true;

      const reqDate = new Date(r.updated_at || r.created_at).getTime();
      const isRecent = !isNaN(reqDate) && (now - reqDate) < RECENT_MONITOR_WINDOW_MS;
      if (!isRecent) return false;

      const lastCheck = lastFundRequestCheckRef.current[r.id] || 0;
      return (now - lastCheck) >= COMPLETED_CHECK_INTERVAL_MS;
    });

    if (candidates.length === 0) return;

    for (const req of candidates) {
      try {
        let reqApiKey = apiKey;
        let reqSecretKey = secretKey;

        // If admin, we must use the owner's credentials to query status
        if (isAdmin) {
          const owner = usersToUse.find(u => u.id === req.user_id);
          if (!owner || !owner.x_api_key || !owner.x_secret_key) {
            console.warn(`[Fund Request Sync] Skipping status check for request ${req.id}: Owner credentials not configured.`);
            continue;
          }
          reqApiKey = owner.x_api_key.trim();
          reqSecretKey = owner.x_secret_key.trim();
        }

        lastFundRequestCheckRef.current[req.id] = now;

        const response = await fetch(`/api/v1/b2b/fund-request/status/${encodeURIComponent(req.id)}`, {
          method: 'GET',
          headers: {
            'x-api-key': reqApiKey,
            'x-secret-key': reqSecretKey
          }
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.status === 'success' && resData.data) {
            let rawStatus = resData.data.status?.toString().toLowerCase().trim();
            let newStatus: 'pending' | 'approved' | 'rejected' = 'pending';
            if (rawStatus === 'reject' || rawStatus === 'rejected' || rawStatus === 'failed') {
              newStatus = 'rejected';
            } else if (rawStatus === 'approve' || rawStatus === 'approved' || rawStatus === 'success') {
              newStatus = 'approved';
            }

            // Update if status changed (handles pending->approved/rejected AND approved->rejected upon revert)
            if (newStatus !== req.status) {
              console.log(
                `>>> [Fund Request Auto-Sync] Request ${req.id} (UTR: ${req.utr_number}) status updated from '${req.status}' to '${newStatus}'`
              );

              const updatedTimestamp = resData.data.updated_at || new Date().toISOString();

              setFundRequests((prev) =>
                prev.map((r) =>
                  r.id === req.id
                    ? { ...r, status: newStatus, updated_at: updatedTimestamp }
                    : r
                )
              );

              if (isSupabaseConfigured && supabase) {
                supabase
                  .from('fund_requests')
                  .update({
                    status: newStatus,
                    updated_at: updatedTimestamp,
                  })
                  .eq('id', req.id)
                  .then(({ error }) => {
                    if (error) {
                      console.error('Failed to update fund request status in database:', error);
                    }
                  });
              }
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to check status for request ${req.id}:`, err);
      }
    }
  };

  const checkFundRequestStatus = async (
    requestId: string
  ): Promise<{ success: boolean; status: 'pending' | 'approved' | 'rejected'; message: string }> => {
    const req = fundRequestsRef.current.find((r) => r.id === requestId) || fundRequests.find((r) => r.id === requestId);
    if (!req) {
      throw new Error('Fund request record not found.');
    }

    const owner = usersRef.current.find((u) => u.id === req.user_id) || currentUser;
    if (!owner || !owner.x_api_key || !owner.x_secret_key) {
      throw new Error('API credentials (x-api-key, x-secret-key) missing for fund request verification.');
    }

    const response = await fetch(`/api/v1/b2b/fund-request/status/${encodeURIComponent(req.id)}`, {
      method: 'GET',
      headers: {
        'x-api-key': owner.x_api_key.trim(),
        'x-secret-key': owner.x_secret_key.trim(),
      },
    });

    if (!response.ok) {
      throw new Error(`Gateway returned HTTP ${response.status}`);
    }

    const resData = await response.json();
    if (resData.status !== 'success' || !resData.data) {
      throw new Error(resData.message || 'Failed to fetch status from UsePay API.');
    }

    let rawStatus = resData.data.status?.toString().toLowerCase().trim();
    let normalizedStatus: 'pending' | 'approved' | 'rejected' = 'pending';
    if (rawStatus === 'reject' || rawStatus === 'rejected' || rawStatus === 'failed') {
      normalizedStatus = 'rejected';
    } else if (rawStatus === 'approve' || rawStatus === 'approved' || rawStatus === 'success') {
      normalizedStatus = 'approved';
    }

    const updatedTimestamp = resData.data.updated_at || new Date().toISOString();

    setFundRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: normalizedStatus, updated_at: updatedTimestamp } : r))
    );

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('fund_requests')
          .update({
            status: normalizedStatus,
            updated_at: updatedTimestamp,
          })
          .eq('id', req.id);
      } catch (dbErr) {
        console.warn('Failed to update fund request in Supabase:', dbErr);
      }
    }

    lastFundRequestCheckRef.current[req.id] = Date.now();

    return {
      success: true,
      status: normalizedStatus,
      message: `Fund request status is ${normalizedStatus.toUpperCase()}`,
    };
  };

  // Background Status Check Cron Job for Pending Transactions
  const billsRef = useRef(bills);
  const usersRef = useRef(users);
  const fundRequestsRef = useRef(fundRequests);
  const isCheckingPendingRef = useRef(false);

  useEffect(() => {
    billsRef.current = bills;
  }, [bills]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    fundRequestsRef.current = fundRequests;
  }, [fundRequests]);

  const checkBillStatus = async (
    billId: string,
    customId?: string
  ): Promise<{ success: boolean; status: TransactionStatus; message: string; data?: any }> => {
    const bill = billsRef.current.find((b) => b.id === billId) || bills.find((b) => b.id === billId);
    if (!bill) {
      throw new Error('Transaction record not found.');
    }

    const owner = usersRef.current.find((u) => u.id === bill.user_id) || currentUser;
    if (!owner || !owner.x_api_key || !owner.x_secret_key) {
      throw new Error('User API credentials (x-api-key, x-secret-key) not configured in profile.');
    }

    // Parse payment method to find clientTxnId if stored
    let clientOrderId = bill.client_transaction_id;
    if (!clientOrderId && bill.payment_method && bill.payment_method.includes('|')) {
      const parts = bill.payment_method.split('|');
      if (parts[3]) {
        clientOrderId = parts[3];
      }
    }
    if (!clientOrderId && bill.transaction_ref.startsWith('TXN_ORD_')) {
      clientOrderId = bill.transaction_ref.split(' ')[0];
    }

    let apiTxnId = bill.api_transaction_id;
    const refToken = bill.transaction_ref.split(' ')[0];
    if (!apiTxnId && refToken && !refToken.startsWith('TXN_ORD_') && !refToken.startsWith('USEPAY_')) {
      apiTxnId = refToken;
    }

    // Build ordered list of candidate query IDs (API Transaction ID & Custom Client Order ID)
    const candidates: string[] = [];
    if (customId && customId.trim()) candidates.push(customId.trim());
    if (apiTxnId && !candidates.includes(apiTxnId)) candidates.push(apiTxnId);
    if (clientOrderId && !candidates.includes(clientOrderId)) candidates.push(clientOrderId);
    if (refToken && !candidates.includes(refToken)) candidates.push(refToken);

    let statusData: any = null;
    let lastError: string = 'No response from status check gateway.';

    for (const queryId of candidates) {
      try {
        console.log(`>>> [Live Status Check] Querying UsePay status with ID: "${queryId}"...`);
        const url = `/api/v1/b2b/status/${encodeURIComponent(queryId)}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': owner.x_api_key.trim(),
            'x-secret-key': owner.x_secret_key.trim(),
          },
        });

        if (!res.ok) {
          console.warn(`[Live Status Check] ID "${queryId}" returned HTTP status ${res.status}`);
          continue;
        }

        const resJson = await res.json();
        console.log(`<<< [Live Status Check] Response for "${queryId}":`, resJson);

        if (resJson.status === 'success' && resJson.data) {
          statusData = resJson.data;
          break;
        } else if (resJson.message) {
          lastError = resJson.message;
        }
      } catch (err: any) {
        lastError = err?.message || lastError;
      }
    }

    if (!statusData) {
      throw new Error(`Could not verify status from UsePay. ${lastError}`);
    }

    const currentStatusRaw = (statusData.current_status || statusData.bbps_status || statusData.status || '').toLowerCase();
    let newStatus: TransactionStatus = bill.status;

    if (currentStatusRaw === 'success' || currentStatusRaw === 'completed') {
      newStatus = 'Success';
    } else if (currentStatusRaw === 'failed' || currentStatusRaw === 'failure' || currentStatusRaw === 'rejected' || currentStatusRaw.includes('failed')) {
      newStatus = 'Failed';
    } else if (currentStatusRaw === 'pending' || currentStatusRaw === 'processing') {
      newStatus = 'Pending';
    }

    // Extract identifiers returned by API
    const returnedApiTxnId = statusData.transaction_id || apiTxnId;
    const returnedBbpsRef = (statusData.bbps_txn_ref_id && statusData.bbps_txn_ref_id !== 'N/A') ? statusData.bbps_txn_ref_id : bill.bbps_ref_id;
    const returnedClientOrderId = statusData.client_transaction_id || clientOrderId;

    let updatedTxnRef = bill.transaction_ref;
    if (returnedBbpsRef && returnedApiTxnId) {
      updatedTxnRef = `${returnedApiTxnId} (BBPS: ${returnedBbpsRef})`;
    } else if (returnedApiTxnId) {
      updatedTxnRef = returnedApiTxnId;
    } else if (returnedClientOrderId && bill.transaction_ref.startsWith('USEPAY_')) {
      updatedTxnRef = returnedClientOrderId;
    }

    // Update in state
    setBills((prev) =>
      prev.map((b) =>
        b.id === bill.id
          ? {
              ...b,
              status: newStatus,
              transaction_ref: updatedTxnRef,
              api_transaction_id: returnedApiTxnId,
              bbps_ref_id: returnedBbpsRef,
              client_transaction_id: returnedClientOrderId,
            }
          : b
      )
    );

    // Update in Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('credit_card_bills')
          .update({
            status: newStatus,
            transaction_ref: updatedTxnRef,
          })
          .eq('id', bill.id);
      } catch (dbErr) {
        console.error("Failed to update bill in Supabase:", dbErr);
      }
    }

    return {
      success: true,
      status: newStatus,
      message: statusData.message || `Transaction is ${newStatus}.`,
      data: statusData,
    };
  };

  const checkPendingStatus = async () => {
    const pendingBills = billsRef.current.filter((b) => b.status === 'Pending');
    if (pendingBills.length === 0) return;

    console.log(`>>> [Pending Status Cron] Checking ${pendingBills.length} pending transaction(s)...`);

    for (const bill of pendingBills) {
      try {
        await checkBillStatus(bill.id);
      } catch (err) {
        console.warn(`>>> [Pending Status Cron] Failed to check status for bill ${bill.id}:`, err);
      }
    }
  };

  const runCronChecks = async () => {
    await checkPendingStatus();
    if (currentUser) {
      const apiKey = currentUser.x_api_key?.trim() || '';
      const secretKey = currentUser.x_secret_key?.trim() || '';
      await checkPendingFundRequests(currentUser.id, apiKey, secretKey);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isCheckingPendingRef.current) {
        isCheckingPendingRef.current = true;
        runCronChecks().finally(() => {
          isCheckingPendingRef.current = false;
        });
      }
    }, 60000); // every 1 minute

    // Check after 5 seconds of application load to catch any pending bills immediately
    const startupTimer = setTimeout(() => {
      if (!isCheckingPendingRef.current) {
        isCheckingPendingRef.current = true;
        runCronChecks().finally(() => {
          isCheckingPendingRef.current = false;
        });
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(startupTimer);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'user') return;

    localStorage.setItem('zentopay_last_activity', Date.now().toString());

    let lastUpdate = Date.now();
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 5000) {
        localStorage.setItem('zentopay_last_activity', now.toString());
        lastUpdate = now;
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, updateActivity));

    const interval = setInterval(() => {
      const lastActivity = parseInt(localStorage.getItem('zentopay_last_activity') || '0', 10);
      const now = Date.now();
      const INACTIVITY_LIMIT = 10 * 60 * 1000;

      if (now - lastActivity > INACTIVITY_LIMIT) {
        console.log('Inactivity timeout reached. Logging out...');
        logout();
      }
    }, 10000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
      clearInterval(interval);
    };
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        users,
        bills,
        maintenance,
        b2bConfig,
        isLoading,
        login,
        logout,
        createNewUser,
        changePassword,
        changeMPIN,
        changeTPIN,
        updateB2BConfig,
        syncUserToB2B,
        toggleUserStatus,
        deleteUser,
        updateUser,
        updateMaintenance,
        payBill,
        addManualBill,
        refreshData,
        checkBillStatus,
        checkFundRequestStatus,
        theme,
        toggleTheme,
        fundRequests,
        submitFundRequest,
        isProfileModalOpen,
        setIsProfileModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
