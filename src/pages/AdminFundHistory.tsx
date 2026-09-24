import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DollarSign, CheckCircle2, Clock, XCircle, FileText, ExternalLink, Search, RefreshCw, Landmark } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import type { BankAccount } from '../lib/usepay_b2b_client';

export const AdminFundHistory: React.FC = () => {
  const { currentUser, fundRequests, users, checkFundRequestStatus } = useAuth();
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Fetch admin bank accounts for friendly display
  useEffect(() => {
    const fetchBanks = async () => {
      const activeUser = users.find(u => u.x_api_key && u.x_secret_key) || currentUser;
      if (!activeUser?.x_api_key || !activeUser?.x_secret_key) return;
      try {
        const res = await fetch('/api/v1/b2b/admin-bank-accounts', {
          headers: {
            'x-api-key': activeUser.x_api_key.trim(),
            'x-secret-key': activeUser.x_secret_key.trim(),
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && Array.isArray(data.data)) {
            setBankAccounts(data.data);
          }
        }
      } catch (err) {
        console.warn('AdminFundHistory: Could not fetch bank accounts:', err);
      }
    };
    fetchBanks();
  }, [users, currentUser]);

  const handleCheckStatus = async (requestId: string) => {
    setCheckingStatusId(requestId);
    try {
      await checkFundRequestStatus(requestId);
    } catch (err) {
      console.warn('Failed to verify status:', err);
    } finally {
      setCheckingStatusId(null);
    }
  };
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Look up user helper
  const getUserInfo = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return {
      name: user ? user.full_name : 'Unknown User',
      email: user ? user.email : 'N/A',
      initial: user ? user.full_name.charAt(0) : 'U',
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

  // Calculated metrics based on active date filter
  const dateFilteredRequests = fundRequests.filter(r => checkDateMatch(r.created_at));
  const approvedCount = dateFilteredRequests.filter(r => r.status === 'approved').length;
  const approvedAmount = dateFilteredRequests
    .filter(r => r.status === 'approved')
    .reduce((acc, r) => acc + r.amount, 0);
  const pendingCount = dateFilteredRequests.filter(r => r.status === 'pending').length;
  const pendingAmount = dateFilteredRequests
    .filter(r => r.status === 'pending')
    .reduce((acc, r) => acc + r.amount, 0);
  const rejectedCount = dateFilteredRequests.filter(r => r.status === 'rejected').length;
  const rejectedAmount = dateFilteredRequests
    .filter(r => r.status === 'rejected')
    .reduce((acc, r) => acc + r.amount, 0);

  // Filter requests
  const filteredRequests = fundRequests.filter((r) => {
    const user = getUserInfo(r.user_id);
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.utr_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.admin_bank_account_id && r.admin_bank_account_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.amount.toString().includes(searchTerm) ||
      r.status.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesDate = checkDateMatch(r.created_at);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination (10 per page)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRequests = filteredRequests.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-indigo-400" />
            <span>Global B2B Fund History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Log of all B2B wallet fund requests submitted by agent members for verification.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
          Total {filteredRequests.length} Requests
        </span>
      </div>

      {/* 3 Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* 1. Approved Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
          className={`p-5 rounded-2xl bg-slate-900/40 border backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/50 transition-all shadow-lg shadow-emerald-950/20 cursor-pointer ${
            statusFilter === 'approved' ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-emerald-500/20'
          }`}
          title="Click to filter Approved fund requests"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Approved Total</div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
            ₹{approvedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 font-semibold flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{approvedCount.toLocaleString('en-IN')} Approved Requests</span>
          </div>
        </div>

        {/* 2. Pending Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          className={`p-5 rounded-2xl bg-slate-900/40 border backdrop-blur-md relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-lg shadow-amber-950/20 cursor-pointer ${
            statusFilter === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-amber-500/20'
          }`}
          title="Click to filter Pending fund requests"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Total</div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
            ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1 font-semibold flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{pendingCount.toLocaleString('en-IN')} Pending Requests</span>
          </div>
        </div>

        {/* 3. Rejected Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')}
          className={`p-5 rounded-2xl bg-slate-900/40 border backdrop-blur-md relative overflow-hidden group hover:border-rose-500/50 transition-all shadow-lg shadow-rose-950/20 cursor-pointer ${
            statusFilter === 'rejected' ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-rose-500/20'
          }`}
          title="Click to filter Rejected fund requests"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all pointer-events-none" />
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Rejected Total</div>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">
            ₹{rejectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1 font-semibold flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>{rejectedCount.toLocaleString('en-IN')} Rejected Requests</span>
          </div>
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
              placeholder="Search all columns..."
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
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
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

      {/* Fund Requests Log Table */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">UTR Number</th>
                <th className="py-3.5 px-4">Admin Bank Account ID</th>
                <th className="py-3.5 px-4">Requested Amount</th>
                <th className="py-3.5 px-4">Proof of Payment</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedRequests.map((r) => {
                const user = getUserInfo(r.user_id);
                return (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User Info Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 text-xs">
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
                      {new Date(r.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </td>

                    {/* UTR Number Column */}
                    <td className="py-3.5 px-4 font-mono text-indigo-400 font-bold">{r.utr_number}</td>

                    {/* Admin Bank Account Column */}
                    <td className="py-3.5 px-4">
                      {r.admin_bank_account_id ? (
                        (() => {
                          const bank = bankAccounts.find(b => b.bank_account_id === r.admin_bank_account_id);
                          return (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                                <Landmark className="h-3 w-3 text-emerald-400 shrink-0" />
                                <span>{bank ? bank.bank_name : 'Deposit Bank'}</span>
                              </span>
                              <span className="font-mono text-slate-400 text-[10px] select-all truncate max-w-[160px]" title={r.admin_bank_account_id}>
                                {bank ? `A/C: ${bank.account_number}` : r.admin_bank_account_id}
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-slate-500 font-medium">N/A</span>
                      )}
                    </td>

                    {/* Requested Amount Column */}
                    <td className="py-3.5 px-4 font-bold text-white font-mono">
                      ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Proof of Payment Column */}
                    <td className="py-3.5 px-4">
                      {r.proof_url ? (
                        <a
                          href={r.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          <span>View Proof</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500 font-medium">No Proof</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        {r.status === 'approved' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {r.status === 'pending' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                            <Clock className="h-3 w-3" />
                            <span>Pending</span>
                          </span>
                        )}
                        {r.status === 'rejected' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="h-3 w-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                        <button
                          onClick={() => handleCheckStatus(r.id)}
                          disabled={checkingStatusId === r.id}
                          title="Check / Sync live status with UsePay"
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${
                              checkingStatusId === r.id ? 'animate-spin text-indigo-400' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium">
                    No matching fund requests found.
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
          totalItems={filteredRequests.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          itemName="fund requests"
        />
      </div>
    </div>
  );
};
