/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, X, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login'
}) => {
  const { login, register, switchPersona } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPersona = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      await switchPersona(key);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Persona switch failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md glass-panel-elevated rounded-3xl p-6 shadow-2xl border border-[#E3E9E4]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E3E9E4]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#087F5B] to-[#10B981] text-white flex items-center justify-center shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#17231D]">
                {mode === 'login' ? 'Authenticate Vault Access' : 'Create Vault Account'}
              </h3>
              <p className="text-[11px] text-[#68756D]">Zero-trust server-enforced credentials</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-[#68756D] hover:bg-stone-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-[#F0F3EF] rounded-xl mt-4 text-xs font-medium text-[#68756D]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'login' ? 'bg-white text-[#17231D] font-semibold shadow-2xs' : 'hover:text-[#17231D]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              mode === 'register' ? 'bg-white text-[#17231D] font-semibold shadow-2xs' : 'hover:text-[#17231D]'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mt-3.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#C03939] flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {mode === 'register' && (
            <div>
              <label className="block font-medium text-[#17231D] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Elena Rostova"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E9E4] text-[#17231D] focus:outline-none focus:border-[#087F5B]"
              />
            </div>
          )}

          <div>
            <label className="block font-medium text-[#17231D] mb-1">Corporate Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@trustvault.io"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E9E4] text-[#17231D] focus:outline-none focus:border-[#087F5B]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#17231D] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E9E4] text-[#17231D] focus:outline-none focus:border-[#087F5B]"
            />
            {mode === 'register' && (
              <span className="text-[10px] text-[#68756D] mt-1 block">
                Must be at least 8 characters. New accounts are provisioned with Owner capacity.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#087F5B] hover:bg-[#076b4d] disabled:opacity-50 transition-all shadow-sm shadow-emerald-900/10 cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Demo Switcher Presets */}
        <div className="mt-5 pt-4 border-t border-[#E3E9E4]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#17231D] flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-[#087F5B]" />
              <span>1-Click Evaluator Personas:</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handleQuickPersona(p.key)}
                className="text-left p-2 rounded-xl bg-white border border-[#E3E9E4] hover:border-[#087F5B] hover:bg-[#E5F7EE]/30 transition-all text-[11px]"
              >
                <div className="font-semibold text-[#17231D] truncate">{p.name.split(' ')[0]} ({p.role})</div>
                <div className="text-[10px] text-[#68756D] truncate">{p.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
