import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Wrench, ShieldCheck, Mail, Clock, RefreshCw, Sparkles } from 'lucide-react';

interface MaintenancePageProps {
  onAdminBypass?: () => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ onAdminBypass }) => {
  const { maintenance, refreshData } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Animated Glow Spheres */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-glow" />

      <div className="max-w-xl w-full text-center relative z-10 glass-panel p-8 sm:p-12 border border-slate-800 shadow-2xl">
        {/* Animated Icon Badge */}
        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 mb-6 shadow-xl shadow-amber-500/10">
          <Wrench className="h-10 w-10 animate-bounce" />
        </div>

        {/* Title & Status */}
        <div className="flex items-center justify-center space-x-2 mb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">System Status Notice</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
          Under Maintenance
        </h1>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
          {maintenance.message || 'ZentoPay is currently undergoing scheduled infrastructure upgrades to enhance bill payment security and processing speeds.'}
        </p>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-3">
            <Clock className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Estimated Completion</p>
              <p className="text-sm font-bold text-slate-200">{maintenance.eta || '30 - 45 Minutes'}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center space-x-3">
            <Sparkles className="h-5 w-5 text-indigo-400 shrink-0" />
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Services Affected</p>
              <p className="text-sm font-bold text-slate-200">Credit Card Bill Pay</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => refreshData()}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Check Status</span>
          </button>

          <a
            href="mailto:support@zentopay.com"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-sm transition-all flex items-center justify-center space-x-2"
          >
            <Mail className="h-4 w-4" />
            <span>Contact Support</span>
          </a>
        </div>

        {/* Admin Bypass Link */}
        {onAdminBypass && (
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <button
              onClick={onAdminBypass}
              className="text-xs text-slate-400 hover:text-indigo-400 flex items-center justify-center space-x-1.5 mx-auto transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <span>Admin Login / Access Switcher</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
