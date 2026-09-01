import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Plus, 
  Search, 
  DownloadCloud
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    setIsNewSaleModalOpen,
    overdueCustomers,
    setActiveTab,
  } = useApp();

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also check if app was launched in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setCanInstall(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install PURIT on your phone: Tap your browser share/menu button (⋮ or Share) and select "Add to Home Screen" or "Install App".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <header 
      id="app-header" 
      className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 transition-all"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-6">
        
        {/* Left: Mobile Brand / Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black tracking-tight text-sm shadow-sm">
              P
            </div>
            <span className="font-bold text-slate-900 text-base tracking-tight">PURIT</span>
          </div>

          {/* Quick Search */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Search restaurant, phone, GSTIN, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-900 text-xs md:text-sm pl-9 pr-4 py-2 rounded-xl border border-transparent focus:border-slate-300 focus:outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right: Date Filter & Action Buttons */}
        <div className="flex items-center gap-2 md:gap-3">
          
          {/* PWA Install App Button */}
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200/80 text-teal-800 text-xs md:text-sm font-semibold transition-all shadow-2xs cursor-pointer"
            title="Install PURIT App on Phone / Desktop"
          >
            <DownloadCloud className="w-4 h-4 text-teal-600 animate-bounce" />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden">Install</span>
          </button>

          {/* Overdue alert indicator on desktop */}
          {overdueCustomers.length > 0 && (
            <button
              onClick={() => setActiveTab('customers')}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
              title={`${overdueCustomers.length} restaurant(s) overdue for repurchase`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
              </span>
              <span>{overdueCustomers.length} Overdue</span>
            </button>
          )}

          {/* Quick New Sale CTA */}
          <button
            id="header-new-sale-btn"
            onClick={() => setIsNewSaleModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 md:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs md:text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Sale</span>
            <span className="sm:hidden">Sale</span>
          </button>
        </div>
      </div>
    </header>
  );
};
