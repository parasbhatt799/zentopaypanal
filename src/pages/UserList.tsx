import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserProfile, UserRole } from '../types';
import { Search, UserCheck, UserX, Shield, User, Filter, Check, Ban, UserPlus, Copy, X, Key, Phone, Mail, Sparkles, CheckCircle2, Network, Lock, Edit, Trash2, Settings, Eye, EyeOff } from 'lucide-react';

const UserApiBalance: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user.x_api_key || !user.x_secret_key) {
      setBalance(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchBalance = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/v1/b2b/balance', {
          headers: {
            'x-api-key': user.x_api_key || '',
            'x-secret-key': user.x_secret_key || ''
          }
        });
        const res = await response.json();
        if (isMounted) {
          if (res.status === 'success' && res.data && typeof res.data.balance !== 'undefined') {
            setBalance(Number(res.data.balance));
            setError(null);
          } else {
            setError(res.message || 'API Error');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError('CORS/Connection Error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBalance();
    return () => {
      isMounted = false;
    };
  }, [user.x_api_key, user.x_secret_key]);

  if (!user.x_api_key || !user.x_secret_key) {
    return <span className="text-slate-500 font-medium text-[11px]">N/A</span>;
  }

  if (loading) {
    return <span className="text-slate-400 font-medium text-[11px] animate-pulse">Loading...</span>;
  }

  if (error) {
    return <span className="text-rose-400 font-semibold text-[11px]" title={error}>Error</span>;
  }

  return (
    <span className="text-indigo-300 font-bold text-[11px] font-mono">
      ₹{balance !== null ? balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
    </span>
  );
};

const PasswordCell: React.FC<{ password?: string }> = ({ password = 'password123' }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center space-x-1.5 font-mono text-slate-300">
      <span className="bg-slate-800 px-2 py-1 rounded text-[11px] border border-slate-700 min-w-[72px] inline-block text-center select-all">
        {show ? password : '••••••••'}
      </span>
      <button 
        onClick={() => setShow(!show)}
        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        title={show ? "Hide Password" : "Show Password"}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};

export const UserList: React.FC = () => {
  const { users, toggleUserStatus, createNewUser, deleteUser, updateUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Create User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [address, setAddress] = useState('');
  const [firmAddress, setFirmAddress] = useState('');
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [b2bAgentId, setB2BAgentId] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('user');

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAltPhone, setEditAltPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editFirmAddress, setEditFirmAddress] = useState('');
  const [editReference, setEditReference] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editB2BAgentId, setEditB2BAgentId] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('user');
  const [editPassword, setEditPassword] = useState('');

  // B2B API Settings Modal State
  const [isApiSettingsModalOpen, setIsApiSettingsModalOpen] = useState(false);
  const [apiSettingsUser, setApiSettingsUser] = useState<UserProfile | null>(null);
  const [apiSettingsXApiKey, setApiSettingsXApiKey] = useState('');
  const [apiSettingsXSecretKey, setApiSettingsXSecretKey] = useState('');

  // Created Credentials Popup Modal State
  const [createdCredentials, setCreatedCredentials] = useState<{
    user: UserProfile;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditFirstName(user.first_name || '');
    setEditMiddleName(user.middle_name || '');
    setEditLastName(user.last_name || '');
    setEditPhone(user.phone || '');
    setEditAltPhone(user.alt_phone || '');
    setEditAddress(user.address || '');
    setEditFirmAddress(user.firm_address || '');
    setEditReference(user.reference || '');
    setEditEmail(user.email || '');
    setEditB2BAgentId(user.b2b_agent_id || '');
    setEditUserRole(user.role);
    setEditPassword(user.password || 'password123');
    setIsEditModalOpen(true);
  };

  const handleOpenApiSettings = (user: UserProfile) => {
    setApiSettingsUser(user);
    setApiSettingsXApiKey(user.x_api_key || '');
    setApiSettingsXSecretKey(user.x_secret_key || '');
    setIsApiSettingsModalOpen(true);
  };

  const handleApiSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiSettingsUser) return;

    await updateUser(apiSettingsUser.id, {
      first_name: apiSettingsUser.first_name,
      middle_name: apiSettingsUser.middle_name,
      last_name: apiSettingsUser.last_name,
      phone: apiSettingsUser.phone || '',
      alt_phone: apiSettingsUser.alt_phone,
      address: apiSettingsUser.address,
      firm_address: apiSettingsUser.firm_address,
      reference: apiSettingsUser.reference,
      email: apiSettingsUser.email,
      role: apiSettingsUser.role,
      x_api_key: apiSettingsXApiKey,
      x_secret_key: apiSettingsXSecretKey,
      password: apiSettingsUser.password,
    });

    setIsApiSettingsModalOpen(false);
    setApiSettingsUser(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editFirstName || !editLastName || !editPhone) return;

    await updateUser(editingUser.id, {
      first_name: editFirstName,
      middle_name: editMiddleName,
      last_name: editLastName,
      phone: editPhone,
      alt_phone: editAltPhone,
      address: editAddress,
      firm_address: editFirmAddress,
      reference: editReference,
      email: editEmail,
      role: editUserRole,
      b2b_agent_id: editB2BAgentId,
      password: editPassword,
    });

    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      await deleteUser(userId);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm)) ||
      (u.b2b_agent_id && u.b2b_agent_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone) return;

    const result = await createNewUser({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      phone: phone,
      alt_phone: altPhone,
      address: address,
      firm_address: firmAddress,
      reference: reference,
      email: email,
      role: userRole,
      wallet_balance: 0,
      b2b_agent_id: b2bAgentId,
    });

    // Reset Form & Show Credentials Modal
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setPhone('');
    setAltPhone('');
    setAddress('');
    setFirmAddress('');
    setReference('');
    setEmail('');
    setB2BAgentId('');
    setIsAddModalOpen(false);

    setCreatedCredentials({
      user: result.user,
      password: result.generatedPassword,
    });
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    let textToCopy = `🔑 ZentoPay User Credentials:\n📱 User ID (Mobile): ${createdCredentials.user.phone}\n🏢 B2B Agent ID: ${createdCredentials.user.b2b_agent_id || 'N/A'}`;
    
    if (createdCredentials.user.x_api_key) {
      textToCopy += `\n🔑 x-api-key: ${createdCredentials.user.x_api_key}`;
    }
    if (createdCredentials.user.x_secret_key) {
      textToCopy += `\n🔒 x-secret-key: ${createdCredentials.user.x_secret_key}`;
    }
    
    textToCopy += `\n📧 Email: ${createdCredentials.user.email}\n🔒 Password: ${createdCredentials.password}\n👤 Account Name: ${createdCredentials.user.full_name}`;
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">User Directory & B2B Link</h1>
          <p className="text-xs text-slate-400 mt-1">Manage user accounts, mobile IDs, B2B Agent IDs, and access privileges.</p>
        </div>

        <button
          onClick={() => {
            const randomId = `zentopay${Math.floor(10000 + Math.random() * 90000)}`;
            setB2BAgentId(randomId);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>+ Create New User</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, mobile ID, B2B Agent ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Active ({users.filter((u) => u.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'suspended'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Suspended ({users.filter((u) => u.status === 'suspended').length})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3.5 px-4">User Info</th>
                <th className="py-3.5 px-4">User ID (Mobile No)</th>
                <th className="py-3.5 px-4">Auto Password</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Live API Balance</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 font-bold text-indigo-400 text-sm">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          u.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">{u.full_name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                    {u.phone || '9876543210'}
                  </td>

                  <td className="py-3.5 px-4">
                    <PasswordCell password={u.password} />
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        u.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {u.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                      <span className="capitalize">{u.role}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <UserApiBalance user={u} />
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {u.status === 'active' ? <Check className="h-3 w-3 mr-1" /> : <Ban className="h-3 w-3 mr-1" />}
                      <span className="capitalize">{u.status}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => toggleUserStatus(u.id)}
                        title={u.status === 'active' ? 'Suspend User' : 'Activate User'}
                        className={`p-2 rounded-lg font-semibold transition-all flex items-center justify-center border ${
                          u.status === 'active'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <UserX className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenApiSettings(u)}
                        title="B2B API Settings"
                        className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-all flex items-center justify-center"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(u)}
                        title="Edit User"
                        className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition-all flex items-center justify-center"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        title="Delete User"
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all flex items-center justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Create New User Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">Create & Link New B2B User</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    required
                    className="w-full px-2.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Middle Name"
                    className="w-full px-2.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    required
                    className="w-full px-2.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Mobile (User ID)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9898989898"
                      required
                      className="w-full pl-9 pr-2.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Alt Mobile (Opt)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-550" />
                    <input
                      type="tel"
                      value={altPhone}
                      onChange={(e) => setAltPhone(e.target.value)}
                      placeholder="Alt Phone"
                      className="w-full pl-9 pr-2.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Resident Address"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Firm Address
                  </label>
                  <input
                    type="text"
                    value={firmAddress}
                    onChange={(e) => setFirmAddress(e.target.value)}
                    placeholder="Business Address"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Reference / Broker Name
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. Self or broker name"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Leave blank to auto-generate from mobile"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    B2B Agent ID
                  </label>
                  <input
                    type="text"
                    value={b2bAgentId}
                    onChange={(e) => setB2BAgentId(e.target.value)}
                    placeholder="zentopay12345"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Account Role
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  >
                    <option value="user">User / B2B Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center space-x-2">
                <Sparkles className="h-4 w-4 shrink-0 text-purple-400" />
                <span>Auto-generates password &amp; links directly with <strong>B2B System</strong>.</span>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
              >
                Generate User &amp; Link to B2B
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Credentials Popup Modal with Copy Button */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 border border-emerald-500/40 shadow-2xl relative text-center">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h3 className="text-xl font-extrabold text-white">User Created &amp; Linked to B2B!</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Here are the generated credentials. Copy and share them manually with the user.
            </p>

            {/* Credential Cards */}
            <div className="space-y-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-left text-xs mb-6">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Full Name</span>
                </span>
                <span className="font-bold text-slate-100">{createdCredentials.user.full_name}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Phone className="h-3.5 w-3.5 text-indigo-400" />
                  <span>User ID (Mobile No)</span>
                </span>
                <span className="font-mono font-extrabold text-indigo-300 text-sm">
                  {createdCredentials.user.phone}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Network className="h-3.5 w-3.5 text-purple-400" />
                  <span>B2B Agent Link ID</span>
                </span>
                <span className="font-mono font-bold text-purple-300 text-xs bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/30">
                  {createdCredentials.user.b2b_agent_id || 'N/A'}
                </span>
              </div>

              {createdCredentials.user.x_api_key && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center space-x-1.5">
                    <Key className="h-3.5 w-3.5 text-indigo-400" />
                    <span>x-api-key</span>
                  </span>
                  <span className="font-mono font-bold text-indigo-300 text-xs bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30 font-semibold truncate max-w-[200px]" title={createdCredentials.user.x_api_key}>
                    {createdCredentials.user.x_api_key}
                  </span>
                </div>
              )}

              {createdCredentials.user.x_secret_key && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center space-x-1.5">
                    <Lock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>x-secret-key</span>
                  </span>
                  <span className="font-mono font-bold text-indigo-300 text-xs bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30 font-semibold truncate max-w-[200px]" title={createdCredentials.user.x_secret_key}>
                    {createdCredentials.user.x_secret_key}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>Auto Password</span>
                </span>
                <span className="font-mono font-extrabold text-amber-300 text-sm bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {createdCredentials.password}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Mail className="h-3.5 w-3.5 text-purple-400" />
                  <span>Email Account</span>
                </span>
                <span className="text-slate-300">{createdCredentials.user.email}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopyCredentials}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-200" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy User ID & Password'}</span>
              </button>

              <button
                onClick={() => setCreatedCredentials(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors"
              >
                Close & Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Existing User */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel p-6 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Edit User Account</h3>
                  <p className="text-[10px] text-slate-400">Modify user profile, B2B Agent ID, and credentials</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="First Name"
                    required
                    className="w-full px-2.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={editMiddleName}
                    onChange={(e) => setEditMiddleName(e.target.value)}
                    placeholder="Middle Name"
                    className="w-full px-2.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Last Name"
                    required
                    className="w-full px-2.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Mobile (User ID)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Mobile number"
                      required
                      className="w-full pl-9 pr-2.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Alt Mobile (Opt)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-550" />
                    <input
                      type="tel"
                      value={editAltPhone}
                      onChange={(e) => setEditAltPhone(e.target.value)}
                      placeholder="Alt Phone"
                      className="w-full pl-9 pr-2.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Resident Address"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 uppercase mb-1">
                    Firm Address
                  </label>
                  <input
                    type="text"
                    value={editFirmAddress}
                    onChange={(e) => setEditFirmAddress(e.target.value)}
                    placeholder="Business Address"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Reference / Broker Name
                </label>
                <input
                  type="text"
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  placeholder="e.g. broker or agent reference"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Account Password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    B2B Agent ID
                  </label>
                  <input
                    type="text"
                    value={editB2BAgentId}
                    onChange={(e) => setEditB2BAgentId(e.target.value)}
                    placeholder="zentopay12345"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Account Role
                  </label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  >
                    <option value="user">User / B2B Agent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
              >
                Save Changes &amp; Update
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: B2B API Settings */}
      {isApiSettingsModalOpen && apiSettingsUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsApiSettingsModalOpen(false);
                setApiSettingsUser(null);
              }}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Settings className="h-5 w-5 animate-spin-slow" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">B2B API Settings</h2>
                <p className="text-[11px] text-slate-400">Configure keys for {apiSettingsUser.full_name}</p>
              </div>
            </div>

            <form onSubmit={handleApiSettingsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  x-api-key
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-cyan-400" />
                  <input
                    type="text"
                    value={apiSettingsXApiKey}
                    onChange={(e) => setApiSettingsXApiKey(e.target.value)}
                    placeholder="Enter B2B API Key"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-mono text-cyan-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  x-secret-key
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-cyan-400" />
                  <input
                    type="text"
                    value={apiSettingsXSecretKey}
                    onChange={(e) => setApiSettingsXSecretKey(e.target.value)}
                    placeholder="Enter B2B Secret Key"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-mono text-cyan-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all"
              >
                Save API Keys
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
