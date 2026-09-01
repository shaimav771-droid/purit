import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Pipette, 
  Plus, 
  RefreshCw, 
  Building2, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2,
  Calendar,
  X
} from 'lucide-react';
import { formatCurrency, formatDate, getTodayString } from '../../lib/dateUtils';
import { Dispenser, DispenserReplacement } from '../../types';

export const DispensersView: React.FC = () => {
  const {
    dispensers,
    dispenserReplacements,
    customers,
    settings,
    addDispenser,
    addDispenserReplacement,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'installed' | 'replacements'>('installed');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);

  // New dispenser form state
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [dispenserType, setDispenserType] = useState('Touchless Wall-Mounted 1000ml Handwash Dispenser');
  const [installedQuantity, setInstalledQuantity] = useState(2);
  const [costPerUnit, setCostPerUnit] = useState(450);
  const [installationDate, setInstallationDate] = useState(getTodayString());
  const [notes, setNotes] = useState('');

  // Replacement form state
  const [replaceCustomerId, setReplaceCustomerId] = useState(customers[0]?.id || '');
  const [replacementDate, setReplacementDate] = useState(getTodayString());
  const [replacedQuantity, setReplacedQuantity] = useState(1);
  const [replacementReason, setReplacementReason] = useState<'damaged' | 'malfunction' | 'upgrade' | 'lost'>('malfunction');
  const [isChargedToCustomer, setIsChargedToCustomer] = useState(false);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [replacementNotes, setReplacementNotes] = useState('');

  // Fleet stats
  const totalInstalledUnits = dispensers.reduce((sum, d) => sum + d.installedQuantity, 0);
  const totalAssetCost = dispensers.reduce((sum, d) => sum + (d.installedQuantity * d.costPerUnit), 0);
  const totalReplacedUnits = dispenserReplacements.reduce((sum, r) => sum + r.replacedQuantity, 0);

  const handleCreateDispenser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    await addDispenser({
      customerId: cust.id,
      customerName: cust.restaurantName,
      dispenserType,
      installedQuantity: Number(installedQuantity),
      costPerUnit: Number(costPerUnit),
      installationDate,
      status: 'active',
      notes: notes.trim() || undefined,
    });
    setIsAddModalOpen(false);
  };

  const handleCreateReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === replaceCustomerId);
    if (!cust) return;

    await addDispenserReplacement({
      customerId: cust.id,
      customerName: cust.restaurantName,
      replacementDate,
      replacedQuantity: Number(replacedQuantity),
      reason: replacementReason,
      isChargedToCustomer,
      chargeAmount: isChargedToCustomer ? Number(chargeAmount) : 0,
      notes: replacementNotes.trim() || undefined,
    });
    setIsReplaceModalOpen(false);
  };

  return (
    <div id="dispensers-view" className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Pipette className="w-6 h-6 text-emerald-600" />
            Dispenser Hardware Assets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track free & paid dispensers deployed at client restaurants, asset costs, and replacements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReplaceModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Record Replacement</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Install Dispensers</span>
          </button>
        </div>
      </div>

      {/* Fleet KPI Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Active Dispensers</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {totalInstalledUnits} Units Deployed
          </div>
          <span className="text-xs text-slate-500">Across {dispensers.length} restaurant locations</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Total Asset Capitalization</span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {formatCurrency(totalAssetCost, settings.currency)}
          </div>
          <span className="text-xs text-slate-500">Hardware investment at client sites</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-amber-600 block">Replacement Records</span>
          <div className="text-xl font-black text-amber-800 mt-1">
            {totalReplacedUnits} Replaced
          </div>
          <span className="text-xs text-slate-500">Breakage & maintenance audits</span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 bg-white p-2 rounded-2xl border border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('installed')}
          className={`px-3.5 py-1.5 rounded-xl transition-all ${
            activeTab === 'installed' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Installed Fleet ({dispensers.length})
        </button>

        <button
          onClick={() => setActiveTab('replacements')}
          className={`px-3.5 py-1.5 rounded-xl transition-all ${
            activeTab === 'replacements' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Replacement History ({dispenserReplacements.length})
        </button>
      </div>

      {/* Tab 1: Installed Dispensers Table */}
      {activeTab === 'installed' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs">
          {dispensers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No dispensers deployed yet. Click "+ Install Dispensers" to add hardware.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Restaurant</th>
                    <th className="pb-3">Dispenser Model / Type</th>
                    <th className="pb-3 text-center">Installed Qty</th>
                    <th className="pb-3 text-right">Unit Asset Cost</th>
                    <th className="pb-3 text-right">Total Cost</th>
                    <th className="pb-3">Installation Date</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispensers.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-bold text-slate-900">
                        {d.customerName}
                      </td>
                      <td className="py-3 text-slate-700 font-medium">
                        {d.dispenserType}
                      </td>
                      <td className="py-3 text-center font-extrabold text-emerald-800">
                        {d.installedQuantity} Units
                      </td>
                      <td className="py-3 text-right text-slate-600 font-semibold">
                        {formatCurrency(d.costPerUnit, settings.currency)}
                      </td>
                      <td className="py-3 text-right font-extrabold text-slate-900">
                        {formatCurrency(d.costPerUnit * d.installedQuantity, settings.currency)}
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(d.installationDate)}
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Replacement History */}
      {activeTab === 'replacements' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs">
          {dispenserReplacements.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No dispenser replacements recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Restaurant</th>
                    <th className="pb-3 text-center">Replaced Qty</th>
                    <th className="pb-3">Replacement Reason</th>
                    <th className="pb-3 text-center">Charged to Restaurant?</th>
                    <th className="pb-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispenserReplacements.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(r.replacementDate)}
                      </td>
                      <td className="py-3 font-bold text-slate-900">
                        {r.customerName}
                      </td>
                      <td className="py-3 text-center font-bold text-rose-600">
                        {r.replacedQuantity} Units
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                          {r.reason}
                        </span>
                      </td>
                      <td className="py-3 text-center font-semibold">
                        {r.isChargedToCustomer ? (
                          <span className="text-emerald-700">Charged ({formatCurrency(r.chargeAmount, settings.currency)})</span>
                        ) : (
                          <span className="text-slate-500">Free Replacement</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-500 max-w-[200px] truncate">
                        {r.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Install Dispenser Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Install Dispenser Hardware</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDispenser} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Restaurant</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.restaurantName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dispenser Model / Type</label>
                <input
                  type="text"
                  required
                  value={dispenserType}
                  onChange={(e) => setDispenserType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={installedQuantity}
                    onChange={(e) => setInstalledQuantity(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hardware Cost / Unit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Installation Date</label>
                <input
                  type="date"
                  required
                  value={installationDate}
                  onChange={(e) => setInstallationDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Location within Restaurant</label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen entrance & Guest washroom..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Record Installation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Replacement Modal */}
      {isReplaceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Record Dispenser Replacement</h2>
              <button onClick={() => setIsReplaceModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReplacement} className="mt-4 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Restaurant</label>
                <select
                  value={replaceCustomerId}
                  onChange={(e) => setReplaceCustomerId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.restaurantName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Replaced Quantity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={replacedQuantity}
                    onChange={(e) => setReplacedQuantity(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason</label>
                  <select
                    value={replacementReason}
                    onChange={(e) => setReplacementReason(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="malfunction">Pump Malfunction</option>
                    <option value="damaged">Damaged / Broken by Staff</option>
                    <option value="upgrade">Upgrade</option>
                    <option value="lost">Lost / Missing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Replacement Date</label>
                <input
                  type="date"
                  required
                  value={replacementDate}
                  onChange={(e) => setReplacementDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isChargedToCustomer}
                    onChange={(e) => setIsChargedToCustomer(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Charge cost to restaurant?</span>
                </label>

                {isChargedToCustomer && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount to Charge (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Broken nozzle replaced with steel pump..."
                  value={replacementNotes}
                  onChange={(e) => setReplacementNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplaceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  Save Replacement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
