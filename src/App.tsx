import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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
  const { currentUser, role, maintenance, logout } = useAuth();
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

        <main className="flex-1 px-4 sm:px-16 lg:px-24 py-8 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto w-full">
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
