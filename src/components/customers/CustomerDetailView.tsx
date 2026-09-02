import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Receipt, 
  Plus, 
  Download, 
  Edit2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Wrench,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/dateUtils';
import { downloadInvoicePDF } from '../../lib/pdfGenerator';
import { CustomerFormModal } from './CustomerFormModal';
import { MarkAsLostModal } from './MarkAsLostModal';
import { Sale } from '../../types';

interface CustomerDetailViewProps {
  customerId?: string;
  onBack?: () => void;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customerId: propsCustomerId,
  onBack: propsOnBack,
}) => {
  const {
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    isLoading,
    sales,
    saleItems,
    dispensers,
    dispenserReplacements,
    settings,
    setIsNewSaleModalOpen,
    setIsAddPaymentModalOpen,
    setSelectedSaleForPayment,
    updateCustomer,
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<string>>(new Set());

  const targetCustomerId = propsCustomerId || selectedCustomerId;
  const onBack = propsOnBack || (() => setSelectedCustomerId(null));

  const customer = useMemo(() => {
    if (!customers || customers.length === 0) return null;

    if (targetCustomerId) {
      const decodedTarget = decodeURIComponent(targetCustomerId).trim();
      const lowerTarget = decodedTarget.toLowerCase();

      // 1. Direct ID / _id match (exact)
      let found = customers.find(c => c.id === decodedTarget || c.id === targetCustomerId || (c as any)._id === decodedTarget || (c as any)._id === targetCustomerId);
      if (found) return found;

      // 2. Case-insensitive ID / _id match
      found = customers.find(c =>
        (c.id && c.id.toLowerCase() === lowerTarget) ||
        ((c as any)._id && (c as any)._id.toLowerCase() === lowerTarget)
      );
      if (found) return found;

      // 3. Case-insensitive restaurantName, legalName, or contactPerson match
      found = customers.find(c =>
        (c.restaurantName && c.restaurantName.toLowerCase() === lowerTarget) ||
        (c.legalName && c.legalName.toLowerCase() === lowerTarget) ||
        (c.contactPerson && c.contactPerson.toLowerCase() === lowerTarget)
      );
      if (found) return found;

      // 4. Substring / partial match on restaurantName or legalName
      found = customers.find(c =>
        (c.restaurantName && (
          lowerTarget.includes(c.restaurantName.toLowerCase()) ||
          c.restaurantName.toLowerCase().includes(lowerTarget)
        )) ||
        (c.legalName && (
          lowerTarget.includes(c.legalName.toLowerCase()) ||
          c.legalName.toLowerCase().includes(lowerTarget)
        ))
      );
      if (found) return found;
    }

    // Fallback: Check if selectedCustomerId has a direct match
    if (selectedCustomerId) {
      const fallbackSelected = customers.find(c => c.id === selectedCustomerId || (c as any)._id === selectedCustomerId);
      if (fallbackSelected) return fallbackSelected;
    }

    return null;
  }, [customers, targetCustomerId, selectedCustomerId]);

  if (!customer) {
    if (isLoading) {
      return (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Loading customer profile...</p>
        </div>
      );
    }

    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500 font-bold mb-1">Customer record not found.</p>
        <p className="text-slate-400 text-xs mb-4">The requested customer record could not be located in your directory.</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors">
          ← Back to Customer List
        </button>
      </div>
    );
  }

  // Customer sales (matched by ID, _id, or restaurant/legal name)
  const customerSales = useMemo(() => {
    if (!customer) return [];
    const custId = customer.id;
    const custIdAlt = (customer as any)._id;
    const restName = customer.restaurantName ? customer.restaurantName.trim().toLowerCase() : '';
    const legalName = customer.legalName ? customer.legalName.trim().toLowerCase() : '';

    return sales.filter(s => {
      if (s.customerId && (s.customerId === custId || (custIdAlt && s.customerId === custIdAlt))) return true;
      if (s.customerName) {
        const sName = s.customerName.trim().toLowerCase();
        if (restName && (sName === restName || sName.includes(restName) || restName.includes(sName))) return true;
        if (legalName && (sName === legalName || sName.includes(legalName) || legalName.includes(sName))) return true;
      }
      return false;
    });
  }, [sales, customer]);

  // Customer dispensers & replacements for fitting cost calculation
  const customerDispensers = useMemo(() => {
    if (!customer) return [];
    const custId = customer.id;
    const custIdAlt = (customer as any)._id;
    const restName = customer.restaurantName ? customer.restaurantName.trim().toLowerCase() : '';

    return dispensers.filter(d => {
      if (d.customerId && (d.customerId === custId || (custIdAlt && d.customerId === custIdAlt))) return true;
      if (d.customerName) {
        const dName = d.customerName.trim().toLowerCase();
        if (restName && (dName === restName || dName.includes(restName) || restName.includes(dName))) return true;
      }
      return false;
    });
  }, [dispensers, customer]);

  const customerReplacements = useMemo(() => {
    if (!customer) return [];
    const custId = customer.id;
    const custIdAlt = (customer as any)._id;
    const restName = customer.restaurantName ? customer.restaurantName.trim().toLowerCase() : '';

    return dispenserReplacements.filter(r => {
      if (r.customerId && (r.customerId === custId || (custIdAlt && r.customerId === custIdAlt))) return true;
      if (r.customerName) {
        const rName = r.customerName.trim().toLowerCase();
        if (restName && (rName === restName || rName.includes(restName) || restName.includes(rName))) return true;
      }
      return false;
    });
  }, [dispenserReplacements, customer]);

  // Financial summary metrics
  const totalSalesVal = useMemo(() => {
    const validSales = customerSales.filter(s => s.paymentStatus !== 'cancelled');
    if (validSales.length > 0) {
      return validSales.reduce((sum, s) => sum + (s.invoiceTotal || 0), 0);
    }
    return customer.totalInvoicedSales || 0;
  }, [customerSales, customer]);

  const totalReceivedVal = useMemo(() => {
    const validSales = customerSales.filter(s => s.paymentStatus !== 'cancelled');
    if (validSales.length > 0) {
      return validSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    }
    return customer.totalPaid || 0;
  }, [customerSales, customer]);

  const totalPendingVal = useMemo(() => {
    const validSales = customerSales.filter(s => s.paymentStatus !== 'cancelled');
    if (validSales.length > 0) {
      return validSales.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);
    }
    return customer.totalPending || 0;
  }, [customerSales, customer]);

  // Total Fitting Cost calculation
  const totalFittingCost = useMemo(() => {
    const dispensersCost = customerDispensers.reduce((sum, d) => {
      const cost = d.totalCost ?? ((d.costPerUnit ?? (d as any).unitCost ?? 0) * (d.installedQuantity ?? 1));
      return sum + cost;
    }, 0);
    const replacementsCost = customerReplacements.reduce((sum, r) => {
      const cost = r.chargeAmount ?? ((r.unitCost ?? 0) * (r.replacedQuantity ?? 1));
      return sum + cost;
    }, 0);
    return dispensersCost + replacementsCost;
  }, [customerDispensers, customerReplacements]);

  const handleToggleExpandSale = (saleId: string) => {
    setExpandedSaleIds(prev => {
      const next = new Set(prev);
      if (next.has(saleId)) {
        next.delete(saleId);
      } else {
        next.add(saleId);
      }
      return next;
    });
  };

  const handleDownloadInvoice = (e: React.MouseEvent, sale: Sale) => {
    e.stopPropagation();
    const items = saleItems.filter(si => si.saleId === sale.id);
    downloadInvoicePDF(sale, items, customer, settings);
  };

  const handleReactivate = async () => {
    await updateCustomer(customer.id, { status: 'active' });
  };

  // Format initials for profile avatar
  const getInitials = (name: string) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format date and time
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return formatDate(dateStr);
      const datePart = formatDate(dateStr);
      const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return timePart && timePart !== '12:00 AM' && timePart !== '05:30 AM' 
        ? `${datePart}, ${timePart}` 
        : datePart;
    } catch {
      return formatDate(dateStr);
    }
  };

  // Helper for invoice ID display
  const getFormattedInvoiceId = (invoiceNo: string) => {
    if (!invoiceNo) return 'INV-0000';
    if (invoiceNo.toUpperCase().startsWith('INV')) return invoiceNo;
    return `INV-${invoiceNo.padStart(4, '0')}`;
  };

  // Helper for item summary per sale
  const getItemSummaryText = (saleId: string) => {
    const items = saleItems.filter(si => si.saleId === saleId);
    if (items.length === 0) return 'No items listed';
    const totalQty = items.reduce((acc, i) => acc + (i.quantity || 0), 0);
    const shortNames = items.map(i => {
      let name = i.productName;
      if (name.includes('PURIT')) name = name.replace('PURIT ', '');
      if (name.includes('(')) name = name.split('(')[0].trim();
      return name;
    }).join(', ');
    return `${totalQty} ${totalQty === 1 ? 'Item' : 'Items'}: ${shortNames}`;
  };

  // Helper for Payment Status Badge
  const renderPaymentStatusBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
          PAID
        </span>
      );
    }
    if (status === 'partially_paid' || status === 'partial') {
      return (
        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
          PARTIAL
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-black uppercase tracking-wider">
        UNPAID
      </span>
    );
  };

  return (
    <div id="customer-detail-view" className="-mt-3 sm:-mt-4 space-y-2 pb-12 animate-in fade-in duration-200">
      
      {/* Back Icon Button (Above Left Corner of Card) */}
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* 1. CUSTOMER CARD */}
      <div className="bg-white border border-slate-100/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">

        {/* Top Row: Avatar, Info, Active Badge, Edit Button */}
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-4">
            {/* Avatar Initials */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#dcfce7] text-[#059669] font-black text-xl sm:text-2xl flex items-center justify-center shrink-0 border border-emerald-200/50">
              {getInitials(customer.restaurantName)}
            </div>

            {/* Name & Subtitle/Phone */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight capitalize">
                {customer.restaurantName}
              </h1>
              <p className="text-sm text-slate-400 font-medium mt-0.5">
                {customer.phone || customer.id || '123456678'}
              </p>
            </div>
          </div>

          {/* Badge & Edit Button */}
          <div className="flex items-center gap-3">
            {/* ACTIVE Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              customer.status === 'active' || !customer.status
                ? 'bg-[#dcfce7] text-[#16a34a]'
                : customer.status === 'lost'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              <span>{customer.status || 'ACTIVE'}</span>
              <span className={`w-2 h-2 rounded-full ${
                customer.status === 'active' || !customer.status
                  ? 'bg-[#16a34a]'
                  : customer.status === 'lost'
                  ? 'bg-rose-600'
                  : 'bg-amber-600'
              }`} />
            </span>

            {/* Dark Navy "Edit" Button */}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-sm font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Divider Line */}
        <hr className="border-slate-100" />

        {/* Two Action Buttons */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {customer.status === 'lost' ? (
            <button
              onClick={handleReactivate}
              className="py-3 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-sm font-bold transition-colors cursor-pointer text-center"
            >
              Reactivate Customer
            </button>
          ) : (
            <button
              onClick={() => setIsLostModalOpen(true)}
              className="py-3 px-4 rounded-xl bg-[#fff0f3] text-[#e11d48] border border-[#fecdd3] hover:bg-[#ffe4e6] text-sm font-bold transition-colors cursor-pointer text-center"
            >
              Mark as Lost
            </button>
          )}

          <button
            onClick={() => setIsNewSaleModalOpen(true)}
            className="py-3 px-4 rounded-xl bg-[#00875a] hover:bg-[#00704a] text-white text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Sale</span>
          </button>
        </div>
      </div>

      {/* 2. METRICS BAR (3 equal horizontal columns with vertical dividers) */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          {/* TOTAL RECEIVED (green) */}
          <div className="p-4 sm:p-5 space-y-2">
            <span className="text-[10px] sm:text-xs font-bold text-[#00875a] uppercase tracking-wider block">
              TOTAL RECEIVED
            </span>
            <div className="flex items-center justify-between gap-1">
              <div className="text-xl sm:text-3xl font-extrabold text-[#00875a]">
                {formatCurrency(totalReceivedVal, settings.currency)}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#dcfce7] text-[#00875a] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          {/* PENDING AMOUNT (red) */}
          <div className="p-4 sm:p-5 space-y-2">
            <span className="text-[10px] sm:text-xs font-bold text-[#dc2626] uppercase tracking-wider block">
              PENDING AMOUNT
            </span>
            <div className="flex items-center justify-between gap-1">
              <div className="text-xl sm:text-3xl font-extrabold text-[#dc2626]">
                {formatCurrency(totalPendingVal, settings.currency)}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>

          {/* TOTAL INVOICED (grey) */}
          <div className="p-4 sm:p-5 space-y-2">
            <span className="text-[10px] sm:text-xs font-bold text-[#64748b] uppercase tracking-wider block">
              TOTAL INVOICED
            </span>
            <div className="flex items-center justify-between gap-1">
              <div className="text-xl sm:text-3xl font-extrabold text-[#334155]">
                {formatCurrency(totalSalesVal, settings.currency)}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#f1f5f9] text-[#475569] flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. CUSTOMER INFORMATION SECTION (Multi-column grid) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          Customer Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Customer Name</span>
            <div className="font-extrabold text-sm text-slate-900">{customer.restaurantName}</div>
            {customer.legalName && (
              <div className="text-slate-500 text-[11px] mt-0.5 font-medium">Legal: {customer.legalName}</div>
            )}
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Phone Number</span>
            <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <a href={`tel:${customer.phone}`} className="hover:text-emerald-600 transition-colors">
                {customer.phone || 'N/A'}
              </a>
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Email Address</span>
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{customer.email || 'N/A'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">GSTIN</span>
            <div className="font-extrabold text-slate-900 font-mono">
              {customer.gstin || (customer.gstEnabled ? 'Active (Pending No.)' : 'N/A')}
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Address</span>
            <div className="font-semibold text-slate-800 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{customer.address || customer.billingAddress || 'N/A'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Customer Since</span>
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formatDate(customer.createdAt)}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-1">Account Status</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="font-bold text-slate-800 capitalize text-xs">{customer.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. SALES HISTORY SECTION */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Sales History ({customerSales.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              All invoices and payment status records for this customer account.
            </p>
          </div>

          <button
            onClick={() => setIsNewSaleModalOpen(true)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/60 transition-colors cursor-pointer"
          >
            + Create New Invoice
          </button>
        </div>

        {customerSales.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No sales or purchase history recorded for this customer yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {customerSales.map((sale) => {
              const isExpanded = expandedSaleIds.has(sale.id);
              const items = saleItems.filter(si => si.saleId === sale.id);

              return (
                <div 
                  key={sale.id}
                  className={`border rounded-xl transition-all ${
                    isExpanded ? 'border-emerald-300 bg-slate-50/50 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Clean Horizontal Transaction Row */}
                  <div 
                    onClick={() => handleToggleExpandSale(sale.id)}
                    className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 cursor-pointer select-none"
                  >
                    {/* 1. Invoice ID & Date */}
                    <div className="min-w-[150px]">
                      <div className="font-black text-sm text-slate-900">
                        {getFormattedInvoiceId(sale.invoiceNumber)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {formatDateTime(sale.saleDate || sale.createdAt)}
                      </div>
                    </div>

                    {/* 2. Item Summary */}
                    <div className="flex-1 min-w-[180px]">
                      <div className="text-xs text-slate-700 font-semibold truncate">
                        {getItemSummaryText(sale.id)}
                      </div>
                    </div>

                    {/* 3. Financials (Total, Paid in green, Pending in red) */}
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Total</span>
                        <span className="font-black text-slate-900">
                          {formatCurrency(sale.invoiceTotal, settings.currency)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-emerald-600 block">Paid</span>
                        <span className="font-black text-emerald-600">
                          {formatCurrency(sale.paidAmount, settings.currency)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-rose-600 block">Pending</span>
                        <span className={`font-black ${sale.pendingAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {formatCurrency(sale.pendingAmount, settings.currency)}
                        </span>
                      </div>
                    </div>

                    {/* 4. Status Badges (PAID, PARTIAL, UNPAID) & Actions */}
                    <div className="flex items-center gap-3 justify-between md:justify-end" onClick={(e) => e.stopPropagation()}>
                      {renderPaymentStatusBadge(sale.paymentStatus)}

                      <div className="flex items-center gap-1.5">
                        {sale.pendingAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedSaleForPayment(sale);
                              setIsAddPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                          >
                            + Pay
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDownloadInvoice(e, sale)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Download Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleExpandSale(sale.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expandable itemized details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-200/80 bg-white rounded-b-xl">
                      <div className="bg-slate-50/80 rounded-xl p-4 space-y-3 border border-slate-100">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <h4 className="font-extrabold text-[11px] text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                            Itemized Invoice Breakdown — {getFormattedInvoiceId(sale.invoiceNumber)}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {items.length} {items.length === 1 ? 'Line Item' : 'Line Items'}
                          </span>
                        </div>

                        {items.length === 0 ? (
                          <div className="text-center text-slate-400 py-3 text-xs font-medium">
                            No individual line items found for this transaction.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200">
                                  <th className="pb-2">Product Name</th>
                                  <th className="pb-2 text-center">Quantity</th>
                                  <th className="pb-2 text-right">Unit Price</th>
                                  <th className="pb-2 text-right">Subtotal</th>
                                  <th className="pb-2 text-right">GST</th>
                                  <th className="pb-2 text-right">Grand Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {items.map((item) => {
                                  const subtotal = item.totalBeforeGst || (item.quantity * item.unitSellingPrice);
                                  const lineGst = (subtotal * (sale.gstRate || 0)) / 100;
                                  const grandTotal = subtotal + lineGst;

                                  return (
                                    <tr key={item.id} className="text-slate-800 font-medium">
                                      <td className="py-2 font-bold text-slate-900">
                                        {item.productName}
                                      </td>
                                      <td className="py-2 text-center font-bold">
                                        {item.quantity} {item.unit}
                                      </td>
                                      <td className="py-2 text-right text-[#64748b]">
                                        {formatCurrency(item.unitSellingPrice, settings.currency)}
                                      </td>
                                      <td className="py-2 text-right font-semibold text-slate-700">
                                        {formatCurrency(subtotal, settings.currency)}
                                      </td>
                                      <td className="py-2 text-right text-slate-500">
                                        {lineGst > 0 ? formatCurrency(lineGst, settings.currency) : '₹0'}
                                      </td>
                                      <td className="py-2 text-right font-extrabold text-slate-900">
                                        {formatCurrency(grandTotal, settings.currency)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-slate-200 text-xs font-bold">
                                  <td colSpan={3} className="pt-3 text-slate-500 uppercase text-[10px]">
                                    Summary Totals
                                  </td>
                                  <td className="pt-3 text-right text-slate-800">
                                    {formatCurrency(sale.subtotal, settings.currency)}
                                  </td>
                                  <td className="pt-3 text-right text-slate-600">
                                    {formatCurrency(sale.gstAmount || 0, settings.currency)}
                                  </td>
                                  <td className="pt-3 text-right text-emerald-700 font-black text-sm">
                                    {formatCurrency(sale.invoiceTotal, settings.currency)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customerToEdit={customer}
      />

      {/* Mark As Lost Modal */}
      <MarkAsLostModal
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        customer={customer}
      />
    </div>
  );
};


