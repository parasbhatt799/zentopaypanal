import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { parsePaymentMethod } from './CreditCardBillPay';
import { 
  FileText, Search, Download, ArrowUpRight, ArrowDownRight, 
  Calendar, CheckCircle2, Clock, XCircle, Filter, Info, Users 
} from 'lucide-react';

interface UnifiedTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userInitial: string;
  date: string;
  type: 'credit' | 'debit';
  refId: string;
  amount: number;
  status: string;
  description: string;
}

export const AdminStatement: React.FC = () => {
  const { bills, fundRequests, users } = useAuth();
  const [liveBalances, setLiveBalances] = useState<Record<string, number | string>>({});

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Get active standard users list for dropdown filter
  const standardUsers = users.filter((u) => u.role === 'user');

  // Background fetch live B2B balances
  useEffect(() => {
    standardUsers.forEach(async (u) => {
      if (!u.x_api_key || !u.x_secret_key) {
        setLiveBalances((prev) => ({ ...prev, [u.id]: 'No Keys' }));
        return;
      }
      try {
        const response = await fetch('https://www.usepay.in/api/v1/b2b/balance', {
          headers: {
            'x-api-key': u.x_api_key,
            'x-secret-key': u.x_secret_key
          }
        });
        const res = await response.json();
        if (res.status === 'success' && res.data && typeof res.data.balance !== 'undefined') {
          setLiveBalances((prev) => ({ ...prev, [u.id]: Number(res.data.balance) }));
        } else {
          setLiveBalances((prev) => ({ ...prev, [u.id]: 'Error' }));
        }
      } catch (err) {
        setLiveBalances((prev) => ({ ...prev, [u.id]: 'Error' }));
      }
    });
  }, [users]);

  // Look up user details helper
  const getUserDetails = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return {
      name: user ? user.full_name : 'Unknown User',
      email: user ? user.email : 'N/A',
      initial: user ? user.full_name.charAt(0).toUpperCase() : 'U',
    };
  };

  // Construct raw list of unified transactions from all users
  const rawTransactions: UnifiedTransaction[] = [
    ...bills.map((b) => {
      const parsed = parsePaymentMethod(b.payment_method);
      const user = getUserDetails(b.user_id);
      return {
        id: b.id,
        userId: b.user_id,
        userName: user.name,
        userEmail: user.email,
        userInitial: user.initial,
        date: b.created_at,
        type: 'debit' as const,
        refId: b.transaction_ref,
        amount: b.amount,
        status: b.status,
        description: `Credit Card Bill Pay (${b.bank_name} - ${b.card_number}) via ${parsed.method}`
      };
    }),
    ...fundRequests.map((r) => {
      const user = getUserDetails(r.user_id);
      return {
        id: r.id,
        userId: r.user_id,
        userName: user.name,
        userEmail: user.email,
        userInitial: user.initial,
        date: r.created_at,
        type: 'credit' as const,
        refId: r.utr_number,
        amount: r.amount,
        status: r.status,
        description: `Wallet Load Request (UTR: ${r.utr_number})`
      };
    })
  ];

  // Sort chronologically newest to oldest
  const sortedTransactions = [...rawTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

  // Filter global transactions
  const filteredTransactions = sortedTransactions.filter((tx) => {
    const matchesSearch =
      tx.refId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.amount.toString().includes(searchTerm);

    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesUser = userFilter === 'all' || tx.userId === userFilter;
    const matchesDate = checkDateMatch(tx.date);

    return matchesSearch && matchesType && matchesUser && matchesDate;
  });

  // Calculate metrics based on filtered transactions
  const totalCredits = filteredTransactions
    .filter((tx) => tx.type === 'credit' && tx.status === 'approved')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalDebits = filteredTransactions
    .filter((tx) => tx.type === 'debit' && (tx.status === 'Success' || tx.status === 'Pending'))
    .reduce((acc, tx) => acc + tx.amount, 0);

  const netFlow = totalCredits - totalDebits;

  // Export filtered transactions to CSV
  const exportToCSV = () => {
    const headers = ['Date & Time', 'User Name', 'User Email', 'Reference ID / UTR', 'Description', 'Transaction Type', 'Amount (INR)', 'Status'];
    const rows = filteredTransactions.map((tx) => [
      new Date(tx.date).toLocaleString('en-IN'),
      tx.userName,
      tx.userEmail,
      tx.refId,
      tx.description,
      tx.type === 'credit' ? 'Deposit (Inflow)' : 'Debit (Outflow)',
      tx.amount,
      tx.status
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ZentoPay_System_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-400" />
            <span>Global System Statement</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global ledger of deposits and credit card bill payments executed by all agent members.
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredTransactions.length === 0}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700/50 disabled:cursor-not-allowed text-xs font-semibold text-white border border-indigo-500/20 hover:border-indigo-500/40 shadow-lg shadow-indigo-600/10 flex items-center space-x-2 transition-all duration-200"
        >
          <Download className="h-4 w-4" />
          <span>Export statement (CSV)</span>
        </button>
      </div>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Deposits */}
        <div className="p-4 rounded-xl glass-card border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Total System Inflows (Deposits)</span>
            <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-emerald-400 font-mono">
              +₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Total Payments */}
        <div className="p-4 rounded-xl glass-card border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Total System Outflows (Debits)</span>
            <div className="p-1 rounded bg-rose-500/10 text-rose-400">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-rose-400 font-mono">
              -₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* System Net Volume */}
        <div className="p-4 rounded-xl glass-card border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>System Net Flow</span>
            <div className={`p-1 rounded ${netFlow >= 0 ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Info className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-lg font-bold font-mono ${netFlow >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
              {netFlow >= 0 ? '+' : ''}₹{netFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
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
              placeholder="Search user name, email, ref, or desc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-end">
            {/* User Select Filter */}
            <div className="flex items-center space-x-2">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="px-3 py-2 rounded-xl glass-input text-xs cursor-pointer max-w-[150px] truncate"
              >
                <option value="all">All Users</option>
                {standardUsers.map((u) => {
                  const bal = liveBalances[u.id];
                  return (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({typeof bal === 'number' ? `₹${bal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : (bal || 'Loading...')})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Type dropdown */}
            <div className="flex items-center space-x-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl glass-input text-xs cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="credit">Deposits (Credits)</option>
                <option value="debit">Payments (Debits)</option>
              </select>
            </div>

            {/* Date filter dropdown */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl glass-input text-xs cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom date range fields */}
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

      {/* Global Transaction Table */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Ref ID / UTR</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.map((tx) => (
                <tr key={`${tx.type}-${tx.id}`} className="hover:bg-slate-800/30 transition-colors">
                  {/* User Profile avatar + details */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-indigo-400 text-xs">
                        {tx.userInitial}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">{tx.userName}</p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                          <span>{tx.userEmail}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-indigo-300 font-semibold font-mono">
                            Live Bal: {
                              typeof liveBalances[tx.userId] === 'number' 
                                ? `₹${Number(liveBalances[tx.userId]).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                                : (liveBalances[tx.userId] || 'Loading...')
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    {new Date(tx.date).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </td>

                  {/* Reference ID */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                    {tx.refId}
                  </td>

                  {/* Description */}
                  <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={tx.description}>
                    {tx.description}
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4">
                    {tx.type === 'credit' ? (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-400">
                        Inflow
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-rose-400">
                        Outflow
                      </span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="py-3.5 px-4 font-bold font-mono">
                    {tx.type === 'credit' ? (
                      <span className="text-emerald-400">
                        +₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-rose-400">
                        -₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {tx.status === 'approved' || tx.status === 'Success' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Approved</span>
                      </span>
                    ) : tx.status === 'pending' || tx.status === 'Pending' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                        <Clock className="h-3 w-3" />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle className="h-3 w-3" />
                        <span>Rejected</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                    No transactions found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
