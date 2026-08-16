import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, LogOut, AlertTriangle, Zap, Sun, Moon, Menu, Monitor, Smartphone, X, Camera } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  forceDesktopMode: boolean;
  onToggleDesktopMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  sidebarCollapsed = false, 
  onToggleSidebar,
  forceDesktopMode,
  onToggleDesktopMode
}) => {
  const { currentUser, role, logout, maintenance, theme, toggleTheme, updateUser } = useAuth();
  const [apiBalance, setApiBalance] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be under 5MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        await updateUser(currentUser.id, {
          first_name: currentUser.first_name || currentUser.full_name,
          middle_name: currentUser.middle_name,
          last_name: currentUser.last_name || '',
          phone: currentUser.phone || '',
          alt_phone: currentUser.alt_phone,
          address: currentUser.address,
          firm_address: currentUser.firm_address,
          reference: currentUser.reference,
          avatar_url: base64String,
          email: currentUser.email,
          role: currentUser.role,
          b2b_agent_id: currentUser.b2b_agent_id,
        });
      } catch (err: any) {
        console.error("Failed to upload profile picture:", err);
        alert("Failed to update profile picture.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!currentUser?.x_api_key || !currentUser?.x_secret_key) {
      setApiBalance(null);
      setApiError(null);
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
 
          {/* Desktop/Mobile Layout Toggle Button */}
          <button
            onClick={onToggleDesktopMode}
            title={forceDesktopMode ? 'Switch to Mobile View' : 'Switch to Desktop View'}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:border-indigo-500/30 transition-all duration-200 flex items-center justify-center cursor-pointer"
          >
            {forceDesktopMode ? (
              <Smartphone className="h-4.5 w-4.5 text-indigo-400" />
            ) : (
              <Monitor className="h-4.5 w-4.5 text-emerald-400" />
            )}
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

          {/* User Profile Area */}
          {currentUser && (
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${role === 'admin'
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                {role === 'admin' ? 'Admin' : 'User'}
              </span>
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity text-left cursor-pointer"
                title="View My Profile"
              >
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {currentUser.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    role === 'admin' ? <Shield className="h-4 w-4 text-purple-400" /> : <User className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium text-slate-200 leading-tight">{currentUser.full_name}</p>
                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">{currentUser.email}</p>
                </div>
              </button>

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

      {/* My Profile Modal */}
      {isProfileModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-white">My Profile</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">View details and update profile picture</p>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative h-20 w-20 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden cursor-pointer group shadow-lg"
                title="Click to change profile picture"
              >
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Avatar" className="h-full w-full object-cover transition-opacity group-hover:opacity-40" />
                ) : (
                  <User className="h-10 w-10 text-slate-500 transition-opacity group-hover:opacity-40" />
                )}
                
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40 text-white text-[9px] font-semibold">
                  <Camera className="h-4 w-4 mb-0.5 text-indigo-400" />
                  <span>Update</span>
                </div>

                {isUploading && (
                  <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                    <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarUpload} 
                className="hidden" 
                accept="image/*" 
              />
            </div>

            <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Full Name</span>
                  <span className="text-xs font-semibold text-slate-200">{currentUser.full_name}</span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">B2B Agent ID</span>
                  <span className="text-xs font-mono font-semibold text-indigo-400">{currentUser.b2b_agent_id || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Mobile Number</span>
                  <span className="text-xs font-mono font-semibold text-slate-200">{currentUser.phone || 'N/A'}</span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Alt Mobile</span>
                  <span className="text-xs font-mono font-semibold text-slate-200">{currentUser.alt_phone || 'N/A'}</span>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Email Address</span>
                <span className="text-xs font-semibold text-slate-200 text-ellipsis overflow-hidden block">{currentUser.email}</span>
              </div>

              {currentUser.role !== 'admin' && (
                <>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Account Role</span>
                      <span className="text-xs font-bold text-slate-200 capitalize">{currentUser.role}</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Reference / Broker</span>
                      <span className="text-xs font-semibold text-slate-200">{currentUser.reference || 'Self'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Resident Address</span>
                      <span className="text-xs font-semibold text-slate-200">{currentUser.address || 'N/A'}</span>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Firm Address</span>
                      <span className="text-xs font-semibold text-slate-200">{currentUser.firm_address || 'N/A'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="w-full mt-6 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all shadow-md"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
