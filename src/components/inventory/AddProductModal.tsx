import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { X, Package, DollarSign, Layers } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { addProduct, updateProduct } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('handwash');
  const [unit, setUnit] = useState('Litre');
  const [makingCost, setMakingCost] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setCategory(productToEdit.category || 'handwash');
      setUnit(productToEdit.unit || 'Litre');
      setMakingCost(productToEdit.makingCost || 0);
      setSellingPrice(productToEdit.sellingPrice || 0);
      setCurrentStock(productToEdit.currentStock || 0);
      setReorderLevel(productToEdit.reorderLevel || 10);
      setDescription(productToEdit.description || '');
    } else {
      setName('');
      setCategory('handwash');
      setUnit('Litre');
      setMakingCost(0);
      setSellingPrice(0);
      setCurrentStock(0);
      setReorderLevel(10);
      setDescription('');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name: name.trim(),
          category,
          unit: unit.trim(),
          makingCost: Number(makingCost) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          currentStock: Number(currentStock) || 0,
          reorderLevel: Number(reorderLevel) || 5,
          description: description.trim() || undefined,
        });
      } else {
        await addProduct({
          name: name.trim(),
          category,
          unit: unit.trim(),
          makingCost: Number(makingCost) || 0,
          sellingPrice: Number(sellingPrice) || 0,
          currentStock: Number(currentStock) || 0,
          reorderLevel: Number(reorderLevel) || 5,
          description: description.trim() || undefined,
        });
      }
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
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {productToEdit ? 'Edit Product Item' : 'Add Catalog Product'}
              </h2>
              <p className="text-xs text-slate-500">Configure cost, sales price and reorder alert level</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name <span className="text-rose-500">*</span></label>
            <input
              type="text"
              required
              placeholder="e.g. Premium Handwash 5L Canister"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as ProductCategory;
                  setCategory(cat);
                  if (cat === 'handwash') setUnit('Litre');
                  else if (cat === 'tissue') setUnit('Pack');
                  else if (cat === 'dispenser') setUnit('Unit');
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
              >
                <option value="handwash">Handwash</option>
                <option value="tissue">Tissue</option>
                <option value="dispenser">Dispenser</option>
                <option value="other">Other Supplies</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
              <input
                type="text"
                required
                placeholder="e.g. Litre, Pack, Box"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Making / Base Cost (₹)</label>
              <input
                type="number"
                min={0}
                step="any"
                required
                value={makingCost || ''}
                onChange={(e) => setMakingCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Selling Price (₹)</label>
              <input
                type="number"
                min={0}
                step="any"
                required
                value={sellingPrice || ''}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Stock Level</label>
              <input
                type="number"
                min={0}
                value={currentStock || ''}
                onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Low Stock Alert Level</label>
              <input
                type="number"
                min={1}
                value={reorderLevel || ''}
                onChange={(e) => setReorderLevel(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description / Formula Notes</label>
            <input
              type="text"
              placeholder="e.g. Anti-bacterial lemon fragrance 5L bulk jar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
            >
              {isSubmitting ? 'Saving...' : productToEdit ? 'Update Product' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
