import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  Edit2, 
  SlidersHorizontal, 
  PackagePlus, 
  Trash2,
  Layers,
  History,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/dateUtils';
import { AddProductModal } from './AddProductModal';
import { AddStockModal } from './AddStockModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { Product, ProductCategory } from '../../types';

export const InventoryView: React.FC = () => {
  const {
    products,
    inventoryTransactions,
    settings,
    deleteProduct,
    isAddProductModalOpen,
    setIsAddProductModalOpen,
    isAddStockModalOpen,
    setIsAddStockModalOpen,
    selectedProductForStock,
    setSelectedProductForStock,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'catalog' | 'movements'>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') return products;
    return products.filter(p => p.category === categoryFilter);
  }, [products, categoryFilter]);

  // Inventory valuation
  const totalValuationCost = products.reduce((sum, p) => sum + (p.currentStock * p.makingCost), 0);
  const totalValuationSelling = products.reduce((sum, p) => sum + (p.currentStock * p.sellingPrice), 0);
  const lowStockProducts = products.filter(p => p.currentStock <= p.reorderLevel);

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  return (
    <div id="inventory-view" className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            Inventory & Warehouse Stock
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time stock levels, weighted-average making costs, and movement ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedProductForStock(null);
              setIsAddStockModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
          >
            <PackagePlus className="w-4 h-4 text-teal-400" />
            <span>+ Receive Stock</span>
          </button>

          <button
            onClick={() => {
              setProductToEdit(null);
              setIsAddProductModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 rounded-3xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-rose-900 text-sm block">
                {lowStockProducts.length} Product(s) Below Reorder Threshold
              </span>
              <span className="text-rose-700">
                {lowStockProducts.map(p => `${p.name} (${p.currentStock} ${p.unit})`).join(', ')}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedProductForStock(lowStockProducts[0]);
              setIsAddStockModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm shrink-0"
          >
            Restock Now →
          </button>
        </div>
      )}

      {/* Valuation Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Inventory Valuation (At Cost)</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(totalValuationCost, settings.currency)}
          </div>
          <span className="text-xs text-slate-500">Based on weighted average unit costs</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Inventory Potential (At Sales Price)</span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {formatCurrency(totalValuationSelling, settings.currency)}
          </div>
          <span className="text-xs text-emerald-600 font-semibold">Total realizable retail value</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-indigo-600 block">Product Items Tracked</span>
          <div className="text-xl font-black text-indigo-900 mt-1">
            {products.length} Items
          </div>
          <span className="text-xs text-slate-500">Handwash, Tissues & Dispensers</span>
        </div>
      </div>

      {/* Tabs & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 text-xs font-semibold">
        
        {/* Main View Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'catalog' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Product Catalog ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'movements' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Ledger ({inventoryTransactions.length})</span>
          </button>
        </div>

        {/* Category Filter for Catalog */}
        {activeTab === 'catalog' && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scrollbar-none pb-1 sm:pb-0">
            {['all', 'handwash', 'tissue', 'dispenser', 'other'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs capitalize whitespace-nowrap ${
                  categoryFilter === cat ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Catalog Products Grid */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const isLowStock = product.currentStock <= product.reorderLevel;
            const marginPerUnit = product.sellingPrice - product.makingCost;
            const marginPercent = product.sellingPrice > 0
              ? Math.round((marginPerUnit / product.sellingPrice) * 100)
              : 0;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-3xl border p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isLowStock ? 'border-rose-300 ring-1 ring-rose-200/60' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 mb-1 inline-block">
                        {product.category}
                      </span>
                      <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                        {product.name}
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                        isLowStock ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>

                  {product.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                  )}

                  {/* Stock Levels Meter */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Stock</span>
                      <div className={`text-xl font-black ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>
                        {product.currentStock} <span className="text-xs font-semibold text-slate-500">{product.unit}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Alert Below</span>
                      <span className="text-xs font-bold text-slate-700">{product.reorderLevel} {product.unit}</span>
                    </div>
                  </div>

                  {/* Financial & Margin Details */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] text-slate-400 font-medium block">Making Cost</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(product.makingCost, settings.currency)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50">
                      <span className="text-[10px] text-slate-400 font-medium block">Selling Price</span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(product.sellingPrice, settings.currency)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50/50">
                      <span className="text-[10px] text-emerald-600 font-medium block">Gross Margin</span>
                      <span className="font-extrabold text-emerald-800">
                        {marginPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setProductToEdit(product)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Edit Product"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setProductToAdjust(product)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Adjust / Damaged"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setProductToDelete(product)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedProductForStock(product);
                      setIsAddStockModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <span>+ Add Stock</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Stock Movement Ledger */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs">
          {inventoryTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No inventory movements logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Movement Type</th>
                    <th className="pb-3 text-center">Qty Change</th>
                    <th className="pb-3 text-center">New Stock</th>
                    <th className="pb-3 text-right">Unit Cost</th>
                    <th className="pb-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(txn.createdAt)}
                      </td>
                      <td className="py-3 font-bold text-slate-900">
                        {txn.productName}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            txn.type === 'purchase'
                              ? 'bg-teal-100 text-teal-800'
                              : txn.type === 'sale'
                              ? 'bg-blue-100 text-blue-800'
                              : txn.type === 'damaged'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td className="py-3 text-center font-extrabold">
                        <span className={txn.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {txn.quantityChange > 0 ? `+${txn.quantityChange}` : txn.quantityChange}
                        </span>
                      </td>
                      <td className="py-3 text-center font-semibold text-slate-800">
                        {txn.newStock}
                      </td>
                      <td className="py-3 text-right text-slate-700 font-semibold">
                        {formatCurrency(txn.unitCost, settings.currency)}
                      </td>
                      <td className="py-3 text-slate-500 max-w-[200px] truncate">
                        {txn.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <AddProductModal
        isOpen={isAddProductModalOpen || !!productToEdit}
        onClose={() => {
          setIsAddProductModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
      />

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={isAddStockModalOpen}
        onClose={() => {
          setIsAddStockModalOpen(false);
          setSelectedProductForStock(null);
        }}
        product={selectedProductForStock}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={!!productToAdjust}
        onClose={() => setProductToAdjust(null)}
        product={productToAdjust}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product Item"
        message={`Are you sure you want to remove "${productToDelete?.name}" from your product catalog?`}
        confirmText="Yes, Delete Product"
        confirmVariant="danger"
      />
    </div>
  );
};
