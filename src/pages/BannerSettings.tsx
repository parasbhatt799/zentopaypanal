import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Image, Plus, Trash2, AlertCircle, CheckCircle2, Link as LinkIcon } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
}

const PRESET_IMAGE_SUGGESTIONS = [
  { label: 'HDFC Cashback Promo', url: '/hdfc_promo.jpg' },
  { label: 'Unsplash Credit Card', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60' },
  { label: 'Unsplash Digital Pay', url: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=600&auto=format&fit=crop&q=60' }
];

export const BannerSettings: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('/hdfc_promo.jpg');
  const [newTargetUrl, setNewTargetUrl] = useState('/credit-card-bill');

  useEffect(() => {
    const fetchBanners = async () => {
      setIsLoading(true);
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'advertising_banners')
            .single();

          if (!error && data && data.value) {
            setBanners(data.value as Banner[]);
          } else {
            // Seed defaults if setting does not exist
            const defaults: Banner[] = [
              {
                id: '1',
                title: 'HDFC Bank Infinia Card',
                description: 'Get up to 10% CashBack on all utility payments.',
                imageUrl: '/hdfc_promo.jpg',
                targetUrl: '/credit-card-bill'
              },
              {
                id: '2',
                title: 'SBI Card Discount',
                description: 'Flat ₹500 discount on electricity and water bills.',
                imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=60',
                targetUrl: '/credit-card-bill'
              }
            ];
            setBanners(defaults);
          }
        } catch (err) {
          console.error('Error fetching banners:', err);
        }
      } else {
        // Mock fallback
        setBanners([
          {
            id: '1',
            title: 'HDFC Bank Infinia Card',
            description: 'Get up to 10% CashBack on all utility payments.',
            imageUrl: '/hdfc_promo.jpg',
            targetUrl: '/credit-card-bill'
          }
        ]);
      }
      setIsLoading(false);
    };

    fetchBanners();
  }, []);

  const handleSaveAll = async (updatedBanners: Banner[]) => {
    setIsSaving(true);
    setMessage({ text: '', type: '' });

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: 'advertising_banners',
            value: updatedBanners,
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });

        if (error) throw error;
        setMessage({ text: 'Advertising banners updated successfully!', type: 'success' });
      } catch (err: any) {
        setMessage({ text: err.message || 'Failed to save settings to database.', type: 'error' });
      }
    } else {
      setMessage({ text: 'Local demo: Banners updated in state (Database not connected).', type: 'success' });
    }
    setIsSaving(false);
  };

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newImageUrl.trim()) return;

    const newBanner: Banner = {
      id: Date.now().toString(),
      title: newTitle,
      description: newDescription,
      imageUrl: newImageUrl,
      targetUrl: newTargetUrl || '/credit-card-bill'
    };

    const newBanners = [...banners, newBanner];
    setBanners(newBanners);
    handleSaveAll(newBanners);

    // Clear form inputs
    setNewTitle('');
    setNewDescription('');
    setNewImageUrl('/hdfc_promo.jpg');
    setNewTargetUrl('/credit-card-bill');
  };

  const handleDeleteBanner = (id: string) => {
    const newBanners = banners.filter(b => b.id !== id);
    setBanners(newBanners);
    handleSaveAll(newBanners);
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Ad Banners Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Admin Portal
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage advertising banners displayed on the client dashboard. Banners rotate randomly on the User UI.
          </p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-rose-400" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add New Banner */}
        <div className="lg:col-span-1 glass-panel p-6 border border-slate-800 flex flex-col space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
            <Plus className="h-4 w-4 text-indigo-400" />
            <span>Add Advertising Banner</span>
          </h3>

          <form onSubmit={handleAddBanner} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Banner Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. HDFC Credit Card Promo"
                required
                className="w-full px-4 py-3 rounded-xl glass-input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description / Promo Offer Info
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Get up to 10% instant cashback on all utility payments..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl glass-input text-xs resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Banner Image URL
              </label>
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste Image URL or select preset below"
                required
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-mono"
              />
              {/* Presets suggestions */}
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_IMAGE_SUGGESTIONS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setNewImageUrl(preset.url)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                      newImageUrl === preset.url 
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Target Redirect URL
              </label>
              <input
                type="text"
                value={newTargetUrl}
                onChange={(e) => setNewTargetUrl(e.target.value)}
                placeholder="e.g. /credit-card-bill"
                className="w-full px-4 py-3 rounded-xl glass-input text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add & Save Banner</span>
            </button>
          </form>
        </div>

        {/* Right Content Area: Active Banners Grid */}
        <div className="lg:col-span-2 glass-panel p-6 border border-slate-800 flex flex-col space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image className="h-4 w-4 text-indigo-400" />
              <span>Active Banners ({banners.length})</span>
            </div>
            {isSaving && (
              <span className="text-[10px] text-indigo-300 flex items-center space-x-1">
                <div className="h-2 w-2 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>Saving to database...</span>
              </span>
            )}
          </h3>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Loading advertising banners...</span>
            </div>
          ) : banners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
              <AlertCircle className="h-8 w-8 mb-2 text-slate-600" />
              <span>No advertising banners created yet. Add one on the left to start!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banners.map((banner) => (
                <div key={banner.id} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900/40 relative group">
                  <div className="aspect-[16/9] w-full overflow-hidden bg-slate-950 relative">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=600&auto=format&fit=crop&q=60';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-3">
                      <h4 className="text-xs font-bold text-white">{banner.title}</h4>
                      <p className="text-[9px] text-slate-300 line-clamp-2 mt-1">{banner.description}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 border-t border-slate-900 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-[9px] text-slate-400">
                      <LinkIcon className="h-3 w-3 text-indigo-400" />
                      <span className="truncate max-w-[120px] font-mono">{banner.targetUrl}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all"
                      title="Delete Banner"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
