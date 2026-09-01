import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CalendarClock,
  LayoutDashboard, 
  ReceiptText, 
  Users, 
  Package, 
  Pipette, 
  CreditCard, 
  BarChart3, 
  Settings,
  Sparkles,
  AlertTriangle,
  Clock,
  Lock,
  Unlock
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    settings, 
    overdueCustomers, 
    products, 
    sales,
    activities,
    isDashboardUnlocked,
    setSelectedCustomerId 
  } = useApp();

  // Count low stock items
  const lowStockCount = products.filter(p => p.currentStock <= p.reorderLevel).length;
  // Count unpaid/pending sales
  const pendingSalesCount = sales.filter(s => s.paymentStatus === 'unpaid' || s.paymentStatus === 'partially_paid').length;
  // Count pending activities
  const pendingActivitiesCount = activities.filter(a => a.status === 'pending').length;

  const navItems = [
    {
      id: 'activities',
      label: 'Activities',
      icon: CalendarClock,
      badge: pendingActivitiesCount > 0 ? `${pendingActivitiesCount}` : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 font-bold',
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: ReceiptText,
      badge: pendingSalesCount > 0 ? `${pendingSalesCount}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: overdueCustomers.length > 0 ? `${overdueCustomers.length} Overdue` : undefined,
      badgeColor: 'bg-rose-100 text-rose-700 font-bold',
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
      badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: CreditCard,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: isDashboardUnlocked ? 'Unlocked' : '🔒 PIN',
      badgeColor: isDashboardUnlocked ? 'bg-emerald-900/60 text-emerald-300 text-[10px]' : 'bg-slate-800 text-slate-300 text-[10px]',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside 
      id="app-sidebar" 
      className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 shrink-0 border-r border-slate-800 select-none min-h-screen"
    >
      {/* Brand & Logo Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-slate-950 text-xl tracking-tight shadow-md shadow-emerald-500/20">
          P
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-white text-base tracking-wide">PURIT</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              ERP
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5 font-normal">
            {settings.businessName || 'Hygiene Management'}
          </p>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">
          Management
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              onClick={() => {
                setActiveTab(item.id as any);
                if (item.id !== 'customers') {
                  setSelectedCustomerId(null);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Repurchase Alert Pulse Card at bottom */}
      {overdueCustomers.length > 0 && (
        <div className="p-3 m-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
          <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>PURIT Pulse Alert</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            {overdueCustomers.length} restaurant{overdueCustomers.length > 1 ? 's' : ''} past their estimated Handwash/Tissue purchase cycle.
          </p>
          <button
            onClick={() => {
              setActiveTab('customers');
            }}
            className="mt-2 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-1"
          >
            Review repurchases →
          </button>
        </div>
      )}

      {/* User / Company Footer */}
      <div className="p-4 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400">
        <div className="truncate">
          <div className="font-semibold text-slate-200 truncate">HQ Operations</div>
          <div className="text-[11px] text-slate-400 truncate">sales@purit.in</div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
      </div>
    </aside>
  );
};
