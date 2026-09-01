import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { X, SlidersHorizontal, AlertTriangle } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { adjustStock } = useApp();

  const [newStock, setNewStock] = useState<number>(0);
  const [reasonType, setReasonType] = useState<'adjustment' | 'damaged'>('adjustment');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setNewStock(product.currentStock);
      setReasonType('adjustment');
      setNotes('');
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const diff = newStock - product.currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adjustStock(
        product.id,
        Number(newStock),
        reasonType,
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
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-xs">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Adjust Inventory Stock</h2>
              <p className="text-xs text-slate-500">{product.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
            <span className="text-slate-500">Current Recorded Stock:</span>
            <span className="font-extrabold text-slate-900 text-sm">{product.currentStock} {product.unit}</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Adjustment Reason</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReasonType('adjustment')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                  reasonType === 'adjustment'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Physical Audit / Recount
              </button>
              <button
                type="button"
                onClick={() => setReasonType('damaged')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all text-center ${
                  reasonType === 'damaged'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Damaged / Leakage
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              New Accurate Stock Count ({product.unit}) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              required
              value={newStock}
              onChange={(e) => setNewStock(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 text-base"
            />
            {diff !== 0 && (
              <span className={`text-[11px] font-semibold mt-1 block ${diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {diff > 0 ? `+${diff}` : `${diff}`} {product.unit} adjustment
              </span>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Explanation Notes</label>
            <input
              type="text"
              placeholder="e.g. Broken seal during transit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

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
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              {isSubmitting ? 'Adjusting...' : 'Save Stock Count'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
