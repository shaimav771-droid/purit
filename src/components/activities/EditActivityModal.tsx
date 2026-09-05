import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Wrench, 
  Settings2, 
  Truck, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Trash2, 
  CheckCircle2, 
  RotateCcw,
  Check,
  Layers,
  Circle,
  Plus
} from 'lucide-react';
import { Activity, ActivityStatus, ActivityTask } from '../../types';
import { 
  normalizeTasksFromActivity, 
  calculateVisitStatus, 
  normalizeTaskTypeName 
} from '../../lib/activityUtils';
import { motion } from 'motion/react';

type ActivityOption = 'Dispenser Fitting' | 'Dispenser Service' | 'Delivery';

export const EditActivityModal: React.FC = () => {
  const { 
    selectedActivityForEdit, 
    setSelectedActivityForEdit, 
    updateActivity, 
    deleteActivity,
    markActivityFinished,
    reopenActivity
  } = useApp();

  const [tasks, setTasks] = useState<ActivityTask[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');

  // Dispenser Details (3 Options: Number of Dispenser, Cost for One, Total Cost)
  const [dispenserCount, setDispenserCount] = useState<string>('');
  const [costPerDispenser, setCostPerDispenser] = useState<string>('');

  // Service Cost (Only shown when Service task is selected)
  const [serviceCost, setServiceCost] = useState<string>('');

  const totalDispenserCost = React.useMemo(() => {
    const qty = parseFloat(dispenserCount) || 0;
    const cost = parseFloat(costPerDispenser) || 0;
    return qty > 0 && cost > 0 ? qty * cost : 0;
  }, [dispenserCount, costPerDispenser]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (selectedActivityForEdit) {
      const normalizedTasks = normalizeTasksFromActivity(selectedActivityForEdit);
      setTasks(normalizedTasks);
      setCustomerName(selectedActivityForEdit.customerName || '');
      setCustomerPhone(selectedActivityForEdit.customerPhone || '');
      setCustomerAddress(selectedActivityForEdit.customerAddress || '');
      setDueDate(selectedActivityForEdit.dueDate || '');
      setRemarks(selectedActivityForEdit.remarks || '');
      setAssignedTo(selectedActivityForEdit.assignedTo || '');
      setDispenserCount(selectedActivityForEdit.dispenserCount ? String(selectedActivityForEdit.dispenserCount) : '');
      setCostPerDispenser(selectedActivityForEdit.costPerDispenser ? String(selectedActivityForEdit.costPerDispenser) : '');
      setServiceCost(selectedActivityForEdit.serviceCost ? String(selectedActivityForEdit.serviceCost) : '');
      setShowDeleteConfirm(false);
    }
  }, [selectedActivityForEdit]);

  if (!selectedActivityForEdit) return null;

  const currentVisitStatus = calculateVisitStatus(tasks);

  const toggleTaskTypeInList = (type: ActivityOption) => {
    setTasks(prev => {
      const exists = prev.some(t => normalizeTaskTypeName(t.type) === type);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least 1 task
        return prev.filter(t => normalizeTaskTypeName(t.type) !== type);
      } else {
        return [
          ...prev,
          {
            id: `task-${Date.now()}-${type.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Math.random().toString(36).substring(2, 7)}`,
            type,
            status: 'pending',
          }
        ];
      }
    });
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId || normalizeTaskTypeName(t.type) === normalizeTaskTypeName(taskId)) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        return {
          ...t,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
        };
      }
      return t;
    }));
  };

  const removeTask = (taskId: string) => {
    if (tasks.length <= 1) return;
    setTasks(prev => prev.filter(t => t.id !== taskId && normalizeTaskTypeName(t.type) !== normalizeTaskTypeName(taskId)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tasks.length === 0) return;
    setIsSubmitting(true);
    try {
      const overallStatus = calculateVisitStatus(tasks);
      const uniqueTypes = Array.from(new Set(tasks.map(t => normalizeTaskTypeName(t.type))));
      const combinedLabel = uniqueTypes.join(' + ');
      const hasFittingTask = tasks.some(t => normalizeTaskTypeName(t.type) === 'Dispenser Fitting');
      const hasServiceTask = tasks.some(t => normalizeTaskTypeName(t.type) === 'Dispenser Service');

      const numDispensers = hasFittingTask ? (parseFloat(dispenserCount) || undefined) : undefined;
      const costOne = hasFittingTask ? (parseFloat(costPerDispenser) || undefined) : undefined;
      const totCost = hasFittingTask ? (totalDispenserCost || undefined) : undefined;
      const servCost = hasServiceTask ? (parseFloat(serviceCost) || undefined) : undefined;

      await updateActivity(selectedActivityForEdit.id, {
        tasks,
        status: overallStatus,
        activityType: combinedLabel,
        activityTypes: uniqueTypes,
        type: combinedLabel,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        dueDate,
        remarks: remarks.trim(),
        assignedTo: assignedTo.trim() || undefined,
        dispenserCount: numDispensers,
        costPerDispenser: costOne,
        totalDispenserCost: totCost,
        serviceCost: servCost,
        completedAt: overallStatus === 'completed' ? (selectedActivityForEdit.completedAt || new Date().toISOString()) : null,
      });
      setSelectedActivityForEdit(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteActivity(selectedActivityForEdit.id);
      setSelectedActivityForEdit(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisitFinished = async () => {
    if (currentVisitStatus === 'completed') {
      await reopenActivity(selectedActivityForEdit.id);
      setSelectedActivityForEdit(null);
    } else {
      await markActivityFinished(selectedActivityForEdit.id);
      setSelectedActivityForEdit(null);
    }
  };

  const hasType = (t: ActivityOption) => tasks.some(task => normalizeTaskTypeName(task.type) === t);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Edit Operational Visit</h2>
              <p className="text-xs text-slate-500">1 Restaurant + 1 Date = 1 Visit Card</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedActivityForEdit(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Quick Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Visit Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                currentVisitStatus === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentVisitStatus === 'partially_completed'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {currentVisitStatus === 'completed' ? 'All Tasks Done' : currentVisitStatus === 'partially_completed' ? 'Partially Done' : 'Pending'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleVisitFinished}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentVisitStatus === 'completed'
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              }`}
            >
              {currentVisitStatus === 'completed' ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-open Visit</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark All Finished</span>
                </>
              )}
            </button>
          </div>

          {/* Activity Tasks in this Visit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tasks in This Visit
              </label>
              <span className="text-[10px] text-slate-500 font-medium">Tap task to toggle done/pending</span>
            </div>

            {/* Quick Type Selection Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => toggleTaskTypeInList('Dispenser Fitting')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center relative cursor-pointer ${
                  hasType('Dispenser Fitting') 
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/30' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 opacity-70'
                }`}
              >
                🔧 Fitting
                {hasType('Dispenser Fitting') && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px]">
                    ✓
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleTaskTypeInList('Dispenser Service')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center relative cursor-pointer ${
                  hasType('Dispenser Service') 
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 ring-2 ring-indigo-500/30' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 opacity-70'
                }`}
              >
                🛠️ Service
                {hasType('Dispenser Service') && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px]">
                    ✓
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleTaskTypeInList('Delivery')}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center relative cursor-pointer ${
                  hasType('Delivery') 
                    ? 'bg-sky-50 border-sky-600 text-sky-900 ring-2 ring-sky-500/30' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 opacity-70'
                }`}
              >
                🚚 Delivery
                {hasType('Delivery') && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[9px]">
                    ✓
                  </span>
                )}
              </button>
            </div>

            {/* Individual Task Progress List */}
            <div className="space-y-1.5 pt-1">
              {tasks.map((task, idx) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={`task-${task.id || task.type}-${idx}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTaskStatus(task.id)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-800 text-left flex-1 cursor-pointer"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0 hover:text-emerald-600" />
                      )}
                      <span className={isDone ? 'line-through text-slate-500' : 'text-slate-900'}>
                        {task.type}
                      </span>
                    </button>

                    {tasks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove task from visit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Restaurant details */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Restaurant Info
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="tel"
                placeholder="Phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <input
                type="text"
                placeholder="Address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Due Date & Assigned Staff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Visit Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assigned Staff
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Visit Instructions / Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add instructions or notes..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Dispenser Details (3 Options) - Only shown when 'Dispenser Fitting' task is selected */}
          {tasks.some(t => normalizeTaskTypeName(t.type) === 'Dispenser Fitting') && (
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dispenser Details</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                    Number of Dispenser
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2"
                    value={dispenserCount}
                    onChange={(e) => setDispenserCount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                    Cost for One
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={costPerDispenser}
                      onChange={(e) => setCostPerDispenser(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-6 pr-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                    Total Cost
                  </label>
                  <div className="w-full bg-emerald-50/80 border border-emerald-200/90 rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-800 flex items-center h-[33px]">
                    ₹{totalDispenserCost ? totalDispenserCost.toLocaleString('en-IN') : '0'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Cost Option - Only shown when 'Dispenser Service' task is selected */}
          {tasks.some(t => normalizeTaskTypeName(t.type) === 'Dispenser Service') && (
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1">
                <Settings2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Service Cost</span>
              </label>
              <div className="max-w-[200px]">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={serviceCost}
                    onChange={(e) => setServiceCost(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-6 pr-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Visit</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedActivityForEdit(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Visit'}</span>
              </button>
            </div>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
