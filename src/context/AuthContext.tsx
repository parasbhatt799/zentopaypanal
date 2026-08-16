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
  }) => Promise<CreditCardBill>;
  refreshData: () => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  fundRequests: FundRequest[];
  submitFundRequest: (amount: number, utrNumber: string, proofUrl?: string | null, adminBankAccountId?: string | null) => Promise<FundRequest>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const users = getStoredUsers();
    const savedId = localStorage.getItem('zentopay_active_user_id');
    if (savedId) {
      const match = users.find((u) => u.id === savedId || u.phone === savedId || u.email === savedId);
      if (match) {
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

    const savedId = localStorage.getItem('zentopay_active_user_id');
    if (savedId) {
      const match = users.find((u) => u.id === savedId || u.phone === savedId || u.email === savedId);
      if (match) {
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
    try {
      const { data: profilesData } = await supabase.from('profiles').select('*');
      if (profilesData && profilesData.length > 0) {
        try {
          const storedPasswords = JSON.parse(localStorage.getItem('zentopay_user_passwords') || '{}');
          const storedMpins = JSON.parse(localStorage.getItem('zentopay_user_mpins') || '{}');
          const profilesWithPasswords = profilesData.map((p) => ({
            ...p,
            password: p.password || storedPasswords[p.id],
            mpin: p.mpin || storedMpins[p.id] || undefined
          }));
          setUsers(profilesWithPasswords);
        } catch (e) {
          setUsers(profilesData.map(p => ({ ...p, password: p.password || '' })));
        }
      }

      const { data: billsData } = await supabase
        .from('credit_card_bills')
        .select('*')
        .order('created_at', { ascending: false });
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

      const { data: fundRequestsData } = await supabase
        .from('fund_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (fundRequestsData && fundRequestsData.length > 0) {
        setFundRequests(fundRequestsData);
      }

      // Check statuses of pending requests
      if (currentUser && currentUser.x_api_key && currentUser.x_secret_key) {
        await checkPendingFundRequests(currentUser.id, currentUser.x_api_key.trim(), currentUser.x_secret_key.trim());
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
    localStorage.setItem('zentopay_active_user_id', target.id);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('zentopay_active_user_id');
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
    extra?: { billerId: string; customerParams: Array<{ name: string; value: string }>; billerResponseInfo?: any; mobile?: string }
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

    if (fetchRequestId) {
      requestPayload.fetchRequestId = fetchRequestId;
    }

    const additionalInfo = extra?.billerResponseInfo?.billFetchResponse?.additionalInfo?.info
      || extra?.billerResponseInfo?.additionalInfo?.info
      || extra?.billerResponseInfo?.additionalInfo;

    if (additionalInfo) {
      requestPayload.additionalInfo = additionalInfo;
    }

    console.log(">>> [UsePay API Request] PAYLOAD SENT:", requestPayload);

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

      const resData = await response.json();
      console.log("<<< [UsePay API Response] RECEIVED:", resData);

      const extError = resData.ExtBillPayResponse?.errorInfo?.error?.errorMessage;
      const gatewayError = resData.message || resData.data?.message;

      if (!response.ok || resData.status === 'error' || resData.status === 'failed' || resData.payment_status === 'failed' || extError) {
        const errMsg = extError || gatewayError || 'Transaction rejected by UsePay gateway.';

        // Record the failed transaction in the database and state so it shows in history
        const baseRef = resData.transaction_id || resData.data?.billPayResponse?.txnReferenceId || `USEPAY_FAIL_${Math.floor(100000 + Math.random() * 900000)}`;
        const approvalRef = resData.ExtBillPayResponse?.approvalRefNumber;
        const finalRef = approvalRef ? `${baseRef} (Approval: ${approvalRef})` : baseRef;

        const failedBill: CreditCardBill = {
          ...billData,
          id: `b-${Date.now()}`,
          status: 'Failed',
          transaction_ref: finalRef,
          created_at: new Date().toISOString(),
          payment_method: `${billData.payment_method}|${billerId}|${userPhone}`,
        };

        setBills((prev) => [failedBill, ...prev]);

        if (isSupabaseConfigured && supabase) {
          await supabase.from('credit_card_bills').insert({
            user_id: failedBill.user_id,
            card_number: failedBill.card_number,
            cardholder_name: failedBill.cardholder_name,
            bank_name: failedBill.bank_name,
            amount: failedBill.amount,
            status: failedBill.status,
            transaction_ref: failedBill.transaction_ref,
            payment_method: failedBill.payment_method,
          });
        }

        throw new Error(errMsg);
      }

      // Live payment succeeded!
      const baseRef = resData.transaction_id || resData.data?.billPayResponse?.txnReferenceId || `USEPAY${Math.floor(100000 + Math.random() * 900000)}`;
      const approvalRef = resData.ExtBillPayResponse?.approvalRefNumber;
      const finalRef = approvalRef ? `${baseRef} (Approval: ${approvalRef})` : baseRef;

      // Determine initial transaction status based on API response
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
        payment_method: `${billData.payment_method}|${billerId}|${userPhone}`,
      };

      const updatedUsers = users.map((u) => {
        if (u.id === billData.user_id) {
          return {
            ...u,
            wallet_balance: Math.max(0, u.wallet_balance - billData.amount),
          };
        }
        return u;
      });

      setBills([newBill, ...bills]);
      setUsers(updatedUsers);

      if (currentUser?.id === billData.user_id) {
        setCurrentUser((prev) =>
          prev ? { ...prev, wallet_balance: Math.max(0, prev.wallet_balance - billData.amount) } : prev
        );
      }

      if (isSupabaseConfigured && supabase) {
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
      }

      return newBill;

    } catch (apiErr: any) {
      console.error('UsePay API Error:', apiErr);
      throw new Error(apiErr.message || 'Connection timeout with UsePay API.');
    }
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
          await supabase.from('fund_requests').insert({
            id: newRequest.id,
            user_id: newRequest.user_id,
            amount: newRequest.amount,
            utr_number: newRequest.utr_number,
            admin_bank_account_id: newRequest.admin_bank_account_id,
            proof_url: newRequest.proof_url,
            status: newRequest.status,
            created_at: newRequest.created_at,
            updated_at: newRequest.updated_at,
          });
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

  const checkPendingFundRequests = async (activeUserId: string, apiKey: string, secretKey: string) => {
    const pending = fundRequests.filter(r => r.user_id === activeUserId && r.status === 'pending');
    if (pending.length === 0) return;

    for (const req of pending) {
      try {
        const response = await fetch(`/api/v1/b2b/fund-request/status/${req.id}`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'x-secret-key': secretKey
          }
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.status === 'success' && resData.data) {
            const newStatus = resData.data.status;
            if (newStatus !== 'pending') {
              setFundRequests((prev) =>
                prev.map((r) =>
                  r.id === req.id
                    ? { ...r, status: newStatus, updated_at: resData.data.updated_at || new Date().toISOString() }
                    : r
                )
              );

              if (isSupabaseConfigured && supabase) {
                supabase
                  .from('fund_requests')
                  .update({
                    status: newStatus,
                    updated_at: resData.data.updated_at || new Date().toISOString(),
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

  // Background Status Check Cron Job for Pending Transactions
  const billsRef = useRef(bills);
  const usersRef = useRef(users);
  const isCheckingPendingRef = useRef(false);

  useEffect(() => {
    billsRef.current = bills;
  }, [bills]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const checkPendingStatus = async () => {
    const pendingBills = billsRef.current.filter((b) => b.status === 'Pending');
    if (pendingBills.length === 0) return;

    console.log(`>>> [Pending Status Cron] Checking ${pendingBills.length} pending transaction(s)...`);

    for (const bill of pendingBills) {
      try {
        const owner = usersRef.current.find((u) => u.id === bill.user_id);
        if (!owner || !owner.x_api_key || !owner.x_secret_key) {
          console.warn(`>>> [Pending Status Cron] Skipping status check for bill ${bill.id}: User API credentials not configured.`);
          continue;
        }

        const txnId = bill.transaction_ref.split(' ')[0];
        const url = `/api/v1/b2b/status/${txnId}`;

        console.log(`>>> [Pending Status Cron] Checking status for ${txnId}...`);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': owner.x_api_key.trim(),
            'x-secret-key': owner.x_secret_key.trim(),
          },
        });

        if (!response.ok) {
          console.error(`>>> [Pending Status Cron] API request failed for ${txnId}: ${response.statusText}`);
          continue;
        }

        const resData = await response.json();
        console.log(`<<< [Pending Status Cron] Response for ${txnId}:`, resData);

        if (resData.status === 'success' && resData.data) {
          const currentStatus = resData.data.current_status?.toLowerCase();
          if (currentStatus === 'success') {
            // Update status to Success
            setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, status: 'Success' } : b)));

            if (isSupabaseConfigured && supabase) {
              await supabase
                .from('credit_card_bills')
                .update({ status: 'Success' })
                .eq('id', bill.id);
            }
            console.log(`>>> [Pending Status Cron] Transaction ${txnId} marked as Success.`);
          } else if (currentStatus === 'failed' || currentStatus === 'failure') {
            // Update status to Failed
            setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, status: 'Failed' } : b)));

            if (isSupabaseConfigured && supabase) {
              await supabase
                .from('credit_card_bills')
                .update({ status: 'Failed' })
                .eq('id', bill.id);
            }
            console.log(`>>> [Pending Status Cron] Transaction ${txnId} marked as Failed.`);
          }
        }
      } catch (err) {
        console.error(`>>> [Pending Status Cron] Error checking status for bill ${bill.id}:`, err);
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isCheckingPendingRef.current) {
        isCheckingPendingRef.current = true;
        checkPendingStatus().finally(() => {
          isCheckingPendingRef.current = false;
        });
      }
    }, 60000); // every 1 minute

    // Check after 5 seconds of application load to catch any pending bills immediately
    const startupTimer = setTimeout(() => {
      if (!isCheckingPendingRef.current) {
        isCheckingPendingRef.current = true;
        checkPendingStatus().finally(() => {
          isCheckingPendingRef.current = false;
        });
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(startupTimer);
    };
  }, []);

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
        refreshData,
        theme,
        toggleTheme,
        fundRequests,
        submitFundRequest,
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
