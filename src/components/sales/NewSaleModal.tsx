import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Customer, PaymentMethod, Sale } from '../../types';
import { 
  X, 
  Receipt, 
  Plus, 
  Trash2, 
  CreditCard, 
  Download, 
  Sparkles, 
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserPlus,
  Building2,
  Check
} from 'lucide-react';
import { formatCurrency, getTodayString } from '../../lib/dateUtils';
import { downloadInvoicePDF } from '../../lib/pdfGenerator';
import { getNextInvoiceNumber } from '../../lib/invoiceNumbering';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SaleItemRow {
  productId: string;
  quantity: number;
  unitSellingPrice: number;
  discount: number;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose }) => {
  const { 
    customers, 
    products, 
    settings, 
    createSale, 
    selectedCustomerId,
    saleItems,
    addCustomer
  } = useApp();

  const [customerId, setCustomerId] = useState<string>('');
  const [isGstInvoice, setIsGstInvoice] = useState<boolean>(true);
  const [saleDate, setSaleDate] = useState<string>(getTodayString());
  const [items, setItems] = useState<SaleItemRow[]>([]);
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Quick Customer Creation inline state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustPhone, setQuickCustPhone] = useState('');
  const [quickCustAddress, setQuickCustAddress] = useState('');
  const [quickCustGst, setQuickCustGst] = useState(false);
  const [quickCustGstin, setQuickCustGstin] = useState('');
  const [isSavingQuickCust, setIsSavingQuickCust] = useState(false);

  // Payment on creation
  const [paymentOption, setPaymentOption] = useState<'none' | 'full' | 'partial'>('none');
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setCreatedSale(null);
      setSaleDate(getTodayString());
      setSaleDiscount(0);
      setNotes('');
      setPaymentOption('none');
      setPartialAmount(0);
      setPaymentMethod('upi');
      setReferenceNumber('');
      setPaymentNotes('');

      // If a customer was already selected in context or list
      let targetCustId = '';
      if (selectedCustomerId && customers.some(c => c.id === selectedCustomerId)) {
        targetCustId = selectedCustomerId;
      } else if (customers.length > 0) {
        targetCustId = customers[0].id;
      }
      setCustomerId(targetCustId);

      const targetCust = customers.find(c => c.id === targetCustId);
      const defaultIsGst = targetCust ? (targetCust.gstEnabled && settings.isGstRegistered !== false) : (settings.isGstRegistered !== false);
      setIsGstInvoice(defaultIsGst);

      // Preload 1 default product item if available
      if (products.length > 0) {
        setItems([
          {
            productId: products[0].id,
            quantity: 5,
            unitSellingPrice: products[0].sellingPrice,
            discount: 0,
          },
        ]);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, selectedCustomerId, customers, products]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === customerId);
  }, [customers, customerId]);

  // Add line item
  const handleAddItem = () => {
    if (products.length === 0) return;
    const defaultProd = products[0];
    setItems(prev => [
      ...prev,
      {
        productId: defaultProd.id,
        quantity: 1,
        unitSellingPrice: defaultProd.sellingPrice,
        discount: 0,
      },
    ]);
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Update line item
  const handleUpdateItem = (index: number, field: keyof SaleItemRow, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        copy[index] = {
          ...copy[index],
          productId: value,
          unitSellingPrice: prod ? prod.sellingPrice : copy[index].unitSellingPrice,
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

  // Update GST state when customer selection changes
  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    const cust = customers.find(c => c.id === newCustId);
    if (cust) {
      setIsGstInvoice(cust.gstEnabled && settings.isGstRegistered !== false);
    }
  };

  // Preview next invoice number depending on active GST / Non-GST series
  const nextInvoiceNumberPreview = useMemo(() => {
    if (isGstInvoice) {
      const currentGst = settings.currentGstInvoiceNumber || `${settings.invoicePrefix || 'PURIT/00/'}12`;
      return getNextInvoiceNumber(currentGst, settings.invoicePrefix || 'PURIT/00/', '12');
    } else {
      const currentNonGst = settings.currentNonGstInvoiceNumber || `${settings.nonGstInvoicePrefix || 'NON-GST/'}000`;
      return getNextInvoiceNumber(currentNonGst, settings.nonGstInvoicePrefix || 'NON-GST/', '000');
    }
  }, [isGstInvoice, settings]);

  // Live financial totals calculation
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalGrossProfit = 0;

    items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      const lineDisc = Number(item.discount) || 0;
      const lineTotalBeforeGst = Math.max(0, (Number(item.quantity) * Number(item.unitSellingPrice)) - lineDisc);
      const cost = prod ? prod.makingCost : 0;
      const profit = lineTotalBeforeGst - (Number(item.quantity) * cost);

      subtotal += lineTotalBeforeGst;
      totalGrossProfit += profit;
    });

    const discSubtotal = Math.max(0, subtotal - (Number(saleDiscount) || 0));
    const gstRate = isGstInvoice ? (settings.gstRate || 18) : 0;
    const cgstRate = isGstInvoice ? (settings.cgstRate ?? (gstRate / 2)) : 0;
    const sgstRate = isGstInvoice ? (settings.sgstRate ?? (gstRate / 2)) : 0;
    
    const gstAmount = isGstInvoice ? Math.round(((discSubtotal * gstRate) / 100 + Number.EPSILON) * 100) / 100 : 0;
    const cgstAmount = isGstInvoice ? Math.round(((discSubtotal * cgstRate) / 100 + Number.EPSILON) * 100) / 100 : 0;
    const sgstAmount = isGstInvoice ? Math.round(((discSubtotal * sgstRate) / 100 + Number.EPSILON) * 100) / 100 : 0;
    const invoiceTotal = discSubtotal + gstAmount;

    const oldDue = selectedCustomer?.totalPending || 0;
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
  }, [items, products, saleDiscount, selectedCustomer, isGstInvoice, settings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || items.length === 0) return;

    setIsSubmitting(true);
    try {
      let initialPayment;
      if (paymentOption === 'full') {
        initialPayment = {
          amount: calculations.invoiceTotal,
          paymentMethod,
          referenceNumber,
          notes: paymentNotes || 'Paid in full upon invoice generation',
        };
      } else if (paymentOption === 'partial' && partialAmount > 0) {
        initialPayment = {
          amount: Math.min(partialAmount, calculations.invoiceTotal),
          paymentMethod,
          referenceNumber,
          notes: paymentNotes || 'Partial payment received on sale creation',
        };
      }

      const newSale = await createSale(
        {
          customerId,
          saleDate,
          notes: notes.trim() || undefined,
          discount: Number(saleDiscount) || 0,
          gstEnabled: isGstInvoice,
        },
        items.map(item => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 1,
          unitSellingPrice: Number(item.unitSellingPrice) || 0,
          discount: Number(item.discount) || 0,
        })),
        initialPayment
      );

      setCreatedSale(newSale);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!createdSale) return;
    const activeItems = saleItems.filter(si => si.saleId === createdSale.id);
    downloadInvoicePDF(createdSale, activeItems, selectedCustomer, settings);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {createdSale ? 'Invoice Created Successfully!' : 'Generate Sales Invoice'}
              </h2>
              <p className="text-xs text-slate-500">
                {createdSale
                  ? `Invoice #${createdSale.invoiceNumber} recorded in PURIT system.`
                  : 'Add hygiene products, review GST & Old Due, and confirm dispatch.'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View after creation */}
        {createdSale ? (
          <div className="py-6 space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                Invoice #{createdSale.invoiceNumber}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Issued to <span className="font-bold text-slate-800">{createdSale.customerName}</span> for{' '}
                <span className="font-bold text-emerald-700">{formatCurrency(createdSale.invoiceTotal, settings.currency)}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span className="font-bold uppercase text-emerald-700">{createdSale.paymentStatus.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(createdSale.paidAmount, settings.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Pending:</span>
                <span className="font-bold text-rose-600">{formatCurrency(createdSale.pendingAmount, settings.currency)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleDownloadPDF}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Invoice</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all"
              >
                Done / Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Main Creation Form */
          <form onSubmit={handleSubmit} className="mt-4 space-y-5 text-xs">
            
            {/* Step 1: Customer & Date Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Select Restaurant / Customer <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ Quick Add</span>
                  </button>
                </div>
                <select
                  required
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 font-semibold text-xs"
                >
                  <option value="" disabled>-- Select Restaurant --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.restaurantName} {c.totalPending > 0 ? `(Old Due: ${formatCurrency(c.totalPending, settings.currency)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Invoice Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>
            </div>

            {/* Invoice Series & Taxation Mode Selector */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Invoice Numbering Series & Tax Type</span>
                <span className="text-[11px] font-mono font-bold text-slate-600">
                  Next Number: <span className="text-emerald-700 font-extrabold">{nextInvoiceNumberPreview}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsGstInvoice(true)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isGstInvoice
                      ? 'bg-sky-50/90 border-sky-400 text-sky-950 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">GST Tax Invoice</span>
                    {isGstInvoice && <span className="px-1.5 py-0.5 rounded-md bg-sky-600 text-white text-[9px] font-extrabold uppercase">Active</span>}
                  </div>
                  <span className="text-[10px] text-sky-800/80 mt-1 font-mono font-semibold">
                    Series: {settings.invoicePrefix || 'PURIT/00/'} • {settings.gstRate || 18}% GST
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsGstInvoice(false)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    !isGstInvoice
                      ? 'bg-purple-50/90 border-purple-400 text-purple-950 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">Non-GST Bill / Retail</span>
                    {!isGstInvoice && <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white text-[9px] font-extrabold uppercase">Active</span>}
                  </div>
                  <span className="text-[10px] text-purple-800/80 mt-1 font-mono font-semibold">
                    Series: {settings.nonGstInvoicePrefix || 'NON-GST/'} • 0% GST
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Customer Add Panel */}
            {isQuickAddOpen && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-emerald-950 text-xs">Add New Restaurant Instantly</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Restaurant Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Spice Garden"
                      value={quickCustName}
                      onChange={(e) => setQuickCustName(e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={quickCustPhone}
                      onChange={(e) => setQuickCustPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Address / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Indiranagar, Bengaluru"
                      value={quickCustAddress}
                      onChange={(e) => setQuickCustAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      value={quickCustGstin}
                      onChange={(e) => {
                        setQuickCustGstin(e.target.value.toUpperCase());
                        setQuickCustGst(!!e.target.value.trim());
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 uppercase focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsQuickAddOpen(false)}
                    className="px-3 py-1 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingQuickCust || !quickCustName.trim()}
                    onClick={async () => {
                      if (!quickCustName.trim()) return;
                      setIsSavingQuickCust(true);
                      try {
                        const newId = await addCustomer({
                          restaurantName: quickCustName.trim(),
                          contactPerson: 'Manager',
                          phone: quickCustPhone.trim() || '0000000000',
                          email: '',
                          address: quickCustAddress.trim() || '',
                          status: 'active',
                          gstEnabled: !!quickCustGstin.trim(),
                          gstin: quickCustGstin.trim() || undefined,
                          paymentTermsDays: 15,
                          defaultHandwashPrice: 150,
                          defaultTissuePrice: 80,
                        });
                        setCustomerId(newId);
                        setIsQuickAddOpen(false);
                        setQuickCustName('');
                        setQuickCustPhone('');
                        setQuickCustAddress('');
                        setQuickCustGstin('');
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsSavingQuickCust(false);
                      }
                    }}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingQuickCust ? 'Saving...' : 'Save & Select'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Selected Customer Snapshot & Old Due Banner */}
            {selectedCustomer && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{selectedCustomer.restaurantName}</span>
                    {selectedCustomer.gstEnabled ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        18% GST Enabled ({selectedCustomer.gstin || 'Taxable'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                        Non-GST Bill
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Phone: {selectedCustomer.phone} | {selectedCustomer.address}
                  </div>
                </div>

                {selectedCustomer.totalPending > 0 && (
                  <div className="text-right shrink-0 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                    <span className="text-[10px] uppercase font-bold text-rose-600 block">Existing Old Due</span>
                    <span className="text-xs font-black text-rose-700">
                      {formatCurrency(selectedCustomer.totalPending, settings.currency)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Line Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Product Line Items ({items.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              </div>

              {items.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
                  No products added yet. Click "+ Add Product" above.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((row, idx) => {
                    const product = products.find(p => p.id === row.productId);
                    const lineTotal = Math.max(0, (row.quantity * row.unitSellingPrice) - (row.discount || 0));

                    return (
                      <div 
                        key={idx} 
                        className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <select
                              value={row.productId}
                              onChange={(e) => handleUpdateItem(idx, 'productId', e.target.value)}
                              className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:outline-none focus:border-emerald-500"
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — {p.category.toUpperCase()} (Stock: {p.currentStock} {p.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Quantity ({product?.unit || 'Units'})</label>
                            <input
                              type="number"
                              min={1}
                              required
                              value={row.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-center"
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
                              onChange={(e) => handleUpdateItem(idx, 'unitSellingPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-center"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Discount (₹)</label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={row.discount}
                              onChange={(e) => handleUpdateItem(idx, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-center"
                            />
                          </div>

                          <div className="col-span-3 sm:col-span-1 flex flex-col justify-center sm:text-right">
                            <span className="text-[10px] text-slate-500 block">Line Total</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {formatCurrency(lineTotal, settings.currency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Calculation & Total Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal:</span>
                <span className="font-semibold text-white">{formatCurrency(calculations.subtotal, settings.currency)}</span>
              </div>

              {calculations.discSubtotal !== calculations.subtotal && (
                <div className="flex justify-between text-slate-300">
                  <span>Discounted Subtotal:</span>
                  <span className="font-semibold text-white">{formatCurrency(calculations.discSubtotal, settings.currency)}</span>
                </div>
              )}

              {isGstInvoice ? (
                <>
                  <div className="flex justify-between text-sky-300 text-[11px] pt-0.5">
                    <span>CGST ({calculations.cgstRate}%):</span>
                    <span className="font-semibold text-sky-400">+{formatCurrency(calculations.cgstAmount, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-sky-300 text-[11px]">
                    <span>SGST ({calculations.sgstRate}%):</span>
                    <span className="font-semibold text-sky-400">+{formatCurrency(calculations.sgstAmount, settings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Total GST ({calculations.gstRate}%):</span>
                    <span className="font-semibold text-emerald-400">+{formatCurrency(calculations.gstAmount, settings.currency)}</span>
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
                <span className="text-emerald-400 text-base">{formatCurrency(calculations.invoiceTotal, settings.currency)}</span>
              </div>

              {calculations.oldDue > 0 && (
                <div className="flex justify-between text-rose-300 text-xs pt-1">
                  <span>+ Previous Old Due:</span>
                  <span>{formatCurrency(calculations.oldDue, settings.currency)}</span>
                </div>
              )}

              {calculations.oldDue > 0 && (
                <div className="flex justify-between font-black text-sm text-amber-300 pt-1 border-t border-slate-800">
                  <span>Total Payable (with Old Due):</span>
                  <span>{formatCurrency(calculations.totalDue, settings.currency)}</span>
                </div>
              )}
            </div>

            {/* Step 4: Payment On Creation Option */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block font-bold text-slate-800 text-xs">
                Payment Collection upon Creation
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentOption('none')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                    paymentOption === 'none'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Unpaid (Credit)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentOption('full');
                    setPartialAmount(calculations.invoiceTotal);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                    paymentOption === 'full'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Paid Full (₹{Math.round(calculations.invoiceTotal)})
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentOption('partial')}
                  className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                    paymentOption === 'partial'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Partial Pay
                </button>
              </div>

              {paymentOption !== 'none' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {paymentOption === 'partial' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Amount Collected (₹)</label>
                      <input
                        type="number"
                        min={1}
                        max={calculations.invoiceTotal}
                        value={partialAmount || ''}
                        onChange={(e) => setPartialAmount(parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 2000"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
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
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Delivery / Invoice Notes</label>
              <input
                type="text"
                placeholder="e.g. Handed over to store manager Rajesh..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {isSubmitting ? 'Generating Invoice...' : `Confirm & Save Invoice`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
