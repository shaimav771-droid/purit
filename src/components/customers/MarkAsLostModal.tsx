import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { AlertOctagon, X } from 'lucide-react';

interface MarkAsLostModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const MarkAsLostModal: React.FC<MarkAsLostModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { updateCustomer } = useApp();
  const [reason, setReason] = useState<string>('switched_supplier');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !customer) return null;

  const reasonsList = [
    { id: 'switched_supplier', label: 'Switched to Competitor / Other Supplier' },
    { id: 'restaurant_closed', label: 'Restaurant / Outlet Closed' },
    { id: 'price_issue', label: 'Price Sensitivity / Budget Issue' },
    { id: 'product_issue', label: 'Product / Quality Feedback' },
    { id: 'unknown', label: 'Unresponsive / Unknown Reason' },
    { id: 'other', label: 'Other Reason' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateCustomer(customer.id, {
        status: 'lost',
        lostReason: reason as any,
        lostDate: new Date().toISOString().split('T')[0],
        notes: notes.trim() ? `[LOST REASON: ${reason}] ${notes}\n${customer.notes || ''}` : customer.notes,
      });
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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Mark Restaurant as Lost</h2>
              <p className="text-xs text-slate-500">{customer.restaurantName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-2">Primary Reason for Churn</label>
            <div className="space-y-2">
              {reasonsList.map(r => (
                <label 
                  key={r.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    reason === r.id ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="churnReason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Additional Observations & Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Discussed with owner; competitor offered 10% lower bulk rate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 text-xs"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20"
            >
              {isSubmitting ? 'Updating...' : 'Confirm Lost Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
