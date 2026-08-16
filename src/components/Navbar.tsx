import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, AlertTriangle, Zap, Sun, Moon, Menu } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, sidebarCollapsed = false, onToggleSidebar }) => {
  const { currentUser, role, logout, maintenance, theme, toggleTheme } = useAuth();
  const [apiBalance, setApiBalance] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.x_api_key || !currentUser?.x_secret_key) {
      setApiBalance(null);
      setApiError(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const response = await fetch('https://www.usepay.in/api/v1/b2b/balance', {
          headers: {
            'x-api-key': currentUser.x_api_key || '',
            'x-secret-key': currentUser.x_secret_key || ''
          }
        });
        const res = await response.json();
        if (res.status === 'success' && res.data && typeof res.data.balance !== 'undefined') {
          setApiBalance(Number(res.data.balance));
          setApiError(null);
        } else {
          setApiError(res.message || 'API Error');
        }
      } catch (err: any) {
        console.warn('Failed to fetch API balance:', err);
        setApiError('CORS/Connection Error');
      }
    };

    fetchBalance();

    // Refresh every 15 seconds
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.x_api_key, currentUser?.x_secret_key]);

  return (
    <header className="sticky top-0 z-40 bg-white/5 dark:bg-slate-950/20 backdrop-blur-xl border-b border-slate-800/40 px-4 lg:px-8 py-3 transition-all duration-300">
      <div className="flex items-center justify-between w-full">
        {/* Sidebar Toggle Hamburger */}
        <button
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:border-indigo-500/30 transition-all duration-200 flex items-center justify-center cursor-pointer"
        >
          <Menu className="h-4.5 w-4.5 text-indigo-400" />
        </button>

        {/* Center Banner: Maintenance Notification Indicator */}
        {maintenance.enabled && (
          <div className="hidden md:flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-amber-400 text-xs animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="font-medium">Under Maintenance Mode Active</span>
          </div>
        )}

        {/* Right Section: Database Status & Auth User Info */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:border-indigo-500/30 transition-all duration-200 flex items-center justify-center"
          >
            {theme === 'light' ? <Moon className="h-4.5 w-4.5 text-indigo-400" /> : <Sun className="h-4.5 w-4.5 text-amber-400" />}
          </button>

          {/* Live API Balance Badge */}
          {role !== 'admin' && (
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-semibold shadow-md">
              <Zap className="h-3.5 w-3.5 text-indigo-400" />
              <span>
                {!currentUser?.x_api_key || !currentUser?.x_secret_key
                  ? 'API Bal: Setup Keys'
                  : apiError
                    ? `API Bal: ${apiError}`
                    : apiBalance !== null
                      ? `API Bal: ₹${apiBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : 'API Bal: Loading...'}
              </span>
            </div>
          )}

          {/* User Profile */}
          {currentUser && (
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${role === 'admin'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                {role === 'admin' ? 'Admin' : 'User'}
              </span>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                  {role === 'admin' ? <Shield className="h-4 w-4 text-purple-400" /> : <User className="h-4 w-4 text-emerald-400" />}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium text-slate-200 leading-tight">{currentUser.full_name}</p>
                  <p className="text-[10px] text-slate-400">{currentUser.email}</p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
