import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  CreditCard, Zap, Phone, Flame, Droplets, Tv, Wifi, Car, DollarSign, 
  Receipt, Save, RefreshCw, AlertCircle, CheckCircle2, Sliders, Eye, EyeOff 
} from 'lucide-react';

export const CategorySettings: React.FC = () => {
  const PRESET_CATEGORIES = [
    "Credit Card",
    "Electricity",
    "Mobile Postpaid",
    "Mobile Prepaid",
    "LPG Gas",
    "Gas",
    "Water",
    "DTH",
    "Broadband Postpaid",
    "Landline Postpaid",
    "Fastag",
    "Loan Repayment",
    "Insurance",
    "Cable TV",
    "EV Recharge",
    "Fleet Card Recharge",
    "Education Fees",
    "Housing Society",
    "Municipal Services",
    "Municipal Taxes",
    "NCMC Recharge",
    "National Pension System",
    "Prepaid Meter",
    "Rental",
    "Subscription",
    "Clubs and Associations",
    "Donation",
    "Forex",
    "Agent Collection",
    "eChallan"
  ];

  const getCategoryIcon = (category: string) => {
    const clean = category.toLowerCase();
    if (clean.includes('card')) return CreditCard;
    if (clean.includes('elect')) return Zap;
    if (clean.includes('phone') || clean.includes('mobile')) return Phone;
    if (clean.includes('gas') || clean.includes('flame') || clean.includes('lpg')) return Flame;
    if (clean.includes('water')) return Droplets;
    if (clean.includes('dth') || clean.includes('tv')) return Tv;
    if (clean.includes('broadband') || clean.includes('wifi')) return Wifi;
    if (clean.includes('fastag') || clean.includes('car')) return Car;
    if (clean.includes('loan') || clean.includes('repay')) return DollarSign;
    return Receipt;
  };

  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings from Supabase
  useEffect(() => {
    const loadSettings = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'category_settings')
          .single();

        if (!error && data && data.value) {
          const fetchedToggles = data.value as Record<string, boolean>;
          // Fill missing ones as true
          const normalized: Record<string, boolean> = {};
          PRESET_CATEGORIES.forEach(cat => {
            normalized[cat] = typeof fetchedToggles[cat] !== 'undefined' ? fetchedToggles[cat] : true;
          });
          setToggles(normalized);
        } else {
          // Initialize all to true
          const initial: Record<string, boolean> = {};
          PRESET_CATEGORIES.forEach(cat => {
            initial[cat] = true;
          });
          setToggles(initial);
        }
      } catch (err) {
        console.warn('Failed to load category settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isSupabaseConfigured, supabase]);

  // Handle Toggle Switch Change
  const handleToggle = (category: string) => {
    setToggles(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Enable/Disable All Toggles helper
  const handleToggleAll = (status: boolean) => {
    const updated: Record<string, boolean> = {};
    PRESET_CATEGORIES.forEach(cat => {
      updated[cat] = status;
    });
    setToggles(updated);
  };

  // Save Settings to Supabase
  const handleSaveSettings = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setMessage({ type: 'error', text: 'Supabase is not configured!' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'category_settings',
          value: toggles,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Category settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Category Visibility Control</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Admin System Settings
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Toggle which bill payment categories are visible to users in their portal. Disabled categories will be hidden instantly.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={() => handleToggleAll(true)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-all"
          >
            Enable All
          </button>
          <button
            type="button"
            onClick={() => handleToggleAll(false)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-all"
          >
            Disable All
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-semibold ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-rose-400" />}
          <span>{message.text}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
          <p className="text-xs">Loading category configuration from Supabase...</p>
        </div>
      ) : (
        <div className="glass-panel p-6 border border-slate-800 rounded-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Categories Config Manager</h3>
                <p className="text-xs text-slate-400">Configure client portal grid layout visibility</p>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0"
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {PRESET_CATEGORIES.map(cat => {
              const IconComponent = getCategoryIcon(cat);
              const isActive = toggles[cat] !== false; // default true
              return (
                <div 
                  key={cat} 
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    isActive 
                      ? 'bg-slate-900/40 border-slate-800 text-slate-200' 
                      : 'bg-slate-950/20 border-slate-900/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-slate-600'}`}>
                      <IconComponent className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold truncate">{cat}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle(cat)}
                    className={`p-2 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                    }`}
                    title={isActive ? 'Deactivate Category' : 'Activate Category'}
                  >
                    {isActive ? <Eye className="h-4.5 w-4.5" /> : <EyeOff className="h-4.5 w-4.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
