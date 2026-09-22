import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, CheckCircle2, Clock, XCircle, Receipt, Search, 
  RefreshCw, PlusCircle, X, AlertCircle, Sparkles, Building2, User, 
  Calendar, Check, ShieldCheck 
} from 'lucide-react';
import { parsePaymentMethod } from './CreditCardBillPay';
import type { TransactionStatus } from '../types';
import { Pagination } from '../components/Pagination';

const PRESET_BILLERS = [
  { id: 'SBIC00000NATDN', name: 'SBI Card' },
  { id: 'INDU00000NATL1', name: 'IndusInd Credit Card' },
  { id: 'ICIC00000NATSI', name: 'ICICI Credit card' },
  { id: 'HDFCCARD00001', name: 'HDFC Bank Credit Card' },
  { id: 'AXISCARD00001', name: 'Axis Bank Credit Card' },
  { id: 'FEDE00000NATDL', name: 'Federal Bank Credit Card' },
  { id: 'IDFC00000NATFQ', name: 'IDFC FIRST Bank Credit Card' },
  { id: 'BOBCARD000001', name: 'Bank of Baroda Credit Card' },
  { id: 'KOTAKCARD0001', name: 'Kotak Mahindra Bank Credit Card' },
  { id: 'RBLC00000NAT01', name: 'RBL Bank Credit Card' },
  { id: 'AUBK00000NAT01', name: 'AU Small Finance Bank Credit Card' },
  { id: 'CUSTOM', name: 'Other / Custom Biller' },
];

export const AdminPaymentHistory: React.FC = () => {
  const { bills, users, refreshData, addManualBill, checkBillStatus } = useAuth();
  const [receiptBill, setReceiptBill] = useState<any | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [checkingAdminBillId, setCheckingAdminBillId] = useState<string | null>(null);

  // Add Missing Transaction Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form Fields
  const standardUsers = users.filter((u) => u.role === 'user');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedBillerChoice, setSelectedBillerChoice] = useState<string>('SBIC00000NATDN');
  const [customBankName, setCustomBankName] = useState('');
  const [customBillerId, setCustomBillerId] = useState('');
  const [cardDigits, setCardDigits] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus>('Success');
  const [methodName, setMethodName] = useState('UPI Instant Direct');
  const [customDateTime, setCustomDateTime] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Success' | 'Pending' | 'Failed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Look up user helper
  const getUserInfo = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return {
      name: user ? user.full_name : 'Unknown User',
      email: user ? user.email : 'N/A',
      phone: user ? user.phone : 'N/A',
      initial: user ? user.full_name.charAt(0).toUpperCase() : 'U',
    };
  };

  // Date range match helper
  const checkDateMatch = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    // Reset hours for day comparisons
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

  // Filter bills
  const filteredBills = bills.filter((b) => {
    const user = getUserInfo(b.user_id);
    const parsed = parsePaymentMethod(b.payment_method);
    
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.transaction_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.card_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsed.billerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsed.mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.amount.toString().includes(searchTerm) ||
      b.status.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesDate = checkDateMatch(b.created_at);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination (10 per page)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBills = filteredBills.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const [isFetchingModalStatus, setIsFetchingModalStatus] = useState(false);
  const [modalStatusHint, setModalStatusHint] = useState('');

  const handleFetchLiveStatusForModal = async () => {
    const cleanRef = transactionRef.trim();
    if (!cleanRef) return;
    setIsFetchingModalStatus(true);
    setModalStatusHint('');
    setModalError('');
    try {
      const user = users.find((u) => u.id === selectedUserId);
      if (!user || !user.x_api_key || !user.x_secret_key) {
        throw new Error('Selected user does not have API credentials configured in profile.');
      }
      const res = await fetch(`/api/v1/b2b/status/${encodeURIComponent(cleanRef)}`, {
        headers: {
          'x-api-key': user.x_api_key.trim(),
          'x-secret-key': user.x_secret_key.trim(),
        },
      });
      const data = await res.json();
      if (res.ok && data.status === 'success' && data.data) {
        const rawStatus = (data.data.current_status || data.data.bbps_status || data.data.status || '').toLowerCase();
        if (rawStatus === 'success' || rawStatus === 'completed') {
          setSelectedStatus('Success');
        } else if (rawStatus === 'failed' || rawStatus === 'error' || rawStatus === 'rejected') {
          setSelectedStatus('Failed');
        } else {
          setSelectedStatus('Pending');
        }
        setModalStatusHint(`Verified from UsePay Gateway: Status is ${rawStatus.toUpperCase()} (BBPS: ${data.data.bbps_status || 'N/A'})`);
      } else {
        throw new Error(data.message || 'Reference not found on UsePay.');
      }
    } catch (err: any) {
      setModalError(err.message || 'Could not verify reference with gateway.');
    } finally {
      setIsFetchingModalStatus(false);
    }
  };

  // Handle Sync Recent API Transactions
  const handleSyncTransactions = async () => {
    setIsSyncing(true);
    setSyncToast(null);
    try {
      await refreshData();
      const pendingList = bills.filter((b) => b.status === 'Pending');
      let checkedCount = 0;
      for (const pb of pendingList) {
        try {
          await checkBillStatus(pb.id);
          checkedCount++;
        } catch (e) {
          console.warn('Sync pending bill check notice:', pb.id, e);
        }
      }
      setSyncToast({
        message: `Synced all records! Verified ${checkedCount} pending transaction(s) with live gateway.`,
        type: 'success',
      });
    } catch (err: any) {
      setSyncToast({ message: err?.message || 'Failed to sync with database.', type: 'error' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 5000);
    }
  };

  // Handle Live Status Check from UsePay
  const handleAdminCheckStatus = async (billId: string) => {
    setCheckingAdminBillId(billId);
    try {
      const res = await checkBillStatus(billId);
      setSyncToast({
        message: `Status updated: ${res.status}! ${res.message || ''}`,
        type: res.status === 'Success' ? 'success' : 'error'
      });
    } catch (err: any) {
      setSyncToast({ message: err?.message || 'Failed to check status with UsePay API.', type: 'error' });
    } finally {
      setCheckingAdminBillId(null);
      setTimeout(() => setSyncToast(null), 5000);
    }
  };

  // Handle Open Add Missing Transaction Modal
  const handleOpenAddModal = () => {
    const defaultUser = standardUsers.length > 0 ? standardUsers[0] : users[0];
    if (defaultUser) {
      setSelectedUserId(defaultUser.id);
      setCardholderName(defaultUser.full_name);
      setCustomerMobile(defaultUser.phone || '');
    }
    setSelectedBillerChoice('SBIC00000NATDN');
    setCustomBankName('');
    setCustomBillerId('');
    setCardDigits('');
    setAmount('');
    setTransactionRef('');
    setSelectedStatus('Success');
    setMethodName('UPI Instant Direct');
    setModalError('');
    
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    setCustomDateTime(localISOTime);

    setIsAddModalOpen(true);
  };

  // Handle User Change in Modal
  const handleUserSelect = (uid: string) => {
    setSelectedUserId(uid);
    const u = users.find((item) => item.id === uid);
    if (u) {
      setCardholderName(u.full_name);
      if (u.phone) setCustomerMobile(u.phone);
    }
  };

  // Handle Form Submit for Manual Transaction Addition
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!selectedUserId) {
      setModalError('Please select a valid user.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setModalError('Please enter a valid paid amount (greater than 0).');
      return;
    }

    const cleanRef = transactionRef.trim();
    if (!cleanRef) {
      setModalError('Please enter a valid Transaction / BBPS Reference Number.');
      return;
    }

    // Check for duplicate reference
    const duplicate = bills.find((b) => b.transaction_ref.toLowerCase() === cleanRef.toLowerCase());
    if (duplicate) {
      setModalError(`A transaction with reference "${cleanRef}" already exists in the database.`);
      return;
    }

    // Determine Biller ID and Bank Name
    let finalBillerId = selectedBillerChoice;
    let finalBankName = '';

    if (selectedBillerChoice === 'CUSTOM') {
      finalBankName = customBankName.trim() || 'Custom Bank';
      finalBillerId = customBillerId.trim() || 'GENERIC_BILLER';
    } else {
      const match = PRESET_BILLERS.find((pb) => pb.id === selectedBillerChoice);
      finalBankName = match ? match.name : 'Credit Card';
      finalBillerId = match ? match.id : selectedBillerChoice;
    }

    // Clean card number formatting
    const rawDigits = cardDigits.replace(/\D/g, '');
    const cleanCard = rawDigits.length >= 4 
      ? `•••• •••• •••• ${rawDigits.slice(-4)}`
      : rawDigits.length > 0 
        ? `•••• •••• •••• ${rawDigits}` 
        : '•••• •••• •••• XXXX';

    const cleanMobile = customerMobile.replace(/\D/g, '') || '9876543210';
    const finalPaymentMethod = `${methodName.trim() || 'UPI Instant Direct'}|${finalBillerId}|${cleanMobile}`;

    // Convert local datetime to ISO string
    let finalCreatedAt = new Date().toISOString();
    if (customDateTime) {
      try {
        finalCreatedAt = new Date(customDateTime).toISOString();
      } catch {
        finalCreatedAt = new Date().toISOString();
      }
    }

    setIsSubmitting(true);
    try {
      await addManualBill({
        user_id: selectedUserId,
        card_number: cleanCard,
        cardholder_name: cardholderName.trim() || getUserInfo(selectedUserId).name,
        bank_name: finalBankName,
        amount: numAmount,
        status: selectedStatus,
        transaction_ref: cleanRef,
        payment_method: finalPaymentMethod,
        created_at: finalCreatedAt,
      });

      setIsAddModalOpen(false);
      setSyncToast({
        message: `Transaction ${cleanRef} successfully added to database!`,
        type: 'success',
      });
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to insert transaction into database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {syncToast && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 shadow-xl ${
          syncToast.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
            : 'bg-rose-950/80 border-rose-500/40 text-rose-300 shadow-rose-950/40'
        }`}>
          <div className="flex items-center space-x-2">
            {syncToast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{syncToast.message}</span>
          </div>
          <button 
            onClick={() => setSyncToast(null)}
            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Title Header with Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-400" />
            <span>Global Payment History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Log of all utility and credit card bill transactions executed by portal members.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sync Button */}
          <button
            onClick={handleSyncTransactions}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition-all flex items-center space-x-2 shadow-sm hover:border-indigo-500/40 cursor-pointer disabled:opacity-50"
            title="Fetch latest database records and verify status"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Recent API Transactions'}</span>
          </button>

          {/* Add Missing Transaction Button */}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Add a completed API transaction by BBPS Ref or Order ID"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Missing Transaction by Ref</span>
          </button>

          {/* Total Count Badge */}
          <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-800">
            Total {filteredBills.length}
          </span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user, ref, bank, card, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-end">
            {/* Date filter dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-xs">Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl glass-input text-xs cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-xs">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl glass-input text-xs cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom date range fields (only if custom is selected) */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-xs">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg glass-input text-xs"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-xs">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg glass-input text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transaction History Log Table */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Biller ID</th>
                <th className="py-3.5 px-4">Customer Mobile</th>
                <th className="py-3.5 px-4">Ref Number</th>
                <th className="py-3.5 px-4">Bank</th>
                <th className="py-3.5 px-4">Card Number</th>
                <th className="py-3.5 px-4">Paid Amount</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedBills.map((b) => {
                const user = getUserInfo(b.user_id);
                const parsed = parsePaymentMethod(b.payment_method);
                return (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User Info Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 text-xs shrink-0">
                          {user.initial}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200">{user.name}</p>
                          <p className="text-[10px] text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Date & Time Column */}
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {new Date(b.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </td>

                    {/* Biller ID Column */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">{parsed.billerId}</td>

                    {/* Customer Mobile Column */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">{parsed.mobile}</td>

                    {/* Ref Number Column */}
                    <td className="py-3.5 px-4 font-mono text-indigo-400 font-semibold text-xs">
                      <div>{b.transaction_ref}</div>
                      {(b.client_transaction_id || parsed.clientTxnId) && (b.client_transaction_id || parsed.clientTxnId) !== b.transaction_ref && (
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">Order: {b.client_transaction_id || parsed.clientTxnId}</div>
                      )}
                    </td>

                    {/* Bank Name Column */}
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{b.bank_name}</td>

                    {/* Card Number Column */}
                    <td className="py-3.5 px-4 font-mono text-slate-300">{b.card_number}</td>

                    {/* Amount Column */}
                    <td className="py-3.5 px-4 font-bold text-white font-mono">
                      ₹{b.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Payment Method Column */}
                    <td className="py-3.5 px-4 text-slate-400">{parsed.method}</td>

                    {/* Status Column */}
                    <td className="py-3.5 px-4">
                      {b.status === 'Success' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Success</span>
                        </span>
                      )}
                      {b.status === 'Pending' && (
                        <div className="flex items-center space-x-1.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                            <Clock className="h-3 w-3" />
                            <span>Pending</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdminCheckStatus(b.id)}
                            disabled={checkingAdminBillId === b.id}
                            title="Check Live Status with UsePay API"
                            className="p-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all hover:scale-105 inline-flex items-center cursor-pointer"
                          >
                            <RefreshCw className={`h-3 w-3 ${checkingAdminBillId === b.id ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      )}
                      {b.status === 'Failed' && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="h-3 w-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    {/* Receipt Action Column */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setReceiptBill(b)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-[11px] inline-flex items-center space-x-1 border border-slate-700 transition-all cursor-pointer"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-medium">
                    No matching transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={filteredBills.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemName="transactions"
        />
      </div>

      {/* Add Missing Transaction by Ref Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full glass-panel p-6 border border-indigo-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>Add Missing Transaction by Ref</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    UsePay / BBPS
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Directly record a successful or completed API transaction into database with reference ID.
                </p>
              </div>
            </div>

            {/* Error Message */}
            {modalError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Target User */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Select User Profile *</span>
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => handleUserSelect(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                        {u.full_name} ({u.phone || u.email}) {u.role === 'admin' ? '• Admin' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Biller Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Card Issuer / Biller *</span>
                  </label>
                  <select
                    value={selectedBillerChoice}
                    onChange={(e) => setSelectedBillerChoice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs cursor-pointer"
                  >
                    {PRESET_BILLERS.map((b) => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                        {b.name} ({b.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional Custom Biller Fields */}
                {selectedBillerChoice === 'CUSTOM' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Custom Bank / Biller Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Yes Bank Credit Card"
                        value={customBankName}
                        onChange={(e) => setCustomBankName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Custom Biller ID *</label>
                      <input
                        type="text"
                        placeholder="e.g. YESB00000NAT01"
                        value={customBillerId}
                        onChange={(e) => setCustomBillerId(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>
                  </>
                )}

                {/* 3. Transaction / BBPS Reference ID */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span>BBPS / UsePay Ref ID *</span>
                    </label>
                    {transactionRef.trim() && (
                      <button
                        type="button"
                        onClick={handleFetchLiveStatusForModal}
                        disabled={isFetchingModalStatus}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${isFetchingModalStatus ? 'animate-spin' : ''}`} />
                        <span>{isFetchingModalStatus ? 'Checking Live API...' : 'Fetch Status from UsePay'}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. BBPSU3828168450 or CC01RS..."
                    value={transactionRef}
                    onChange={(e) => {
                      setTransactionRef(e.target.value);
                      setModalStatusHint('');
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono text-indigo-300 font-bold placeholder-slate-500"
                  />
                  {modalStatusHint && (
                    <p className="text-[11px] mt-1 text-emerald-400 font-medium animate-in fade-in duration-200">
                      {modalStatusHint}
                    </p>
                  )}
                </div>

                {/* 4. Paid Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    <span>Paid Amount (₹) *</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 21199.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono font-bold text-white placeholder-slate-500"
                  />
                </div>

                {/* 5. Card Last Digits / Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    <span>Card Number / Last 4 Digits</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 6678"
                    maxLength={19}
                    value={cardDigits}
                    onChange={(e) => setCardDigits(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono text-slate-200"
                  />
                </div>

                {/* 6. Customer Mobile */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Customer Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 8780182013"
                    maxLength={10}
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono text-slate-200"
                  />
                </div>

                {/* 7. Cardholder Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cardholder Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. PARTH RAJESHBHAI PATEL"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-200 uppercase"
                  />
                </div>

                {/* 8. Transaction Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Transaction Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as TransactionStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs cursor-pointer font-bold"
                  >
                    <option value="Success" className="bg-slate-900 text-emerald-400">Success</option>
                    <option value="Pending" className="bg-slate-900 text-amber-400">Pending</option>
                    <option value="Failed" className="bg-slate-900 text-rose-400">Failed</option>
                  </select>
                </div>

                {/* 9. Payment Date & Time */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Transaction Date & Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-200"
                  />
                </div>

                {/* 10. Payment Method Gateway */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Method / Gateway</label>
                  <input
                    type="text"
                    value={methodName}
                    onChange={(e) => setMethodName(e.target.value)}
                    placeholder="UPI Instant Direct"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-300"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save & Sync Entry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {receiptBill && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full glass-panel p-6 border shadow-2xl relative ${
            receiptBill.status === 'Success' ? 'border-emerald-500/30' :
            receiptBill.status === 'Pending' ? 'border-amber-500/30' : 'border-rose-500/30'
          }`}>
            <div className="text-center mb-6">
              {receiptBill.status === 'Success' && (
                <>
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Bill Payment Successful</h3>
                </>
              )}
              {receiptBill.status === 'Pending' && (
                <>
                  <div className="inline-flex p-3 rounded-full bg-amber-500/20 text-amber-400 mb-3 border border-amber-500/30 animate-pulse">
                    <Clock className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Bill Payment Pending</h3>
                </>
              )}
              {receiptBill.status === 'Failed' && (
                <>
                  <div className="inline-flex p-3 rounded-full bg-rose-500/20 text-rose-400 mb-3 border border-rose-500/30">
                    <XCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">Bill Payment Failed</h3>
                </>
              )}
              <p className="text-xs text-slate-400 mt-1">Transaction Ref: <span className="font-mono text-indigo-300 font-bold">{receiptBill.transaction_ref}</span></p>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Card Member</span>
                <span className="font-bold text-slate-200">{getUserInfo(receiptBill.user_id).name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Card Issuer</span>
                <span className="font-bold text-slate-200">{receiptBill.bank_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Card Number</span>
                <span className="font-mono text-slate-200">{receiptBill.card_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Cardholder Name</span>
                <span className="font-semibold text-slate-200">{receiptBill.cardholder_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Payment Status</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                  receiptBill.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  receiptBill.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>{receiptBill.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Payment Amount</span>
                <span className={`font-extrabold font-mono text-sm ${
                  receiptBill.status === 'Success' ? 'text-emerald-400' :
                  receiptBill.status === 'Pending' ? 'text-amber-400' : 'text-rose-400'
                }`}>₹{receiptBill.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Payment Gateway</span>
                <span className="text-slate-300">{parsePaymentMethod(receiptBill.payment_method).method}</span>
              </div>
            </div>

            <button
              onClick={() => setReceiptBill(null)}
              className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
