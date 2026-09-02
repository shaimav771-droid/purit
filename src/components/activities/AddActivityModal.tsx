import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Wrench, 
  Settings2, 
  Truck, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Search, 
  Plus, 
  Check, 
  Building2, 
  CheckCircle2, 
  ExternalLink,
  ChevronDown,
  UserCheck,
  Layers,
  AlertCircle
} from 'lucide-react';
import { getTodayString } from '../../lib/dateUtils';
import { normalizeTasksFromActivity, normalizeTaskTypeName, getCustomerCanonicalKey, normalizeDueDate } from '../../lib/activityUtils';
import { motion } from 'motion/react';

type ActivityOption = 'Dispenser Fitting' | 'Dispenser Service' | 'Delivery';

export const AddActivityModal: React.FC = () => {
  const { 
    isAddActivityModalOpen, 
    setIsAddActivityModalOpen, 
    selectedActivityType,
    customers, 
    activities,
    addActivity,
    addCustomer 
  } = useApp();

  // Multi-select activity types for 1 combined task card
  const [selectedTypes, setSelectedTypes] = useState<ActivityOption[]>(['Dispenser Fitting']);
  
  // Customer selection mode: 'browse' | 'new'
  const [customerMode, setCustomerMode] = useState<'browse' | 'new'>('browse');
  
  // Selected existing customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New / Ad-hoc customer fields
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [saveToDirectory, setSaveToDirectory] = useState<boolean>(true);

  // Single-line Date
  const [dueDate, setDueDate] = useState<string>(getTodayString());
  
  // Remarks & optional assigned
  const [remarks, setRemarks] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('PURIT Field Team');
  
  // Dispenser Count & Cost (Simple Model)
  const [dispenserCount, setDispenserCount] = useState<number>(1);
  const [dispenserCost, setDispenserCost] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Helper to normalize any incoming activity type string
  const normalizeActivityType = (t?: string): ActivityOption => {
    if (!t) return 'Dispenser Fitting';
    const lower = t.toLowerCase().replace(/_/g, ' ');
    if (lower.includes('fit')) return 'Dispenser Fitting';
    if (lower.includes('serv')) return 'Dispenser Service';
    if (lower.includes('deliv')) return 'Delivery';
    return 'Dispenser Fitting';
  };

  useEffect(() => {
    if (isAddActivityModalOpen) {
      if (selectedActivityType) {
        setSelectedTypes([normalizeActivityType(selectedActivityType)]);
      } else {
        setSelectedTypes(['Dispenser Fitting']);
      }

      setDueDate(getTodayString());
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setRemarks('');
      setDispenserCount(1);
      setDispenserCost('');
      setAssignedTo('PURIT Field Team');
      setSearchTerm('');
      setIsCustomerDropdownOpen(false);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      
      const hasCustomers = Array.isArray(customers) && customers.length > 0;
      setCustomerMode(hasCustomers ? 'browse' : 'new');
      setSaveToDirectory(true);
    }
  }, [isAddActivityModalOpen, selectedActivityType]);

  const safeCustomers = Array.isArray(customers) ? customers : [];

  // Toggle selection of activity option
  const toggleActivityType = (type: ActivityOption) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) {
          // Keep at least 1 selected
          return prev;
        }
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Quick date helper
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDueDate(d.toISOString().split('T')[0]);
  };

  // Handle picking an existing customer
  const handleSelectCustomer = (cId: string) => {
    setSelectedCustomerId(cId);
    const cust = safeCustomers.find(c => c && c.id === cId);
    if (cust) {
      setCustomerName(cust.restaurantName || '');
      setCustomerPhone(cust.phone || '');
      setCustomerAddress(cust.address || '');
    }
    setIsCustomerDropdownOpen(false);
  };

  // Search filtered customers
  const filteredCustomers = safeCustomers.filter(c => {
    if (!c) return false;
    const name = (c.restaurantName || '').toLowerCase();
    const person = (c.contactPerson || '').toLowerCase();
    const phone = c.phone || '';
    const q = (searchTerm || '').toLowerCase();
    return name.includes(q) || person.includes(q) || phone.includes(q);
  });

  const selectedCustomerObj = safeCustomers.find(c => c && c.id === selectedCustomerId);

  // Check if an existing visit is already scheduled for this restaurant on this date
  const existingVisit = useMemo(() => {
    const custId = selectedCustomerId;
    const name = customerName.trim();
    if (!custId && !name) return null;

    const modalCanonical = getCustomerCanonicalKey(custId, name, customers);
    const targetDueDate = normalizeDueDate(dueDate);
    return activities.find(a => {
      const aCanonical = getCustomerCanonicalKey(a.customerId, a.customerName, customers);
      return aCanonical.key === modalCanonical.key && normalizeDueDate(a.dueDate) === targetDueDate;
    });
  }, [activities, selectedCustomerId, customerName, customers, dueDate]);

  // Quick remark snippets tailored to selected types
  const quickRemarksMap: Record<ActivityOption, string[]> = {
    'Dispenser Fitting': ['Install Handwash Dispensers', 'Fit Tissue Roll Holders', 'Mount Soap Dispenser'],
    'Dispenser Service': ['Service / Inspect Dispenser', 'Replace damaged nozzle', 'Deep clean & test pump'],
    'Delivery': ['Deliver Handwash Refill Cans', 'Deliver Tissue Box Stock', 'Deliver Refill Pack'],
  };

  const currentSnippets = Array.from(
    new Set(selectedTypes.flatMap(t => quickRemarksMap[t] || []))
  );

  const getCombinedTypeShortTitle = () => {
    const parts = selectedTypes.map(t => {
      if (t === 'Dispenser Fitting') return 'Fitting';
      if (t === 'Dispenser Service') return 'Service';
      if (t === 'Delivery') return 'Delivery';
      return t;
    });
    return parts.join(' + ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    
    const finalName = customerName.trim();
    if (!finalName) return;

    if (selectedTypes.length === 0) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      let finalCustId = selectedCustomerId;

      // If in 'new' mode and user wants to save to directory (or no customer ID linked)
      if (customerMode === 'new' && saveToDirectory && !selectedCustomerId) {
        try {
          finalCustId = await addCustomer({
            restaurantName: finalName,
            contactPerson: 'Manager',
            phone: customerPhone.trim() || '0000000000',
            email: '',
            address: customerAddress.trim() || '',
            status: 'active',
            gstEnabled: false,
            paymentTermsDays: 15,
            defaultHandwashPrice: 150,
            defaultTissuePrice: 80,
          });
        } catch (custErr) {
          console.warn('Could not auto-create customer directory item, proceeding with walk-in', custErr);
          finalCustId = `adhoc-${Date.now()}`;
        }
      } else if (!finalCustId) {
        finalCustId = `adhoc-${Date.now()}`;
      }

      const combinedLabel = selectedTypes.join(' + ');
      const taskObjects = selectedTypes.map((t, idx) => {
        const typeSlug = t.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return {
          id: `task-${Date.now()}-${typeSlug}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          type: t,
          status: 'pending' as const,
          remarks: remarks.trim() || undefined,
          assignedTo: assignedTo.trim() || 'PURIT Field Staff',
        };
      });

      // Create or merge into EXACTLY ONE scheduled activity card per restaurant per date
      await addActivity({
        activityType: combinedLabel,
        activityTypes: selectedTypes,
        tasks: taskObjects,
        customerId: finalCustId,
        customerName: finalName,
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        dueDate,
        remarks: remarks.trim() || `${getCombinedTypeShortTitle()} scheduled`,
        assignedTo: assignedTo.trim() || 'PURIT Field Staff',
      });

      setIsAddActivityModalOpen(false);
    } catch (err) {
      console.error('Failed to create activity', err);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const isMapsUrl = customerAddress.includes('http://') || customerAddress.includes('https://') || customerAddress.includes('maps.app') || customerAddress.includes('google.com/maps');

  if (!isAddActivityModalOpen) return null;

  return (
    <div 
      id="add-activity-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
      onClick={() => setIsAddActivityModalOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 6 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Schedule Operational Visit</h2>
              <p className="text-[10px] text-slate-500 font-medium">1 Restaurant + 1 Date = 1 Visit Card</p>
            </div>
          </div>
          <button
            type="button"
            id="close-add-activity-modal-btn"
            onClick={() => setIsAddActivityModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          
          {/* 1. Multi-Select Activity Options (All in 1 Visit Card) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Tasks for this visit <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" />
                <span>1 Card: {getCombinedTypeShortTitle()}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {/* Fitting */}
              <button
                type="button"
                id="type-select-fitting"
                onClick={() => toggleActivityType('Dispenser Fitting')}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                  selectedTypes.includes('Dispenser Fitting')
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600 font-medium opacity-70'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${
                  selectedTypes.includes('Dispenser Fitting') ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] leading-tight font-bold">Fitting</span>
                {selectedTypes.includes('Dispenser Fitting') && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                    ✓
                  </span>
                )}
              </button>

              {/* Service */}
              <button
                type="button"
                id="type-select-service"
                onClick={() => toggleActivityType('Dispenser Service')}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                  selectedTypes.includes('Dispenser Service')
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-950 font-bold ring-2 ring-indigo-500/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600 font-medium opacity-70'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${
                  selectedTypes.includes('Dispenser Service') ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Settings2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] leading-tight font-bold">Service</span>
                {selectedTypes.includes('Dispenser Service') && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                    ✓
                  </span>
                )}
              </button>

              {/* Delivery */}
              <button
                type="button"
                id="type-select-delivery"
                onClick={() => toggleActivityType('Delivery')}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                  selectedTypes.includes('Delivery')
                    ? 'border-sky-500 bg-sky-50 text-sky-950 font-bold ring-2 ring-sky-500/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600 font-medium opacity-70'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 ${
                  selectedTypes.includes('Delivery') ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] leading-tight font-bold">Delivery</span>
                {selectedTypes.includes('Delivery') && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                    ✓
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 2. Customer: Browse vs New Customer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Restaurant / Customer <span className="text-rose-500">*</span>
              </label>

              {/* 2 Options Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  id="tab-browse-customer"
                  onClick={() => {
                    setCustomerMode('browse');
                    setIsCustomerDropdownOpen(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    customerMode === 'browse'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Building2 className="w-3 h-3 text-slate-600" />
                  <span>Browse</span>
                </button>
                <button
                  type="button"
                  id="tab-new-customer"
                  onClick={() => {
                    setCustomerMode('new');
                    setSelectedCustomerId('');
                    setIsCustomerDropdownOpen(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    customerMode === 'new'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>+ New</span>
                </button>
              </div>
            </div>

            {/* A. BROWSE MODE: Simple Clean Selector & Summary */}
            {customerMode === 'browse' && (
              <div className="relative">
                {!selectedCustomerId ? (
                  <div>
                    <div
                      id="browse-customer-trigger"
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                      className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <span>Select an existing customer / restaurant...</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    {/* Customer Dropdown */}
                    {isCustomerDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 max-h-56 overflow-y-auto">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search restaurant or phone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600 mb-1.5"
                        />
                        <div className="space-y-1">
                          {filteredCustomers.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c.id)}
                              className="w-full text-left p-2 rounded-xl hover:bg-emerald-50 text-xs transition-colors flex items-center justify-between cursor-pointer group"
                            >
                              <div>
                                <p className="font-bold text-slate-900 group-hover:text-emerald-900">{c.restaurantName}</p>
                                <p className="text-[10px] text-slate-500">{c.phone || 'No phone'} {c.address ? `• ${c.address}` : ''}</p>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Select
                              </span>
                            </button>
                          ))}
                          {filteredCustomers.length === 0 && (
                            <div className="text-center py-3 text-xs text-slate-500">
                              <p className="mb-1">No matching restaurant.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerMode('new');
                                  setCustomerName(searchTerm);
                                  setIsCustomerDropdownOpen(false);
                                }}
                                className="text-emerald-700 font-bold hover:underline"
                              >
                                + Add "{searchTerm}" as new
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Chosen Customer Summary Chip */
                  <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {customerName || selectedCustomerObj?.restaurantName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-0.5 truncate">
                        {customerPhone && <span>📞 {customerPhone}</span>}
                        {customerAddress && <span className="truncate">📍 {customerAddress}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId('');
                        setCustomerName('');
                        setCustomerPhone('');
                        setCustomerAddress('');
                        setIsCustomerDropdownOpen(true);
                      }}
                      className="px-2 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* B. NEW CUSTOMER MODE */}
            {customerMode === 'new' && (
              <div className="space-y-1.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Restaurant / Customer Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-emerald-600 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none placeholder:font-normal"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <div className="relative">
                    <Phone className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="Phone (Optional)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-emerald-600 rounded-xl pl-7 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <MapPin className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Location / Google Maps Link"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-emerald-600 rounded-xl pl-7 pr-7 py-1.5 text-xs text-slate-900 focus:outline-none"
                    />
                    {isMapsUrl && (
                      <a
                        href={customerAddress}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 p-0.5 text-emerald-600 hover:text-emerald-800"
                        title="Open Map Link"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={saveToDirectory}
                    onChange={(e) => setSaveToDirectory(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3"
                  />
                  <span>Save this customer to directory for future orders</span>
                </label>
              </div>
            )}
          </div>

          {/* 3. Single-Line Scheduled Date Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Scheduled Due Date <span className="text-rose-500">*</span>
            </label>
            
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer shrink-0 ${
                  dueDate === getTodayString() 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer shrink-0"
              >
                Tomorrow
              </button>

              <button
                type="button"
                onClick={() => setQuickDate(2)}
                className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer shrink-0"
              >
                +2d
              </button>
            </div>
          </div>

          {/* Notice when existing visit is scheduled on that date */}
          {existingVisit && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Existing visit scheduled on this date</p>
                <p className="text-amber-800 text-[10px] leading-tight mt-0.5">
                  This restaurant already has a visit scheduled for {dueDate} with {normalizeTasksFromActivity(existingVisit).map(t => t.type).join(', ')}. Your selections will be combined into this single visit card.
                </p>
              </div>
            </div>
          )}

          {/* 4. Small Remark Area */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Instructions / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Fit 2 soap units, urgent replacement..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />

            {/* Quick snippet suggestion tags */}
            {currentSnippets.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {currentSnippets.map((snippet, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRemarks(prev => prev ? `${prev}, ${snippet}` : snippet)}
                    className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-600 transition-colors flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>+ {snippet}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. Submit Button */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddActivityModalOpen(false)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !customerName.trim() || selectedTypes.length === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling...' : existingVisit ? `Combine into Visit (${getCombinedTypeShortTitle()})` : `Schedule Visit (${getCombinedTypeShortTitle()})`}</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
