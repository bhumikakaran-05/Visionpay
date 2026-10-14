import React, { useState, useEffect } from 'react';
import { User } from '../types/payment';
import { audioEngine } from '../utils/audioEngine';
import { Lock, UserCheck, KeyRound, Phone, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (user: User, token: string) => void;
  onBackToWelcome: () => void;
  isHighContrast: boolean;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  onBackToWelcome,
  isHighContrast,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [identifier, setIdentifier] = useState('9876543210');
  const [pin, setPin] = useState('2580');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    audioEngine.speak(
      'Authentication screen. You can say "Log in as demo", or enter your registered mobile number and four-digit security PIN.'
    );
  }, []);

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDemoLogin: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');

      audioEngine.playEarcon('success');
      audioEngine.speak(data.spokenGreeting);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message);
      audioEngine.playEarcon('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !pin) {
      setErrorMsg('Please enter both mobile and PIN.');
      audioEngine.speak('Please enter mobile number and 4-digit PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      audioEngine.playEarcon('success');
      audioEngine.speak(data.spokenGreeting);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message);
      audioEngine.playEarcon('error');
      audioEngine.speak('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !identifier || !pin) {
      setErrorMsg('Please fill in all registration fields.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile: identifier, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      audioEngine.playEarcon('success');
      audioEngine.speak(data.spokenGreeting);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message);
      audioEngine.playEarcon('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <button
        onClick={onBackToWelcome}
        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-amber-400 rounded px-2 py-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Back to Welcome Screen</span>
      </button>

      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {mode === 'LOGIN' ? 'Voice & Secure PIN Login' : 'Register VisionPay Account'}
        </h2>
        <p className="text-xs text-slate-300">
          Passwords and PINs are never spoken aloud to prevent shoulder-surfing and voice leakage.
        </p>
      </div>

      {errorMsg && (
        <div role="alert" className="p-3 rounded-lg bg-rose-950/80 border border-rose-600 text-rose-200 text-xs">
          {errorMsg}
        </div>
      )}

      {/* One-Click Demo Login Box */}
      <div
        className={`p-4 rounded-xl border text-center space-y-2 ${
          isHighContrast
            ? 'bg-black border-amber-400 text-amber-300'
            : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
          College Exhibition Quick Access
        </div>
        <p className="text-xs text-slate-400">
          Instant login as pre-configured test user (Aarav Sharma &middot; ₹15,000 balance).
        </p>
        <button
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold text-sm transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
        >
          {isLoading ? 'Signing In...' : 'Log In As Demo User (Say "Demo Login")'}
        </button>
      </div>

      {/* Standard Credentials Form */}
      <form
        onSubmit={mode === 'LOGIN' ? handleStandardLogin : handleRegister}
        className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4"
      >
        {mode === 'REGISTER' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-700 text-white focus:border-amber-400 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (10 Digits)</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" aria-hidden="true" />
            <input
              type="tel"
              required
              maxLength={10}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
              placeholder="9876543210"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">4-Digit Security PIN</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" aria-hidden="true" />
            <input
              type="password"
              required
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-950 border border-slate-700 text-white font-mono tracking-widest focus:border-amber-400 focus:outline-none"
            />
          </div>
          <span className="text-[11px] text-slate-500">Test demo account PIN is 2580</span>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm transition-colors focus-visible:ring-4 focus-visible:ring-amber-400 focus-visible:outline-none"
        >
          {isLoading ? 'Verifying...' : mode === 'LOGIN' ? 'Log In Securely' : 'Create Account'}
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
            className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-4"
          >
            {mode === 'LOGIN' ? "Don't have an account? Register here" : 'Already registered? Switch to Login'}
          </button>
        </div>
      </form>
    </div>
  );
};
