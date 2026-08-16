import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  CreditCard, Save, RefreshCw, AlertCircle, CheckCircle2, Sliders, Eye, EyeOff, Search 
} from 'lucide-react';

const PRESET_CC_BILLERS = [
  { biller_id: "HDFCCARD00001", biller_name: "HDFC Bank Credit Card", category: "Credit Card" },
  { biller_id: "SBICARD000001", biller_name: "SBI Card", category: "Credit Card" },
  { biller_id: "ICICICARD0001", biller_name: "ICICI Bank Credit Card", category: "Credit Card" },
  { biller_id: "AXISCARD00001", biller_name: "Axis Bank Credit Card", category: "Credit Card" },
  { biller_id: "BOBCARD000001", biller_name: "BOB Card", category: "Credit Card" }
];

const getBillerLogoUrl = (billerName: string): string | null => {
  const name = billerName.toLowerCase();
  if (name.includes('au bank') || name.includes('au credit')) return '/logos/au-BGK_wavr.png';
  if (name.includes('axis bank') || name.includes('axis credit')) return '/logos/axis-Bgg9b_RG.png';
  if (name.includes('bandhan bank') || name.includes('bandhan credit')) return '/logos/bandhan-BuQvAAD6.png';
  if (name.includes('bob ') || name.includes('baroda') || name.includes(' baroda credit')) return '/logos/bob-B2dAmJmD.png';
  if (name.includes('boi ') || name.includes('bank of india') || name.includes('india credit')) return '/logos/boi-Bl_oOHHB.png';
  if (name.includes('canara bank') || name.includes('canara credit')) return '/logos/canara-B_SbmPQP.png';
  if (name.includes('csb bank') || name.includes('csb credit')) return '/logos/csb-fV039-_h.png';
  if (name.includes('federal bank') || name.includes('federal credit')) return '/logos/federal-D_3n-L-c.png';
  if (name.includes('hdfc') || name.includes('hdfc credit')) return '/logos/hdfc-Bb15t70L.png';
  if (name.includes('icici') || name.includes('icici credit')) return '/logos/icici-Bt1d_Kz7.png';
  if (name.includes('idbi bank') || name.includes('idbi credit')) return '/logos/idbi-CYT29G1C.png';
  if (name.includes('idfc') || name.includes('idfc credit')) return '/logos/idfc-B6B1v7Z3.png';
  if (name.includes('indusind') || name.includes('indusind credit')) return '/logos/indusind-B36KmA_H.png';
  if (name.includes('karnataka bank') || name.includes('karnataka credit')) return '/logos/karnataka-CYQ-190q.png';
  if (name.includes('kotak') || name.includes('kotak credit')) return '/logos/kotak-BnU9v9_f.png';
  if (name.includes('pnb ') || name.includes('punjab national') || name.includes('punjab credit')) return '/logos/pnb-Bu9v9_fa.png';
  if (name.includes('rbl ') || name.includes('ratnakar') || name.includes('rbl credit')) return '/logos/rbl-C_Tv90qa.png';
  if (name.includes('sbi') || name.includes('state bank of india') || name.includes('sbi credit')) return '/logos/sbi-C1v79_ab.png';
  if (name.includes('south indian bank') || name.includes('south indian credit')) return '/logos/sib-CV190_aq.png';
  if (name.includes('yes bank') || name.includes('yes credit')) return '/logos/yes-B6B1v7Za.png';
  return null;
};

export const BillerSettings: React.FC = () => {
  const [billers, setBillers] = useState<any[]>(PRESET_CC_BILLERS);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load Credit Card Billers & Toggle Settings
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      let ccBillers = [...PRESET_CC_BILLERS];

      // 1. Try loading CC billers from Supabase 'billers' table
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('billers')
            .select('*')
            .ilike('category', 'Credit Card');

          if (!error && data && data.length > 0) {
            // Filter to make sure it includes 'card'
            const dbCc = data.filter(b => b.biller_name.toLowerCase().includes('card'));
            if (dbCc.length > 0) {
              ccBillers = dbCc;
            }
          }
        } catch (dbErr) {
          console.warn('Failed to load database billers:', dbErr);
        }
      }

      setBillers(ccBillers);

      // 2. Load toggles config from system_settings
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'credit_card_biller_settings')
            .single();

          if (!error && data && data.value) {
            const fetched = data.value as Record<string, boolean>;
            const normalized: Record<string, boolean> = {};
            ccBillers.forEach(b => {
              normalized[b.biller_id] = typeof fetched[b.biller_id] !== 'undefined' ? fetched[b.biller_id] : true;
            });
            setToggles(normalized);
          } else {
            // Default all to true
            const initial: Record<string, boolean> = {};
            ccBillers.forEach(b => {
              initial[b.biller_id] = true;
            });
            setToggles(initial);
          }
        } catch (err) {
          console.warn('Failed to load biller settings:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Localstorage fallback for local testing
        try {
          const stored = localStorage.getItem('zentopay_cc_biller_settings');
          const fetched = stored ? JSON.parse(stored) : {};
          const initial: Record<string, boolean> = {};
          ccBillers.forEach(b => {
            initial[b.biller_id] = typeof fetched[b.biller_id] !== 'undefined' ? fetched[b.biller_id] : true;
          });
          setToggles(initial);
        } catch {
          const initial: Record<string, boolean> = {};
          ccBillers.forEach(b => {
            initial[b.biller_id] = true;
          });
          setToggles(initial);
        }
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleToggle = (billerId: string) => {
    setToggles(prev => ({
      ...prev,
      [billerId]: !prev[billerId]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: 'credit_card_biller_settings',
            value: toggles,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });

        if (error) throw error;
        setMessage({ type: 'success', text: 'Biller visibility settings updated successfully!' });
      } catch (err: any) {
        console.error('Failed to save biller settings:', err);
        setMessage({ type: 'error', text: err.message || 'Failed to save settings to database.' });
      } finally {
        setIsSaving(false);
      }
    } else {
      // Local fallback
      localStorage.setItem('zentopay_cc_biller_settings', JSON.stringify(toggles));
      setMessage({ type: 'success', text: 'Settings saved locally!' });
      setIsSaving(false);
    }
  };

  const filteredBillers = billers.filter(b => 
    b.biller_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.biller_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Credit Card Biller Controls</h1>
          <p className="text-xs text-slate-400 mt-1">
            Toggle visibility of credit card billers. Disabled billers will not appear in user dropdowns.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center"
            title="Refresh list"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Search and Filter */}
      <div className="glass-panel p-4 border border-slate-800 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Credit Card Biller..."
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs"
          />
        </div>
      </div>

      {/* Billers list */}
      <div className="glass-panel p-6 border border-slate-800">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
            <p className="text-xs text-slate-400">Loading billers and configurations...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBillers.map((b) => {
              const isBillerActive = toggles[b.biller_id] !== false;
              const logo = getBillerLogoUrl(b.biller_name);
              
              return (
                <div 
                  key={b.biller_id} 
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                    isBillerActive 
                      ? 'bg-slate-900/40 border-slate-800 hover:border-slate-700' 
                      : 'bg-slate-950/20 border-slate-900/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Biller Logo */}
                    <div className="h-9 w-9 bg-white border shadow-sm rounded-lg flex items-center justify-center shrink-0 p-1">
                      {logo ? (
                        <img 
                          src={logo} 
                          alt={b.biller_name} 
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <CreditCard className="h-5 w-5 text-slate-400" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-100 text-xs tracking-wide">{b.biller_name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{b.biller_id}</p>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <button
                    onClick={() => handleToggle(b.biller_id)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isBillerActive ? 'bg-indigo-600' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isBillerActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
            
            {filteredBillers.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-slate-500">
                No Credit Card billers match your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
