import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale, PaymentMethod } from '../../types';
import { X, CreditCard, DollarSign, Calendar, FileText, Check } from 'lucide-react';
import { formatCurrency, getTodayString } from '../../lib/dateUtils';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  const { addPayment, settings, sales } = useApp();

  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(getTodayString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeSale = sale || sales.find(s => s.id === selectedSaleId);

  useEffect(() => {
    if (sale) {
      setSelectedSaleId(sale.id);
      setAmount(sale.pendingAmount || 0);
    } else {
      // Pick first unpaid sale
      const firstUnpaid = sales.find(s => s.pendingAmount > 0 && s.paymentStatus !== 'cancelled');
      if (firstUnpaid) {
        setSelectedSaleId(firstUnpaid.id);
        setAmount(firstUnpaid.pendingAmount);
      }
    }
    setPaymentDate(getTodayString());
    setPaymentMethod('upi');
    setReferenceNumber('');
    setNotes('');
  }, [sale, sales, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSale || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await addPayment(
        activeSale.id,
        amount,
        paymentMethod,
        paymentDate,
        referenceNumber.trim() || undefined,
        notes.trim() || undefined
      );
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Payment Received</h2>
              <p className="text-xs text-slate-500">Collect receivable against customer invoice</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          
          {/* Sale selector if not pre-passed */}
          {!sale && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Invoice</label>
              <select
                value={selectedSaleId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setSelectedSaleId(sId);
                  const matched = sales.find(s => s.id === sId);
                  if (matched) setAmount(matched.pendingAmount);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-xs font-semibold"
              >
                {sales
                  .filter(s => s.pendingAmount > 0 && s.paymentStatus !== 'cancelled')
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.invoiceNumber} — {s.customerName} (Pending: {formatCurrency(s.pendingAmount, settings.currency)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Active Sale Overview Banner */}
          {activeSale && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Invoice #{activeSale.invoiceNumber}</span>
                <span className="text-slate-500">{activeSale.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px] pt-1">
                <span>Invoice Total: {formatCurrency(activeSale.invoiceTotal, settings.currency)}</span>
                <span>Already Paid: {formatCurrency(activeSale.paidAmount, settings.currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600 text-xs pt-1 border-t border-slate-200/60">
                <span>Pending Balance:</span>
                <span>{formatCurrency(activeSale.pendingAmount, settings.currency)}</span>
              </div>
            </div>
          )}

          {/* Amount to collect */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700">Payment Amount Received (₹) <span className="text-rose-500">*</span></label>
              {activeSale && (
                <button
                  type="button"
                  onClick={() => setAmount(activeSale.pendingAmount)}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold"
                >
                  Pay Full ({formatCurrency(activeSale.pendingAmount, settings.currency)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                type="number"
                required
                min={1}
                max={activeSale?.pendingAmount}
                step="any"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-base font-extrabold text-slate-900"
              />
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank NEFT / IMPS</option>
                <option value="cheque">Cheque</option>
                <option value="card">Debit / Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / UTR / Cheque #</label>
            <input
              type="text"
              placeholder="e.g. UPI-1234567890 / Chq 00412"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Notes</label>
            <input
              type="text"
              placeholder="e.g. Received via manager on delivery..."
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
              disabled={isSubmitting || amount <= 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
            >
              {isSubmitting ? 'Recording...' : `Confirm ₹${amount.toLocaleString('en-IN')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
