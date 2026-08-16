import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wrench, ShieldAlert, CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { maintenance, updateMaintenance } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsUpdating(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateMaintenance({
        ...maintenance,
        enabled: !maintenance.enabled
      });
      setSuccessMessage(`Maintenance Mode successfully ${!maintenance.enabled ? 'Enabled' : 'Disabled'}!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update settings');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800">
        <div className="flex items-center space-x-2">
          <Wrench className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            System Control
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure global platform settings, access controls, security policies, and system availability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side Settings Form Card */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800/60 pb-5">
              <div className="space-y-1 pr-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Maintenance Control</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Lock down User access to ZentoPay portal for updates or database synchronization. When active, only administrators can access system controls.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleToggle}
                disabled={isUpdating}
                className="relative cursor-pointer focus:outline-none transition-all shrink-0 self-center"
              >
                {maintenance.enabled ? (
                  <ToggleRight className="h-12 w-12 text-amber-500 hover:text-amber-400 transition-colors" />
                ) : (
                  <ToggleLeft className="h-12 w-12 text-slate-600 hover:text-slate-500 transition-colors" />
                )}
              </button>
            </div>

            {/* Status Information Box */}
            <div className={`p-4 rounded-xl border ${
              maintenance.enabled 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            } transition-all duration-300 flex items-start space-x-3`}>
              {maintenance.enabled ? (
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-bold uppercase tracking-wide">
                  Status: {maintenance.enabled ? 'Maintenance Active' : 'System Operational / Live'}
                </p>
                <p className={maintenance.enabled ? 'text-amber-300/80' : 'text-emerald-300/80'}>
                  {maintenance.enabled
                    ? 'All standard agent/client logins are blocked. Standard users will see the "Under Maintenance" screen.'
                    : 'All users can access dashboard portals, check balances, and pay credit card bills normally.'
                  }
                </p>
              </div>
            </div>

            {/* Form Actions Feedbacks */}
            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Settings Info Widget Card */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl glass-card border border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Settings Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-slate-400">Portal Version</span>
                <span className="text-white font-mono font-medium">v2.1.0</span>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-slate-400">Environment</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">Production</span>
              </div>
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-slate-400">B2B Gateway</span>
                <span className="text-white font-medium">UsePay Live API</span>
              </div>
              <div className="flex items-center justify-between text-xs py-2">
                <span className="text-slate-400">Sync Status</span>
                <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping inline-block mr-1" />
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
