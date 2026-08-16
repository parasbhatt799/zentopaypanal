import React from 'react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { Users, DollarSign, CreditCard, Wrench, AlertTriangle, Activity } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { users, bills, fundRequests, maintenance, updateMaintenance } = useAuth();

  // Compute metrics
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.status === 'active').length;
  const totalVolume = bills.reduce((acc, b) => acc + (b.status === 'Success' ? b.amount : 0), 0);
  const totalBillsCount = bills.length;

  // Bill payment metrics
  const successBillsTotal = bills
    .filter((b) => b.status === 'Success')
    .reduce((acc, b) => acc + b.amount, 0);
  const pendingBillsTotal = bills
    .filter((b) => b.status === 'Pending')
    .reduce((acc, b) => acc + b.amount, 0);
  const failedBillsTotal = bills
    .filter((b) => b.status === 'Failed')
    .reduce((acc, b) => acc + b.amount, 0);

  // Fund request metrics
  const successFundsTotal = fundRequests
    .filter((r) => r.status === 'approved')
    .reduce((acc, r) => acc + r.amount, 0);
  const pendingFundsTotal = fundRequests
    .filter((r) => r.status === 'pending')
    .reduce((acc, r) => acc + r.amount, 0);
  const failedFundsTotal = fundRequests
    .filter((r) => r.status === 'rejected')
    .reduce((acc, r) => acc + r.amount, 0);

  const handleToggleMaintenance = () => {
    updateMaintenance({
      ...maintenance,
      enabled: !maintenance.enabled,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Master Dashboard</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            System Control
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Real-time management of user accounts, B2B Agent linking, credit card payments, and platform availability.
        </p>
      </div>

      {/* Under Maintenance Notice Alert if active */}
      {maintenance.enabled && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">System Maintenance Mode is Currently ON</p>
            <p className="text-amber-300/80">
              All non-admin users attempting to open the User Panel will see the Under Maintenance screen.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Users"
          value={totalUsersCount}
          subtitle={`${activeUsersCount} Active Accounts`}
          icon={Users}
          trend="+12%"
          color="indigo"
        />

        <StatCard
          title="Total Payments Volume"
          value={`₹${totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Processed CC Bills"
          icon={DollarSign}
          trend="+28%"
          color="emerald"
        />

        <StatCard
          title="Bill Transactions"
          value={totalBillsCount}
          subtitle="Successful & Pending"
          icon={CreditCard}
          color="purple"
        />

        <StatCard
          title="Maintenance Status"
          value={maintenance.enabled ? 'ENABLED' : 'ONLINE'}
          subtitle={maintenance.enabled ? 'Users Redirected' : 'Normal Operations'}
          icon={Activity}
          color="sky"
        />
      </div>

      {/* Bill Payments Section Header */}
      <div className="pt-4">
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
          Bill Payment Statistics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Success Bills Total"
            value={`₹${successBillsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle="Successfully Paid Credit Card Bills"
            icon={CreditCard}
            color="teal"
          />
          <StatCard
            title="Pending Bills Total"
            value={`₹${pendingBillsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle="Bills Awaiting Bank Settlement"
            icon={CreditCard}
            color="amber"
          />
          <StatCard
            title="Failed Bills Total"
            value={`₹${failedBillsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle="Rejected / Failed Bill Payments"
            icon={CreditCard}
            color="rose"
          />
        </div>
      </div>

      {/* Fund Requests Section Header */}
      <div className="pt-4">
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
          Fund Request Statistics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Success Funds Total"
            value={`₹${successFundsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle="Approved B2B Fund Requests"
            icon={DollarSign}
            color="blue"
          />
          <StatCard
            title="Pending Funds Total"
            value={`₹${pendingFundsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle="Awaiting Verification Fund Requests"
            icon={DollarSign}
            color="orange"
          />
          <StatCard
            title="Failed Funds Total"
            value={`₹${failedFundsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle="Rejected Fund Requests"
            icon={DollarSign}
            color="pink"
          />
        </div>
      </div>
    </div>
  );
};
