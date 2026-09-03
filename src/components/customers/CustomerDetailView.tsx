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
  Wrench
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/dateUtils';
import { downloadInvoicePDF } from '../../lib/pdfGenerator';
import { CustomerFormModal } from './CustomerFormModal';
import { MarkAsLostModal } from './MarkAsLostModal';
import { Customer, Sale } from '../../types';

const DUMMY_CUSTOMER: Customer = {
  id: '',
  restaurantName: 'Customer',
  phone: '',
  address: '',
  gstEnabled: false,
  status: 'active',
  totalInvoicedSales: 0,
  totalPaid: 0,
  totalPending: 0,
  totalProfit: 0,
  totalHandwashPurchased: 0,
  totalTissuePurchased: 0,
  dispensersCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

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

  const currentCustomer = customer || DUMMY_CUSTOMER;

  // Customer sales (matched by ID, _id, or restaurant/legal name)
  const customerSales = useMemo(() => {
    if (!currentCustomer.id && !currentCustomer.restaurantName) return [];
    const custId = currentCustomer.id;
    const custIdAlt = (currentCustomer as any)._id;
    const restName = currentCustomer.restaurantName ? currentCustomer.restaurantName.trim().toLowerCase() : '';
    const legalName = currentCustomer.legalName ? currentCustomer.legalName.trim().toLowerCase() : '';

    return sales.filter(s => {
      if (s.customerId && (s.customerId === custId || (custIdAlt && s.customerId === custIdAlt))) return true;
      if (s.customerName) {
        const sName = s.customerName.trim().toLowerCase();
        if (restName && restName !== 'customer' && (sName === restName || sName.includes(restName) || restName.includes(sName))) return true;
        if (legalName && (sName === legalName || sName.includes(legalName) || legalName.includes(sName))) return true;
      }
      return false;
    });
  }, [sales, currentCustomer]);

  // Customer dispensers & replacements for fitting cost calculation
  const customerDispensers = useMemo(() => {
    if (!currentCustomer.id && !currentCustomer.restaurantName) return [];
    const custId = currentCustomer.id;
    const custIdAlt = (currentCustomer as any)._id;
    const restName = currentCustomer.restaurantName ? currentCustomer.restaurantName.trim().toLowerCase() : '';

    return dispensers.filter(d => {
      if (d.customerId && (d.customerId === custId || (custIdAlt && d.customerId === custIdAlt))) return true;
      if (d.customerName) {
        const dName = d.customerName.trim().toLowerCase();
        if (restName && restName !== 'customer' && (dName === restName || dName.includes(restName) || restName.includes(dName))) return true;
      }
      return false;
    });
  }, [dispensers, currentCustomer]);

  const customerReplacements = useMemo(() => {
    if (!currentCustomer.id && !currentCustomer.restaurantName) return [];
    const custId = currentCustomer.id;
    const custIdAlt = (currentCustomer as any)._id;
    const restName = currentCustomer.restaurantName ? currentCustomer.restaurantName.trim().toLowerCase() : '';

    return dispenserReplacements.filter(r => {
      if (r.customerId && (r.customerId === custId || (custIdAlt && r.customerId === custIdAlt))) return true;
      if (r.customerName) {
        const rName = r.customerName.trim().toLowerCase();
        if (restName && restName !== 'customer' && (rName === restName || rName.includes(restName) || restName.includes(rName))) return true;
      }
      return false;
    });
  }, [dispenserReplacements, currentCustomer]);

  // Financial summary metrics
  const totalSalesVal = useMemo(() => {
    const validSales = customerSales.filter(s => s.paymentStatus !== 'cancelled');
    if (validSales.length > 0) {
      return validSales.reduce((sum, s) => sum + (s.invoiceTotal || 0), 0);
    }
    return currentCustomer.totalInvoicedSales || 0;
  }, [customerSales, currentCustomer]);

  const totalReceivedVal = useMemo(() => {
    const validSales = customerSales.filter(s => s.paymentStatus !== 'cancelled');
    if (validSales.length > 0) {
      return validSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    }
    return currentCustomer.totalPaid || 0;
  }, [customerSales, currentCustomer]);

  const totalPendingVal = useMemo(() => {
    const validSales = customerSales.filter(s => s.paymentStatus !== 'cancelled');
    if (validSales.length > 0) {
      return validSales.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);
    }
    return currentCustomer.totalPending || 0;
  }, [customerSales, currentCustomer]);

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
    downloadInvoicePDF(sale, items, currentCustomer, settings);
  };

  const handleReactivate = async () => {
    await updateCustomer(currentCustomer.id, { status: 'active' });
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

        {/* Top Row: Avatar, Info (Name + Active Badge inline), Edit Button */}
        <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-start gap-4">
            {/* Avatar Initials */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#dcfce7] text-[#059669] font-black text-xl sm:text-2xl flex items-center justify-center shrink-0 border border-emerald-200/50">
              {getInitials(currentCustomer.restaurantName)}
            </div>

            {/* Name & Subtitle/Phone */}
            <div className="pt-0.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight capitalize">
                  {currentCustomer.restaurantName}
                </h1>
                {/* ACTIVE Status Badge inline with name */}
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                  currentCustomer.status === 'active' || !currentCustomer.status
                    ? 'bg-[#dcfce7] text-[#16a34a]'
                    : currentCustomer.status === 'lost'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  <span>{currentCustomer.status || 'ACTIVE'}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    currentCustomer.status === 'active' || !currentCustomer.status
                      ? 'bg-[#16a34a]'
                      : currentCustomer.status === 'lost'
                      ? 'bg-rose-600'
                      : 'bg-amber-600'
                  }`} />
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium mt-0.5">
                {currentCustomer.phone || currentCustomer.id || '123456678'}
              </p>
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex items-center gap-3 pt-0.5">
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
          {currentCustomer.status === 'lost' ? (
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

      {/* 2. TOP FINANCIAL SUMMARY CARDS (3 separate, distinct horizontal cards) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Card 1: TOTAL SALES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-4 shadow-xs text-center min-w-0 space-y-0.5 sm:space-y-1">
          <span className="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
            TOTAL SALES
          </span>
          <div className="text-base sm:text-2xl font-black text-slate-900 truncate">
            {formatCurrency(totalSalesVal, settings.currency)}
          </div>
        </div>

        {/* Card 2: RECEIVED */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-4 shadow-xs text-center min-w-0 space-y-0.5 sm:space-y-1">
          <span className="text-[9px] sm:text-xs font-bold text-[#00875a] uppercase tracking-wider block truncate">
            RECEIVED
          </span>
          <div className="text-base sm:text-2xl font-black text-[#00875a] truncate">
            {formatCurrency(totalReceivedVal, settings.currency)}
          </div>
        </div>

        {/* Card 3: PENDING */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2.5 sm:p-4 shadow-xs text-center min-w-0 space-y-0.5 sm:space-y-1">
          <span className="text-[9px] sm:text-xs font-bold text-[#dc2626] uppercase tracking-wider block truncate">
            PENDING
          </span>
          <div className="text-base sm:text-2xl font-black text-[#dc2626] truncate">
            {formatCurrency(totalPendingVal, settings.currency)}
          </div>
        </div>
      </div>

      {/* 3. CUSTOMER INFORMATION SECTION (Vertical stacked layout matching reference image) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs">
        <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-4.5 h-4.5 text-emerald-600" />
          Customer Information
        </h2>

        <div className="space-y-4">
          {/* 1. CUSTOMER NAME */}
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Customer Name
            </span>
            <div className="font-extrabold text-base text-slate-900">
              {currentCustomer.restaurantName}
            </div>
            {currentCustomer.legalName && (
              <div className="text-slate-500 text-xs font-medium">
                Legal: {currentCustomer.legalName}
              </div>
            )}
          </div>

          {/* 2. PHONE NUMBER */}
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Phone Number
            </span>
            <div className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0 stroke-[1.75]" />
              <a href={`tel:${currentCustomer.phone}`} className="hover:text-emerald-600 transition-colors">
                {currentCustomer.phone || 'N/A'}
              </a>
            </div>
          </div>

          {/* 3. EMAIL ADDRESS */}
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Email Address
            </span>
            <div className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0 stroke-[1.75]" />
              <span>{currentCustomer.email || 'N/A'}</span>
            </div>
          </div>

          {/* 4. GSTIN */}
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              GSTIN
            </span>
            <div className="font-extrabold text-sm text-slate-900">
              {currentCustomer.gstin || (currentCustomer.gstEnabled ? 'Active (Pending No.)' : 'N/A')}
            </div>
          </div>

          {/* 5. ADDRESS */}
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Address
            </span>
            <div className="font-semibold text-sm text-slate-800 flex items-start gap-2 leading-relaxed">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 stroke-[1.75]" />
              <span>{currentCustomer.address || currentCustomer.billingAddress || 'N/A'}</span>
            </div>
          </div>

          {/* 6. CUSTOMER SINCE */}
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Customer Since
            </span>
            <div className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 stroke-[1.75]" />
              <span>{formatDate(currentCustomer.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SALES HISTORY SECTION */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              Sales History ({customerSales.length})
            </h2>
          </div>

          <button
            onClick={() => setIsNewSaleModalOpen(true)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/60 transition-colors cursor-pointer"
          >
            + Create New Invoice
          </button>
        </div>

        {customerSales.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No sales or purchase history recorded for this customer yet.
          </div>
        ) : (
          <div className="space-y-2">
            {customerSales.map((sale) => {
              const isExpanded = expandedSaleIds.has(sale.id);
              const items = saleItems.filter(si => si.saleId === sale.id);

              return (
                <div 
                  key={sale.id}
                  className={`border rounded-xl transition-all ${
                    isExpanded ? 'border-emerald-300 bg-slate-50/50 shadow-xs' : 'border-slate-200/90 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Clean Compact Horizontal Transaction Row */}
                  <div 
                    onClick={() => handleToggleExpandSale(sale.id)}
                    className="p-2.5 sm:p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-3 cursor-pointer select-none"
                  >
                    {/* 1. Invoice ID & Date */}
                    <div className="min-w-[130px]">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                        {getFormattedInvoiceId(sale.invoiceNumber)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {formatDateTime(sale.saleDate || sale.createdAt)}
                      </div>
                    </div>

                    {/* 2. Item Summary */}
                    <div className="flex-1 min-w-[140px]">
                      <div className="text-xs text-slate-700 font-medium truncate">
                        {getItemSummaryText(sale.id)}
                      </div>
                    </div>

                    {/* 3. Financials (Total, Paid in green, Pending in red) */}
                    <div className="flex items-center gap-3.5 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Total</span>
                        <span className="font-extrabold text-slate-900 text-xs">
                          {formatCurrency(sale.invoiceTotal, settings.currency)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-emerald-600 block leading-none">Paid</span>
                        <span className="font-extrabold text-emerald-600 text-xs">
                          {formatCurrency(sale.paidAmount, settings.currency)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase font-bold text-rose-600 block leading-none">Pending</span>
                        <span className={`font-extrabold text-xs ${sale.pendingAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {formatCurrency(sale.pendingAmount, settings.currency)}
                        </span>
                      </div>
                    </div>

                    {/* 4. Status Badges (PAID, PARTIAL, UNPAID) & Actions */}
                    <div className="flex items-center gap-2 justify-between md:justify-end" onClick={(e) => e.stopPropagation()}>
                      {renderPaymentStatusBadge(sale.paymentStatus)}

                      <div className="flex items-center gap-1">
                        {sale.pendingAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedSaleForPayment(sale);
                              setIsAddPaymentModalOpen(true);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                          >
                            + Pay
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDownloadInvoice(e, sale)}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Download Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleExpandSale(sale.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
        customerToEdit={currentCustomer}
      />

      {/* Mark As Lost Modal */}
      <MarkAsLostModal
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        customer={currentCustomer}
      />
    </div>
  );
};



