import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomerDetailView } from './CustomerDetailView';
import { CustomerFormModal } from './CustomerFormModal';
import { 
  Users, 
  Plus, 
  Phone, 
  ArrowUpDown, 
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../../lib/dateUtils';

const getInitials = (name: string): string => {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const CustomersView: React.FC = () => {
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    settings,
    searchQuery,
    isAddCustomerModalOpen,
    setIsAddCustomerModalOpen,
  } = useApp();

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'active' | 'lost'>('all');
  const [sortBy, setSortBy] = useState<'latest_date' | 'highest_sales' | 'highest_pending'>('latest_date');

  // Filter and sort customer records
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.restaurantName.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    // 2. Status Filter
    if (activeFilterTab === 'active') {
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
      return 0;
    });

    return result;
  }, [customers, searchQuery, activeFilterTab, sortBy]);

  // If a specific customer is selected, show their full detail profile
  if (selectedCustomerId) {
    return (
      <CustomerDetailView
        customerId={selectedCustomerId}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  const handleSelectCustomer = (customer: any) => {
    if (!customer) return;
    const identifier = customer.id || customer._id || customer.restaurantName;
    if (identifier) {
      setSelectedCustomerId(identifier);
    }
  };

  return (
    <div id="customers-view" className="space-y-5 pb-12">
      
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Customer Directory
          </h1>
        </div>

        <button
          onClick={() => setIsAddCustomerModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filter Tabs & Sorting Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none pb-1 sm:pb-0 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeFilterTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({customers.length})
          </button>

          <button
            onClick={() => setActiveFilterTab('active')}
            className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeFilterTab === 'active'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Active ({customers.filter(c => c.status === 'active').length})
          </button>

          <button
            onClick={() => setActiveFilterTab('lost')}
            className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeFilterTab === 'lost'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Lost ({customers.filter(c => c.status === 'lost').length})
          </button>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none cursor-pointer text-xs grow sm:grow-0 min-w-0"
          >
            <option value="latest_date">Latest Activity</option>
            <option value="highest_sales">Highest Total Sales</option>
            <option value="highest_pending">Highest Pending Balance</option>
          </select>
        </div>
      </div>

      {/* Horizontal Customer Row Cards List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No customers found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No customer accounts match your search filters or active tabs.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredCustomers.map((customer) => {
            const customerId = customer.id || (customer as any)._id || customer.restaurantName;
            return (
              <div
                key={customerId}
                onClick={() => handleSelectCustomer(customer)}
                className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-emerald-400/80 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 group min-w-0"
              >
                {/* Header Container for Mobile (Top-Right View Profile) / unrolls via md:contents on Desktop */}
                <div className="flex items-start sm:items-center justify-between w-full md:contents gap-2">
                  {/* Left Section: Initials Avatar + Customer Info */}
                  <div className="flex items-center gap-3.5 min-w-0 md:w-1/3">
                    {/* Circular Initials Avatar */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-100/80 text-emerald-800 font-extrabold text-xs sm:text-base flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {getInitials(customer.restaurantName)}
                    </div>

                    {/* Customer Name, Status Badge & Phone Number */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                          {customer.restaurantName}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 border ${
                            customer.status === 'active' || !customer.status
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : customer.status === 'lost'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {customer.status === 'due_soon' ? 'DUE SOON' : (customer.status || 'ACTIVE')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{customer.phone || 'No phone'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Section: View Profile -> link & Three-dots menu icon */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 md:order-last">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCustomer(customer);
                      }}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>View Profile</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Middle Section: 3 distinct metric columns divided neatly */}
                <div className="grid grid-cols-3 gap-1 sm:gap-2 py-2 px-2.5 sm:px-4 rounded-xl bg-slate-50/80 border border-slate-100 text-center w-full md:w-auto md:flex-1 max-w-full md:max-w-md">
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">TOTAL SALES</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">
                      {formatCurrency(customer.totalInvoicedSales || 0, settings.currency)}
                    </span>
                  </div>

                  <div className="flex flex-col justify-center border-x border-slate-200/70 px-1 sm:px-2 min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">RECEIVED</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 mt-0.5 truncate">
                      {formatCurrency(customer.totalPaid || 0, settings.currency)}
                    </span>
                  </div>

                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">PENDING</span>
                    <span className="text-xs sm:text-sm font-black text-rose-600 mt-0.5 truncate">
                      {formatCurrency(customer.totalPending || 0, settings.currency)}
                    </span>
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



