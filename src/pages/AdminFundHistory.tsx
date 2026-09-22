import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DollarSign, CheckCircle2, Clock, XCircle, FileText, ExternalLink, Search } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export const AdminFundHistory: React.FC = () => {
  const { fundRequests, users } = useAuth();
  
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

                    {/* Admin Bank Account ID Column */}
                    <td className="py-3.5 px-4 text-slate-300">{r.admin_bank_account_id || 'N/A'}</td>

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
