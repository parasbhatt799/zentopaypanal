import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ChangePassword: React.FC = () => {
  const { currentUser, changePassword, changeMPIN, changeTPIN } = useAuth();

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MPIN Form States
  const [currentMpin, setCurrentMpin] = useState('');
  const [newMpin, setNewMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [showMpinCurrent, setShowMpinCurrent] = useState(false);
  const [showMpinNew, setShowMpinNew] = useState(false);
  const [showMpinConfirm, setShowMpinConfirm] = useState(false);
  const [mpinError, setMpinError] = useState('');
  const [mpinSuccess, setMpinSuccess] = useState('');
  const [isMpinSubmitting, setIsMpinSubmitting] = useState(false);

  // T-PIN Form States
  const [currentTpin, setCurrentTpin] = useState('');
  const [newTpin, setNewTpin] = useState('');
  const [confirmTpin, setConfirmTpin] = useState('');
  const [showTpinCurrent, setShowTpinCurrent] = useState(false);
  const [showTpinNew, setShowTpinNew] = useState(false);
  const [showTpinConfirm, setShowTpinConfirm] = useState(false);
  const [tpinError, setTpinError] = useState('');
  const [tpinSuccess, setTpinSuccess] = useState('');
  const [isTpinSubmitting, setIsTpinSubmitting] = useState(false);

  // Handle Password Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentUser) return;

    // Validate current password
    const activePassword = currentUser.password || '';
    if (currentPassword !== activePassword) {
      setError('Current password is incorrect.');
      return;
    }

    // Validate length
    if (newPassword.length < 8) {
       setError('New password must be at least 8 characters long.');
       return;
     }

    // Check same password
    if (newPassword === currentPassword) {
      setError('New password cannot be the same as the current password.');
      return;
    }

    // Confirm match
    if (newPassword !== confirmPassword) {
      setError('Confirm password does not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(newPassword);
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle MPIN Submit
  const handleMpinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMpinError('');
    setMpinSuccess('');

    if (!currentUser) return;

    // Retrieve active MPIN
    const storedMpins = JSON.parse(localStorage.getItem('zentopay_user_mpins') || '{}');
    const activeMpin = currentUser.mpin || storedMpins[currentUser.id];

    // Validate current MPIN
    if (activeMpin && currentMpin !== activeMpin) {
      setMpinError('Current MPIN is incorrect.');
      return;
    }

    // Validate digit/length constraints
    if (newMpin.length !== 6 || !/^\d+$/.test(newMpin)) {
      setMpinError('New MPIN must be exactly 6 numeric digits.');
      return;
    }

    // Check same MPIN
    if (newMpin === currentMpin) {
      setMpinError('New MPIN cannot be the same as the current MPIN.');
      return;
    }

    // Confirm match
    if (newMpin !== confirmMpin) {
      setMpinError('Confirm MPIN does not match.');
      return;
    }

    setIsMpinSubmitting(true);

    try {
      await changeMPIN(newMpin);
      setMpinSuccess('MPIN updated successfully!');
      setCurrentMpin('');
      setNewMpin('');
      setConfirmMpin('');
    } catch (err: any) {
      setMpinError(err.message || 'Failed to update MPIN.');
    } finally {
      setIsMpinSubmitting(false);
    }
  };

  // Handle T-PIN Submit
  const handleTpinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTpinError('');
    setTpinSuccess('');

    if (!currentUser) return;

    // Retrieve active T-PIN
    const storedTpins = JSON.parse(localStorage.getItem('zentopay_user_tpins') || '{}');
    const activeTpin = currentUser.tpin || storedTpins[currentUser.id];

    // Validate current T-PIN if set
    if (activeTpin && currentTpin !== activeTpin) {
      setTpinError('Current T-PIN is incorrect.');
      return;
    }

    // Validate digit/length constraints
    if (newTpin.length !== 4 || !/^\d+$/.test(newTpin)) {
      setTpinError('New T-PIN must be exactly 4 numeric digits.');
      return;
    }

    // Check same T-PIN
    if (newTpin === currentTpin) {
      setTpinError('New T-PIN cannot be the same as the current T-PIN.');
      return;
    }

    // Confirm match
    if (newTpin !== confirmTpin) {
      setTpinError('Confirm T-PIN does not match.');
      return;
    }

    setIsTpinSubmitting(true);

    try {
      await changeTPIN(newTpin);
      setTpinSuccess('T-PIN updated successfully!');
      setCurrentTpin('');
      setNewTpin('');
      setConfirmTpin('');
    } catch (err: any) {
      setTpinError(err.message || 'Failed to update T-PIN.');
    } finally {
      setIsTpinSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl glass-card border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-indigo-400" />
            <span>Change Security Credentials</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Update your secret sign-in password and security MPIN passcode to keep your wallet secure.
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${currentUser?.role === 'user' ? 'lg:grid-cols-3' : 'max-w-xl'} gap-6 items-start`}>
        
        {/* CARD 1: Change Password Form */}
        <div className="glass-panel p-6 sm:p-8 border border-slate-800">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-400" />
              <span>Change Portal Password</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Change your main account sign-in password.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2.5">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl glass-input text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl glass-input text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-xl glass-input text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs shadow-xl shadow-indigo-650/20 disabled:shadow-none flex items-center justify-center space-x-2 transition-all mt-4"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 text-indigo-200" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* CARD 2: Change MPIN Form (Only visible for User Role) */}
        {currentUser?.role === 'user' && (
          <div className="glass-panel p-6 sm:p-8 border border-slate-800">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-400" />
                <span>Change Security MPIN</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Change your 6-digit transactions/login MPIN passcode.</p>
            </div>

            {mpinError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2.5">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                <span>{mpinError}</span>
              </div>
            )}

            {mpinSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>{mpinSuccess}</span>
              </div>
            )}

            <form onSubmit={handleMpinSubmit} className="space-y-5">
              {/* Current MPIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Current MPIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showMpinCurrent ? 'text' : 'password'}
                    value={currentMpin}
                    onChange={(e) => setCurrentMpin(e.target.value.slice(0, 6))}
                    placeholder="Enter current 6-digit MPIN"
                    required={!!currentUser.mpin}
                    className="w-full pl-10 pr-12 py-3 rounded-xl glass-input text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMpinCurrent(!showMpinCurrent)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showMpinCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New MPIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  New 6-Digit MPIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showMpinNew ? 'text' : 'password'}
                    value={newMpin}
                    onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter new 6-digit MPIN"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl glass-input text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMpinNew(!showMpinNew)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showMpinNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New MPIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm New MPIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showMpinConfirm ? 'text' : 'password'}
                    value={confirmMpin}
                    onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Confirm new 6-digit MPIN"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl glass-input text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMpinConfirm(!showMpinConfirm)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showMpinConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isMpinSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs shadow-xl shadow-purple-650/20 disabled:shadow-none flex items-center justify-center space-x-2 transition-all mt-4"
              >
                {isMpinSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    <span>Updating MPIN...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 text-purple-200" />
                    <span>Update MPIN</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* CARD 3: Change T-PIN Form (Only visible for User Role) */}
        {currentUser?.role === 'user' && (
          <div className="glass-panel p-6 sm:p-8 border border-slate-800">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                <span>Change Transaction T-PIN</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Change/set your 4-digit transaction security T-PIN code.</p>
            </div>

            {tpinError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2.5">
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                <span>{tpinError}</span>
              </div>
            )}

            {tpinSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <span>{tpinSuccess}</span>
              </div>
            )}

            <form onSubmit={handleTpinSubmit} className="space-y-5">
              {/* Current T-PIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Current T-PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showTpinCurrent ? 'text' : 'password'}
                    value={currentTpin}
                    onChange={(e) => setCurrentTpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder={currentUser.tpin ? "Enter current 4-digit T-PIN" : "Optional (not set yet)"}
                    required={!!currentUser.tpin}
                    className="w-full pl-10 pr-12 py-3 rounded-xl glass-input text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTpinCurrent(!showTpinCurrent)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showTpinCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New T-PIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  New 4-Digit T-PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showTpinNew ? 'text' : 'password'}
                    value={newTpin}
                    onChange={(e) => setNewTpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Enter new 4-digit T-PIN"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl glass-input text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTpinNew(!showTpinNew)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showTpinNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New T-PIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm New T-PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type={showTpinConfirm ? 'text' : 'password'}
                    value={confirmTpin}
                    onChange={(e) => setConfirmTpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Confirm new 4-digit T-PIN"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl glass-input text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTpinConfirm(!showTpinConfirm)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showTpinConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isTpinSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs shadow-xl shadow-emerald-650/20 disabled:shadow-none flex items-center justify-center space-x-2 transition-all mt-4"
              >
                {isTpinSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    <span>Updating T-PIN...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4 text-emerald-200" />
                    <span>Update T-PIN</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
