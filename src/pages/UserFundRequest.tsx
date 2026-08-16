import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Send, History, CheckCircle2, AlertCircle, RefreshCw, Upload, Eye, Image as ImageIcon, X, Copy, Check, Hash, Landmark, Search } from 'lucide-react';

export const UserFundRequest: React.FC = () => {
  const { currentUser, fundRequests, submitFundRequest, refreshData } = useAuth();

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');

  // Status feedback states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedUtr, setCopiedUtr] = useState<string>('');
  const [isFetchingBanks, setIsFetchingBanks] = useState<boolean>(false);
  const [apiBalance, setApiBalance] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.x_api_key || !currentUser?.x_secret_key) {
      setApiBalance(null);
      setApiError(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/v1/b2b/balance', {
          headers: {
            'x-api-key': currentUser.x_api_key || '',
            'x-secret-key': currentUser.x_secret_key || ''
          }
        });
        const res = await response.json();
        if (res.status === 'success' && res.data && typeof res.data.balance !== 'undefined') {
          setApiBalance(Number(res.data.balance));
          setApiError(null);
        } else {
          setApiError(res.message || 'API Error');
        }
      } catch (err: any) {
        console.warn('Failed to fetch API balance in fund requests:', err);
        setApiError('CORS/Connection Error');
      }
    };

    fetchBalance();
  }, [currentUser]);

  // Custom Searchable Dropdown States
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter requests for active user
  const userRequests = fundRequests.filter((r) => r.user_id === currentUser?.id);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom' | 'all'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Date range match helper
  const checkDateMatch = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    if (dateFilter === 'today') {
      return date >= todayStart && date <= todayEnd;
    }
    if (dateFilter === 'yesterday') {
      return date >= yesterdayStart && date <= yesterdayEnd;
    }
    if (dateFilter === 'last7') {
      const last7Start = new Date(todayStart);
      last7Start.setDate(last7Start.getDate() - 7);
      return date >= last7Start;
    }
    if (dateFilter === 'last30') {
      const last30Start = new Date(todayStart);
      last30Start.setDate(last30Start.getDate() - 30);
      return date >= last30Start;
    }
    if (dateFilter === 'thisMonth') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= monthStart;
    }
    if (dateFilter === 'custom') {
      if (!startDate) return true;
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate + 'T23:59:59.999') : todayEnd;
      return date >= start && date <= end;
    }
    return true; // all time
  };

  // Filter requests
  const filteredUserRequests = userRequests.filter((r) => {
    const matchesSearch =
      r.utr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.admin_bank_account_id && r.admin_bank_account_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.amount.toString().includes(searchTerm) ||
      r.status.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesDate = checkDateMatch(r.created_at);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculated metrics
  const dateFilteredRequests = userRequests.filter(r => checkDateMatch(r.created_at));
  const successCount = dateFilteredRequests.filter(r => r.status === 'approved').length;
  const successAmount = dateFilteredRequests
    .filter(r => r.status === 'approved')
    .reduce((acc, r) => acc + r.amount, 0);
  const pendingCount = dateFilteredRequests.filter(r => r.status === 'pending').length;
  const pendingAmount = dateFilteredRequests
    .filter(r => r.status === 'pending')
    .reduce((acc, r) => acc + r.amount, 0);
  const failedCount = dateFilteredRequests.filter(r => r.status === 'rejected').length;
  const failedAmount = dateFilteredRequests
    .filter(r => r.status === 'rejected')
    .reduce((acc, r) => acc + r.amount, 0);

  // Selected bank account object
  const selectedAccount = bankAccounts.find(acc => acc.bank_account_id === selectedBankAccountId);

  // Filter accounts based on query
  const filteredAccounts = bankAccounts.filter(acc =>
    acc.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.account_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch admin bank accounts list
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!currentUser?.x_api_key || !currentUser?.x_secret_key) return;
      setIsFetchingBanks(true);
      try {
        const response = await fetch('/api/v1/b2b/admin-bank-accounts', {
          method: 'GET',
          headers: {
            'x-api-key': currentUser.x_api_key.trim(),
            'x-secret-key': currentUser.x_secret_key.trim()
          }
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.status === 'success' && Array.isArray(resData.data)) {
            setBankAccounts(resData.data);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch admin bank accounts:', err);
      } finally {
        setIsFetchingBanks(false);
      }
    };
    fetchBankAccounts();
  }, [currentUser]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      if (currentUser?.x_api_key && currentUser?.x_secret_key) {
        const response = await fetch('/api/v1/b2b/balance', {
          headers: {
            'x-api-key': currentUser.x_api_key || '',
            'x-secret-key': currentUser.x_secret_key || ''
          }
        });
        const res = await response.json();
        if (res.status === 'success' && res.data && typeof res.data.balance !== 'undefined') {
          setApiBalance(Number(res.data.balance));
          setApiError(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('File size must be less than 5MB.');
        return;
      }
      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please upload an image file.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('File size must be less than 5MB.');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(''), 2000);
  };

  // Client-side image compression using canvas
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 2048;
          const MAX_HEIGHT = 2048;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string); // fallback to original
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as JPEG at 0.9 quality to ensure perfect clarity/sharpness of receipt text
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Convert compressed base64 DataURL back to Blob for storage upload
  const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Helper to handle image upload with fallback to Base64
  const uploadImage = async (file: File): Promise<string> => {
    setUploadProgressText('Compressing receipt image for fast transmission...');
    let compressedDataUrl: string;
    try {
      compressedDataUrl = await compressImage(file);
    } catch (e) {
      console.warn('Compression failed, falling back to original image:', e);
      // Fallback: convert original file to base64
      compressedDataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }

    if (isSupabaseConfigured && supabase) {
      setUploadProgressText('Uploading compressed receipt to storage...');
      try {
        const fileExt = 'jpg'; // We export as jpeg in canvas
        const fileName = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.${fileExt}`;
        const filePath = `${currentUser?.id || 'anonymous'}/${fileName}`;

        // Convert base64 dataURL to Blob for upload
        const compressedBlob = dataURLtoBlob(compressedDataUrl);

        // Upload to a bucket named 'receipts'
        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, compressedBlob, {
            cacheControl: '3600',
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.warn('Supabase storage upload failed, converting to local base64 fallback:', uploadError.message);
        } else {
          // Success! Get public URL
          const { data } = supabase.storage.from('receipts').getPublicUrl(filePath);
          if (data?.publicUrl) {
            return data.publicUrl;
          }
        }
      } catch (err) {
        console.warn('Storage exception, using base64 fallback:', err);
      }
    }

    // Default fallback: return compressed Base64 data URL
    setUploadProgressText('Attaching compressed receipt documentation...');
    return compressedDataUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than zero.');
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr) {
      setErrorMsg('UTR Number is required.');
      return;
    }
    const existing = fundRequests.find(r => r.utr_number.toLowerCase() === cleanUtr.toLowerCase());
    if (existing) {
      if (existing.status === 'approved') {
        setErrorMsg('This UTR Number has already been approved and credited.');
        return;
      }
      if (existing.status === 'pending') {
        setErrorMsg('This UTR Number is already pending approval.');
        return;
      }
    }

    if (!selectedBankAccountId) {
      setErrorMsg('Please select a Deposit Bank Account.');
      return;
    }

    if (!selectedFile) {
      setErrorMsg('Payment proof receipt image is required.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgressText('');

    try {
      let finalProofUrl: string | null = null;
      if (selectedFile) {
        finalProofUrl = await uploadImage(selectedFile);
      }

      setUploadProgressText('Submitting fund request to UsePay gateway...');
      await submitFundRequest(parsedAmount, utrNumber, finalProofUrl, selectedBankAccountId);

      setSuccessMsg('Fund request submitted to UsePay successfully!');
      setAmount('');
      setUtrNumber('');
      setSelectedBankAccountId('');
      setSelectedFile(null);
      setFilePreview(null);

      // Trigger automatic balance and status sync
      setTimeout(refreshData, 800);
    } catch (err: any) {
      console.warn('Submission error caught:', err);
      setErrorMsg(
        err.message || 
        'Failed to submit fund request. If your account was debited, please refresh and check your Sync Status in a few seconds before resubmitting.'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-in fade-in duration-300">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Wallet Fund Request</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              UsePay B2B Gateway
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Submit a fund request to UsePay to add balance to your B2B wallet. Once approved by UsePay, your balance will automatically update.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer self-start md:self-auto shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Sync Status</span>
        </button>
      </div>

      {/* Metrics Row - Explicit Grid Layout to prevent touching */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="text-xs text-slate-400 font-medium">B2B Wallet Balance</div>
          <div className="text-2xl font-bold text-white mt-1.5 font-mono">
            {!currentUser?.x_api_key || !currentUser?.x_secret_key
              ? `₹${(currentUser?.wallet_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
              : apiError
                ? 'Error'
                : apiBalance !== null
                  ? `₹${apiBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  : 'Loading...'}
          </div>
          <div className={`text-[10px] mt-1 font-semibold ${apiError ? 'text-rose-400' : 'text-emerald-400'}`}>
            {!currentUser?.x_api_key || !currentUser?.x_secret_key
              ? 'Instant Settlement Reserve'
              : apiError
                ? `API Error: ${apiError}`
                : 'Live UsePay Wallet Funds'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="text-xs text-slate-400 font-medium">Success Requests</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5 font-mono">
            ₹{successAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-1 font-semibold">{successCount} Approved Requests</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="text-xs text-slate-400 font-medium">Pending Requests</div>
          <div className="text-2xl font-bold text-amber-400 mt-1.5 font-mono">
            ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-amber-500/80 mt-1 font-semibold">{pendingCount} Awaiting Approval</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="text-xs text-slate-400 font-medium">Failed Requests</div>
          <div className="text-2xl font-bold text-rose-400 mt-1.5 font-mono">
            ₹{failedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-1 font-semibold">{failedCount} Rejected Requests</div>
        </div>
      </div>

      {/* Main Split Layout - Side-by-side using Flex Wrap */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'flex-start' }}>
        {/* Form Column - Left (made smaller, max-width constrained) */}
        <div style={{ flex: '1 1 320px', maxWidth: '420px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80">
            <div className="flex items-center space-x-2 mb-6">
              <Send className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">New Fund Request</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-3">Amount in INR (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }} className="text-slate-400 text-sm font-semibold select-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Enter amount (e.g. 50000)"
                    style={{ paddingLeft: '36px' }}
                    className="w-full glass-input rounded-xl py-2.5 pr-4 text-sm font-medium transition-all"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-3">Bank Reference / UTR Number</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }} className="text-slate-500 select-none">
                    <Hash className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="Enter unique transaction UTR number"
                    style={{ paddingLeft: '38px' }}
                    className="w-full glass-input rounded-xl py-2.5 pr-4 text-sm font-medium transition-all"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Deposit Admin Bank Account Custom Searchable Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-3">Deposit Bank Account</label>
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => {
                      if (!isSubmitting && !isFetchingBanks) {
                        setIsDropdownOpen(!isDropdownOpen);
                      }
                    }}
                    style={{ paddingLeft: '38px', minHeight: '52px' }}
                    className={`w-full glass-input pr-10 text-sm font-medium transition-all cursor-pointer flex items-center justify-between py-2.5 ${
                      isDropdownOpen ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'
                    }`}
                  >
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }} className="text-slate-500 select-none">
                      <Landmark className="h-4 w-4" />
                    </span>
                    
                    <div className="flex flex-col text-left py-0.5 truncate max-w-[90%] select-none">
                      {selectedAccount ? (
                        <>
                          <span className="font-semibold text-white text-[11px] truncate leading-tight">{selectedAccount.bank_name}</span>
                          <span className="font-mono text-slate-300 text-[10px] mt-0.5 leading-tight">A/C: {selectedAccount.account_number}</span>
                          <span className="text-slate-400 text-[9px] mt-0.5 truncate leading-tight">{selectedAccount.account_name}</span>
                        </>
                      ) : (
                        <span className="text-slate-500 text-sm">Select Deposit Bank Account</span>
                      )}
                    </div>
                    
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px]">
                      ▼
                    </div>
                  </div>

                  {isDropdownOpen && (
                    <>
                      {/* Overlay backdrop to capture outside click */}
                      <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsDropdownOpen(false)} />
                      
                      {/* Custom Dropdown Popup (renders over everything inside card) */}
                      <div
                        style={{ zIndex: 50 }}
                        className="absolute left-0 right-0 mt-0 rounded-b-xl border border-slate-800 border-t-0 glass-panel p-2.5 shadow-2xl max-h-64 overflow-y-auto flex flex-col gap-2 animate-in fade-in duration-150"
                      >
                        {/* Search Input */}
                        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                            <Search className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search bank name, A/C, name..."
                            className="w-full glass-input focus:border-emerald-500 rounded-lg py-1.5 pl-8 pr-3 text-xs transition-colors"
                          />
                        </div>

                        {/* Accounts List Container */}
                        <div className="flex-1 overflow-y-auto max-h-40 flex flex-col gap-1.5 divide-y divide-slate-900/60 custom-scrollbar pr-0.5">
                          {filteredAccounts.length === 0 ? (
                            <p className="text-[11px] text-slate-500 py-3 text-center">No accounts found.</p>
                          ) : (
                            filteredAccounts.map((acc) => {
                              const isSelected = selectedBankAccountId === acc.bank_account_id;
                              return (
                                <div
                                  key={acc.bank_account_id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBankAccountId(acc.bank_account_id);
                                    setIsDropdownOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className={`p-2 rounded-lg transition-colors cursor-pointer text-left flex flex-col ${
                                    isSelected ? 'bg-emerald-950/25 border border-emerald-500/20' : 'hover:bg-slate-900/60 border border-transparent'
                                  }`}
                                >
                                  <span className="font-semibold text-white text-xs">{acc.bank_name}</span>
                                  <span className="font-mono text-slate-300 text-[10px] mt-0.5">A/C: {acc.account_number}</span>
                                  <span className="text-slate-400 text-[9px] mt-0.5 truncate">{acc.account_name}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {isFetchingBanks && (
                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Fetching accounts list...
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-3">Upload Payment Proof (Image)</label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting}
                />

                {!filePreview ? (
                  <div
                    onClick={handleUploadClick}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="group border border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 transition-all bg-slate-950/20 text-center cursor-pointer hover:bg-slate-900/10"
                  >
                    <Upload className="h-8 w-8 mx-auto text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    <p className="text-xs text-slate-300 font-medium mt-2">Click or drag image file here to upload</p>
                    <p className="text-[10px] text-slate-500 mt-1">Supports JPG, PNG, GIF (Max 5MB)</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60 transition-all">
                    <div className="flex items-center space-x-2 text-xs truncate max-w-[85%]">
                      <ImageIcon className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 truncate font-medium">{selectedFile?.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-full transition-colors cursor-pointer shrink-0"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {isSubmitting && uploadProgressText && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs flex items-center space-x-2">
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin shrink-0" />
                  <span>{uploadProgressText}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{isSubmitting ? 'Processing Request...' : 'Submit to UsePay'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Request History - Right (made wider, takes remaining flex area) */}
        <div style={{ flex: '2 1 500px', minWidth: '320px' }}>
          <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80">
            <div className="flex items-center space-x-2 mb-4">
              <History className="h-5 w-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">UsePay Request History</h2>
            </div>

            {/* Filter Bar */}
            <div className="mb-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg glass-input text-[11px]"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2 items-center w-full sm:w-auto justify-end">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="px-2 py-1.5 rounded-lg glass-input text-[11px] cursor-pointer"
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="last7">Last 7 Days</option>
                    <option value="last30">Last 30 Days</option>
                    <option value="thisMonth">This Month</option>
                    <option value="custom">Custom Range</option>
                    <option value="all">All Time</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2 py-1.5 rounded-lg glass-input text-[11px] cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Custom dates */}
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 animate-in fade-in duration-200">
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500 text-[10px]">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 rounded-md glass-input text-[10px]"
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-500 text-[10px]">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1 rounded-md glass-input text-[10px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {filteredUserRequests.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <p className="text-slate-500 text-xs font-medium">No fund requests found.</p>
                <p className="text-slate-600 text-[10px] mt-1">Submit your first request using the form on the left.</p>
              </div>
            ) : (
              <div className="overflow-x-auto font-sans">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-2">Amount</th>
                      <th className="pb-3 px-2">UTR Number</th>
                      <th className="pb-3 px-2">Status</th>
                      <th className="pb-3 px-2">Receipt</th>
                      <th className="pb-3 pl-2">Submitted At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                    {filteredUserRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/20 transition-all">
                        <td className="py-4 pr-2 font-semibold text-white font-mono">
                          ₹{req.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-2 font-mono font-medium text-slate-300">
                          <div className="flex items-center space-x-1.5">
                            <span>{req.utr_number}</span>
                            <button
                              onClick={() => copyUtr(req.utr_number)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                              title="Copy UTR"
                            >
                              {copiedUtr === req.utr_number ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                          {req.admin_bank_account_id && (
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5 flex items-center gap-1">
                              <Landmark className="h-2.5 w-2.5 shrink-0 text-slate-600" />
                              <span>To: {bankAccounts.find(b => b.bank_account_id === req.admin_bank_account_id)?.bank_name || 'Admin Bank'}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              req.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : req.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {req.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          {req.proof_url ? (
                            <a
                              href={req.proof_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-0.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-semibold">View</span>
                            </a>
                          ) : (
                            <span className="text-slate-600 text-[10px]">No Image</span>
                          )}
                        </td>
                        <td className="py-4 pl-2 text-slate-500 font-mono text-[11px]">
                          {new Date(req.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserFundRequest;
