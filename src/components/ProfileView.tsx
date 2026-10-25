/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KeyRound, Shield, User, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { User as UserType } from '../types/index.ts';

interface ProfileViewProps {
  user: UserType;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const { changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccessMsg('Your password has been changed securely and the event has been logged.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* Account Info Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center font-heading font-bold text-lg border border-[#CBD5CD]/50">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-[#17231D]">{user.name}</h2>
              <p className="text-xs text-[#68756D]">{user.email}</p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              user.role === 'admin'
                ? 'bg-[#087F5B] text-white'
                : user.role === 'owner'
                ? 'bg-[#E5F7EE] text-[#087F5B]'
                : 'bg-stone-100 text-stone-700'
            }`}
          >
            {user.role.toUpperCase()}
          </span>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E3E9E4] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-[11px] text-[#68756D] block">Account Identifier</span>
            <span className="font-mono text-[#17231D] font-medium">{user.id}</span>
          </div>
          <div>
            <span className="text-[11px] text-[#68756D] block">Status</span>
            <span className="text-[#087F5B] font-semibold flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#087F5B] mr-1.5" />
              Active & Authorized
            </span>
          </div>
          <div>
            <span className="text-[11px] text-[#68756D] block">Member Since</span>
            <span className="text-[#17231D] font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Password Change Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center space-x-2.5 mb-1">
          <div className="p-1.5 rounded-lg bg-[#E5F7EE] text-[#087F5B]">
            <KeyRound className="w-4 h-4" />
          </div>
          <h3 className="font-heading font-bold text-base text-[#17231D]">Update Authentication Password</h3>
        </div>
        <p className="text-xs text-[#68756D] mb-5">
          Requires verification of your current password before committing salted hash updates.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#C03939] flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#E5F7EE] border border-[#CBD5CD] text-xs text-[#087F5B] flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#17231D] mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-[#17231D] focus:outline-none focus:border-[#087F5B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#17231D] mb-1">New Password (Min 8 chars)</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-[#17231D] focus:outline-none focus:border-[#087F5B]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#17231D] mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-[#17231D] focus:outline-none focus:border-[#087F5B]"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-[#087F5B] hover:bg-[#076b4d] disabled:opacity-50 transition-all cursor-pointer shadow-xs shadow-emerald-900/10"
            >
              {loading ? 'Verifying & Committing...' : 'Commit Password Change'}
            </button>
          </div>
        </form>
      </div>

      {/* Session Security Card */}
      <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h4 className="font-heading font-bold text-sm text-[#17231D]">Terminate Active Session</h4>
          <p className="text-xs text-[#68756D] mt-0.5">
            Invalidates the current session token immediately and writes a LOGOUT security event to the audit trail.
          </p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl text-xs font-medium text-[#C03939] hover:bg-rose-50 border border-red-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
