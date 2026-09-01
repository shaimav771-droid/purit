import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  DollarSign, 
  PieChart, 
  X,
  TrendingDown
} from 'lucide-react';
import { formatCurrency, formatDate, getTodayString, isDateInRange } from '../../lib/dateUtils';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';

export const ExpensesView: React.FC = () => {
  const {
    expenses,
    settings,
    activeDateRange,
    addExpense,
    updateExpense,
    deleteExpense,
    isAddExpenseModalOpen,
    setIsAddExpenseModalOpen,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(getTodayString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [description, setDescription] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter expenses by date & category
  const filteredExpenses = useMemo(() => {
    let list = expenses.filter(e => isDateInRange(e.date, activeDateRange));
    if (categoryFilter !== 'all') {
      list = list.filter(e => e.category === categoryFilter);
    }
    return list;
  }, [expenses, activeDateRange, categoryFilter]);

  // Aggregate stats
  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Category breakdown calculation
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });

    return Object.entries(map).map(([cat, amt]) => ({
      category: cat,
      amount: amt,
      percentage: totalExpenseAmount > 0 ? Math.round((amt / totalExpenseAmount) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpenseAmount]);

  const handleOpenAdd = () => {
    setExpenseToEdit(null);
    setCategory('fuel');
    setAmount(0);
    setDate(getTodayString());
    setPaymentMethod('upi');
    setDescription('');
    setReferenceNumber('');
    setIsAddExpenseModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setExpenseToEdit(exp);
    setCategory(exp.category);
    setAmount(exp.amount);
    setDate(exp.date);
    setPaymentMethod(exp.paymentMethod);
    setDescription(exp.description);
    setReferenceNumber(exp.referenceNumber || '');
    setIsAddExpenseModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setIsSubmitting(true);
    try {
      if (expenseToEdit) {
        await updateExpense(expenseToEdit.id, {
          category,
          amount: Number(amount),
          date,
          paymentMethod,
          description: description.trim(),
          referenceNumber: referenceNumber.trim() || undefined,
        });
      } else {
        await addExpense({
          category,
          amount: Number(amount),
          date,
          paymentMethod,
          description: description.trim(),
          referenceNumber: referenceNumber.trim() || undefined,
        });
      }
      setIsAddExpenseModalOpen(false);
      setExpenseToEdit(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (expenseToDelete) {
      await deleteExpense(expenseToDelete.id);
      setExpenseToDelete(null);
    }
  };

  return (
    <div id="expenses-view" className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600" />
            Operating Expenses & Overhead
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log raw materials, delivery fuel, driver salary, warehouse rent, and packaging costs.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Metrics & Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Total Expense Card */}
        <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col justify-between shadow-md">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Expenses in Selected Period
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {formatCurrency(totalExpenseAmount, settings.currency)}
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              {filteredExpenses.length} expense voucher(s) logged
            </span>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 text-xs text-slate-300">
            Deducted automatically from Gross Profit to calculate Net Profit.
          </div>
        </div>

        {/* Category Breakdown list */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Top Cost Categories (Period Breakdown)
          </h3>

          {categoryBreakdown.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No expenses in this period.
            </div>
          ) : (
            <div className="space-y-2.5">
              {categoryBreakdown.slice(0, 4).map(item => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="capitalize text-slate-800">{item.category.replace('_', ' ')}</span>
                    <span className="text-slate-900 font-bold">
                      {formatCurrency(item.amount, settings.currency)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Toolbar */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scrollbar-none pb-1 bg-white p-2 rounded-2xl border border-slate-200 text-xs font-semibold">
        {['all', 'fuel', 'salary', 'transport', 'raw_materials', 'packaging', 'marketing', 'rent', 'electricity', 'maintenance', 'dispenser', 'other'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap capitalize transition-all ${
              categoryFilter === cat ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs">
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No expenses recorded for this category/period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Description / Purpose</th>
                  <th className="pb-3">Payment Method</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3 font-semibold text-slate-800 capitalize">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold">
                        {exp.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-slate-700 font-medium max-w-[240px] truncate">
                      {exp.description}
                      {exp.referenceNumber && (
                        <span className="text-[10px] text-slate-400 block font-mono">Ref: {exp.referenceNumber}</span>
                      )}
                    </td>
                    <td className="py-3 text-slate-500 uppercase font-semibold text-[10px]">
                      {exp.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="py-3 text-right font-black text-rose-600 text-sm">
                      {formatCurrency(exp.amount, settings.currency)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Expense Modal */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {expenseToEdit ? 'Edit Expense Record' : 'Record Business Expense'}
                </h2>
              </div>
              <button 
                onClick={() => {
                  setIsAddExpenseModalOpen(false);
                  setExpenseToEdit(null);
                }} 
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Category <span className="text-rose-500">*</span></label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold capitalize text-xs"
                >
                  <option value="fuel">Fuel & Petrol (Delivery)</option>
                  <option value="salary">Staff Salary & Driver Wages</option>
                  <option value="transport">Vehicle Transport & Freight</option>
                  <option value="raw_materials">Raw Materials & Formulation Chemicals</option>
                  <option value="packaging">Bottles, Caps, Boxes & Packaging</option>
                  <option value="marketing">Marketing & Samples</option>
                  <option value="rent">Warehouse / Office Rent</option>
                  <option value="electricity">Electricity & Utilities</option>
                  <option value="maintenance">Equipment Maintenance</option>
                  <option value="dispenser">Dispenser Procurement</option>
                  <option value="other">Miscellaneous Expense</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount (₹) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  required
                  placeholder="e.g. 1500"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-900 text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Paid To <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petrol for Delivery Van #02"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt / Transaction Ref (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. HP-Petrol-Bill #8819"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddExpenseModalOpen(false);
                    setExpenseToEdit(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || amount <= 0}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20"
                >
                  {isSubmitting ? 'Saving...' : expenseToEdit ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Expense Record"
        message={`Are you sure you want to remove this expense of ₹${expenseToDelete?.amount.toLocaleString('en-IN')} (${expenseToDelete?.description})?`}
        confirmText="Yes, Delete Expense"
        confirmVariant="danger"
      />
    </div>
  );
};
