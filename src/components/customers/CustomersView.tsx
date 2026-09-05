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
  ChevronRight,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '../../lib/dateUtils';
import { getCustomerCanonicalKey } from '../../lib/activityUtils';

import { Customer, Activity, Sale } from '../../types';

const getInitials = (name: string): string => {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const getCustomerLastVisitDate = (
  customer: Customer,
  activities: Activity[] = [],
  sales: Sale[] = [],
  customersList: Customer[] = []
): string | null => {
  if (!customer) return null;
  const customerId = customer.id || (customer as any)._id || customer.restaurantName;
  const restName = customer.restaurantName ? customer.restaurantName.trim().toLowerCase() : '';
  const legalName = customer.legalName ? customer.legalName.trim().toLowerCase() : '';

  let maxTime = -Infinity;
  let latestDateStr: string | null = null;

  // 1. Check completed operational activities (Fitting, Service, Delivery)
  (activities || []).forEach(act => {
    if (!act) return;

    let isMatch = false;
    if (act.customerId && (act.customerId === customerId || act.customerId === customer.id || ((customer as any)._id && act.customerId === (customer as any)._id))) {
      isMatch = true;
    } else {
      const canonical = getCustomerCanonicalKey(act.customerId, act.customerName, customersList);
      if (canonical.id === customerId || canonical.id === customer.id) {
        isMatch = true;
      }
    }

    if (!isMatch) return;

    // Check if activity is a completed operational activity
    const isCompleted = act.status === 'completed' || !!act.completedAt || (Array.isArray(act.tasks) && act.tasks.some(t => t.status === 'completed'));
    if (!isCompleted) return;

    const dateCandidate = act.completedAt
      ? act.completedAt.split('T')[0]
      : act.dueDate
      ? act.dueDate.split('T')[0]
      : act.createdAt
      ? act.createdAt.split('T')[0]
      : null;

    if (dateCandidate) {
      const t = new Date(dateCandidate).getTime();
      if (!isNaN(t) && t > maxTime) {
        maxTime = t;
        latestDateStr = dateCandidate;
      }
    }
  });

  // 2. Check invoice / sales dates
  (sales || []).forEach(s => {
    if (!s || s.paymentStatus === 'cancelled') return;

    let isMatch = false;
    if (s.customerId && (s.customerId === customerId || s.customerId === customer.id || ((customer as any)._id && s.customerId === (customer as any)._id))) {
      isMatch = true;
    } else if (s.customerName) {
      const sName = s.customerName.trim().toLowerCase();
      if (restName && restName !== 'customer' && (sName === restName || sName.includes(restName) || restName.includes(sName))) {
        isMatch = true;
      } else if (legalName && (sName === legalName || sName.includes(legalName) || legalName.includes(sName))) {
        isMatch = true;
      }
    }

    if (!isMatch) return;

    const dateCandidate = s.saleDate
      ? s.saleDate.split('T')[0]
      : s.createdAt
      ? s.createdAt.split('T')[0]
      : null;

    if (dateCandidate) {
      const t = new Date(dateCandidate).getTime();
      if (!isNaN(t) && t > maxTime) {
        maxTime = t;
        latestDateStr = dateCandidate;
      }
    }
  });

  // 3. Check customer.latestPurchaseDate
  if (customer.latestPurchaseDate) {
    const dateCandidate = customer.latestPurchaseDate.split('T')[0];
    const t = new Date(dateCandidate).getTime();
    if (!isNaN(t) && t > maxTime) {
      maxTime = t;
      latestDateStr = dateCandidate;
    }
  }

  return latestDateStr;
};

export const formatLastVisitDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'No Visits';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

export const getRelativeVisitTime = (visitDateStr?: string | null) => {
  if (!visitDateStr) {
    return { relativeStr: 'No record', daysElapsed: null, isRedAlert: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visitDate = new Date(visitDateStr);
  visitDate.setHours(0, 0, 0, 0);

  if (isNaN(visitDate.getTime())) {
    return { relativeStr: 'Invalid date', daysElapsed: null, isRedAlert: false };
  }

  const diffTime = today.getTime() - visitDate.getTime();
  const daysElapsed = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Red Alert Logic: If last visit was 7 days or more ago (>= 1 week)
  const isRedAlert = daysElapsed >= 7;

  let relativeStr = '';
  if (daysElapsed < 0) {
    const absDays = Math.abs(daysElapsed);
    if (absDays === 1) relativeStr = 'In 1 day';
    else if (absDays < 7) relativeStr = `In ${absDays} days`;
    else if (absDays < 14) relativeStr = 'In 1 week';
    else relativeStr = `In ${Math.floor(absDays / 7)} weeks`;
  } else if (daysElapsed === 0) {
    relativeStr = 'Today';
  } else if (daysElapsed === 1) {
    relativeStr = '1 day ago';
  } else if (daysElapsed < 7) {
    relativeStr = `${daysElapsed} days ago`;
  } else if (daysElapsed < 14) {
    relativeStr = '1 week ago';
  } else if (daysElapsed < 30) {
    const weeks = Math.floor(daysElapsed / 7);
    relativeStr = `${weeks} weeks ago`;
  } else if (daysElapsed < 60) {
    relativeStr = '1 month ago';
  } else {
    const months = Math.floor(daysElapsed / 30);
    relativeStr = `${months} months ago`;
  }

  return { relativeStr, daysElapsed, isRedAlert };
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
    activities,
    sales,
    selectedCustomerId,
    setSelectedCustomerId,
    settings,
    searchQuery,
    setSearchQuery,
    isAddCustomerModalOpen,
    setIsAddCustomerModalOpen,
    customerRepurchaseMap,
    customerFilterTab: activeFilterTab,
    setCustomerFilterTab: setActiveFilterTab,
  } = useApp();

  const [sortBy, setSortByState] = useState<'latest_date' | 'highest_sales' | 'highest_pending' | 'most_overdue'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('purit_customer_sort_by') || localStorage.getItem('purit_customer_sort_by');
        if (saved && ['latest_date', 'highest_sales', 'highest_pending', 'most_overdue'].includes(saved)) {
          return saved as any;
        }
      } catch {}
    }
    return 'latest_date';
  });

  const setSortBy = (val: 'latest_date' | 'highest_sales' | 'highest_pending' | 'most_overdue') => {
    setSortByState(val);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('purit_customer_sort_by', val);
        localStorage.setItem('purit_customer_sort_by', val);
      } catch {}
    }
  };

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
        const lastVisitA = getCustomerLastVisitDate(a, activities, sales, customers) || a.createdAt;
        const lastVisitB = getCustomerLastVisitDate(b, activities, sales, customers) || b.createdAt;
        return new Date(lastVisitB).getTime() - new Date(lastVisitA).getTime();
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
  }, [customers, searchQuery, activeFilterTab, sortBy, customerRepurchaseMap, activities, sales]);

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

            // Dynamically compute the most recent visit date ("Last Visit") by checking completed activities & sales/invoices
            const lastVisitDateStr = getCustomerLastVisitDate(customer, activities, sales, customers);

            // Relative elapsed time and red alert logic (>= 7 days ago)
            const { relativeStr, isRedAlert } = getRelativeVisitTime(lastVisitDateStr);
            const lastVisitFormatted = formatLastVisitDate(lastVisitDateStr);

            const repSummary = customerRepurchaseMap?.get(customerId);
            const isOverdueStatus = customer.status === 'overdue' || repSummary?.overallRepurchaseStatus === 'overdue';

            return (
              <div
                key={customerId}
                onClick={() => handleSelectCustomer(customer)}
                className={`rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 group min-w-0 ${
                  isRedAlert
                    ? 'bg-red-50/40 border-2 border-red-500 hover:border-red-600 hover:bg-red-50/60 ring-1 ring-red-500/20'
                    : 'bg-white border border-slate-200/90 hover:border-emerald-400/80'
                }`}
              >
                {/* Main Card Content */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
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
                              isOverdueStatus
                                ? 'bg-red-100 text-red-800 border-red-300 font-black'
                                : customer.status === 'active' || !customer.status
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : customer.status === 'lost'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {customer.status === 'due_soon' ? 'DUE SOON' : isOverdueStatus ? 'OVERDUE' : (customer.status || 'ACTIVE')}
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

                {/* Card Footer UI Row */}
                <div className={`pt-2.5 border-t ${isRedAlert ? 'border-red-300' : 'border-slate-100'} flex items-center justify-between text-xs font-semibold`}>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className={`w-3.5 h-3.5 ${isRedAlert ? 'text-red-500' : 'text-slate-400'}`} />
                    <span>
                      Last Visit: <strong className={isRedAlert ? 'text-red-900 font-bold' : 'text-slate-700 font-bold'}>{lastVisitFormatted}</strong>
                    </span>
                  </div>
                  <div className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-tight ${
                    isRedAlert
                      ? 'bg-red-100 text-red-800 border border-red-300 shadow-2xs font-bold'
                      : 'bg-slate-100 text-slate-600 border border-slate-200/50'
                  }`}>
                    {relativeStr}
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

export const CustomerDirectory = CustomersView;





