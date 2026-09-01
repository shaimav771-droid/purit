import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Receipt, 
  Landmark, 
  Save, 
  RotateCcw, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  Percent, 
  FileText,
  ShieldAlert,
  Sparkles,
  Lock,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Hash,
  Layers,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { BusinessSettings } from '../../types';
import { getNextInvoiceNumber } from '../../lib/invoiceNumbering';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetToDemoData } = useApp();
  
  const [formData, setFormData] = useState<BusinessSettings>(() => ({
    ...settings,
    isGstRegistered: settings.isGstRegistered ?? true,
    gstRate: settings.gstRate ?? 18,
    cgstRate: settings.cgstRate ?? ((settings.gstRate ?? 18) / 2),
    sgstRate: settings.sgstRate ?? ((settings.gstRate ?? 18) / 2),
    invoicePrefix: settings.invoicePrefix || 'PURIT/00/',
    currentGstInvoiceNumber: settings.currentGstInvoiceNumber || 'PURIT/00/12',
    nonGstInvoicePrefix: settings.nonGstInvoicePrefix || 'NON-GST/',
    currentNonGstInvoiceNumber: settings.currentNonGstInvoiceNumber || 'NON-GST/000',
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const handleChange = (field: keyof BusinessSettings, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Automatically sync CGST and SGST when total GST rate changes
      if (field === 'gstRate') {
        const rate = parseFloat(value) || 0;
        updated.cgstRate = rate / 2;
        updated.sgstRate = rate / 2;
      }
      return updated;
    });
  };

  const nextGstPreview = useMemo(() => {
    const curr = formData.currentGstInvoiceNumber || `${formData.invoicePrefix || 'PURIT/00/'}12`;
    return getNextInvoiceNumber(curr, formData.invoicePrefix || 'PURIT/00/', '12');
  }, [formData.currentGstInvoiceNumber, formData.invoicePrefix]);

  const nextNonGstPreview = useMemo(() => {
    const curr = formData.currentNonGstInvoiceNumber || `${formData.nonGstInvoicePrefix || 'NON-GST/'}000`;
    return getNextInvoiceNumber(curr, formData.nonGstInvoicePrefix || 'NON-GST/', '000');
  }, [formData.currentNonGstInvoiceNumber, formData.nonGstInvoicePrefix]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="settings-view" className="space-y-6 pb-16 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Business Profile & Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure company branding, GST details, invoice numbering sequence, and bank payout coordinates.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Section 1: Business Identity */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Company Identity & Contact</h2>
              <p className="text-xs text-slate-400">Displayed on printed invoices and delivery challans</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Business Name *</label>
              <input
                type="text"
                required
                value={formData.businessName || ''}
                onChange={(e) => handleChange('businessName', e.target.value)}
                placeholder="e.g. PURIT"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-semibold transition-all outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Business Subtitle / Tagline (e.g. BAAMC)</label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="e.g. BAAMC"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-semibold transition-all outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Authorized Signatory Name</label>
              <input
                type="text"
                value={formData.authorizedSignatory || ''}
                onChange={(e) => handleChange('authorizedSignatory', e.target.value)}
                placeholder="e.g. Sinan Abdulatif"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-semibold transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">State (Place of Supply)</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Kerala"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm transition-all outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">State Code</label>
                <input
                  type="text"
                  value={formData.stateCode || ''}
                  onChange={(e) => handleChange('stateCode', e.target.value)}
                  placeholder="32"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-mono transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Phone Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 text-xs sm:text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Support Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@purit.in"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 text-xs sm:text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1.5">Physical Headquarters / Warehouse Address *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  required
                  rows={2}
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Warehouse 4, Industrial Area Phase 2, New Delhi 110020"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 text-xs sm:text-sm transition-all outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Tax & Invoice Settings */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-700">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Tax & Invoice Settings</h2>
                <p className="text-xs text-slate-400">Configure GST registration, CGST/SGST tax split, and independent invoice numbering sequences</p>
              </div>
            </div>
          </div>

          {/* PART A: GST BUSINESS SETTINGS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">GST Business Settings</h3>
            </div>

            {/* GST Registered Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">GST Registered Business</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    formData.isGstRegistered 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {formData.isGstRegistered ? 'ON • Registered' : 'OFF • Unregistered / Non-GST'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When enabled, tax invoices will include GSTIN, state code, and CGST + SGST tax breakdown.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleChange('isGstRegistered', !formData.isGstRegistered)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.isGstRegistered ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    formData.isGstRegistered ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Business GSTIN */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Business GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin || ''}
                  onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                  placeholder="32JSYPS1113P1ZX"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm uppercase font-mono font-bold transition-all outline-none"
                />
              </div>

              {/* Default GST Rate */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Default GST Rate (%)</label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    max="28"
                    step="any"
                    value={formData.gstRate ?? 18}
                    onChange={(e) => handleChange('gstRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-semibold transition-all outline-none"
                  />
                </div>
              </div>

              {/* CGST Rate */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  CGST Rate (%) <span className="text-[10px] text-slate-400 font-normal">(Central)</span>
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    max="14"
                    step="any"
                    value={formData.cgstRate ?? ((formData.gstRate || 18) / 2)}
                    onChange={(e) => handleChange('cgstRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-semibold transition-all outline-none"
                  />
                </div>
              </div>

              {/* SGST Rate */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  SGST Rate (%) <span className="text-[10px] text-slate-400 font-normal">(State)</span>
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    max="14"
                    step="any"
                    value={formData.sgstRate ?? ((formData.gstRate || 18) / 2)}
                    onChange={(e) => handleChange('sgstRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-semibold transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            {/* State and Place of Supply Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Business State</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => {
                    const st = e.target.value;
                    handleChange('state', st);
                    if (formData.stateCode) {
                      handleChange('placeOfSupply', `${st} (${formData.stateCode})`);
                    }
                  }}
                  placeholder="Kerala"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm transition-all outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">State Code</label>
                <input
                  type="text"
                  value={formData.stateCode || ''}
                  onChange={(e) => {
                    const sc = e.target.value;
                    handleChange('stateCode', sc);
                    if (formData.state) {
                      handleChange('placeOfSupply', `${formData.state} (${sc})`);
                    }
                  }}
                  placeholder="32"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-mono transition-all outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Place of Supply (On Invoice)</label>
                <input
                  type="text"
                  value={formData.placeOfSupply || ''}
                  onChange={(e) => handleChange('placeOfSupply', e.target.value)}
                  placeholder="Kerala (32)"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm transition-all outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4" />

          {/* PART B: GST INVOICE NUMBER CONTROL */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">GST Invoice Number Control</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">GST Invoice Prefix</label>
                <input
                  type="text"
                  value={formData.invoicePrefix || 'PURIT/00/'}
                  onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                  placeholder="PURIT/00/"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-mono font-bold transition-all outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  e.g. <span className="font-mono">PURIT/00/</span> or <span className="font-mono">PURIT/25-26/</span>
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Current GST Invoice Number *</label>
                <input
                  type="text"
                  required
                  value={formData.currentGstInvoiceNumber || ''}
                  onChange={(e) => handleChange('currentGstInvoiceNumber', e.target.value)}
                  placeholder="PURIT/00/12"
                  className="w-full bg-slate-50 border border-sky-300 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-mono font-black transition-all outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Example: <span className="font-mono font-bold text-slate-600">PURIT/00/12</span>
                </span>
              </div>
            </div>

            {/* Next GST Invoice Live Preview Card */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-950">Next GST Invoice to be generated:</span>
                  <span className="px-3 py-1 rounded-xl bg-sky-600 text-white font-mono font-black text-xs sm:text-sm shadow-xs">
                    {nextGstPreview}
                  </span>
                </div>

                <span className="text-[11px] text-sky-800 font-medium">
                  Followed by: <span className="font-mono font-semibold">{getNextInvoiceNumber(nextGstPreview)}</span>, <span className="font-mono font-semibold">{getNextInvoiceNumber(getNextInvoiceNumber(nextGstPreview))}</span>...
                </span>
              </div>

              <p className="text-[11px] text-sky-700 leading-relaxed">
                ℹ️ The system will automatically advance this counter <strong>ONLY</strong> when a GST tax invoice is actually generated.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4" />

          {/* PART C: NON-GST INVOICE NUMBERING */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Non-GST Invoice Numbering Series</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Non-GST Invoice Prefix</label>
                <input
                  type="text"
                  value={formData.nonGstInvoicePrefix || 'NON-GST/'}
                  onChange={(e) => handleChange('nonGstInvoicePrefix', e.target.value)}
                  placeholder="NON-GST/"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-mono font-bold transition-all outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  e.g. <span className="font-mono">NON-GST/</span> or <span className="font-mono">RETAIL/</span>
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Current Non-GST Invoice Number *</label>
                <input
                  type="text"
                  required
                  value={formData.currentNonGstInvoiceNumber || ''}
                  onChange={(e) => handleChange('currentNonGstInvoiceNumber', e.target.value)}
                  placeholder="NON-GST/000"
                  className="w-full bg-slate-50 border border-purple-300 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-mono font-black transition-all outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Example: <span className="font-mono font-bold text-slate-600">NON-GST/000</span> or <span className="font-mono font-bold text-slate-600">NON-GST/001</span>
                </span>
              </div>
            </div>

            {/* Next Non-GST Invoice Live Preview Card */}
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-950">Next Non-GST Invoice to be generated:</span>
                  <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-mono font-black text-xs sm:text-sm shadow-xs">
                    {nextNonGstPreview}
                  </span>
                </div>

                <span className="text-[11px] text-purple-800 font-medium">
                  Followed by: <span className="font-mono font-semibold">{getNextInvoiceNumber(nextNonGstPreview)}</span>, <span className="font-mono font-semibold">{getNextInvoiceNumber(getNextInvoiceNumber(nextNonGstPreview))}</span>...
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 border border-purple-100 text-[11px] text-purple-900 font-medium leading-relaxed">
                🔒 <strong>Series Isolation Guarantee:</strong> Non-GST invoices maintain an independent sequential counter and will <strong>NEVER</strong> consume or increment the GST invoice number series.
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4" />

          {/* PART D: INVOICE TERMS & FOOTER */}
          <div className="space-y-2 text-xs">
            <label className="block font-bold text-slate-700 mb-1.5">Invoice Terms & Declaration Footer</label>
            <textarea
              rows={2}
              value={formData.invoiceFooter || ''}
              onChange={(e) => handleChange('invoiceFooter', e.target.value)}
              placeholder="We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm transition-all outline-none"
            />
          </div>
        </div>

        {/* Section 3: Bank Payout Coordinates */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Bank Account & UPI Details</h2>
              <p className="text-xs text-slate-400">Printed on PDF invoices for customer wire payments</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Bank Name</label>
              <input
                type="text"
                value={formData.bankName || ''}
                onChange={(e) => handleChange('bankName', e.target.value)}
                placeholder="HDFC Bank / ICICI Bank"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm transition-all outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Account Number</label>
              <input
                type="text"
                value={formData.bankAccountNumber || ''}
                onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                placeholder="50200012345678"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-mono transition-all outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">IFSC Code</label>
              <input
                type="text"
                value={formData.bankIfsc || ''}
                onChange={(e) => handleChange('bankIfsc', e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm uppercase font-mono transition-all outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">UPI ID (VPA)</label>
              <input
                type="text"
                value={formData.upiId || ''}
                onChange={(e) => handleChange('upiId', e.target.value)}
                placeholder="purit@okhdfcbank"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs sm:text-sm transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Dashboard Security & PIN */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Dashboard Security & Access PIN</h2>
              <p className="text-xs text-slate-400">Password required to view executive P&L, revenue metrics, and financial dashboard</p>
            </div>
          </div>

          <div className="max-w-xs space-y-2 text-xs">
            <label className="block font-bold text-slate-700">
              Dashboard PIN / Password <span className="text-slate-400 font-normal">(Initial: 1075)</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.dashboardPassword || '1075'}
                onChange={(e) => handleChange('dashboardPassword', e.target.value)}
                placeholder="1075"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 text-xs sm:text-sm font-mono font-bold tracking-widest transition-all outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Anyone opening the Dashboard tab must enter this password to view business data.
            </p>
          </div>
        </div>

        {/* Section 5: Demo Data & Reset */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-slate-600" />
                Reset / Seed Sample Data
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Load fresh test restaurants, mock invoices, dispenser installations and products.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors self-start sm:self-auto"
            >
              Reset to Demo Dataset
            </button>
          </div>
        </div>
      </form>

      {/* Reset Confirmation Dialog */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Reset Demo Database?</h3>
              <p className="text-xs text-slate-500 mt-1">
                This will re-initialize sample restaurant accounts, sales invoices, stock inventory, and repurchase intelligence records.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsResetConfirmOpen(false);
                  await resetToDemoData();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
