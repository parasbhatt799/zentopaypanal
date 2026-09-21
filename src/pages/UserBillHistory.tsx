import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { CreditCardBill } from '../types';
import { parsePaymentMethod } from './CreditCardBillPay';
import { 
  Receipt, Search, Clock, CheckCircle2, XCircle, 
  History, Calendar, Filter, FileText, ChevronRight, X, RefreshCw 
} from 'lucide-react';

export const UserBillHistory: React.FC = () => {
  const { currentUser, bills, checkBillStatus } = useAuth();
  
  const userBills = bills.filter((b) => b.user_id === currentUser?.id);
  const [checkingBillId, setCheckingBillId] = useState<string | null>(null);
  const [historyToast, setHistoryToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);



  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Success' | 'Pending' | 'Failed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom' | 'all'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [receiptBill, setReceiptBill] = useState<CreditCardBill | null>(null);

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

  // Calculated metrics based on active date filter
  const dateFilteredBills = userBills.filter(b => checkDateMatch(b.created_at));
  const successCount = dateFilteredBills.filter(b => b.status === 'Success').length;
  const successAmount = dateFilteredBills
    .filter(b => b.status === 'Success')
    .reduce((acc, b) => acc + b.amount, 0);
  const pendingCount = dateFilteredBills.filter(b => b.status === 'Pending').length;
  const pendingAmount = dateFilteredBills
    .filter(b => b.status === 'Pending')
    .reduce((acc, b) => acc + b.amount, 0);
  const failedCount = dateFilteredBills.filter(b => b.status === 'Failed').length;
  const failedAmount = dateFilteredBills
    .filter(b => b.status === 'Failed')
    .reduce((acc, b) => acc + b.amount, 0);

  // Filter bills
  const filteredUserBills = userBills.filter((b) => {
    const parsed = parsePaymentMethod(b.payment_method);
    const matchesSearch =
      b.transaction_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.card_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsed.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsed.billerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parsed.mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.amount.toString().includes(searchTerm) ||
      b.status.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesDate = checkDateMatch(b.created_at);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleCheckBillStatus = async (billId: string) => {
    setCheckingBillId(billId);
    try {
      const res = await checkBillStatus(billId);
      setHistoryToast({
        message: `Status: ${res.status}! ${res.message || ''}`,
        type: res.status === 'Success' ? 'success' : 'error',
      });
      if (receiptBill && receiptBill.id === billId) {
        const updated = bills.find(b => b.id === billId);
        if (updated) setReceiptBill(updated);
        else setReceiptBill(prev => prev ? { ...prev, status: res.status } : null);
      }
    } catch (err: any) {
      setHistoryToast({ message: err?.message || 'Failed to check status with UsePay.', type: 'error' });
    } finally {
      setCheckingBillId(null);
      setTimeout(() => setHistoryToast(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {historyToast && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn shadow-xl ${
          historyToast.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <span>{historyToast.message}</span>
          <button onClick={() => setHistoryToast(null)} className="text-slate-400 hover:text-white ml-2 text-xs">✕</button>
        </div>
      )}

      {/* Header Panel */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800">
        <div className="flex items-center space-x-2">
          <History className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Bill History</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Payment Log
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Track, search, and generate invoice receipts for credit cards and custom utility bill payments.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="text-xs text-slate-400 font-medium">Successful Payments</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5 font-mono">
            ₹{successAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-1 font-semibold">{successCount} Bills Paid</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="text-xs text-slate-400 font-medium">Pending Payments</div>
          <div className="text-2xl font-bold text-amber-400 mt-1.5 font-mono">
            ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-amber-500/80 mt-1 font-semibold">{pendingCount} Bills Processing</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md">
          <div className="text-xs text-slate-400 font-medium">Failed Payments</div>
          <div className="text-2xl font-bold text-rose-400 mt-1.5 font-mono">
            ₹{failedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-1 font-semibold">{failedCount} Failed Attempts</div>
        </div>
      </div>

      {/* Transaction History Log Table */}
      <div className="glass-panel p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Your Payment History</h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            {filteredUserBills.length} Bill Transactions
          </span>
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
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
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

        <div className="overflow-x-auto">
          {filteredUserBills.length === 0 ? (
            <div className="text-center py-8 text-slate-500 space-y-2">
              <FileText className="h-8 w-8 mx-auto opacity-40" />
              <p className="text-xs">No bill payment transactions found for this selection.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Biller ID</th>
                  <th className="py-3 px-4">Customer Mobile</th>
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Card Issuer / Bank</th>
                  <th className="py-3 px-4">Card Number</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUserBills.map((b) => {
                  const parsed = parsePaymentMethod(b.payment_method);
                  return (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {new Date(b.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{parsed.billerId}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{parsed.mobile}</td>
                      <td className="py-3 px-4 font-mono text-indigo-400 font-semibold text-xs">
                        <div>{b.transaction_ref}</div>
                        {(b.client_transaction_id || parsed.clientTxnId) && (b.client_transaction_id || parsed.clientTxnId) !== b.transaction_ref && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5">Order: {b.client_transaction_id || parsed.clientTxnId}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{b.bank_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{b.card_number}</td>
                      <td className="py-3 px-4 font-bold text-white font-mono">
                        ₹{b.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{parsed.method}</td>
                      <td className="py-3 px-4">
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
                              onClick={() => handleCheckBillStatus(b.id)}
                              disabled={checkingBillId === b.id}
                              title="Check Live Status with UsePay API"
                              className="p-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all hover:scale-105 inline-flex items-center"
                            >
                              <RefreshCw className={`h-3 w-3 ${checkingBillId === b.id ? 'animate-spin' : ''}`} />
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
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setReceiptBill(b)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-[11px] inline-flex items-center space-x-1 border border-slate-700 transition-all"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {receiptBill && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full glass-panel p-6 border shadow-2xl relative ${
            receiptBill.status === 'Success' ? 'border-emerald-500/30' :
            receiptBill.status === 'Pending' ? 'border-amber-500/30' : 'border-rose-500/30'
          }`}>
            {/* Close button top right */}
            <button 
              onClick={() => setReceiptBill(null)}
              className="absolute right-4 top-4 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

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
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Payment Gateway</span>
                <span className="text-slate-300">{parsePaymentMethod(receiptBill.payment_method).method}</span>
              </div>
              {parsePaymentMethod(receiptBill.payment_method).clientTxnId && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Client Order ID</span>
                  <span className="font-mono text-indigo-300 font-semibold text-[11px]">{parsePaymentMethod(receiptBill.payment_method).clientTxnId}</span>
                </div>
              )}
            </div>

            {receiptBill.status === 'Pending' && (
              <button
                type="button"
                onClick={() => handleCheckBillStatus(receiptBill.id)}
                disabled={checkingBillId === receiptBill.id}
                className="mt-4 w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/20"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${checkingBillId === receiptBill.id ? 'animate-spin' : ''}`} />
                <span>Check Live Status (સ્ટેટસ તપાસો)</span>
              </button>
            )}

            <button
              onClick={() => setReceiptBill(null)}
              className="mt-4 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/30"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBillHistory;
