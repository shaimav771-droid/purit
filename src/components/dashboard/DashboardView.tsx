import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  TrendingUp, 
  Wallet, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight,
  Package, 
  Users, 
  CreditCard, 
  ReceiptText,
  AlertTriangle,
  FileText,
  Sparkles,
  Download,
  Plus,
  Eye,
  Lock
} from 'lucide-react';
import { formatCurrency, formatDate, isDateInRange } from '../../lib/dateUtils';
import { downloadInvoicePDF } from '../../lib/pdfGenerator';
import { Sale } from '../../types';
import { DashboardPasswordScreen } from './DashboardPasswordScreen';

export const DashboardView: React.FC = () => {
  const {
    settings,
    customers,
    products,
    sales,
    saleItems,
    payments,
    expenses,
    activeDateRange,
    overdueCustomers,
    dueSoonCustomers,
    customerRepurchaseMap,
    setActiveTab,
    setSelectedCustomerId,
    setIsNewSaleModalOpen,
    setIsAddCustomerModalOpen,
    setIsAddProductModalOpen,
    setIsAddStockModalOpen,
    setIsAddExpenseModalOpen,
    setIsAddPaymentModalOpen,
    setSelectedSaleForPayment,
    isDashboardUnlocked,
    lockDashboard,
  } = useApp();

  // If dashboard is locked, show password unlock screen
  if (!isDashboardUnlocked) {
    return <DashboardPasswordScreen />;
  }

  // Filter sales, payments, and expenses by active date range
  const filteredSales = sales.filter(s => s.paymentStatus !== 'cancelled' && isDateInRange(s.saleDate, activeDateRange));
  const filteredPayments = payments.filter(p => isDateInRange(p.paymentDate, activeDateRange));
  const filteredExpenses = expenses.filter(e => isDateInRange(e.date, activeDateRange));

  // 1. Total Invoiced Sales in selected period
  const totalInvoicedSales = filteredSales.reduce((sum, s) => sum + s.invoiceTotal, 0);

  // 2. Amount actually received in selected period (from payment records)
  const totalReceivedAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  // 3. Pending receivables on invoices generated in this period
  const totalPendingInPeriod = filteredSales.reduce((sum, s) => sum + s.pendingAmount, 0);

  // Global total outstanding pending across all customer accounts
  const totalAllPendingReceivables = customers.reduce((sum, c) => sum + (c.totalPending || 0), 0);

  // Collection percentage in period
  const collectionPercentage = totalInvoicedSales > 0
    ? Math.min(100, Math.round((totalReceivedAmount / totalInvoicedSales) * 100))
    : 0;

  // 4. Gross Profit: Selling Price before GST - Product Cost
  const totalGrossProfit = filteredSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0);

  // 5. Total Expenses
  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 6. Net Profit: Gross Profit - Total Expenses
  const netProfit = totalGrossProfit - totalExpensesAmount;

  // Low stock products
  const lowStockProducts = products.filter(p => p.currentStock <= p.reorderLevel);

  // Recent 5 sales
  const recentSales = [...sales].slice(0, 5);

  const handleDownloadPDF = (sale: Sale) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const items = saleItems.filter(si => si.saleId === sale.id);
    downloadInvoicePDF(sale, items, customer, settings);
  };

  return (
    <div id="dashboard-view" className="space-y-6 pb-12">
      
      {/* Welcome & Quick KPI Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              Live Operations
            </span>
            <span className="text-xs text-slate-400">
              {formatDate(activeDateRange.startDate)} — {formatDate(activeDateRange.endDate)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-1 text-white tracking-tight">
            PURIT Executive Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Realized cash collection, inventory velocity, and rolling repurchase intelligence for restaurant hygiene.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => lockDashboard()}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
            title="Lock Dashboard"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Lock</span>
          </button>

          <button
            onClick={() => setIsNewSaleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* KPI 1: TOTAL INVOICED SALES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Invoiced Sales
            </span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {formatCurrency(totalInvoicedSales, settings.currency)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {filteredSales.length} invoice{filteredSales.length === 1 ? '' : 's'} in selected period
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Received: </span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(totalReceivedAmount, settings.currency)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Pending: </span>
              <span className="font-bold text-rose-600">
                {formatCurrency(totalPendingInPeriod, settings.currency)}
              </span>
            </div>
          </div>

          {/* Collection Progress Bar */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
              <span>Collection Rate</span>
              <span>{collectionPercentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${collectionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPI 2: GROSS & NET PROFIT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Net Profit
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatCurrency(netProfit, settings.currency)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Gross Profit − Operating Expenses (Excl. GST)
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Gross Product Profit:</span>
              <span className="font-bold text-slate-800">{formatCurrency(totalGrossProfit, settings.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Operating Expenses:</span>
              <span className="font-bold text-rose-600">− {formatCurrency(totalExpensesAmount, settings.currency)}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: REALIZED SALES & RECEIVABLES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Realized Sales (Collected)
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-900">
              {formatCurrency(totalReceivedAmount, settings.currency)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Actual cash received into bank/UPI/cash
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Total All Pending Due:</span>
              <div className="font-bold text-rose-600 text-sm">
                {formatCurrency(totalAllPendingReceivables, settings.currency)}
              </div>
            </div>
            <button
              onClick={() => setActiveTab('customers')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              View debtors →
            </button>
          </div>
        </div>
      </div>

      {/* Repurchase Intelligence Widget (PURIT PULSE) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs">
                PURIT PULSE
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Customer Repurchase Intelligence — Who to Contact Today
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Predictive cycle based on rolling 2-purchase Handwash & Tissue consumption rates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              {overdueCustomers.length} Overdue
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
              {dueSoonCustomers.length} Due Soon
            </span>
          </div>
        </div>

        {overdueCustomers.length === 0 && dueSoonCustomers.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs sm:text-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            All restaurant clients are currently within healthy purchase consumption cycles.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
            {/* Overdue Items First */}
            {overdueCustomers.map((item) => (
              <div
                key={item.customer.id}
                className="bg-red-50/40 border-2 border-red-500 rounded-2xl p-4 flex flex-col justify-between hover:border-red-600 transition-all shadow-2xs ring-1 ring-red-500/20"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">
                      {item.customer.restaurantName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-black shrink-0 shadow-2xs">
                      OVERDUE
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Phone: {item.customer.phone}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-white p-2.5 rounded-xl border border-red-200/80">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Handwash:</span>
                      <span className={`font-semibold ${item.handwash.status === 'overdue' ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                        {item.handwash.badgeText}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Tissue:</span>
                      <span className={`font-semibold ${item.tissue.status === 'overdue' ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                        {item.tissue.badgeText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-red-200/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedCustomerId(item.customer.id);
                      setActiveTab('customers');
                    }}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      setIsNewSaleModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
                  >
                    + New Sale
                  </button>
                </div>
              </div>
            ))}

            {/* Due Soon Items */}
            {dueSoonCustomers.map((item) => (
              <div
                key={item.customer.id}
                className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-300 transition-all shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">
                      {item.customer.restaurantName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shrink-0">
                      DUE SOON
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Phone: {item.customer.phone}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs bg-white p-2.5 rounded-xl border border-amber-100">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Handwash:</span>
                      <span className={`font-semibold ${item.handwash.status === 'approaching' ? 'text-amber-700' : 'text-slate-700'}`}>
                        {item.handwash.badgeText}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Tissue:</span>
                      <span className={`font-semibold ${item.tissue.status === 'approaching' ? 'text-amber-700' : 'text-slate-700'}`}>
                        {item.tissue.badgeText}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedCustomerId(item.customer.id);
                      setActiveTab('customers');
                    }}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      setIsNewSaleModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                  >
                    + Create Sale
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setIsNewSaleModalOpen(true)}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-center group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ReceiptText className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-900">New Sale</span>
          <span className="text-[10px] text-slate-400">Generate invoice</span>
        </button>

        <button
          onClick={() => setIsAddCustomerModalOpen(true)}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-center group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-900">Add Restaurant</span>
          <span className="text-[10px] text-slate-400">New client profile</span>
        </button>

        <button
          onClick={() => setIsAddProductModalOpen(true)}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-center group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-900">Add Product</span>
          <span className="text-[10px] text-slate-400">Catalog item</span>
        </button>

        <button
          onClick={() => setIsAddStockModalOpen(true)}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-center group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-900">Add Stock</span>
          <span className="text-[10px] text-slate-400">Inbound shipment</span>
        </button>

        <button
          onClick={() => setIsAddExpenseModalOpen(true)}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-center group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-900">Add Expense</span>
          <span className="text-[10px] text-slate-400">Log cost & fuel</span>
        </button>

        <button
          onClick={() => setIsAddPaymentModalOpen(true)}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all text-center group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-900">Add Payment</span>
          <span className="text-[10px] text-slate-400">Collect dues</span>
        </button>
      </div>

      {/* Two Column Layout: Low Stock Alert & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Invoices Table / Mobile Cards */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-emerald-600" />
              Recent Invoices
            </h2>
            <button
              onClick={() => setActiveTab('sales')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
            >
              View All ({sales.length}) →
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs sm:text-sm">
              No sales invoices generated yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        #{sale.invoiceNumber}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        • {formatDate(sale.saleDate)}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          sale.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sale.paymentStatus === 'partially_paid'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sale.paymentStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                      {sale.customerName}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {formatCurrency(sale.invoiceTotal, settings.currency)}
                      </div>
                      {sale.pendingAmount > 0 && (
                        <div className="text-[11px] text-rose-600 font-semibold">
                          Due: {formatCurrency(sale.pendingAmount, settings.currency)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {sale.pendingAmount > 0 && (
                        <button
                          onClick={() => {
                            setSelectedSaleForPayment(sale);
                            setIsAddPaymentModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                          title="Add Payment"
                        >
                          + Pay
                        </button>
                      )}

                      <button
                        onClick={() => handleDownloadPDF(sale)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs"
                        title="Download Invoice PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Inventory Stock Health Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Inventory Stock Health
              </h2>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
              >
                Catalog →
              </button>
            </div>

            {lowStockProducts.length > 0 ? (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 mb-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{lowStockProducts.length} Product(s) Below Reorder Level</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-xs">
                      <span className="text-slate-700 truncate max-w-[160px]">{p.name}</span>
                      <span className="font-bold text-rose-700">
                        {p.currentStock} / {p.reorderLevel} {p.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                All product stock levels are above reorder thresholds.
              </div>
            )}

            <div className="space-y-2 text-xs">
              {products.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="truncate mr-2">
                    <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-400 capitalize">{p.category}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-bold ${p.currentStock <= p.reorderLevel ? 'text-rose-600' : 'text-slate-900'}`}>
                      {p.currentStock} {p.unit}
                    </div>
                    <div className="text-[10px] text-slate-400">Cost: {formatCurrency(p.makingCost, settings.currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsAddStockModalOpen(true)}
            className="w-full mt-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Inbound Stock</span>
          </button>
        </div>
      </div>
    </div>
  );
};
