import React from 'react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';
import logoIconImg from '../assets/logo_icon.png';
import { LayoutDashboard, Users, CreditCard, Wrench, ChevronRight, AlertOctagon, Sliders, Image, Lock, Banknote, Zap, History, FileText } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  collapsed?: boolean;
  forceDesktop?: boolean;
}

const BBPSIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 204.63 225"
    fill="currentColor"
    {...props}
  >
    <g>
      <path d="M151.52,67.21c0,2.03-0.07,4.01-0.19,5.92c-0.13,1.9-0.54,4.41-1.22,7.53c-0.69,3.11-1.59,5.98-2.72,8.58c-1.12,2.6-2.78,5.34-4.97,8.2c-2.19,2.86-4.79,5.24-7.79,7.15c-3,1.9-6.82,3.49-11.45,4.77c-4.63,1.27-9.82,1.91-15.58,1.91H61.91c-3.38,0-6.12-2.78-6.12-6.21V87.55h0.02c7.06,0,15.96,0,25.26-0.01h27.76c3.55,0,6.24-1.78,7.57-5.01c1.31-3.18,0.69-6.3-1.77-8.82c-8.72-8.91-17.53-17.84-25.76-26.18c-1.89-1.92-4.25-2.71-6.82-2.28c-3.13,0.53-5.31,2.39-6.3,5.37c-1.02,3.1-0.35,5.98,1.95,8.34c3.37,3.44,6.76,6.87,10.32,10.45l1.94,1.97H55.79l-0.01-43.76c0.01-3.42,2.74-6.2,6.11-6.2h45.7c12.39,0,22.81,4.1,31.25,12.3C147.29,41.94,151.52,53.1,151.52,67.21z" />
      <path d="M151.52,160.17c0,2.03-0.07,4.01-0.19,5.92c-0.13,1.9-0.54,4.41-1.22,7.53c-0.69,3.11-1.59,5.98-2.72,8.58c-1.12,2.6-2.78,5.34-4.97,8.2c-2.19,2.86-4.79,5.24-7.79,7.15c-3,1.9-6.82,3.49-11.45,4.77c-4.63,1.27-9.82,1.91-15.58,1.91H61.91c-3.38,0-6.12-2.78-6.12-6.21v-8.87l-0.01-68.53c0.01-3.42,2.74-6.2,6.11-6.2h45.7c12.39,0,22.81,4.1,31.25,12.3c3.63,3.53,6.48,7.59,8.55,12.21c-6.43,0-14.4,0-22.83,0.01H94.18c-3.55,0-6.24,1.78-7.58,5.01c-1.31,3.18-0.68,6.31,1.78,8.82c8.66,8.84,17.5,17.81,25.76,26.18c1.56,1.58,3.42,2.39,5.46,2.39c0.45,0,0.9-0.04,1.36-0.12c3.13-0.53,5.31-2.39,6.3-5.38c1.02-3.1,0.35-5.97-1.96-8.33c-3.37-3.45-6.76-6.88-10.32-10.47l-1.92-1.95h38.27C151.45,156.73,151.52,158.43,151.52,160.17z" />
    </g>
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, collapsed = false, forceDesktop = false }) => {
  const { role, maintenance, updateMaintenance } = useAuth();

  const adminMenuItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'user-list', label: 'User List', icon: Users },
    { id: 'admin-payment-history', label: 'Payment History', icon: CreditCard },
    { id: 'admin-fund-history', label: 'Fund History', icon: Banknote },
    { id: 'category-settings', label: 'Bill Categories', icon: Sliders },
    { id: 'banner-settings', label: 'Ad Banners', icon: Image },
    { id: 'system-statement', label: 'System Statement', icon: FileText },
    { id: 'admin-settings', label: 'System Settings', icon: Wrench },
    { id: 'change-password', label: 'Change Password', icon: Lock },
  ];

  const userMenuItems = [
    { id: 'user-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'credit-card-bill', label: 'Bill Payment', icon: BBPSIcon },
    { id: 'fund-request', label: 'Fund Request', icon: Banknote },
    { id: 'bill-history', label: 'Bill History', icon: History },
    { id: 'account-statement', label: 'Account Statement', icon: FileText },
    { id: 'change-password', label: 'Change Password', icon: Lock },
  ];

  const menuItems = role === 'admin' ? adminMenuItems : userMenuItems;

  return (
    <aside className={`sidebar-aside shrink-0 flex flex-col justify-between bg-slate-900/60 backdrop-blur-lg border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-4 transition-all duration-300 ${
      forceDesktop
        ? (collapsed ? 'flex w-20' : 'flex w-64')
        : (collapsed ? 'hidden lg:flex lg:w-20' : 'flex w-full lg:w-64')
    }`}>
      {/* Brand Logo & Panel Identity */}
      <div className={`flex items-center border-b border-slate-800/40 shrink-0 transition-all duration-300 ${
        collapsed ? 'justify-center px-2' : 'justify-start px-4'
      }`} style={{ height: '61px' }}>
        <img 
          src={collapsed ? logoIconImg : logoImg} 
          alt="ZentoPay Logo" 
          className={`object-contain transition-all duration-300 ${
            collapsed ? 'h-11 w-11' : 'h-[60px]'
          }`} 
        />
      </div>

      <div className={`flex-1 pt-4 overflow-y-auto transition-all duration-300 ${collapsed ? 'px-2' : 'px-4'}`}>
        {/* Menu Navigation List */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-xl font-medium text-sm transition-all duration-200 ${
                  collapsed ? 'justify-center py-3 px-0' : 'justify-between py-3 px-3.5'
                } ${isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className={`flex items-center ${collapsed ? 'space-x-0 justify-center' : 'space-x-3'}`}>
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className={`transition-all duration-200 ${collapsed ? (forceDesktop ? 'hidden' : 'lg:hidden') : 'block'}`}>
                    {item.label}
                  </span>
                </div>
                {isActive && !collapsed && <ChevronRight className="h-4 w-4 text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
