import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  PieChart,
  FileSpreadsheet,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatDate, isDateInRange } from '../../lib/dateUtils';
import { exportToCSV } from '../../lib/pdfGenerator';
import { CustomerRepurchaseSummary } from '../../types';

export const ReportsView: React.FC = () => {
  const {
    sales,
    expenses,
    products,
    customers,
    settings,
    financialSummary,
    activeDateRange,
    customerRepurchaseMap,
  } = useApp();

  const repurchaseList = useMemo<CustomerRepurchaseSummary[]>(() => {
    return Array.from(customerRepurchaseMap.values());
  }, [customerRepurchaseMap]);

  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'cashflow' | 'consumption' | 'valuation'>('pnl');

  // Filtered dataset by active date range
  const periodSales = useMemo(() => {
    return sales.filter(s => isDateInRange(s.saleDate, activeDateRange) && s.paymentStatus !== 'cancelled');
  }, [sales, activeDateRange]);

  const periodExpenses = useMemo(() => {
    return expenses.filter(e => isDateInRange(e.date, activeDateRange));
  }, [expenses, activeDateRange]);

  // Financial calculations for P&L
  const totalInvoicedSales = periodSales.reduce((sum, s) => sum + s.invoiceTotal, 0);
  const totalGstCollected = periodSales.reduce((sum, s) => sum + s.gstAmount, 0);
  const totalTaxableSales = periodSales.reduce((sum, s) => sum + s.subtotal - (s.discount || 0), 0);
  const totalGrossProfit = periodSales.reduce((sum, s) => sum + (s.grossProfit || 0), 0);
  const totalCogs = Math.max(0, totalTaxableSales - totalGrossProfit);
  const totalOperatingExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalGrossProfit - totalOperatingExpenses;
  const grossMarginPercent = totalTaxableSales > 0 ? Math.round((totalGrossProfit / totalTaxableSales) * 100) : 0;
  const netMarginPercent = totalTaxableSales > 0 ? Math.round((netProfit / totalTaxableSales) * 100) : 0;

  // Cashflow calculations
  const totalAmountCollected = periodSales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalReceivablesPending = periodSales.reduce((sum, s) => sum + s.pendingAmount, 0);

  // Inventory valuation
  const inventoryCostValuation = products.reduce((sum, p) => sum + (p.currentStock * p.makingCost), 0);
  const inventoryRetailValuation = products.reduce((sum, p) => sum + (p.currentStock * p.sellingPrice), 0);

  // Export handlers
  const handleExportSales = () => {
    const data = periodSales.map(s => ({
      InvoiceNumber: s.invoiceNumber,
      Date: s.saleDate,
      Customer: s.customerName,
      Phone: s.customerPhone,
      GSTIN: s.customerGstin || '',
      TaxableSubtotal: s.subtotal,
      Discount: s.discount,
      GSTAmount: s.gstAmount,
      InvoiceTotal: s.invoiceTotal,
      PaidAmount: s.paidAmount,
      PendingAmount: s.pendingAmount,
      GrossProfit: s.grossProfit,
      Status: s.paymentStatus,
    }));
    exportToCSV(`PURIT_Sales_Report_${activeDateRange.startDate}_${activeDateRange.endDate}.csv`, data);
  };

  const handleExportExpenses = () => {
    const data = periodExpenses.map(e => ({
      Date: e.date,
      Category: e.category,
      Description: e.description,
      Amount: e.amount,
      PaymentMethod: e.paymentMethod,
      Reference: e.referenceNumber || '',
    }));
    exportToCSV(`PURIT_Expenses_Report_${activeDateRange.startDate}_${activeDateRange.endDate}.csv`, data);
  };

  const handleExportConsumption = () => {
    const data = repurchaseList.map(c => ({
      Restaurant: c.customer.restaurantName,
      HandwashRate: c.handwash?.consumptionRateDisplay || 'N/A',
      HandwashLastPurchased: c.handwash?.latestPurchaseDate || '',
      HandwashNextExpected: c.handwash?.expectedNextPurchaseDate || '',
      HandwashStatus: c.handwash?.status || 'no_data',
      TissueRate: c.tissue?.consumptionRateDisplay || 'N/A',
      TissueLastPurchased: c.tissue?.latestPurchaseDate || '',
      TissueNextExpected: c.tissue?.expectedNextPurchaseDate || '',
      TissueStatus: c.tissue?.status || 'no_data',
      OverallStatus: c.overallRepurchaseStatus,
    }));
    exportToCSV(`PURIT_Consumption_Intelligence.csv`, data);
  };

  return (
    <div id="reports-view" className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Financial Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            P&L, Cash Collections vs Receivables, Repurchase intelligence audits, and CSV export.
          </p>
        </div>

        {/* CSV Export Dropdown / Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSales}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Sales CSV</span>
          </button>

          <button
            onClick={handleExportExpenses}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-rose-600" />
            <span>Export Expenses CSV</span>
          </button>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex items-center gap-1 bg-white p-2 rounded-2xl border border-slate-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveReportTab('pnl')}
          className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReportTab === 'pnl' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Profit & Loss Statement (P&L)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('cashflow')}
          className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReportTab === 'cashflow' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Cash Flow & Receivables</span>
        </button>

        <button
          onClick={() => setActiveReportTab('consumption')}
          className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReportTab === 'consumption' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Consumption Intelligence Audit</span>
        </button>

        <button
          onClick={() => setActiveReportTab('valuation')}
          className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeReportTab === 'valuation' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Inventory Valuation</span>
        </button>
      </div>

      {/* Tab 1: P&L Statement */}
      {activeReportTab === 'pnl' && (
        <div className="space-y-6">
          
          {/* Top 3 KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Profit</span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(totalGrossProfit, settings.currency)}
              </div>
              <span className="text-xs font-semibold text-emerald-600">{grossMarginPercent}% Gross Margin</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-rose-500 block">Total Expenses</span>
              <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                {formatCurrency(totalOperatingExpenses, settings.currency)}
              </div>
              <span className="text-xs text-slate-500">{periodExpenses.length} Expense vouchers</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                Net Operating Profit
              </span>
              <div className={`text-xl sm:text-2xl font-black mt-1 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(netProfit, settings.currency)}
              </div>
              <span className="text-xs font-semibold text-slate-300">{netMarginPercent}% Net Profit Margin</span>
            </div>
          </div>

          {/* Detailed P&L Structured Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs text-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">
              Income Statement ({formatDate(activeDateRange.startDate)} – {formatDate(activeDateRange.endDate)})
            </h3>

            <div className="space-y-2.5">
              
              {/* Revenue */}
              <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b border-slate-100">
                <span>1. Gross Invoiced Revenue</span>
                <span>{formatCurrency(totalInvoicedSales, settings.currency)}</span>
              </div>

              <div className="flex justify-between py-1 pl-4 text-slate-500">
                <span>Less: 18% GST (Tax Liability)</span>
                <span className="text-rose-600">− {formatCurrency(totalGstCollected, settings.currency)}</span>
              </div>

              <div className="flex justify-between py-1.5 pl-4 font-bold text-slate-800 bg-slate-50 px-2 rounded-lg">
                <span>Net Taxable Sales (Business Revenue)</span>
                <span>{formatCurrency(totalTaxableSales, settings.currency)}</span>
              </div>

              {/* COGS */}
              <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b border-slate-100 mt-4">
                <span>2. Cost of Goods Sold (COGS)</span>
                <span className="text-rose-600">− {formatCurrency(totalCogs, settings.currency)}</span>
              </div>

              <div className="flex justify-between py-1 pl-4 text-slate-500">
                <span>Making Cost (Handwash chemicals, packaging & tissue procurement)</span>
                <span>{formatCurrency(totalCogs, settings.currency)}</span>
              </div>

              {/* Gross Profit */}
              <div className="flex justify-between py-2 px-3 rounded-xl bg-emerald-50 text-emerald-950 font-black text-sm my-2">
                <span>Gross Profit (Revenue − COGS)</span>
                <span className="text-emerald-700">{formatCurrency(totalGrossProfit, settings.currency)}</span>
              </div>

              {/* Operating Expenses */}
              <div className="flex justify-between py-1.5 font-bold text-slate-900 border-b border-slate-100 mt-4">
                <span>3. Operating Expenses & Overheads</span>
                <span className="text-rose-600">− {formatCurrency(totalOperatingExpenses, settings.currency)}</span>
              </div>

              <div className="flex justify-between py-1 pl-4 text-slate-500">
                <span>Fuel & Delivery</span>
                <span>{formatCurrency(periodExpenses.filter(e => e.category === 'fuel' || e.category === 'transport').reduce((s, e) => s + e.amount, 0), settings.currency)}</span>
              </div>

              <div className="flex justify-between py-1 pl-4 text-slate-500">
                <span>Salaries & Wages</span>
                <span>{formatCurrency(periodExpenses.filter(e => e.category === 'salary').reduce((s, e) => s + e.amount, 0), settings.currency)}</span>
              </div>

              <div className="flex justify-between py-1 pl-4 text-slate-500">
                <span>Rent, Electricity & Maintenance</span>
                <span>{formatCurrency(periodExpenses.filter(e => e.category === 'rent' || e.category === 'electricity' || e.category === 'maintenance').reduce((s, e) => s + e.amount, 0), settings.currency)}</span>
              </div>

              <div className="flex justify-between py-1 pl-4 text-slate-500">
                <span>Other Miscellaneous Overheads</span>
                <span>{formatCurrency(periodExpenses.filter(e => ['marketing', 'dispenser', 'other', 'packaging', 'raw_materials'].includes(e.category)).reduce((s, e) => s + e.amount, 0), settings.currency)}</span>
              </div>

              {/* Net Profit */}
              <div className="flex justify-between py-3 px-4 rounded-2xl bg-slate-900 text-white font-black text-base mt-6">
                <span>Net Operating Profit</span>
                <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {formatCurrency(netProfit, settings.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Cash Flow & Receivables */}
      {activeReportTab === 'cashflow' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Invoiced</span>
              <div className="text-xl font-black text-slate-900 mt-1">
                {formatCurrency(totalInvoicedSales, settings.currency)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Cash Collected (Realized)</span>
              <div className="text-xl font-black text-emerald-700 mt-1">
                {formatCurrency(totalAmountCollected, settings.currency)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-rose-600 block">Uncollected Receivables</span>
              <div className="text-xl font-black text-rose-600 mt-1">
                {formatCurrency(totalReceivablesPending, settings.currency)}
              </div>
            </div>
          </div>

          {/* Aged Receivables by Restaurant */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Outstanding Restaurant Receivables Ledger
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Restaurant</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3 text-right">Total Invoiced</th>
                    <th className="pb-3 text-right">Total Paid</th>
                    <th className="pb-3 text-right">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers
                    .filter(c => c.totalPending > 0)
                    .sort((a, b) => b.totalPending - a.totalPending)
                    .map(cust => (
                      <tr key={cust.id} className="hover:bg-slate-50/80">
                        <td className="py-3 font-bold text-slate-900">{cust.restaurantName}</td>
                        <td className="py-3 text-slate-500">{cust.phone}</td>
                        <td className="py-3 text-right text-slate-700 font-semibold">
                          {formatCurrency(cust.totalSalesValue, settings.currency)}
                        </td>
                        <td className="py-3 text-right text-emerald-600 font-semibold">
                          {formatCurrency(cust.totalPaid, settings.currency)}
                        </td>
                        <td className="py-3 text-right font-black text-rose-600 text-sm">
                          {formatCurrency(cust.totalPending, settings.currency)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Consumption Intelligence Audit */}
      {activeReportTab === 'consumption' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs text-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Restaurant Consumption Velocity & Repurchase Radar
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Evaluated exclusively for Handwash (Litres/Day) and Tissue (Packs/Day) based on purchase history intervals.
              </p>
            </div>

            <button
              onClick={handleExportConsumption}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Radar CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Restaurant</th>
                  <th className="pb-3 text-center">Handwash Burn Rate</th>
                  <th className="pb-3 text-center">Next Handwash Due</th>
                  <th className="pb-3 text-center">Tissue Burn Rate</th>
                  <th className="pb-3 text-center">Next Tissue Due</th>
                  <th className="pb-3 text-center">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repurchaseList.map(item => {
                  const hw = item.handwash;
                  const ts = item.tissue;

                  return (
                    <tr key={item.customer.id} className="hover:bg-slate-50/80">
                      <td className="py-3 font-bold text-slate-900">{item.customer.restaurantName}</td>
                      
                      {/* Handwash Velocity */}
                      <td className="py-3 text-center">
                        {hw?.consumptionRateDisplay ? (
                          <span className="font-semibold text-slate-800">{hw.consumptionRateDisplay}</span>
                        ) : (
                          <span className="text-slate-400">1 purchase logged</span>
                        )}
                      </td>

                      <td className="py-3 text-center">
                        {hw?.expectedNextPurchaseDate ? (
                          <span className={`font-bold ${hw.daysOverdue && hw.daysOverdue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {formatDate(hw.expectedNextPurchaseDate)}
                            {hw.daysOverdue !== null && hw.daysOverdue > 0 ? (
                              <span className="text-[10px] block font-normal text-rose-500">
                                {hw.daysOverdue}d overdue
                              </span>
                            ) : hw.daysRemaining !== null ? (
                              <span className="text-[10px] block font-normal text-slate-400">
                                in {hw.daysRemaining}d
                              </span>
                            ) : null}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Tissue Velocity */}
                      <td className="py-3 text-center">
                        {ts?.consumptionRateDisplay ? (
                          <span className="font-semibold text-slate-800">{ts.consumptionRateDisplay}</span>
                        ) : (
                          <span className="text-slate-400">1 purchase logged</span>
                        )}
                      </td>

                      <td className="py-3 text-center">
                        {ts?.expectedNextPurchaseDate ? (
                          <span className={`font-bold ${ts.daysOverdue && ts.daysOverdue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {formatDate(ts.expectedNextPurchaseDate)}
                            {ts.daysOverdue !== null && ts.daysOverdue > 0 ? (
                              <span className="text-[10px] block font-normal text-rose-500">
                                {ts.daysOverdue}d overdue
                              </span>
                            ) : ts.daysRemaining !== null ? (
                              <span className="text-[10px] block font-normal text-slate-400">
                                in {ts.daysRemaining}d
                              </span>
                            ) : null}
                          </span>
                        ) : '—'}
                      </td>

                      <td className="py-3 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            item.overallRepurchaseStatus === 'overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : item.overallRepurchaseStatus === 'approaching'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.overallRepurchaseStatus === 'overdue'
                            ? 'Overdue'
                            : item.overallRepurchaseStatus === 'approaching'
                            ? 'Approaching'
                            : item.overallRepurchaseStatus === 'healthy'
                            ? 'Healthy'
                            : 'Pending Data'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Inventory Valuation */}
      {activeReportTab === 'valuation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Stock Valuation (At Cost)</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(inventoryCostValuation, settings.currency)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Actual capital locked in warehouse inventory</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Total Potential Retail Value</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatCurrency(inventoryRetailValuation, settings.currency)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Revenue realizable upon 100% stock liquidation</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Product Stock Valuation Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3 text-center">Available Stock</th>
                    <th className="pb-3 text-right">Making Cost</th>
                    <th className="pb-3 text-right">Selling Price</th>
                    <th className="pb-3 text-right">Total Asset Cost</th>
                    <th className="pb-3 text-right">Potential Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 capitalize text-slate-500">{p.category}</td>
                      <td className="py-3 text-center font-bold text-slate-800">{p.currentStock} {p.unit}</td>
                      <td className="py-3 text-right text-slate-600">{formatCurrency(p.makingCost, settings.currency)}</td>
                      <td className="py-3 text-right text-emerald-700 font-semibold">{formatCurrency(p.sellingPrice, settings.currency)}</td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {formatCurrency(p.currentStock * p.makingCost, settings.currency)}
                      </td>
                      <td className="py-3 text-right font-extrabold text-emerald-800">
                        {formatCurrency(p.currentStock * p.sellingPrice, settings.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
