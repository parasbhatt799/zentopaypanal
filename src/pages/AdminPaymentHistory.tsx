import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CheckCircle2, Clock, XCircle, Receipt, Search } from 'lucide-react';
import { parsePaymentMethod } from './CreditCardBillPay';

export const AdminPaymentHistory: React.FC = () => {
  const { bills, users } = useAuth();
  const [receiptBill, setReceiptBill] = useState<any | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Success' | 'Pending' | 'Failed'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom' | 'all'>('today');
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

  return (
    <div className="space-y-6">
      {/* Title Header */}
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
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
          Total {filteredBills.length} Transactions
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
              {filteredBills.map((b) => {
                const parsed = parsePaymentMethod(b.payment_method);
                const user = getUserInfo(b.user_id);
                return (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
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
                    <td className="py-3.5 px-4 font-mono text-indigo-400 font-semibold">{b.transaction_ref}</td>

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
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </span>
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
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-[11px] inline-flex items-center space-x-1 border border-slate-700 transition-all"
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
      </div>

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
              className="mt-6 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-600/30"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
