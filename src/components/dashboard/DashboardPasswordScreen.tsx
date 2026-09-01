import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, KeyRound, ArrowRight, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const DashboardPasswordScreen: React.FC = () => {
  const { unlockDashboard, setActiveTab } = useApp();
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsSubmitting(true);
    setError(false);

    setTimeout(() => {
      const success = unlockDashboard(pin);
      if (!success) {
        setError(true);
      }
      setIsSubmitting(false);
    }, 150);
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + digit);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div id="dashboard-password-screen" className="flex items-center justify-center min-h-[75vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
      >
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 text-center text-white relative">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">Protected Analytics & Financials</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Enter the authorized PIN or password to access the executive PURIT business dashboard.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
              Dashboard Access Password
            </label>
            
            <div className="relative max-w-xs mx-auto">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="dashboard-password-input"
                type={showPassword ? "text" : "password"}
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                placeholder="Enter PIN"
                className={`w-full bg-slate-50 border ${
                  error ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40' : 'border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
                } rounded-2xl pl-10 pr-10 py-3 text-center text-slate-900 text-lg font-bold tracking-widest transition-all outline-none`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-1.5 text-xs text-rose-600 font-semibold pt-1"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Incorrect password. Please try again.</span>
              </motion.div>
            )}
          </div>

          {/* Quick Numeric Keypad for fast mobile entry */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="h-11 rounded-xl bg-slate-100/90 hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-800 text-base transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-xs font-bold text-slate-500 transition-colors flex items-center justify-center cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-11 rounded-xl bg-slate-100/90 hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-800 text-base transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-xs font-bold text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
            >
              ⌫
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2 max-w-xs mx-auto">
            <button
              type="submit"
              disabled={isSubmitting || !pin}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Verifying...' : 'Unlock Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('activities')}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors text-center"
            >
              ← Back to Upcoming Activities
            </button>
          </div>
        </form>

        {/* Footer Security Notice */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Configurable in Settings • Private Business Access</span>
        </div>
      </motion.div>
    </div>
  );
};
