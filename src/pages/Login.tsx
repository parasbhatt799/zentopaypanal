import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';
import { Zap, Lock, Phone, ArrowRight, AlertCircle, Eye, EyeOff, ArrowLeft, Sun, Moon } from 'lucide-react';
import { StarryBackground } from '../components/StarryBackground';
import type { UserProfile } from '../types';

export const Login: React.FC = () => {
  const { login, users, theme, toggleTheme } = useAuth();
  
  // Login Panel inputs
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // MPIN UI Flow States
  const [step, setStep] = useState<'login' | 'mpin-verify' | 'mpin-create'>('login');
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  
  const [createDigits, setCreateDigits] = useState<string[]>(Array(6).fill(''));
  const [confirmDigits, setConfirmDigits] = useState<string[]>(Array(6).fill(''));
  const [verifyDigits, setVerifyDigits] = useState<string[]>(Array(6).fill(''));

  // Step 1: Handle UserID and Password Submission
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!identifier) return;

    const cleanId = identifier.trim().toLowerCase();
    
    // Find matched user profile in internal memory
    const target = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.phone && u.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, '')) ||
        u.id === cleanId
    );

    if (!target) {
      setErrorMessage('Account not found. Please verify User ID.');
      return;
    }

    // Verify Password
    const storedPasswords = JSON.parse(localStorage.getItem('zentopay_user_passwords') || '{}');
    const activePassword = target.password || storedPasswords[target.id] || 'password123';
    
    if (password !== activePassword) {
      setErrorMessage('Incorrect password. Please try again.');
      return;
    }

    // If Admin Role, bypass MPIN check and log in directly
    if (target.role === 'admin') {
      try {
        login(identifier, password);
      } catch (err: any) {
        setErrorMessage(err.message || 'Login failed.');
      }
      return;
    }

    // If User Role, trigger MPIN workflow
    setPendingUser(target);

    // Retrieve saved MPIN locally
    const storedMpins = JSON.parse(localStorage.getItem('zentopay_user_mpins') || '{}');
    const userMpin = target.mpin || storedMpins[target.id];

    if (userMpin) {
      // Prompt MPIN verification
      setStep('mpin-verify');
      setVerifyDigits(Array(6).fill(''));
    } else {
      // First-time setup: prompt MPIN creation
      setStep('mpin-create');
      setCreateDigits(Array(6).fill(''));
      setConfirmDigits(Array(6).fill(''));
    }
  };

  // Helper: auto focus shifting on typing
  const handleDigitChange = (
    value: string,
    index: number,
    type: 'verify' | 'create' | 'confirm'
  ) => {
    const digit = value.slice(-1);
    if (digit && !/^\d$/.test(digit)) return; // Only digits allowed

    const target = type === 'verify' ? verifyDigits : type === 'create' ? createDigits : confirmDigits;
    const setter = type === 'verify' ? setVerifyDigits : type === 'create' ? setCreateDigits : setConfirmDigits;

    const next = [...target];
    next[index] = digit;
    setter(next);

    // Auto-focus next box
    if (digit && index < 5) {
      const nextInput = document.getElementById(`mpin-${type}-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Helper: backward shifting on backspace
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    type: 'verify' | 'create' | 'confirm'
  ) => {
    if (e.key === 'Backspace') {
      const target = type === 'verify' ? verifyDigits : type === 'create' ? createDigits : confirmDigits;
      const setter = type === 'verify' ? setVerifyDigits : type === 'create' ? setCreateDigits : setConfirmDigits;

      if (!target[index] && index > 0) {
        const next = [...target];
        next[index - 1] = '';
        setter(next);
        const prevInput = document.getElementById(`mpin-${type}-${index - 1}`);
        prevInput?.focus();
      } else {
        const next = [...target];
        next[index] = '';
        setter(next);
      }
    }
  };

  // Step 2: Handle MPIN Creation (First time setup)
  const handleMpinCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!pendingUser) return;

    const mpinCode = createDigits.join('');
    const confirmCode = confirmDigits.join('');

    if (mpinCode.length !== 6 || confirmCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the MPIN code.');
      return;
    }

    if (mpinCode !== confirmCode) {
      setErrorMessage('MPIN codes do not match.');
      return;
    }

    try {
      // Execute login and save the newly created MPIN
      login(identifier, password, undefined, mpinCode);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed.');
    }
  };

  // Step 3: Handle MPIN Verification
  const handleMpinVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!pendingUser) return;

    const enteredMpin = verifyDigits.join('');
    if (enteredMpin.length !== 6) {
      setErrorMessage('Please enter all 6 digits.');
      return;

    }

    // Retrieve stored mpin
    const storedMpins = JSON.parse(localStorage.getItem('zentopay_user_mpins') || '{}');
    const activeMpin = pendingUser.mpin || storedMpins[pendingUser.id];

    if (enteredMpin !== activeMpin) {
      setErrorMessage('Incorrect MPIN. Please try again.');
      return;
    }

    try {
      // Credentials and MPIN match, log in
      login(identifier, password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    }
  };

  const handleBackToLogin = () => {
    setStep('login');
    setPendingUser(null);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Theme Toggle Button - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-3 rounded-xl bg-slate-800/80 dark:bg-slate-900/60 hover:bg-slate-800 dark:hover:bg-slate-800/80 text-slate-300 dark:text-slate-200 border border-slate-700/60 dark:border-slate-800/80 hover:border-indigo-500/30 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-lg"
        >
          {theme === 'light' ? <Moon className="h-5 w-5 text-indigo-500" /> : <Sun className="h-5 w-5 text-amber-400" />}
        </button>
      </div>

      {/* Starry Constellation Background */}
      <StarryBackground />

      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse-glow" />

      <div className="max-w-[420px] w-full relative z-10">
        {/* Form Panel */}
        <div className="login-card px-8 sm:px-10 py-12 shadow-2xl border border-slate-800/80">
          
          {/* STEP 1: Standard Username/Password Login */}
          {step === 'login' && (
            <>
              {/* Brand Header */}
              <div className="text-center mb-6 flex flex-col items-center justify-center">
                <h1 className="text-slate-200 dark:text-slate-700 text-base sm:text-lg font-bold uppercase tracking-widest mb-3">Login Panel</h1>
                <img src={logoImg} alt="ZentoPay Logo" className="h-16 object-contain mb-2 select-none" />
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
              
              <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    User ID (Mobile No) or Email
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter Mobile Number or Email..."
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl login-input text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-3 rounded-xl login-input text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 via-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                >
                  <span>Sign In to Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </>
          )}

          {/* STEP 2: First-Time MPIN Creation */}
          {step === 'mpin-create' && (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-3">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Create 6-Digit MPIN</h2>
                <p className="text-slate-400 text-xs mt-1">Set a 6-digit MPIN to secure dashboard access.</p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleMpinCreateSubmit} className="space-y-6">
                {/* Enter MPIN Digits */}
                <div>
                  <label className="block text-center text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                    Enter 6-Digit MPIN
                  </label>
                  <div className="flex justify-between gap-1.5 px-2">
                    {createDigits.map((d, i) => (
                      <input
                        key={`create-${i}`}
                        id={`mpin-create-${i}`}
                        type="text"
                        pattern="\d*"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleDigitChange(e.target.value, i, 'create')}
                        onKeyDown={(e) => handleKeyDown(e, i, 'create')}
                        className="w-10 h-12 text-center text-lg font-bold rounded-lg login-input focus:ring-2 focus:ring-purple-500"
                      />
                    ))}
                  </div>
                </div>

                {/* Confirm MPIN Digits */}
                <div>
                  <label className="block text-center text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                    Confirm 6-Digit MPIN
                  </label>
                  <div className="flex justify-between gap-1.5 px-2">
                    {confirmDigits.map((d, i) => (
                      <input
                        key={`confirm-${i}`}
                        id={`mpin-confirm-${i}`}
                        type="text"
                        pattern="\d*"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleDigitChange(e.target.value, i, 'confirm')}
                        onKeyDown={(e) => handleKeyDown(e, i, 'confirm')}
                        className="w-10 h-12 text-center text-lg font-bold rounded-lg login-input focus:ring-2 focus:ring-purple-500"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Create & Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent hover:border-slate-800 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Credentials</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* STEP 3: MPIN Verification */}
          {step === 'mpin-verify' && (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-3">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Enter 6-Digit MPIN</h2>
                <p className="text-slate-400 text-xs mt-1">Verify your security passcode to access dashboard.</p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleMpinVerifySubmit} className="space-y-6">
                {/* Enter MPIN Digits */}
                <div>
                  <div className="flex justify-between gap-1.5 px-2">
                    {verifyDigits.map((d, i) => (
                      <input
                        key={`verify-${i}`}
                        id={`mpin-verify-${i}`}
                        type="password"
                        pattern="\d*"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleDigitChange(e.target.value, i, 'verify')}
                        onKeyDown={(e) => handleKeyDown(e, i, 'verify')}
                        className="w-10 h-12 text-center text-lg font-bold rounded-lg login-input focus:ring-2 focus:ring-purple-500"
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Verify & Enter Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent hover:border-slate-800 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Credentials</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Tagline footer for secure payments */}
          <div className="mt-8 pt-4 border-t border-slate-800/40 dark:border-slate-800/20 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-400/90 font-medium">
            <Lock className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>100% Secure & Encrypted Payments</span>
          </div>

        </div>
      </div>
    </div>
  );
};
