import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { CustomerDetailView } from './CustomerDetailView';
import { 
  Users, 
  Plus, 
  Phone, 
  ArrowUpDown, 
  ArrowRight,
  MoreVertical,
  Search,
  Check,
  X,
  ChevronRight
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

const sortLabels: Record<'latest_date' | 'highest_sales' | 'highest_pending' | 'most_overdue', string> = {
  latest_date: 'Latest Transaction',
  highest_sales: 'Highest Total Sale',
  highest_pending: 'Highest Pending Balance',
  most_overdue: 'Most Overdue for Repurchase',
};

export const CustomersView: React.FC = () => {
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    settings,
    searchQuery,
    setSearchQuery,
    isAddCustomerModalOpen,
    setIsAddCustomerModalOpen,
    customerRepurchaseMap,
  } = useApp();

  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'active' | 'overdue' | 'due_soon' | 'lost'>('all');
  const [sortBy, setSortBy] = useState<'latest_date' | 'highest_sales' | 'highest_pending' | 'most_overdue'>('latest_date');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isSortSubmenuOpen, setIsSortSubmenuOpen] = useState<boolean>(false);

  // Filter counts
  const overdueCount = useMemo(() => {
    return customers.filter(c => {
      if (c.status === 'lost') return false;
      const id = c.id || (c as any)._id;
      const rep = customerRepurchaseMap?.get(id);
      return c.status === 'overdue' || rep?.overallRepurchaseStatus === 'overdue';
    }).length;
  }, [customers, customerRepurchaseMap]);

  const dueSoonCount = useMemo(() => {
    return customers.filter(c => {
      if (c.status === 'lost') return false;
      const id = c.id || (c as any)._id;
      const rep = customerRepurchaseMap?.get(id);
      return c.status === 'due_soon' || rep?.overallRepurchaseStatus === 'approaching';
    }).length;
  }, [customers, customerRepurchaseMap]);

  const activeCount = useMemo(() => {
    return customers.filter(c => c.status === 'active' || !c.status).length;
  }, [customers]);

  const lostCount = useMemo(() => {
    return customers.filter(c => c.status === 'lost').length;
  }, [customers]);

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
      result = result.filter(c => c.status === 'active' || !c.status);
    } else if (activeFilterTab === 'overdue') {
      result = result.filter(c => {
        if (c.status === 'lost') return false;
        const id = c.id || (c as any)._id;
        const rep = customerRepurchaseMap?.get(id);
        return c.status === 'overdue' || rep?.overallRepurchaseStatus === 'overdue';
      });
    } else if (activeFilterTab === 'due_soon') {
      result = result.filter(c => {
        if (c.status === 'lost') return false;
        const id = c.id || (c as any)._id;
        const rep = customerRepurchaseMap?.get(id);
        return c.status === 'due_soon' || rep?.overallRepurchaseStatus === 'approaching';
      });
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
        const idA = a.id || (a as any)._id;
        const idB = b.id || (b as any)._id;
        const repA = customerRepurchaseMap?.get(idA);
        const repB = customerRepurchaseMap?.get(idB);

        const daysA = (repA?.daysUntilUrgent !== null && repA?.daysUntilUrgent !== undefined) ? repA.daysUntilUrgent : 99999;
        const daysB = (repB?.daysUntilUrgent !== null && repB?.daysUntilUrgent !== undefined) ? repB.daysUntilUrgent : 99999;

        return daysA - daysB;
      }
      return 0;
    });

    return result;
  }, [customers, searchQuery, activeFilterTab, sortBy, customerRepurchaseMap]);

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
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-600" />
          Customer Directory
        </h1>
      </div>

      {/* Search Bar with 3-Dot Options Menu */}
      <div className="flex items-center gap-2">
        {/* Search Bar Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers..."
            className="w-full bg-white hover:bg-slate-50 focus:bg-white rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 border border-slate-300 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3-Dot Options Menu Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              setIsSortSubmenuOpen(false);
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isMenuOpen 
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 shadow-2xs'
            }`}
            title="Filter & Sort Options"
            aria-label="Filter & Sort Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* 3-Dot Dropdown Menu */}
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)} 
              />
              <div className="absolute top-full right-0 mt-2 z-50 min-w-[250px] bg-white rounded-2xl p-2 shadow-2xl border border-slate-200 text-xs font-semibold text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* 1. All */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilterTab('all');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    activeFilterTab === 'all' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>All ({customers.length})</span>
                  {activeFilterTab === 'all' && <Check className="w-4 h-4 text-emerald-400" />}
                </button>

                {/* 2. Active */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilterTab('active');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    activeFilterTab === 'active' ? 'bg-emerald-700 text-white font-bold' : 'hover:bg-emerald-50 text-emerald-800'
                  }`}
                >
                  <span>Active ({activeCount})</span>
                  {activeFilterTab === 'active' && <Check className="w-4 h-4 text-white" />}
                </button>

                {/* 3. Lost */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilterTab('lost');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    activeFilterTab === 'lost' ? 'bg-rose-900 text-white font-bold' : 'hover:bg-rose-50 text-rose-800'
                  }`}
                >
                  <span>Lost ({lostCount})</span>
                  {activeFilterTab === 'lost' && <Check className="w-4 h-4 text-white" />}
                </button>

                {/* 4. Due Soon */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilterTab('due_soon');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    activeFilterTab === 'due_soon' ? 'bg-amber-600 text-white font-bold' : 'hover:bg-amber-50 text-amber-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Due Soon ({dueSoonCount})
                  </span>
                  {activeFilterTab === 'due_soon' && <Check className="w-4 h-4 text-white" />}
                </button>

                {/* 5. Overdue */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveFilterTab('overdue');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                    activeFilterTab === 'overdue' ? 'bg-rose-700 text-white font-bold' : 'hover:bg-rose-50 text-rose-800'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Overdue ({overdueCount})
                  </span>
                  {activeFilterTab === 'overdue' && <Check className="w-4 h-4 text-white" />}
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 6. Sort Header & Options Submenu */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSortSubmenuOpen(!isSortSubmenuOpen);
                    }}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                      isSortSubmenuOpen
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'hover:bg-slate-100 text-slate-700 font-semibold'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{sortLabels[sortBy]}</span>
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isSortSubmenuOpen ? 'rotate-90 text-emerald-500' : 'text-slate-400'}`} />
                  </button>

                  {/* Submenu for sort options */}
                  {isSortSubmenuOpen && (
                    <div className="ml-3 mt-1 pl-2 border-l-2 border-emerald-500/40 space-y-1 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('latest_date');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          sortBy === 'latest_date' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>Latest Transaction</span>
                        {sortBy === 'latest_date' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('highest_sales');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          sortBy === 'highest_sales' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>Highest Total Sale</span>
                        {sortBy === 'highest_sales' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('highest_pending');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          sortBy === 'highest_pending' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>Highest Pending Balance</span>
                        {sortBy === 'highest_pending' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('most_overdue');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          sortBy === 'most_overdue' ? 'bg-slate-900 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>Most Overdue for Repurchase</span>
                        {sortBy === 'most_overdue' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
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

                {/* Middle Section: 3 distinct individual stats sub-cards side-by-side */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 w-full md:w-auto md:flex-1 max-w-full md:max-w-md">
                  {/* Card 1: TOTAL SALES */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-center min-w-0 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">TOTAL SALES</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate" title={formatCurrency(customer.totalInvoicedSales || 0, settings.currency)}>
                      {formatCurrency(customer.totalInvoicedSales || 0, settings.currency)}
                    </span>
                  </div>

                  {/* Card 2: RECEIVED */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-center min-w-0 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">RECEIVED</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600 mt-0.5 truncate" title={formatCurrency(customer.totalPaid || 0, settings.currency)}>
                      {formatCurrency(customer.totalPaid || 0, settings.currency)}
                    </span>
                  </div>

                  {/* Card 3: PENDING */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-center min-w-0 shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">PENDING</span>
                    <span className="text-xs sm:text-sm font-black text-rose-600 mt-0.5 truncate" title={formatCurrency(customer.totalPending || 0, settings.currency)}>
                      {formatCurrency(customer.totalPending || 0, settings.currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button (+ icon) at bottom right for Customer Directory */}
      <button
        type="button"
        onClick={() => setIsAddCustomerModalOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xl shadow-emerald-700/30 flex items-center justify-center transition-all cursor-pointer group"
        title="Add Customer"
        aria-label="Add Customer"
      >
        <Plus className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:rotate-90" />
      </button>
    </div>
  );
};




