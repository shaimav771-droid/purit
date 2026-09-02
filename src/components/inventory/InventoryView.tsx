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
  CheckCircle2,
  BarChart2,
  X,
  Search,
  Filter
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
    searchQuery,
    setSearchQuery,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'catalog' | 'movements'>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isValuationModalOpen, setIsValuationModalOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [localSearchTerm, setLocalSearchTerm] = useState<string>('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    const query = (localSearchTerm || searchQuery || '').toLowerCase().trim();
    return products.filter(p => {
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesSearch = !query || 
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        p.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [products, categoryFilter, localSearchTerm, searchQuery]);

  // Inventory valuation
  const totalValuationCost = useMemo(() => {
    return products.reduce((sum, p) => sum + ((Number(p.currentStock) || 0) * (Number(p.makingCost) || 0)), 0);
  }, [products]);

  const totalValuationSelling = useMemo(() => {
    return products.reduce((sum, p) => sum + ((Number(p.currentStock) || 0) * (Number(p.sellingPrice) || 0)), 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => (Number(p.currentStock) || 0) <= (Number(p.reorderLevel) || 0));
  }, [products]);

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
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsValuationModalOpen(true)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 shadow-2xs flex items-center justify-center cursor-pointer"
            title="View Inventory Valuation & Summary Cards"
            aria-label="View Inventory Valuation & Summary Cards"
          >
            <BarChart2 className="w-4 h-4 text-emerald-600" />
          </button>

          <button
            onClick={() => {
              setSelectedProductForStock(null);
              setIsAddStockModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <PackagePlus className="w-4 h-4 text-teal-400" />
            <span>+ Receive Stock</span>
          </button>

          {/* Search Icon & Input */}
          <div className="relative flex items-center">
            {isSearchOpen ? (
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl border border-slate-300 p-1 animate-in fade-in zoom-in-95 duration-150">
                <Search className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  autoFocus
                  className="bg-transparent text-slate-900 text-xs py-1 px-1.5 focus:outline-none w-32 sm:w-44"
                />
                {localSearchTerm && (
                  <button
                    onClick={() => setLocalSearchTerm('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    setLocalSearchTerm('');
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                  title="Close Search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 shadow-2xs flex items-center justify-center cursor-pointer"
                title="Search Products"
                aria-label="Search Products"
              >
                <Search className="w-4 h-4 text-slate-600" />
              </button>
            )}
          </div>
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

      {/* Tabs & Category Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 text-xs font-semibold relative">
        
        {/* Main View Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'catalog' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Product Catalog ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'movements' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Ledger ({inventoryTransactions.length})</span>
          </button>
        </div>

        {/* Category Filter Icon Button & Pop-Up */}
        {activeTab === 'catalog' && (
          <div className="relative">
            <button
              onClick={() => setIsCategoryModalOpen(!isCategoryModalOpen)}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                categoryFilter !== 'all'
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
              title="Filter by Category"
            >
              <Filter className="w-4 h-4 text-emerald-600" />
              <span className="capitalize text-xs">{categoryFilter === 'all' ? 'Filter' : categoryFilter}</span>
            </button>

            {/* Category Selection Pop-up */}
            {isCategoryModalOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsCategoryModalOpen(false)} 
                />

                <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 min-w-[160px] animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1 border-b border-slate-100 flex items-center justify-between">
                    <span>Filter Category</span>
                    <Filter className="w-3 h-3 text-slate-400" />
                  </div>

                  {['all', 'handwash', 'tissue', 'dispenser', 'other'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoryFilter(cat);
                        setIsCategoryModalOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs capitalize transition-colors flex items-center justify-between cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat}</span>
                      {categoryFilter === cat && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tab 1: Catalog Products Grid */}
      {activeTab === 'catalog' && (
        <div className="space-y-2">
          {filteredProducts.map((product) => {
            const currentStock = Number(product.currentStock) || 0;
            const reorderLevel = Number(product.reorderLevel) || 0;
            const makingCost = Number(product.makingCost) || 0;
            const sellingPrice = Number(product.sellingPrice) || 0;

            const isLowStock = currentStock <= reorderLevel;
            const marginPerUnit = sellingPrice - makingCost;
            const marginPercent = sellingPrice > 0
              ? Math.round((marginPerUnit / sellingPrice) * 100)
              : 0;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl border p-2 sm:p-2.5 shadow-2xs hover:shadow-md transition-all space-y-1 ${
                  isLowStock ? 'border-rose-300 ring-1 ring-rose-200/60 bg-rose-50/10' : 'border-slate-200'
                }`}
              >
                {/* Header Row: Category Badge, Stock Badge & Actions */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {product.category}
                    </span>
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        isLowStock ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isLowStock ? 'Low' : 'In Stock'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setProductToEdit(product)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Edit Product"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setProductToAdjust(product)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Adjust / Damaged"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setProductToDelete(product)}
                      className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProductForStock(product);
                        setIsAddStockModalOpen(true);
                      }}
                      className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] transition-colors cursor-pointer ml-0.5 shrink-0"
                    >
                      <PackagePlus className="w-3 h-3" />
                      <span>+ Stock</span>
                    </button>
                  </div>
                </div>

                {/* Full Product Name (No Truncation!) */}
                <h3 className="font-extrabold text-xs text-slate-900 leading-snug break-words">
                  {product.name}
                </h3>

                {/* 5-Column Metrics Bar (Stock & Financials) */}
                <div className="grid grid-cols-5 gap-1 text-center text-[10px] bg-slate-50 p-1 rounded-lg border border-slate-100">
                  <div className="border-r border-slate-200 pr-0.5">
                    <span className="text-[7.5px] uppercase font-bold text-slate-400 block truncate">Stock</span>
                    <span className={`font-black ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>
                      {currentStock} <span className="text-[8px] font-normal text-slate-500">{product.unit}</span>
                    </span>
                  </div>

                  <div className="border-r border-slate-200 pr-0.5">
                    <span className="text-[7.5px] uppercase font-bold text-slate-400 block truncate">Alert Below</span>
                    <span className="font-bold text-slate-700">{reorderLevel} {product.unit}</span>
                  </div>

                  <div className="border-r border-slate-200 pr-0.5">
                    <span className="text-[7.5px] uppercase font-bold text-slate-400 block truncate">Making Cost</span>
                    <span className="font-bold text-slate-800">{formatCurrency(makingCost, settings.currency)}</span>
                  </div>

                  <div className="border-r border-slate-200 pr-0.5">
                    <span className="text-[7.5px] uppercase font-bold text-slate-400 block truncate">Selling Price</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(sellingPrice, settings.currency)}</span>
                  </div>

                  <div>
                    <span className="text-[7.5px] uppercase font-bold text-emerald-600 block truncate">Margin</span>
                    <span className="font-extrabold text-emerald-800">{marginPercent}%</span>
                  </div>
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

      {/* Valuation & Summary Popup Modal */}
      {isValuationModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsValuationModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    Inventory Valuation & Metrics
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time stock valuation and tracking overview
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsValuationModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {/* Card 1: Inventory Valuation (At Cost) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Inventory Valuation (At Cost)
                </span>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {formatCurrency(totalValuationCost, settings.currency)}
                </div>
                <span className="text-xs text-slate-500">Based on weighted average unit costs</span>
              </div>

              {/* Card 2: Inventory Potential (At Sales Price) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                  Inventory Potential (At Sales Price)
                </span>
                <div className="text-xl font-black text-emerald-700 mt-1">
                  {formatCurrency(totalValuationSelling, settings.currency)}
                </div>
                <span className="text-xs text-emerald-600 font-semibold">Total realizable retail value</span>
              </div>

              {/* Card 3: Product Items Tracked */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">
                  Product Items Tracked
                </span>
                <div className="text-xl font-black text-indigo-900 mt-1">
                  {products.length} Items
                </div>
                <span className="text-xs text-slate-500">Handwash, Tissues & Dispensers</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsValuationModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
