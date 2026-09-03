import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CalendarClock,
  LayoutDashboard, 
  ReceiptText, 
  Users, 
  Package, 
  MoreHorizontal,
  CreditCard,
  BarChart3,
  Settings,
  Pipette,
  X,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Lock,
  Unlock,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    overdueCustomers, 
    products, 
    sales,
    activities,
    isDashboardUnlocked,
    setSelectedCustomerId,
    setIsNewSaleModalOpen,
    setIsAddCustomerModalOpen,
    setIsAddExpenseModalOpen,
    setIsAddProductModalOpen,
    setIsAddActivityModalOpen,
  } = useApp();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  const lowStockCount = products.filter(p => p.currentStock <= p.reorderLevel).length;
  const pendingActivitiesCount = activities.filter(a => a.status === 'pending').length;

  const isMoreTabActive = ['expenses', 'dashboard', 'reports', 'settings'].includes(activeTab);

  const handleNavClick = (tab: any) => {
    setActiveTab(tab);
    if (tab !== 'customers') {
      setSelectedCustomerId(null);
    }
    setIsMoreOpen(false);
  };

  const handleFabClick = () => {
    setIsFabOpen(false);
    setIsNewSaleModalOpen(true);
  };

  return (
    <>
      {/* Floating Action Button (FAB) for Quick Entry */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
        <AnimatePresence>
          {isFabOpen && (
            <>
              <div 
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30" 
                onClick={() => setIsFabOpen(false)} 
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="absolute bottom-14 right-0 z-40 flex flex-col gap-2.5 min-w-48 bg-white rounded-2xl p-2 shadow-2xl border border-slate-200 text-xs font-semibold text-slate-800"
              >
                <button
                  onClick={() => {
                    setIsFabOpen(false);
                    setIsAddActivityModalOpen(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-800 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <CalendarClock className="w-3.5 h-3.5" />
                  </div>
                  <span>Schedule Activity</span>
                </button>

                <button
                  onClick={() => {
                    setIsFabOpen(false);
                    setIsNewSaleModalOpen(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-800 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <ReceiptText className="w-3.5 h-3.5" />
                  </div>
                  <span>New Invoice / Sale</span>
                </button>

                <button
                  onClick={() => {
                    setIsFabOpen(false);
                    setIsAddCustomerModalOpen(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-700"
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span>Add Restaurant</span>
                </button>

                <button
                  onClick={() => {
                    setIsFabOpen(false);
                    setIsAddExpenseModalOpen(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-700"
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <span>Log Expense</span>
                </button>

                <button
                  onClick={() => {
                    setIsFabOpen(false);
                    setIsAddProductModalOpen(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-700"
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  <span>Add Product</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <button
          id="mobile-fab-button"
          onClick={handleFabClick}
          className={`w-13 h-13 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-700/30 transition-all ${
            isFabOpen ? 'bg-slate-900 rotate-45' : 'bg-emerald-600 active:scale-95'
          }`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* "More" Menu Bottom Sheet for Mobile */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <div 
              className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setIsMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 pb-8 shadow-2xl border-t border-slate-200"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-base">More Features</span>
                <button 
                  onClick={() => setIsMoreOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Protected Dashboard */}
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white shadow-2xs mb-2 text-slate-800 flex items-center gap-1">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm">Dashboard</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                      {isDashboardUnlocked ? '🔓' : '🔒 PIN'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5">P&L & Executive Stats</span>
                </button>

                {/* Expenses */}
                <button
                  onClick={() => handleNavClick('expenses')}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all ${
                    activeTab === 'expenses'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white shadow-2xs mb-2 text-sky-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">Expenses</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Cost logs & fuel</span>
                </button>

                {/* Reports */}
                <button
                  onClick={() => handleNavClick('reports')}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all ${
                    activeTab === 'reports'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white shadow-2xs mb-2 text-indigo-600">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">Reports</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Analytics & export</span>
                </button>

                {/* Settings */}
                <button
                  onClick={() => handleNavClick('settings')}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border transition-all ${
                    activeTab === 'settings'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50 border-slate-200/80 text-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white shadow-2xs mb-2 text-slate-700">
                    <Settings className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-sm">Settings</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">PIN, GST & config</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Bottom Bar */}
      <nav 
        id="mobile-bottom-nav"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 flex items-center justify-around shadow-lg"
      >
        {/* 1. Activities (FIRST TAB) */}
        <button
          onClick={() => handleNavClick('activities')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
            activeTab === 'activities' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <div className="relative">
            <CalendarClock className={`w-5 h-5 ${activeTab === 'activities' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            {pendingActivitiesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-600 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Activities</span>
        </button>

        {/* 2. Sales */}
        <button
          onClick={() => handleNavClick('sales')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
            activeTab === 'sales' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <ReceiptText className={`w-5 h-5 ${activeTab === 'sales' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
          <span className="text-[10px] mt-0.5">Sales</span>
        </button>

        {/* 3. Customers / Restaurants */}
        <button
          onClick={() => handleNavClick('customers')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
            activeTab === 'customers' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <div className="relative">
            <Users className={`w-5 h-5 ${activeTab === 'customers' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            {overdueCustomers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full border-2 border-white" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Customers</span>
        </button>

        {/* 4. Inventory */}
        <button
          onClick={() => handleNavClick('inventory')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
            activeTab === 'inventory' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <div className="relative">
            <Package className={`w-5 h-5 ${activeTab === 'inventory' ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />
            )}
          </div>
          <span className="text-[10px] mt-0.5">Inventory</span>
        </button>

        {/* 5. More */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
            isMoreTabActive ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'
          }`}
        >
          <MoreHorizontal className={`w-5 h-5 ${isMoreTabActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
};
