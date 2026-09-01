import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { X, PackagePlus, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../lib/dateUtils';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { products, addStock, settings } = useApp();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedProductId(product.id);
      setUnitCost(product.makingCost);
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setUnitCost(products[0].makingCost);
    }
    setQuantity(10);
    setNotes('');
  }, [product, products, isOpen]);

  const activeProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Calculate Weighted Average Making Cost
  const calculations = useMemo(() => {
    if (!activeProduct) return { newStock: 0, newCost: 0 };

    const oldStock = Math.max(0, activeProduct.currentStock);
    const oldCost = activeProduct.makingCost;
    const addedQty = Math.max(0, Number(quantity) || 0);
    const addedCost = Math.max(0, Number(unitCost) || 0);

    const newStock = oldStock + addedQty;
    const newCost = newStock > 0
      ? ((oldStock * oldCost) + (addedQty * addedCost)) / newStock
      : addedCost;

    return {
      oldStock,
      oldCost,
      newStock,
      newCost: Math.round((newCost + Number.EPSILON) * 100) / 100,
    };
  }, [activeProduct, quantity, unitCost]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || quantity <= 0) return;

    setIsSubmitting(true);
    try {
      await addStock(
        activeProduct.id,
        Number(quantity),
        Number(unitCost),
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
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Receive Inbound Stock</h2>
              <p className="text-xs text-slate-500">Add inventory with automatic weighted average costing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Select Product */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                const pId = e.target.value;
                setSelectedProductId(pId);
                const prod = products.find(p => p.id === pId);
                if (prod) setUnitCost(prod.makingCost);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:outline-none focus:border-emerald-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current: {p.currentStock} {p.unit} @ {formatCurrency(p.makingCost, settings.currency)})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Inbound Qty ({activeProduct?.unit || 'Units'}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantity || ''}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Purchase / Unit Cost (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                step="any"
                required
                value={unitCost || ''}
                onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 text-sm"
              />
            </div>
          </div>

          {/* Live Weighted Average Cost Calculation Banner */}
          {activeProduct && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Weighted Average Costing Impact
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-400">Stock Count:</span>
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-slate-300">{calculations.oldStock} {activeProduct.unit}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{calculations.newStock} {activeProduct.unit}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Making Cost / Unit:</span>
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-slate-300">{formatCurrency(calculations.oldCost, settings.currency)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-sm">{formatCurrency(calculations.newCost, settings.currency)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Supplier / Lot Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Batch #409 from Raw Materials Supplier..."
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
              disabled={isSubmitting || quantity <= 0}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20"
            >
              {isSubmitting ? 'Updating...' : `Add +${quantity} ${activeProduct?.unit || 'Units'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
