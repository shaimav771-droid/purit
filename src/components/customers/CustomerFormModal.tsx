import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { X, Building2, Phone, Mail, MapPin, DollarSign, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
}) => {
  const { addCustomer, updateCustomer, settings } = useApp();

  // General fields
  const [restaurantName, setRestaurantName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [state, setState] = useState('Kerala');
  const [stateCode, setStateCode] = useState('32');
  
  // GST Toggle [ ON / OFF ]
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstin, setGstin] = useState('');
  
  const [status, setStatus] = useState<Customer['status']>('active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customerToEdit) {
      setRestaurantName(customerToEdit.restaurantName || '');
      setLegalName(customerToEdit.legalName || '');
      setContactPerson(customerToEdit.contactPerson || '');
      setPhone(customerToEdit.phone || '');
      setEmail(customerToEdit.email || '');
      setAddress(customerToEdit.address || '');
      setBillingAddress(customerToEdit.billingAddress || customerToEdit.address || '');
      setState(customerToEdit.state || settings.state || 'Kerala');
      setStateCode(customerToEdit.stateCode || settings.stateCode || '32');
      setGstEnabled(customerToEdit.gstEnabled || false);
      setGstin(customerToEdit.gstin || '');
      setStatus(customerToEdit.status || 'active');
      setNotes(customerToEdit.notes || '');
    } else {
      setRestaurantName('');
      setLegalName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
      setBillingAddress('');
      setState(settings.state || 'Kerala');
      setStateCode(settings.stateCode || '32');
      setGstEnabled(false);
      setGstin('');
      setStatus('active');
      setNotes('');
    }
  }, [customerToEdit, isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: Partial<Customer> = {
        restaurantName: restaurantName.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        gstEnabled,
        status,
        notes: notes.trim() || undefined,
      };

      if (gstEnabled) {
        payload.legalName = legalName.trim() || restaurantName.trim();
        payload.gstin = gstin.trim().toUpperCase();
        payload.billingAddress = billingAddress.trim() || address.trim();
        payload.state = state.trim() || 'Kerala';
        payload.stateCode = stateCode.trim() || '32';
      } else {
        payload.legalName = undefined;
        payload.gstin = undefined;
        payload.billingAddress = undefined;
        payload.state = undefined;
        payload.stateCode = undefined;
      }

      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, payload);
      } else {
        await addCustomer(payload as any);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {customerToEdit ? 'Edit Customer Profile' : 'Add New Customer'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium leading-relaxed">
              Client profile, contact coordinates, and GST billing preferences.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          
          {/* GST Customer Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#ecfdf5] border border-emerald-200/80 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0 border border-slate-300/60 shadow-2xs">
                <DollarSign className="w-5 h-5 stroke-[2.25]" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">GST Customer</div>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {gstEnabled ? 'GST invoice format (18% tax)' : 'Standard non-GST invoice format'}
                </p>
              </div>
            </div>

            {/* Segmented ON/OFF Pill Toggle */}
            <div className="inline-flex rounded-full p-1 bg-white border border-slate-200 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setGstEnabled(false)}
                className={`px-3.5 py-1 text-xs font-black rounded-full transition-all cursor-pointer ${
                  !gstEnabled
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-bold'
                }`}
              >
                OFF
              </button>
              <button
                type="button"
                onClick={() => setGstEnabled(true)}
                className={`px-3.5 py-1 text-xs font-black rounded-full transition-all cursor-pointer ${
                  gstEnabled
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-bold'
                }`}
              >
                ON
              </button>
            </div>
          </div>

          {/* Restaurant / Display Name */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 text-xs sm:text-sm">
              Restaurant / Display Name <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. MSTORE / Royal Punjab"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 text-xs sm:text-sm">
              Phone Number <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Email (Optional) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 text-xs sm:text-sm">Email (Optional)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="accounts@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 text-xs sm:text-sm">
              Address <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="e.g. Sector 18, Commercial Block / Street"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (gstEnabled && !billingAddress) {
                    setBillingAddress(e.target.value);
                  }
                }}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
              />
            </div>
          </div>

          {/* Contact Person / Manager */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 text-xs sm:text-sm">Contact Person / Manager</label>
            <input
              type="text"
              placeholder="e.g. Vikram / Manager"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all"
            />
          </div>

          {/* Status Select */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 text-xs sm:text-sm">Status</label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Customer['status'])}
                className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer shadow-2xs transition-all"
              >
                <option value="active">Active Customer</option>
                <option value="due_soon">Refill Due Soon</option>
                <option value="overdue">Refill Overdue</option>
                <option value="lost">Inactive / Lost</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Conditional GST Information Section when GST is ON */}
          {gstEnabled && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs pb-1 border-b border-slate-200/60">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>GST Registration & Legal Billing Coordinates</span>
              </div>

              {/* Legal Business Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  Legal / Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={gstEnabled}
                  placeholder="e.g. MSTORE PRIVATE LIMITED"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 text-xs font-semibold"
                />
              </div>

              {/* GSTIN */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  GSTIN (15-digit Tax Identification) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={gstEnabled}
                  placeholder="e.g. 32ABZFM4622N1ZN"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono uppercase font-bold text-emerald-900"
                />
              </div>

              {/* Billing Address */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  Billing Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required={gstEnabled}
                  rows={2}
                  placeholder="e.g. APTA COWORKS, Building No. 61A, Kuzhippuram Vengara Road, Kottapparambu"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 text-xs"
                />
              </div>

              {/* State and State Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={gstEnabled}
                    placeholder="Kerala"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">
                    State Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={gstEnabled}
                    placeholder="32"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Submit & Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
            >
              {isSubmitting ? 'Saving...' : customerToEdit ? 'Update Profile' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

