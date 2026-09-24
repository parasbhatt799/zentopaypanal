import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { parsePaymentMethod } from './CreditCardBillPay';
import { extractBillIdentifiers } from '../utils/billUtils';
import { 
  FileText, Search, Download, ArrowUpRight, ArrowDownRight, 
  Calendar, CheckCircle2, Clock, XCircle, Filter, Info, RefreshCw,
  Copy, Check 
} from 'lucide-react';

interface UnifiedTransaction {
  id: string;
  date: string;
  type: 'credit' | 'debit';
  refId: string;
  amount: number;
  status: string;
  description: string;
  runningBalance: number;
  clientTxnId?: string;
  bbpsRef?: string;
}

export const UserStatement: React.FC = () => {
  const { currentUser, bills, fundRequests, checkBillStatus } = useAuth();
  const [apiBalance, setApiBalance] = useState<number | null>(null);
  const [checkingTxId, setCheckingTxId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Live API Balance if credentials exist
  useEffect(() => {
    if (!currentUser?.x_api_key || !currentUser?.x_secret_key) {
      setApiBalance(null);
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
        }
      } catch (err: any) {
        console.warn('Failed to fetch API balance in statement:', err);
      }
    };

    fetchBalance();
  }, [currentUser?.x_api_key, currentUser?.x_secret_key]);

  const handleCheckStatus = async (billId: string) => {
    setCheckingTxId(billId);
    try {
      const res = await checkBillStatus(billId);
      setToastMsg({ 
        message: `Status: ${res.status}! ${res.message || ''}`, 
        type: res.status === 'Success' ? 'success' : 'error' 
      });
    } catch (err: any) {
      setToastMsg({ message: err?.message || 'Failed to check status with UsePay.', type: 'error' });
    } finally {
      setCheckingTxId(null);
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  const currentBalance = apiBalance !== null ? apiBalance : (currentUser?.wallet_balance || 0);

  // Filter user bills and fund requests
  const userBills = bills.filter((b) => b.user_id === currentUser?.id);
  const userFundRequests = fundRequests.filter((r) => r.user_id === currentUser?.id);

  // Construct raw list of unified transactions
  const rawTransactions: Omit<UnifiedTransaction, 'runningBalance'>[] = [
    ...userBills.map((b) => {
      const parsed = parsePaymentMethod(b.payment_method);
      const ids = extractBillIdentifiers(b);
      return {
        id: b.id,
        date: b.created_at,
        type: 'debit' as const,
        refId: ids.bbpsRef || b.transaction_ref,
        amount: b.amount,
        status: b.status,
        description: `Credit Card Bill Pay (${b.bank_name} - ${b.card_number}) via ${parsed.method}`,
        clientTxnId: ids.orderId,
        bbpsRef: ids.bbpsRef,
      };
    }),
    ...userFundRequests.map((r) => ({
      id: r.id,
      date: r.created_at,
      type: 'credit' as const,
      refId: r.utr_number,
      amount: r.amount,
      status: r.status,
      description: `Wallet Load Request (UTR: ${r.utr_number})`
    }))
  ];

  // Sort chronologically from newest to oldest
  const sortedRaw = [...rawTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Backtrack from current balance to calculate running balances
  let balanceAccumulator = currentBalance;
  const unifiedTransactions: UnifiedTransaction[] = sortedRaw.map((tx) => {
    const runningBalance = balanceAccumulator;

    // Adjust accumulator backward in time
    const affectsBalance = 
      (tx.type === 'credit' && tx.status === 'approved') ||
      (tx.type === 'debit' && (tx.status === 'Success' || tx.status === 'Pending'));

    if (affectsBalance) {
      if (tx.type === 'credit') {
        balanceAccumulator -= tx.amount;
      } else {
        balanceAccumulator += tx.amount;
      }
    }

    return {
      ...tx,
      runningBalance
    };
  });

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

  // Filter unified transactions
  const filteredTransactions = unifiedTransactions.filter((tx) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      tx.refId.toLowerCase().includes(searchLower) ||
      (tx.clientTxnId && tx.clientTxnId.toLowerCase().includes(searchLower)) ||
      (tx.bbpsRef && tx.bbpsRef.toLowerCase().includes(searchLower)) ||
      tx.description.toLowerCase().includes(searchLower) ||
      tx.status.toLowerCase().includes(searchLower) ||
      tx.amount.toString().includes(searchTerm);

    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesDate = checkDateMatch(tx.date);

    return matchesSearch && matchesType && matchesDate;
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
    const headers = ['Date & Time', 'Reference ID / UTR', 'Description', 'Transaction Type', 'Amount (INR)', 'Status', 'Running Balance (INR)'];
    const rows = filteredTransactions.map((tx) => [
      new Date(tx.date).toLocaleString('en-IN'),
      tx.refId,
      tx.description,
      tx.type === 'credit' ? 'Deposit (Inflow)' : 'Debit (Outflow)',
      tx.amount,
      tx.status,
      tx.runningBalance
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ZentoPay_Statement_${currentUser?.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn shadow-xl ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <span>{toastMsg.message}</span>
          <button onClick={() => setToastMsg(null)} className="text-slate-400 hover:text-white ml-2 text-xs">✕</button>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-400" />
            <span>Account Statement</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            View unified credit/debit activity history, running balances, and export records.
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
        {/* Total Inflow */}
        <div className="p-4 rounded-xl glass-card border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Inflow (Deposits)</span>
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

        {/* Total Outflow */}
        <div className="p-4 rounded-xl glass-card border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Outflow (Payments)</span>
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

        {/* Net Flow */}
        <div className="p-4 rounded-xl glass-card border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Net Flow / Difference</span>
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
              placeholder="Search reference, bank, card, or desc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-end">
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

      {/* Transaction Ledger Table */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Ref ID / UTR</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.map((tx) => {
                const affectsBalance = 
                  (tx.type === 'credit' && tx.status === 'approved') ||
                  (tx.type === 'debit' && (tx.status === 'Success' || tx.status === 'Pending'));

                return (
                  <tr key={`${tx.type}-${tx.id}`} className="hover:bg-slate-800/30 transition-colors">
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

                    {/* Reference / UTR */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {tx.type === 'debit' ? (
                        <div className="flex flex-col gap-1">
                          {tx.clientTxnId && (
                            <div className="flex items-center gap-1.5 group/ord">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30 shrink-0">
                                ORDER
                              </span>
                              <span className="text-violet-200 font-semibold select-all text-xs">
                                {tx.clientTxnId}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(tx.clientTxnId!, `st-ord-${tx.id}`)}
                                title="Copy Order ID"
                                className="opacity-60 hover:opacity-100 transition-opacity p-0.5 text-violet-400 hover:text-white"
                              >
                                {copiedId === `st-ord-${tx.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          )}
                          {tx.bbpsRef && (
                            <div className="flex items-center gap-1.5 group/bbps">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                                BBPS
                              </span>
                              <span className="text-emerald-200 font-semibold select-all text-xs">
                                {tx.bbpsRef}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(tx.bbpsRef!, `st-bbps-${tx.id}`)}
                                title="Copy BBPS Ref"
                                className="opacity-60 hover:opacity-100 transition-opacity p-0.5 text-emerald-400 hover:text-white"
                              >
                                {copiedId === `st-bbps-${tx.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                              </button>
                            </div>
                          )}
                          {!tx.clientTxnId && !tx.bbpsRef && (
                            <span className="text-indigo-400 font-semibold text-xs select-all">
                              {tx.refId}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group/utr">
                          <span className="font-bold text-xs text-slate-200 select-all">{tx.refId}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(tx.refId, `st-utr-${tx.id}`)}
                            title="Copy UTR"
                            className="opacity-60 hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-white"
                          >
                            {copiedId === `st-utr-${tx.id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>

                    {/* Type Badge */}
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
                    <td className="py-3.5 px-4 font-mono font-bold">
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
                          <span>Success</span>
                        </span>
                      ) : tx.status === 'pending' || tx.status === 'Pending' ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                            <Clock className="h-3 w-3" />
                            <span>Pending</span>
                          </span>
                          {tx.type === 'debit' && (
                            <button
                              type="button"
                              onClick={() => handleCheckStatus(tx.id)}
                              disabled={checkingTxId === tx.id}
                              title="Check Live Status with UsePay API"
                              className="p-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all hover:scale-105 inline-flex items-center"
                            >
                              <RefreshCw className={`h-3 w-3 ${checkingTxId === tx.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="h-3 w-3" />
                            <span>Failed</span>
                          </span>
                          {tx.type === 'debit' && (
                            <button
                              type="button"
                              onClick={() => handleCheckStatus(tx.id)}
                              disabled={checkingTxId === tx.id}
                              title="Re-check Live Status with UsePay API"
                              className="p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all hover:scale-105 inline-flex items-center"
                            >
                              <RefreshCw className={`h-3 w-3 ${checkingTxId === tx.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Running Balance */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      {affectsBalance ? (
                        `₹${tx.runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span className="text-slate-500 italic font-normal text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
