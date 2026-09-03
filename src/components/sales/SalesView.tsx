import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Receipt, 
  Plus, 
  Search, 
  Download, 
  CreditCard, 
  Calendar, 
  Building2, 
  Phone, 
  Package, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronDown,
  Filter,
  Check,
  CalendarDays,
  Send,
  Share2,
  BarChart2,
  X
} from 'lucide-react';
import { formatCurrency, formatDate, isDateInRange, getTodayString } from '../../lib/dateUtils';
import { downloadInvoicePDF, shareInvoiceViaWhatsApp } from '../../lib/pdfGenerator';
import { SaleDetailModal } from './SaleDetailModal';
import { AddPaymentModal } from './AddPaymentModal';
import { Sale, DateFilterType, DateRange } from '../../types';

export const SalesView: React.FC = () => {
  const {
    sales,
    saleItems,
    customers,
    settings,
    dateFilter,
    setDateFilter,
    customDateRange,
    setCustomDateRange,
    activeDateRange,
    searchQuery,
    setSearchQuery,
    setIsNewSaleModalOpen,
    isAddPaymentModalOpen,
    setIsAddPaymentModalOpen,
    selectedSaleForPayment,
    setSelectedSaleForPayment,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partially_paid' | 'unpaid' | 'cancelled'>('all');
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState<Sale | null>(null);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState<boolean>(false);
  
  // Date & Month filter dropdown state
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [selectedMonthValue, setSelectedMonthValue] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [customStart, setCustomStart] = useState(customDateRange?.startDate || getTodayString());
  const [customEnd, setCustomEnd] = useState(customDateRange?.endDate || getTodayString());

  // Filter sales
  const filteredSales = useMemo(() => {
    let list = sales.filter(s => isDateInRange(s.saleDate, activeDateRange));

    if (statusFilter !== 'all') {
      list = list.filter(s => s.paymentStatus === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        (s.customerPhone && s.customerPhone.includes(q))
      );
    }

    return list;
  }, [sales, activeDateRange, statusFilter, searchQuery]);

  // Aggregate totals
  const totalInvoiced = filteredSales.filter(s => s.paymentStatus !== 'cancelled').reduce((sum, s) => sum + s.invoiceTotal, 0);
  const totalCollected = filteredSales.filter(s => s.paymentStatus !== 'cancelled').reduce((sum, s) => sum + s.paidAmount, 0);
  const totalPending = filteredSales.filter(s => s.paymentStatus !== 'cancelled').reduce((sum, s) => sum + s.pendingAmount, 0);

  // Label for current active filter
  const getActiveFilterLabel = () => {
    if (dateFilter === 'today') return 'Today';
    if (dateFilter === 'this_week') return 'This Week';
    if (dateFilter === 'this_month') {
      const now = new Date();
      return now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    }
    if (dateFilter === 'last_month') return 'Last Month';
    if (dateFilter === 'this_year') return 'This Year';
    if (dateFilter === 'custom') {
      if (customDateRange.startDate === customDateRange.endDate) {
        return formatDate(customDateRange.startDate);
      }
      return `${formatDate(customDateRange.startDate)} – ${formatDate(customDateRange.endDate)}`;
    }
    return 'All Time';
  };

  const handleSelectMonth = (yearMonth: string) => {
    setSelectedMonthValue(yearMonth);
    const [yearStr, monthStr] = yearMonth.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);

    const start = firstDay.toISOString().split('T')[0];
    const end = lastDay.toISOString().split('T')[0];

    setDateFilter('custom');
    setCustomDateRange({ startDate: start, endDate: end });
    setIsDateDropdownOpen(false);
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    setDateFilter('custom');
    setCustomDateRange({ startDate: customStart, endDate: customEnd });
    setIsDateDropdownOpen(false);
  };

  const handleDownload = (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    const items = saleItems.filter(si => si.saleId === sale.id);
    const customer = customers.find(c => c.id === sale.customerId);
    downloadInvoicePDF(sale, items, customer, settings);
  };

  const handleWhatsApp = async (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    const items = saleItems.filter(si => si.saleId === sale.id);
    const customer = customers.find(c => c.id === sale.customerId);
    await shareInvoiceViaWhatsApp(sale, items, customer, settings);
  };

  const handleOpenPayment = (sale: Sale, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSaleForPayment(sale);
    setIsAddPaymentModalOpen(true);
  };

  return (
    <div id="sales-view" className="space-y-4 pb-12">
      
      {/* Top Banner with Title, Filter Dropdown & New Invoice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Sales & Tax Invoices
          </h1>
        </div>

        {/* Controls: Date/Month Dropdown + Sales Metrics Summary Icon Button */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          
          {/* Sales Metrics Summary Icon Button (Matches Inventory Page Style) */}
          <button
            type="button"
            onClick={() => setIsMetricsModalOpen(true)}
            className="p-2 py-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 transition-all border border-slate-200 shadow-2xs flex items-center justify-center cursor-pointer shrink-0"
            title="View Sales & Financial Metrics"
            aria-label="View Sales & Financial Metrics"
          >
            <BarChart2 className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Date & Month Filter Dropdown */}
          <div className="relative flex-1 sm:flex-initial">
            <button
              type="button"
              id="sales-date-filter-btn"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-800 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{getActiveFilterLabel()}</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDateDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsDateDropdownOpen(false)} 
                />
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-3 space-y-3">
                  
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-emerald-600" />
                      Filter Invoices
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('this_month');
                        setIsDateDropdownOpen(false);
                      }}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800"
                    >
                      Reset (This Month)
                    </button>
                  </div>

                  {/* 1. Quick Presets */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">Quick Presets</span>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {[
                        { id: 'today', label: 'Today' },
                        { id: 'this_week', label: 'This Week' },
                        { id: 'this_month', label: 'This Month' },
                        { id: 'last_month', label: 'Last Month' },
                        { id: 'this_year', label: 'This Year' },
                      ].map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setDateFilter(preset.id as DateFilterType);
                            setIsDateDropdownOpen(false);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                            dateFilter === preset.id
                              ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>{preset.label}</span>
                          {dateFilter === preset.id && <Check className="w-3 h-3 text-emerald-600" />}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilter('custom');
                          setCustomDateRange({ startDate: '2020-01-01', endDate: '2030-12-31' });
                          setIsDateDropdownOpen(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-left font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                          dateFilter === 'custom' && customDateRange.startDate === '2020-01-01'
                            ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>All Time</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Direct Month & Year Picker */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">Filter by Specific Month</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="month"
                        value={selectedMonthValue}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSelectMonth(e.target.value);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 3. Custom Date Range Inputs */}
                  <form onSubmit={handleApplyCustomRange} className="space-y-2 border-t border-slate-100 pt-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">Or Custom Date Range</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5">From</label>
                        <input
                          type="date"
                          required
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5">To</label>
                        <input
                          type="date"
                          required
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Apply Range
                    </button>
                  </form>

                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none pb-1 bg-white p-2 rounded-2xl border border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Invoices ({sales.length})
        </button>

        <button
          onClick={() => setStatusFilter('unpaid')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            statusFilter === 'unpaid' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          }`}
        >
          Unpaid
        </button>

        <button
          onClick={() => setStatusFilter('partially_paid')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            statusFilter === 'partially_paid' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          Partially Paid
        </button>

        <button
          onClick={() => setStatusFilter('paid')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            statusFilter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          Paid in Full
        </button>

        <button
          onClick={() => setStatusFilter('cancelled')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            statusFilter === 'cancelled' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Cancelled / Void
        </button>
      </div>

      {/* Invoices List Section */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No sales invoices found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your date range filter or click the bottom "+" button to generate a sale invoice.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* MOBILE & TABLET CARD VIEW (Visible on screens < lg) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3">
            {filteredSales.map((sale) => {
              const items = saleItems.filter(si => si.saleId === sale.id);
              const isCancelled = sale.paymentStatus === 'cancelled';
              const isPaid = sale.paymentStatus === 'paid';
              const isPartial = sale.paymentStatus === 'partially_paid';

              return (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSaleForDetail(sale)}
                  className={`bg-white rounded-2xl border ${
                    isPaid 
                      ? 'border-l-4 border-l-emerald-500 border-slate-200/90' 
                      : isPartial 
                      ? 'border-l-4 border-l-amber-500 border-slate-200/90' 
                      : isCancelled 
                      ? 'border-l-4 border-l-slate-300 border-slate-200/90' 
                      : 'border-l-4 border-l-rose-500 border-slate-200/90'
                  } p-3.5 sm:p-4 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group space-y-3`}
                >
                  {/* Header: Invoice #, Badges, Customer Name & Status Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-black text-sm text-slate-900 group-hover:text-emerald-700 transition-colors shrink-0">
                        #{sale.invoiceNumber}
                      </span>
                      {sale.gstEnabled ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 uppercase tracking-wider shrink-0">
                          GST {sale.gstRate || 18}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 uppercase tracking-wider shrink-0">
                          NON-GST
                        </span>
                      )}
                      <span className="text-slate-300 font-light text-xs shrink-0">•</span>
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">
                        {sale.customerName}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPartial
                          ? 'bg-amber-100 text-amber-800'
                          : isCancelled
                          ? 'bg-slate-200 text-slate-700 line-through'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sale.paymentStatus.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Important Summary Info (Date, Units Count & Key Financial Amounts) */}
                  <div className="flex items-center justify-between gap-3 bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-100 text-xs">
                    {/* Date & Items Count */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDate(sale.saleDate)}</span>
                      </div>
                      {items.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-500 font-medium truncate">
                          <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{items.reduce((s, i) => s + i.quantity, 0)} {items[0]?.unit || 'units'} ({items.length} item{items.length > 1 ? 's' : ''})</span>
                        </div>
                      )}
                    </div>

                    {/* Financial Highlights (Total & Pending) */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block leading-tight">Total</span>
                        <span className="font-black text-slate-900 text-sm sm:text-base">
                          {formatCurrency(sale.invoiceTotal, settings.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-500 uppercase font-bold block leading-tight">Pending</span>
                        <span className={`font-bold text-xs sm:text-sm ${sale.pendingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {sale.pendingAmount > 0 ? formatCurrency(sale.pendingAmount, settings.currency) : 'Clear (₹0)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleDownload(sale, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleWhatsApp(sale, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer"
                        title="Send PDF & Invoice via WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      {sale.pendingAmount > 0 && !isCancelled && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenPayment(sale, e)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>+ Pay</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSaleForDetail(sale)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (Visible on lg screens and up) */}
          <div className="hidden lg:block bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3 pl-2">Invoice #</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Restaurant Name</th>
                    <th className="pb-3 text-right">Taxable</th>
                    <th className="pb-3 text-right">GST</th>
                    <th className="pb-3 text-right">Total</th>
                    <th className="pb-3 text-right">Paid</th>
                    <th className="pb-3 text-right">Pending</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSaleForDetail(sale)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 pl-2 font-bold text-slate-900 group-hover:text-emerald-700">
                        #{sale.invoiceNumber}
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(sale.saleDate)}
                      </td>
                      <td className="py-3 font-semibold text-slate-800 max-w-[180px] truncate">
                        {sale.customerName}
                      </td>
                      <td className="py-3 text-right text-slate-600">
                        {formatCurrency(sale.subtotal, settings.currency)}
                      </td>
                      <td className="py-3 text-right text-slate-500">
                        {sale.gstAmount > 0 ? formatCurrency(sale.gstAmount, settings.currency) : '—'}
                      </td>
                      <td className="py-3 text-right font-extrabold text-slate-900">
                        {formatCurrency(sale.invoiceTotal, settings.currency)}
                      </td>
                      <td className="py-3 text-right text-emerald-600 font-bold">
                        {formatCurrency(sale.paidAmount, settings.currency)}
                      </td>
                      <td className="py-3 text-right font-bold text-rose-600">
                        {sale.pendingAmount > 0 ? formatCurrency(sale.pendingAmount, settings.currency) : '—'}
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            sale.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sale.paymentStatus === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : sale.paymentStatus === 'cancelled'
                              ? 'bg-slate-200 text-slate-700 line-through'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sale.paymentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {sale.pendingAmount > 0 && sale.paymentStatus !== 'cancelled' && (
                            <button
                              onClick={(e) => handleOpenPayment(sale, e)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs cursor-pointer"
                            >
                              + Pay
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDownload(sale, e)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleWhatsApp(sale, e)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title="Share Invoice & PDF via WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      <SaleDetailModal
        isOpen={!!selectedSaleForDetail}
        onClose={() => setSelectedSaleForDetail(null)}
        sale={selectedSaleForDetail}
      />

      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => {
          setIsAddPaymentModalOpen(false);
          setSelectedSaleForPayment(null);
        }}
        sale={selectedSaleForPayment}
      />

      {/* Sales Financial Overview Metrics Modal (Opened via BarChart2 Icon) */}
      {isMetricsModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsMetricsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    Sales & Financial Overview
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time revenue, collections & receivables tracking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMetricsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {/* Metric 1: Total Invoiced */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Invoiced
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {formatCurrency(totalInvoiced, settings.currency)}
                </div>
                <span className="text-xs text-slate-500">{filteredSales.length} invoice(s)</span>
              </div>

              {/* Metric 2: Collected */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">
                  Collected
                </span>
                <div className="text-xl font-black text-emerald-700 mt-1">
                  {formatCurrency(totalCollected, settings.currency)}
                </div>
                <span className="text-xs text-emerald-600 font-semibold">Realized cash/UPI</span>
              </div>

              {/* Metric 3: Pending */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-rose-600 block tracking-wider">
                  Pending
                </span>
                <div className="text-xl font-black text-rose-600 mt-1">
                  {formatCurrency(totalPending, settings.currency)}
                </div>
                <span className="text-xs text-rose-500 font-medium">Receivables</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMetricsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
