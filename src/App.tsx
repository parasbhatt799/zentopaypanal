import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { X, Camera, User } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserList } from './pages/UserList';
import { UserDashboard } from './pages/UserDashboard';
import { CreditCardBillPay } from './pages/CreditCardBillPay';
import { MaintenancePage } from './pages/MaintenancePage';
import { ForceChangePassword } from './pages/ForceChangePassword';
import { CategorySettings } from './pages/CategorySettings';
import { BillerSettings } from './pages/BillerSettings';
import { BannerSettings } from './pages/BannerSettings';
import { ChangePassword } from './pages/ChangePassword';
import { AdminPaymentHistory } from './pages/AdminPaymentHistory';
import { AdminFundHistory } from './pages/AdminFundHistory';
import { AdminStatement } from './pages/AdminStatement.tsx';
import { StarryBackground } from './components/StarryBackground';
import { UserFundRequest } from './pages/UserFundRequest';
import { AdminSettings } from './pages/AdminSettings';
import { UserBillHistory } from './pages/UserBillHistory';
import { UserStatement } from './pages/UserStatement.tsx';

const AppContent: React.FC = () => {
  const { currentUser, role, maintenance, logout, isProfileModalOpen, setIsProfileModalOpen, updateUser } = useAuth();
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
  const [currentTab, setCurrentTab] = React.useState<string>(() => {
    return localStorage.getItem('zentopay_current_tab') || 'admin-dashboard';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState<boolean>(() => {
    return window.innerWidth < 1024;
  });

  const [forceDesktopMode, setForceDesktopMode] = React.useState<boolean>(() => {
    const saved = localStorage.getItem('zentopay_force_desktop');
    return saved === null ? true : saved === 'true';
  });

  React.useEffect(() => {
    localStorage.setItem('zentopay_current_tab', currentTab);
  }, [currentTab]);

  React.useEffect(() => {
    localStorage.setItem('zentopay_force_desktop', String(forceDesktopMode));
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      if (forceDesktopMode) {
        viewport.setAttribute('content', 'width=1280, initial-scale=0.3, maximum-scale=3.0, user-scalable=yes');
      } else {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    }
  }, [forceDesktopMode]);

  // 1. Unauthenticated -> Show Login Page
  if (!currentUser || !role) {
    return <Login />;
  }

  // 2. Compulsory Password Change on First-Time Login
  if (currentUser.password_change_required) {
    return <ForceChangePassword />;
  }

  // 3. User Panel + Maintenance Mode Active -> Show Under Maintenance Page
  if (role === 'user' && maintenance.enabled) {
    return <MaintenancePage onAdminBypass={logout} />;
  }

  // Set default tab on role switch if invalid
  if (role === 'admin' && !['admin-dashboard', 'user-list', 'admin-payment-history', 'admin-fund-history', 'category-settings', 'biller-settings', 'banner-settings', 'system-statement', 'admin-settings', 'change-password'].includes(currentTab)) {
    setCurrentTab('admin-dashboard');
  } else if (role === 'user' && !['user-dashboard', 'credit-card-bill', 'change-password', 'fund-request', 'bill-history', 'account-statement'].includes(currentTab)) {
    setCurrentTab('user-dashboard');
  }

  return (
    <div className={`h-screen bg-slate-950 flex text-slate-100 font-sans relative overflow-hidden ${
      forceDesktopMode ? 'flex-row' : 'flex-col lg:flex-row'
    }`}>
      {/* Constellation Starry Particle Background */}
      <StarryBackground />

      {/* Sidebar - starts from the very top/edge of screen */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (window.innerWidth < 1024 && !forceDesktopMode) {
            setSidebarCollapsed(true);
          }
        }} 
        collapsed={sidebarCollapsed} 
        forceDesktop={forceDesktopMode}
      />

      {/* Right Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <Navbar 
          activeTab={currentTab} 
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          forceDesktopMode={forceDesktopMode}
          onToggleDesktopMode={() => setForceDesktopMode(!forceDesktopMode)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto">
          <div className="w-full">
            {role === 'admin' && (
              <>
                {currentTab === 'admin-dashboard' && <AdminDashboard />}
                {currentTab === 'user-list' && <UserList />}
                {currentTab === 'admin-payment-history' && <AdminPaymentHistory />}
                {currentTab === 'admin-fund-history' && <AdminFundHistory />}
                {currentTab === 'category-settings' && <CategorySettings />}
                {currentTab === 'biller-settings' && <BillerSettings />}
                {currentTab === 'banner-settings' && <BannerSettings />}
                {currentTab === 'system-statement' && <AdminStatement />}
                {currentTab === 'admin-settings' && <AdminSettings />}
                {currentTab === 'change-password' && <ChangePassword />}
              </>
            )}

             {role === 'user' && (
              <>
                {currentTab === 'user-dashboard' && (
                  <UserDashboard onNavigateToPay={() => setCurrentTab('credit-card-bill')} />
                )}
                {currentTab === 'credit-card-bill' && <CreditCardBillPay />}
                {currentTab === 'change-password' && <ChangePassword />}
                {currentTab === 'fund-request' && <UserFundRequest />}
                {currentTab === 'bill-history' && <UserBillHistory />}
                {currentTab === 'account-statement' && <UserStatement />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Global My Profile Modal */}
      {isProfileModalOpen && currentUser && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150 text-slate-100">
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
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
