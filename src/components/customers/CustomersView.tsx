import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomerDetailView } from './CustomerDetailView';
import { CustomerFormModal } from './CustomerFormModal';
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Receipt, 
  ArrowUpDown, 
  ChevronRight,
  Filter,
  Eye
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/dateUtils';
import { Customer } from '../../types';

export const CustomersView: React.FC = () => {
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    customerRepurchaseMap,
    settings,
    setIsNewSaleModalOpen,
    searchQuery,
    setSearchQuery,
    isAddCustomerModalOpen,
    setIsAddCustomerModalOpen,
  } = useApp();

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'due_soon' | 'overdue' | 'active' | 'lost'>('all');
  const [sortBy, setSortBy] = useState<'latest_date' | 'highest_sales' | 'highest_pending' | 'most_overdue'>('latest_date');

  // If a specific customer is selected, show their full detail dossier
  if (selectedCustomerId) {
    return (
      <CustomerDetailView
        customerId={selectedCustomerId}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  // Filter and sort customer records
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.restaurantName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    // 2. Status Filter
    if (activeFilterTab === 'due_soon') {
      result = result.filter(c => {
        const info = customerRepurchaseMap.get(c.id);
        return c.status !== 'lost' && info?.overallRepurchaseStatus === 'approaching';
      });
    } else if (activeFilterTab === 'overdue') {
      result = result.filter(c => {
        const info = customerRepurchaseMap.get(c.id);
        return c.status !== 'lost' && info?.overallRepurchaseStatus === 'overdue';
      });
    } else if (activeFilterTab === 'active') {
      result = result.filter(c => c.status === 'active');
    } else if (activeFilterTab === 'lost') {
      result = result.filter(c => c.status === 'lost');
    }

    // 3. Sort Order
    result.sort((a, b) => {
      if (sortBy === 'latest_date') {
        const dateA = a.latestPurchaseDate || a.createdAt;
        const dateB = b.latestPurchaseDate || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      if (sortBy === 'highest_sales') {
        return (b.totalInvoicedSales || 0) - (a.totalInvoicedSales || 0);
      }
      if (sortBy === 'highest_pending') {
        return (b.totalPending || 0) - (a.totalPending || 0);
      }
      if (sortBy === 'most_overdue') {
        const daysA = customerRepurchaseMap.get(a.id)?.daysUntilUrgent ?? 999;
        const daysB = customerRepurchaseMap.get(b.id)?.daysUntilUrgent ?? 999;
        return daysA - daysB;
      }
      return 0;
    });

    return result;
  }, [customers, searchQuery, activeFilterTab, sortBy, customerRepurchaseMap]);

  return (
    <div id="customers-view" className="space-y-6 pb-12">
      
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Restaurant Directory & Accounts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Total {customers.length} client restaurants with predictive repurchase and balance tracking.
          </p>
        </div>

        <button
          onClick={() => setIsAddCustomerModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Restaurant</span>
        </button>
      </div>

      {/* Filter Tabs & Sorting Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none pb-1 md:pb-0 text-xs font-semibold">
          <button
            onClick={() => setActiveFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              activeFilterTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({customers.length})
          </button>

          <button
            onClick={() => setActiveFilterTab('overdue')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilterTab === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Overdue Repurchases
          </button>

          <button
            onClick={() => setActiveFilterTab('due_soon')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilterTab === 'due_soon'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Due Soon
          </button>

          <button
            onClick={() => setActiveFilterTab('active')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              activeFilterTab === 'active'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active
          </button>

          <button
            onClick={() => setActiveFilterTab('lost')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              activeFilterTab === 'lost'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Lost
          </button>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 self-end md:self-auto text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium hidden sm:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="latest_date">Latest Transaction</option>
            <option value="highest_sales">Highest Total Sales</option>
            <option value="highest_pending">Highest Pending Balance</option>
            <option value="most_overdue">Most Overdue for Repurchase</option>
          </select>
        </div>
      </div>

      {/* Customer List / Cards */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No restaurants match your filters</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keywords or switching filter tabs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const intelligence = customerRepurchaseMap.get(customer.id);
            const isOverdue = intelligence?.overallRepurchaseStatus === 'overdue';
            const isDueSoon = intelligence?.overallRepurchaseStatus === 'approaching';

            return (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomerId(customer.id)}
                className={`bg-white rounded-3xl border p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group ${
                  isOverdue
                    ? 'border-rose-300 ring-1 ring-rose-200/60'
                    : isDueSoon
                    ? 'border-amber-300 ring-1 ring-amber-200/60'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div>
                  {/* Card Header: Restaurant Name & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {customer.restaurantName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{customer.phone}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                          OVERDUE
                        </span>
                      )}
                      {isDueSoon && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">
                          DUE SOON
                        </span>
                      )}
                      {!isOverdue && !isDueSoon && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                          {customer.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial Snapshot */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Sales</span>
                      <span className="text-xs font-bold text-slate-900">
                        {formatCurrency(customer.totalInvoicedSales || 0, settings.currency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Received</span>
                      <span className="text-xs font-bold text-emerald-600">
                        {formatCurrency(customer.totalPaid || 0, settings.currency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending</span>
                      <span className={`text-xs font-bold ${customer.totalPending > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {formatCurrency(customer.totalPending || 0, settings.currency)}
                      </span>
                    </div>
                  </div>

                  {/* PURIT PULSE: Repurchase Intelligence Box */}
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-[11px] text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        Rolling Repurchase Status
                      </span>
                      <span className="text-slate-400 font-normal">
                        {customer.latestPurchaseDate ? `Last: ${formatDate(customer.latestPurchaseDate)}` : 'No orders'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Handwash:</span>
                      <span className={`font-semibold ${intelligence?.handwash.status === 'overdue' ? 'text-rose-600' : 'text-slate-800'}`}>
                        {intelligence?.handwash.badgeText || '—'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500">Tissue:</span>
                      <span className={`font-semibold ${intelligence?.tissue.status === 'overdue' ? 'text-rose-600' : 'text-slate-800'}`}>
                        {intelligence?.tissue.badgeText || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="text-[11px] text-slate-400">
                    {customer.dispensersCount || 0} Dispensers
                  </span>

                  <div className="flex items-center gap-1 text-emerald-600 group-hover:text-emerald-700 font-bold">
                    <span>View Profile</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Customer Modal */}
      <CustomerFormModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
      />
    </div>
  );
};
