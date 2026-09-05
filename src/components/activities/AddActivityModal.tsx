import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod } from '../../types';
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
  AlertCircle,
  Trash2,
  Receipt,
  Package,
  CreditCard
} from 'lucide-react';
import { getTodayString, formatCurrency } from '../../lib/dateUtils';
import { getNextInvoiceNumber } from '../../lib/invoiceNumbering';
import { normalizeTasksFromActivity, normalizeTaskTypeName, getCustomerCanonicalKey, normalizeDueDate } from '../../lib/activityUtils';
import { motion } from 'motion/react';

type ActivityOption = 'Dispenser Fitting' | 'Dispenser Service' | 'Delivery';

interface DeliveryItemRow {
  productId: string;
  quantity: number;
  unitSellingPrice: number;
  discount: number;
}

export const AddActivityModal: React.FC = () => {
  const { 
    isAddActivityModalOpen, 
    setIsAddActivityModalOpen, 
    selectedActivityType,
    customers, 
    products,
    settings,
    activities,
    addActivity,
    addCustomer,
    createSale
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
  
  // Dispenser Details (3 Options: Number of Dispenser, Cost for One, Total Cost)
  const [dispenserCount, setDispenserCount] = useState<string>('');
  const [costPerDispenser, setCostPerDispenser] = useState<string>('');

  // Service Cost (Only shown when Service is selected)
  const [serviceCost, setServiceCost] = useState<string>('');

  // Delivery Items & Complete Sales Invoice Integration (Shown when Delivery is selected)
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItemRow[]>([]);
  const [deliveryIsGst, setDeliveryIsGst] = useState<boolean>(true);
  const [deliverySaleDiscount, setDeliverySaleDiscount] = useState<number>(0);
  const [deliveryPaymentOption, setDeliveryPaymentOption] = useState<'none' | 'full' | 'partial'>('none');
  const [deliveryPartialAmount, setDeliveryPartialAmount] = useState<number>(0);
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<PaymentMethod>('upi');
  const [deliveryReferenceNumber, setDeliveryReferenceNumber] = useState<string>('');
  const [deliveryPaymentNotes, setDeliveryPaymentNotes] = useState<string>('');

  const safeCustomers = Array.isArray(customers) ? customers : [];
  const selectedCustomerObj = safeCustomers.find(c => c && c.id === selectedCustomerId);

  const totalDispenserCost = useMemo(() => {
    const qty = parseFloat(dispenserCount) || 0;
    const cost = parseFloat(costPerDispenser) || 0;
    return qty > 0 && cost > 0 ? qty * cost : 0;
  }, [dispenserCount, costPerDispenser]);

  // Preview next invoice number depending on active GST / Non-GST series
  const nextInvoiceNumberPreview = useMemo(() => {
    if (deliveryIsGst) {
      const currentGst = settings.currentGstInvoiceNumber || `${settings.invoicePrefix || 'PURIT/00/'}12`;
      return getNextInvoiceNumber(currentGst, settings.invoicePrefix || 'PURIT/00/', '12');
    } else {
      const currentNonGst = settings.currentNonGstInvoiceNumber || `${settings.nonGstInvoicePrefix || 'NON-GST/'}000`;
      return getNextInvoiceNumber(currentNonGst, settings.nonGstInvoicePrefix || 'NON-GST/', '000');
    }
  }, [deliveryIsGst, settings]);

  const deliveryCalculations = useMemo(() => {
    let subtotal = 0;
    let totalGrossProfit = 0;

    deliveryItems.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      const lineDisc = Number(item.discount) || 0;
      const lineTotalBeforeGst = Math.max(0, (Number(item.quantity) * Number(item.unitSellingPrice)) - lineDisc);
      const cost = prod ? prod.makingCost : 0;
      const profit = lineTotalBeforeGst - (Number(item.quantity) * cost);

      subtotal += lineTotalBeforeGst;
      totalGrossProfit += profit;
    });

    const discSubtotal = Math.max(0, subtotal - (Number(deliverySaleDiscount) || 0));
    const gstRate = deliveryIsGst ? (settings.gstRate || 18) : 0;
    const cgstRate = deliveryIsGst ? (settings.cgstRate ?? (gstRate / 2)) : 0;
    const sgstRate = deliveryIsGst ? (settings.sgstRate ?? (gstRate / 2)) : 0;

    const gstAmount = deliveryIsGst ? Math.round(((discSubtotal * gstRate) / 100 + Number.EPSILON) * 100) / 100 : 0;
    const cgstAmount = deliveryIsGst ? Math.round(((discSubtotal * cgstRate) / 100 + Number.EPSILON) * 100) / 100 : 0;
    const sgstAmount = deliveryIsGst ? Math.round(((discSubtotal * sgstRate) / 100 + Number.EPSILON) * 100) / 100 : 0;
    const invoiceTotal = discSubtotal + gstAmount;

    const oldDue = selectedCustomerObj?.totalPending || 0;
    const totalDue = invoiceTotal + oldDue;

    return {
      subtotal,
      discSubtotal,
      gstRate,
      cgstRate,
      sgstRate,
      gstAmount,
      cgstAmount,
      sgstAmount,
      invoiceTotal,
      oldDue,
      totalDue,
      totalGrossProfit,
    };
  }, [deliveryItems, products, deliverySaleDiscount, selectedCustomerObj, deliveryIsGst, settings]);
  
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
      setDispenserCount('');
      setCostPerDispenser('');
      setServiceCost('');
      setDeliveryItems([]);
      setDeliveryIsGst(settings.isGstRegistered !== false);
      setDeliverySaleDiscount(0);
      setDeliveryPaymentOption('none');
      setDeliveryPartialAmount(0);
      setDeliveryPaymentMethod('upi');
      setDeliveryReferenceNumber('');
      setDeliveryPaymentNotes('');
      setAssignedTo('PURIT Field Team');
      setSearchTerm('');
      setIsCustomerDropdownOpen(false);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      
      const hasCustomers = Array.isArray(customers) && customers.length > 0;
      setCustomerMode(hasCustomers ? 'browse' : 'new');
      setSaveToDirectory(true);
    }
  }, [isAddActivityModalOpen, selectedActivityType, customers, settings]);

  // Delivery item row handlers
  const handleAddDeliveryItem = () => {
    if (!products || products.length === 0) return;
    const defaultProd = products[0];
    const price = (defaultProd as any).sellingPrice || defaultProd.defaultSellingPrice || 0;
    setDeliveryItems(prev => [
      ...prev,
      {
        productId: defaultProd.id,
        quantity: 1,
        unitSellingPrice: price,
        discount: 0,
      },
    ]);
  };

  const handleRemoveDeliveryItem = (index: number) => {
    setDeliveryItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDeliveryItem = (index: number, field: keyof DeliveryItemRow, value: any) => {
    setDeliveryItems(prev => {
      const copy = [...prev];
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        const price = prod ? ((prod as any).sellingPrice || prod.defaultSellingPrice || 0) : copy[index].unitSellingPrice;
        copy[index] = {
          ...copy[index],
          productId: value,
          unitSellingPrice: price,
        };
      } else {
        copy[index] = {
          ...copy[index],
          [field]: value,
        };
      }
      return copy;
    });
  };

  // Toggle selection of activity option
  const toggleActivityType = (type: ActivityOption) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) {
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
      setDeliveryIsGst(cust.gstEnabled && settings.isGstRegistered !== false);
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

      // Auto-generate Sales Invoice if Delivery is selected & items are specified
      let deliveryInvoiceNote = '';
      if (selectedTypes.includes('Delivery') && deliveryItems.length > 0) {
        const validItems = deliveryItems.filter(i => i.productId && Number(i.quantity) > 0);
        if (validItems.length > 0) {
          try {
            let initialPayment;
            if (deliveryPaymentOption === 'full') {
              initialPayment = {
                amount: deliveryCalculations.invoiceTotal,
                paymentMethod: deliveryPaymentMethod,
                referenceNumber: deliveryReferenceNumber,
                notes: deliveryPaymentNotes || 'Paid in full upon delivery schedule',
              };
            } else if (deliveryPaymentOption === 'partial' && deliveryPartialAmount > 0) {
              initialPayment = {
                amount: Math.min(deliveryPartialAmount, deliveryCalculations.invoiceTotal),
                paymentMethod: deliveryPaymentMethod,
                referenceNumber: deliveryReferenceNumber,
                notes: deliveryPaymentNotes || 'Partial payment received on delivery schedule',
              };
            }

            const saleResult = await createSale(
              {
                customerId: finalCustId,
                saleDate: dueDate,
                gstEnabled: deliveryIsGst,
                discount: Number(deliverySaleDiscount) || 0,
                notes: remarks.trim() || `Auto-generated from scheduled Delivery Visit on ${dueDate}`,
              },
              validItems.map(i => ({
                productId: i.productId,
                quantity: Number(i.quantity),
                unitSellingPrice: Number(i.unitSellingPrice),
                discount: Number(i.discount) || 0,
              })),
              initialPayment
            );
            if (saleResult) {
              deliveryInvoiceNote = ` [Invoice #${saleResult.invoiceNumber} Generated]`;
            }
          } catch (saleErr) {
            console.error('Failed to auto-create sale invoice for delivery', saleErr);
          }
        }
      }

      const combinedLabel = selectedTypes.join(' + ');
      const isFittingSelected = selectedTypes.includes('Dispenser Fitting');
      const isServiceSelected = selectedTypes.includes('Dispenser Service');

      const numDispensers = isFittingSelected ? (parseFloat(dispenserCount) || undefined) : undefined;
      const costOne = isFittingSelected ? (parseFloat(costPerDispenser) || undefined) : undefined;
      const totCost = isFittingSelected ? (totalDispenserCost || undefined) : undefined;
      const servCost = isServiceSelected ? (parseFloat(serviceCost) || undefined) : undefined;

      const taskObjects = selectedTypes.map((t, idx) => {
        const typeSlug = t.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const taskRemark = t === 'Delivery' && deliveryInvoiceNote 
          ? (remarks.trim() ? `${remarks.trim()}${deliveryInvoiceNote}` : `Delivery scheduled${deliveryInvoiceNote}`)
          : (remarks.trim() || undefined);

        return {
          id: `task-${Date.now()}-${typeSlug}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          type: t,
          status: 'pending' as const,
          remarks: taskRemark,
          assignedTo: assignedTo.trim() || 'PURIT Field Staff',
          dispenserCount: numDispensers,
          costPerDispenser: costOne,
          totalDispenserCost: totCost,
          serviceCost: servCost,
        };
      });

      const finalRemarks = remarks.trim() 
        ? `${remarks.trim()}${deliveryInvoiceNote}`
        : `${getCombinedTypeShortTitle()} scheduled${deliveryInvoiceNote}`;

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
        remarks: finalRemarks,
        assignedTo: assignedTo.trim() || 'PURIT Field Staff',
        dispenserCount: numDispensers,
        costPerDispenser: costOne,
        totalDispenserCost: totCost,
        serviceCost: servCost,
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
        className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[80vh]">
          
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
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
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

          {/* Dispenser Details (3 Options) - Only shown when 'Dispenser Fitting' task is selected */}
          {selectedTypes.includes('Dispenser Fitting') && (
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dispenser Details</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                    Number of Dispenser
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2"
                    value={dispenserCount}
                    onChange={(e) => setDispenserCount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                    Cost for One
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={costPerDispenser}
                      onChange={(e) => setCostPerDispenser(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-6 pr-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                    Total Cost
                  </label>
                  <div className="w-full bg-emerald-50/80 border border-emerald-200/90 rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-800 flex items-center h-[33px]">
                    ₹{totalDispenserCost ? totalDispenserCost.toLocaleString('en-IN') : '0'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Cost Option - Only shown when 'Dispenser Service' task is selected */}
          {selectedTypes.includes('Dispenser Service') && (
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1">
                <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Service Cost</span>
              </label>
              <div className="max-w-[200px]">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={serviceCost}
                    onChange={(e) => setServiceCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Delivery Items & Complete Sales Invoice Integration Option - Only shown when 'Delivery' task is selected */}
          {selectedTypes.includes('Delivery') && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-sky-600" />
                  <span>Delivery Items & Sales Invoice</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddDeliveryItem}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Invoice Numbering Series & Tax Type Selection */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Invoice Numbering Series & Tax Type</span>
                  <span className="text-[10px] font-mono font-bold text-slate-600">
                    Next Number: <span className="text-emerald-700 font-extrabold">{nextInvoiceNumberPreview}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryIsGst(true)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      deliveryIsGst
                        ? 'bg-sky-50/90 border-sky-400 text-sky-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs">GST Tax Invoice</span>
                      {deliveryIsGst && <span className="px-1.5 py-0.5 rounded-md bg-sky-600 text-white text-[9px] font-extrabold uppercase">Active</span>}
                    </div>
                    <span className="text-[10px] text-sky-800/80 mt-1 font-mono font-semibold">
                      Series: {settings.invoicePrefix || 'PURIT/00/'} • {settings.gstRate || 18}% GST
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryIsGst(false)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      !deliveryIsGst
                        ? 'bg-purple-50/90 border-purple-400 text-purple-950 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs">Non-GST Bill / Retail</span>
                      {!deliveryIsGst && <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-extrabold uppercase">Active</span>}
                    </div>
                    <span className="text-[10px] text-purple-800/80 mt-1 font-mono font-semibold">
                      Series: {settings.nonGstInvoicePrefix || 'NON-GST/'} • 0% GST
                    </span>
                  </button>
                </div>
              </div>

              {/* Selected Customer Snapshot & Old Due Banner */}
              {selectedCustomerObj && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{selectedCustomerObj.restaurantName}</span>
                      {deliveryIsGst ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          18% GST Enabled ({selectedCustomerObj.gstin || 'Taxable'})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                          Non-GST Bill
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Phone: {selectedCustomerObj.phone} | {selectedCustomerObj.address}
                    </div>
                  </div>

                  {selectedCustomerObj.totalPending > 0 && (
                    <div className="text-right shrink-0 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                      <span className="text-[10px] uppercase font-bold text-rose-600 block">Existing Old Due</span>
                      <span className="text-xs font-black text-rose-700">
                        {formatCurrency(selectedCustomerObj.totalPending, settings.currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Product Line Items */}
              {deliveryItems.length === 0 ? (
                <div className="p-5 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                  No products added yet. Click <strong>"+ Add Product"</strong> above to record delivery stock & generate invoice.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {deliveryItems.map((row, idx) => {
                    const product = products.find(p => p.id === row.productId);
                    const lineTotal = Math.max(0, (row.quantity * row.unitSellingPrice) - (row.discount || 0));

                    return (
                      <div key={idx} className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <select
                            value={row.productId}
                            onChange={(e) => handleUpdateDeliveryItem(idx, 'productId', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:outline-none focus:border-emerald-500"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} — {p.category.toUpperCase()} (Stock: {p.currentStock} {p.unit})
                              </option>
                            ))}
                          </select>

                          {deliveryItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDeliveryItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Qty ({product?.unit || 'Units'})</label>
                            <input
                              type="number"
                              min={1}
                              required
                              value={row.quantity}
                              onChange={(e) => handleUpdateDeliveryItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-center"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Unit Price (₹)</label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              required
                              value={row.unitSellingPrice}
                              onChange={(e) => handleUpdateDeliveryItem(idx, 'unitSellingPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-center"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Discount (₹)</label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={row.discount}
                              onChange={(e) => handleUpdateDeliveryItem(idx, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-center"
                            />
                          </div>

                          <div className="col-span-3 sm:col-span-1 flex flex-col justify-center sm:text-right">
                            <span className="text-[10px] text-slate-500 block">Line Total</span>
                            <span className="font-extrabold text-slate-900 text-xs">
                              {formatCurrency(lineTotal, settings.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Calculations & Totals Summary Box */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-white">{formatCurrency(deliveryCalculations.subtotal, settings.currency)}</span>
                    </div>

                    {deliveryIsGst ? (
                      <>
                        <div className="flex justify-between text-sky-300 text-[11px]">
                          <span>CGST ({deliveryCalculations.cgstRate}%):</span>
                          <span className="font-semibold text-sky-400">+{formatCurrency(deliveryCalculations.cgstAmount, settings.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sky-300 text-[11px]">
                          <span>SGST ({deliveryCalculations.sgstRate}%):</span>
                          <span className="font-semibold text-sky-400">+{formatCurrency(deliveryCalculations.sgstAmount, settings.currency)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Total GST ({deliveryCalculations.gstRate}%):</span>
                          <span className="font-semibold text-emerald-400">+{formatCurrency(deliveryCalculations.gstAmount, settings.currency)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-purple-300 text-[11px]">
                        <span>Tax (Non-GST Series):</span>
                        <span className="font-semibold text-purple-300">₹0 (Non-taxable)</span>
                      </div>
                    )}

                    <div className="flex justify-between font-extrabold text-sm text-white pt-2 border-t border-slate-800">
                      <span>Current Invoice Total:</span>
                      <span className="text-emerald-400 text-base">{formatCurrency(deliveryCalculations.invoiceTotal, settings.currency)}</span>
                    </div>

                    {deliveryCalculations.oldDue > 0 && (
                      <div className="flex justify-between text-rose-300 text-xs pt-1">
                        <span>+ Previous Old Due:</span>
                        <span>{formatCurrency(deliveryCalculations.oldDue, settings.currency)}</span>
                      </div>
                    )}

                    {deliveryCalculations.oldDue > 0 && (
                      <div className="flex justify-between font-black text-xs text-amber-300 pt-1 border-t border-slate-800">
                        <span>Total Payable (with Old Due):</span>
                        <span>{formatCurrency(deliveryCalculations.totalDue, settings.currency)}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Collection Option */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <label className="block font-bold text-slate-800 text-xs">
                      Payment Collection upon Delivery
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryPaymentOption('none')}
                        className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center text-xs cursor-pointer ${
                          deliveryPaymentOption === 'none'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Unpaid (Credit)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryPaymentOption('full');
                          setDeliveryPartialAmount(deliveryCalculations.invoiceTotal);
                        }}
                        className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center text-xs cursor-pointer ${
                          deliveryPaymentOption === 'full'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Paid Full (₹{Math.round(deliveryCalculations.invoiceTotal)})
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryPaymentOption('partial')}
                        className={`py-2 px-2.5 rounded-xl font-bold border transition-all text-center text-xs cursor-pointer ${
                          deliveryPaymentOption === 'partial'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Partial Pay
                      </button>
                    </div>

                    {deliveryPaymentOption !== 'none' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                        {deliveryPaymentOption === 'partial' && (
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Amount Collected (₹)</label>
                            <input
                              type="number"
                              min={1}
                              max={deliveryCalculations.invoiceTotal}
                              value={deliveryPartialAmount || ''}
                              onChange={(e) => setDeliveryPartialAmount(parseFloat(e.target.value) || 0)}
                              placeholder="e.g. 2000"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                          <select
                            value={deliveryPaymentMethod}
                            onChange={(e) => setDeliveryPaymentMethod(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                          >
                            <option value="upi">UPI (GPay/PhonePe/Paytm)</option>
                            <option value="cash">Cash</option>
                            <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                            <option value="cheque">Cheque</option>
                            <option value="card">Card</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">UTR / Ref # (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. UPI-998877"
                            value={deliveryReferenceNumber}
                            onChange={(e) => setDeliveryReferenceNumber(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
