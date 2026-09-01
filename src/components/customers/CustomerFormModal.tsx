import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { X, Building2, Phone, Mail, MapPin, Receipt, Check, FileSpreadsheet, Globe } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {customerToEdit ? 'Edit Customer Profile' : 'Add New Customer'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Client profile, contact coordinates, and GST billing preferences.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          
          {/* GST Toggle [ ON / OFF ] */}
          <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-center justify-between transition-all">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${gstEnabled ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs">GST Customer</span>
                <p className="text-[11px] text-slate-500">
                  {gstEnabled 
                    ? '18% GST (9% CGST + 9% SGST) applied on generated tax invoices' 
                    : 'Standard non-GST invoice format'}
                </p>
              </div>
            </div>

            {/* Segmented ON/OFF Switch */}
            <div className="inline-flex rounded-xl p-1 bg-white border border-teal-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setGstEnabled(false)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !gstEnabled
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                OFF
              </button>
              <button
                type="button"
                onClick={() => setGstEnabled(true)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  gstEnabled
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ON
              </button>
            </div>
          </div>

          {/* Business / Restaurant Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Restaurant / Display Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. MSTORE / Royal Punjab"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 text-sm font-medium"
              />
            </div>
          </div>

          {/* Conditional GST Section when GST = ON */}
          {gstEnabled ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-teal-800 font-bold text-xs pb-1 border-b border-slate-200/60">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>GST Registration & Legal Billing Coordinates</span>
              </div>

              {/* Legal Business Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Legal / Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={gstEnabled}
                  placeholder="e.g. MSTORE PRIVATE LIMITED"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 text-xs font-semibold"
                />
              </div>

              {/* GSTIN */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GSTIN (15-digit Tax Identification) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Receipt className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required={gstEnabled}
                    placeholder="e.g. 32ABZFM4622N1ZN"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 text-xs font-mono uppercase font-bold text-teal-900"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Billing Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required={gstEnabled}
                  rows={2}
                  placeholder="e.g. APTA COWORKS, Building No. 61A, Kuzhippuram Vengara Road, Kottapparambu, Parappur, Malappuram - 676304"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 text-xs"
                />
              </div>

              {/* State and State Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={gstEnabled}
                    placeholder="Kerala"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    State Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={gstEnabled}
                    placeholder="32"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 text-xs font-mono font-medium"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {/* Contact Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email (Optional)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="accounts@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Delivery / Physical Address */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {gstEnabled ? 'Delivery / Store Location Address' : 'Address'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                required
                rows={2}
                placeholder="e.g. Sector 18, Commercial Block / Street"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (gstEnabled && !billingAddress) {
                    setBillingAddress(e.target.value);
                  }
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 text-xs"
              />
            </div>
          </div>

          {/* Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Person / Manager</label>
              <input
                type="text"
                placeholder="e.g. Vikram / Manager"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Customer['status'])}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 text-xs font-semibold bg-white"
              >
                <option value="active">Active Customer</option>
                <option value="due_soon">Refill Due Soon</option>
                <option value="overdue">Refill Overdue</option>
                <option value="lost">Inactive / Lost</option>
              </select>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes & Preferences</label>
            <textarea
              rows={2}
              placeholder="e.g. Dispenser refill preferences, delivery timings..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-98 text-white font-bold shadow-md shadow-teal-700/20 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : customerToEdit ? 'Update Profile' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
