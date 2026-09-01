import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale } from '../../types';
import { 
  X, 
  Receipt, 
  Download, 
  CreditCard, 
  AlertTriangle, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  CheckCircle2,
  Trash2,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/dateUtils';
import { downloadInvoicePDF, shareInvoiceViaWhatsApp } from '../../lib/pdfGenerator';
import { ConfirmModal } from '../common/ConfirmModal';
import { Send } from 'lucide-react';

interface SaleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  const {
    saleItems,
    payments,
    customers,
    settings,
    cancelSale,
    setIsAddPaymentModalOpen,
    setSelectedSaleForPayment,
  } = useApp();

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  if (!isOpen || !sale) return null;

  const items = saleItems.filter(si => si.saleId === sale.id);
  const salePayments = payments.filter(p => p.saleId === sale.id);
  const customer = customers.find(c => c.id === sale.customerId);

  const handleDownload = () => {
    downloadInvoicePDF(sale, items, customer, settings);
  };

  const handleWhatsApp = async () => {
    await shareInvoiceViaWhatsApp(sale, items, customer, settings);
  };

  const handleConfirmCancel = async () => {
    await cancelSale(sale.id, "Cancelled by user");
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] overflow-y-auto text-xs">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Invoice #{sale.invoiceNumber}
                  </h2>
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
                </div>
                <p className="text-slate-500 mt-0.5">
                  Issued on {formatDate(sale.saleDate)}
                </p>
              </div>
            </div>

            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Customer & Billing Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Billed To
              </span>
              <div className="font-extrabold text-slate-900 text-sm">{sale.customerName}</div>
              <div className="text-slate-600 mt-0.5">{sale.customerPhone}</div>
              {sale.customerAddress && <div className="text-slate-500 truncate mt-0.5">{sale.customerAddress}</div>}
              {sale.customerGstin && (
                <div className="text-[11px] font-mono font-semibold text-emerald-800 mt-1">
                  GSTIN: {sale.customerGstin}
                </div>
              )}
            </div>

            <div className="sm:text-right flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Invoice Financials
                </span>
                <div className="text-xl font-black text-slate-900">
                  {formatCurrency(sale.invoiceTotal, settings.currency)}
                </div>
              </div>

              <div className="mt-2 space-y-0.5">
                <div className="text-emerald-700 font-semibold">
                  Paid: {formatCurrency(sale.paidAmount, settings.currency)}
                </div>
                {sale.pendingAmount > 0 && (
                  <div className="text-rose-600 font-bold">
                    Pending Due: {formatCurrency(sale.pendingAmount, settings.currency)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="my-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
              Itemized Products ({items.length})
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Rate</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {item.productName}
                        <span className="text-[10px] text-slate-400 block capitalize">{item.category}</span>
                      </td>
                      <td className="p-2.5 text-center font-medium text-slate-700">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-2.5 text-right text-slate-600">
                        {formatCurrency(item.unitSellingPrice, settings.currency)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900">
                        {formatCurrency(item.totalBeforeGst, settings.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
            <div className="flex justify-between text-slate-300">
              <span>Taxable Subtotal:</span>
              <span className="font-semibold text-white">{formatCurrency(sale.subtotal, settings.currency)}</span>
            </div>

            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-300">
                <span>Discount:</span>
                <span>− {formatCurrency(sale.discount, settings.currency)}</span>
              </div>
            )}

            {sale.gstAmount > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>GST ({sale.gstRate}%):</span>
                <span className="font-semibold text-emerald-400">+{formatCurrency(sale.gstAmount, settings.currency)}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-sm text-white pt-2 border-t border-slate-800">
              <span>Invoice Total:</span>
              <span className="text-emerald-400 text-base">{formatCurrency(sale.invoiceTotal, settings.currency)}</span>
            </div>

            {sale.oldDue > 0 && (
              <div className="flex justify-between text-rose-300 text-xs">
                <span>+ Old Due from previous invoices:</span>
                <span>{formatCurrency(sale.oldDue, settings.currency)}</span>
              </div>
            )}
          </div>

          {/* Payment Receipts History */}
          {salePayments.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                Payments Received ({salePayments.length})
              </h3>
              <div className="space-y-1.5">
                {salePayments.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <div>
                      <span className="font-bold text-emerald-900 capitalize">{p.paymentMethod.replace('_', ' ')}</span>
                      <span className="text-slate-500 ml-2">• {formatDate(p.paymentDate)}</span>
                      {p.referenceNumber && <span className="text-slate-400 block text-[10px]">Ref: {p.referenceNumber}</span>}
                    </div>
                    <span className="font-extrabold text-emerald-800 text-sm">
                      {formatCurrency(p.amount, settings.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes if any */}
          {sale.notes && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 text-slate-600 text-xs border border-slate-100">
              <span className="font-semibold text-slate-700 block mb-0.5">Notes:</span>
              {sale.notes}
            </div>
          )}

          {/* Actions Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {sale.paymentStatus !== 'cancelled' ? (
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Void / Cancel Invoice</span>
              </button>
            ) : (
              <span className="text-xs text-rose-600 font-bold">This invoice is VOID / CANCELLED</span>
            )}

            <div className="flex items-center gap-2">
              {sale.pendingAmount > 0 && sale.paymentStatus !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSaleForPayment(sale);
                    setIsAddPaymentModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  + Add Payment
                </button>
              )}

              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold cursor-pointer transition-colors"
                title="Send Invoice PDF via WhatsApp"
              >
                <Send className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation to void invoice */}
      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Void / Cancel Sales Invoice"
        message={`Are you sure you want to cancel Invoice #${sale.invoiceNumber}? This will restore the product stock back to inventory and deduct the invoice value from the customer's balance.`}
        confirmText="Yes, Void Invoice"
        confirmVariant="danger"
      />
    </>
  );
};
