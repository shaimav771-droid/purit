import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Receipt, 
  CreditCard, 
  Plus, 
  Download, 
  AlertTriangle, 
  Clock, 
  Pipette, 
  CheckCircle2,
  Edit2,
  AlertOctagon,
  Calendar,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/dateUtils';
import { downloadInvoicePDF } from '../../lib/pdfGenerator';
import { CustomerFormModal } from './CustomerFormModal';
import { MarkAsLostModal } from './MarkAsLostModal';
import { Sale } from '../../types';

interface CustomerDetailViewProps {
  customerId: string;
  onBack: () => void;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customerId,
  onBack,
}) => {
  const {
    customers,
    sales,
    saleItems,
    payments,
    dispensers,
    dispenserReplacements,
    customerRepurchaseMap,
    settings,
    setIsNewSaleModalOpen,
    setIsAddPaymentModalOpen,
    setSelectedSaleForPayment,
    updateCustomer,
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);

  const customer = customers.find(c => c.id === customerId);
  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Restaurant not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs">
          Back to list
        </button>
      </div>
    );
  }

  // Get intelligence calculations
  const intelligence = customerRepurchaseMap.get(customer.id);
  
  // Customer sales
  const customerSales = sales.filter(s => s.customerId === customer.id);
  
  // Customer dispensers
  const customerDispensers = dispensers.filter(d => d.customerId === customer.id);
  const customerReplacements = dispenserReplacements.filter(r => r.customerId === customer.id);

  const handleDownloadInvoice = (sale: Sale) => {
    const items = saleItems.filter(si => si.saleId === sale.id);
    downloadInvoicePDF(sale, items, customer, settings);
  };

  const handleReactivate = async () => {
    await updateCustomer(customer.id, { status: 'active' });
  };

  return (
    <div id="customer-detail-view" className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Top Breadcrumb / Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Restaurants</span>
        </button>

        <div className="flex items-center gap-2">
          {customer.status === 'lost' ? (
            <button
              onClick={handleReactivate}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
            >
              Reactivate Restaurant
            </button>
          ) : (
            <button
              onClick={() => setIsLostModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors"
            >
              Mark as Lost
            </button>
          )}

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => setIsNewSaleModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Sale</span>
          </button>
        </div>
      </div>

      {/* Customer Hero Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {customer.restaurantName}
              </h1>
              
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  customer.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : customer.status === 'lost'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {customer.status}
              </span>

              {customer.gstEnabled && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-semibold">
                  GSTIN: {customer.gstin || 'Active'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mt-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <a href={`tel:${customer.phone}`} className="hover:text-emerald-600 font-semibold">
                  {customer.phone}
                </a>
              </div>

              {customer.legalName && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Legal Name:</span>
                  <span className="font-semibold text-slate-800">{customer.legalName}</span>
                </div>
              )}

              {customer.contactPerson && !customer.legalName && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Contact:</span>
                  <span className="font-semibold text-slate-800">{customer.contactPerson}</span>
                </div>
              )}

              {(customer.billingAddress || customer.address) && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{customer.billingAddress || customer.address} {customer.state ? `(${customer.state})` : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Pillar */}
          <div className="flex items-center gap-3 shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <div className="text-right px-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Due</span>
              <span className="text-lg font-black text-rose-600">
                {formatCurrency(customer.totalPending || 0, settings.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* 4-KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Invoiced Sales
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(customer.totalInvoicedSales || 0, settings.currency)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
              Total Received
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-800 mt-1">
              {formatCurrency(customer.totalPaid || 0, settings.currency)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
              Pending Receivable
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-rose-700 mt-1">
              {formatCurrency(customer.totalPending || 0, settings.currency)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
              Total Gross Profit
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-indigo-800 mt-1">
              {formatCurrency(customer.totalProfit || 0, settings.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* PURIT PULSE: Repurchase Intelligence Breakdown */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-900 text-white">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                PURIT PULSE — Consumption & Repurchase Engine
              </h2>
              <p className="text-xs text-slate-500">
                Calculated strictly on the latest 2 purchases for Handwash and Tissue.
              </p>
            </div>
          </div>

          {intelligence && (
            <span
              className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                intelligence.overallRepurchaseStatus === 'overdue'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : intelligence.overallRepurchaseStatus === 'approaching'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : intelligence.overallRepurchaseStatus === 'healthy'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              Cycle Status: {intelligence.overallRepurchaseStatus}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          
          {/* Handwash Intelligence Card */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Handwash Consumption
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    intelligence?.handwash.status === 'overdue'
                      ? 'bg-rose-600 text-white'
                      : intelligence?.handwash.status === 'approaching'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {intelligence?.handwash.badgeText || 'No Data'}
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Consumption Velocity:</span>
                  <span className="font-bold text-slate-800">{intelligence?.handwash.consumptionRateText}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Last Order:</span>
                  <span className="font-semibold text-slate-800">
                    {intelligence?.handwash.lastPurchaseQuantity} {intelligence?.handwash.unit} on {formatDate(intelligence?.handwash.lastPurchaseDate)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Purchase Interval (Gap):</span>
                  <span className="font-semibold text-slate-800">
                    {intelligence?.handwash.daysBetweenPurchases ? `${intelligence.handwash.daysBetweenPurchases} days` : 'First cycle'}
                  </span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Expected Next Order:</span>
                  <span className="font-bold text-slate-900">
                    {intelligence?.handwash.expectedRepurchaseDate ? formatDate(intelligence.handwash.expectedRepurchaseDate) : 'Pending more orders'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500">Total Handwash Bought:</span>
              <span className="font-black text-slate-900">{customer.totalHandwashPurchased || 0} Litres</span>
            </div>
          </div>

          {/* Tissue Intelligence Card */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  Tissue Consumption
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    intelligence?.tissue.status === 'overdue'
                      ? 'bg-rose-600 text-white'
                      : intelligence?.tissue.status === 'approaching'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {intelligence?.tissue.badgeText || 'No Data'}
                </span>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Consumption Velocity:</span>
                  <span className="font-bold text-slate-800">{intelligence?.tissue.consumptionRateText}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Last Order:</span>
                  <span className="font-semibold text-slate-800">
                    {intelligence?.tissue.lastPurchaseQuantity} {intelligence?.tissue.unit} on {formatDate(intelligence?.tissue.lastPurchaseDate)}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">Purchase Interval (Gap):</span>
                  <span className="font-semibold text-slate-800">
                    {intelligence?.tissue.daysBetweenPurchases ? `${intelligence.tissue.daysBetweenPurchases} days` : 'First cycle'}
                  </span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Expected Next Order:</span>
                  <span className="font-bold text-slate-900">
                    {intelligence?.tissue.expectedRepurchaseDate ? formatDate(intelligence.tissue.expectedRepurchaseDate) : 'Pending more orders'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500">Total Tissue Bought:</span>
              <span className="font-black text-slate-900">{customer.totalTissuePurchased || 0} Packs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Invoice History ({customerSales.length})
          </h2>
          <button
            onClick={() => setIsNewSaleModalOpen(true)}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            + Create New Invoice
          </button>
        </div>

        {customerSales.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No invoices recorded for this restaurant yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Invoice #</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Subtotal</th>
                  <th className="pb-3 text-right">GST</th>
                  <th className="pb-3 text-right">Total</th>
                  <th className="pb-3 text-right">Paid</th>
                  <th className="pb-3 text-right">Pending</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 font-bold text-slate-900">
                      #{sale.invoiceNumber}
                    </td>
                    <td className="py-3 text-slate-600">{formatDate(sale.saleDate)}</td>
                    <td className="py-3 text-right text-slate-700">{formatCurrency(sale.subtotal, settings.currency)}</td>
                    <td className="py-3 text-right text-slate-500">
                      {sale.gstAmount > 0 ? formatCurrency(sale.gstAmount, settings.currency) : '—'}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      {formatCurrency(sale.invoiceTotal, settings.currency)}
                    </td>
                    <td className="py-3 text-right text-emerald-600 font-semibold">
                      {formatCurrency(sale.paidAmount, settings.currency)}
                    </td>
                    <td className="py-3 text-right text-rose-600 font-semibold">
                      {sale.pendingAmount > 0 ? formatCurrency(sale.pendingAmount, settings.currency) : '0'}
                    </td>
                    <td className="py-3 text-center">
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
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {sale.pendingAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedSaleForPayment(sale);
                              setIsAddPaymentModalOpen(true);
                            }}
                            className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                          >
                            + Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadInvoice(sale)}
                          className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispensers Installed & Replacement Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Pipette className="w-4 h-4 text-emerald-600" />
            Dispensers Deployed ({customerDispensers.reduce((s, d) => s + d.installedQuantity, 0)} Units)
          </h2>
        </div>

        {customerDispensers.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No dedicated dispenser hardware records for this restaurant.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customerDispensers.map(d => (
              <div key={d.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-900">{d.dispenserType}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {d.installedQuantity} installed
                  </span>
                </div>
                <div className="text-slate-500 mt-1">Installed: {formatDate(d.installationDate)}</div>
                <div className="text-slate-500 mt-0.5">Asset Cost: {formatCurrency(d.costPerUnit * d.installedQuantity, settings.currency)}</div>
              </div>
            ))}
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
