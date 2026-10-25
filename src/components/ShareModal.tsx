/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Share2, X, Trash2, UserPlus, ShieldAlert, CheckCircle2, User, Clock } from 'lucide-react';
import { api } from '../services/api.ts';
import { DocumentRecord, PermissionRecord, User as UserType } from '../types/index.ts';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  currentUser: UserType;
  availableUsers: UserType[];
  onPermissionsUpdated: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  currentUser,
  availableUsers,
  onPermissionsUpdated
}) => {
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && doc) {
      loadPermissions();
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const loadPermissions = async () => {
    try {
      const data = await api.getPermissions(doc.id);
      setPermissions(data.permissions);
    } catch (err: any) {
      setError(err.message || 'Failed to load permissions');
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Please select a recipient user from the directory.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.grantPermission(doc.id, selectedUserId, selectedLevel);
      setSuccessMsg(`Granted ${selectedLevel} permission successfully.`);
      setSelectedUserId('');
      await loadPermissions();
      onPermissionsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to grant permission');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (userId: string, email: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.revokePermission(doc.id, userId);
      setSuccessMsg(`Revoked permission from ${email}. Access is blocked immediately.`);
      await loadPermissions();
      onPermissionsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke permission');
    } finally {
      setLoading(false);
    }
  };

  // Exclude document owner and users who already have a grant
  const grantedUserIds = new Set(permissions.map((p) => p.userId));
  const candidateUsers = availableUsers.filter(
    (u) => u.id !== doc.ownerId && u.id !== currentUser.id && !grantedUserIds.has(u.id) && u.isActive
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl glass-panel-elevated rounded-3xl p-6 shadow-2xl border border-[#E3E9E4] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#E3E9E4]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#17231D]">Access Control & Sharing</h3>
              <p className="text-[11px] text-[#68756D] truncate max-w-sm">
                Managing: <span className="font-semibold text-[#17231D]">{doc.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#68756D] hover:bg-stone-100 transition-colors"
            aria-label="Close share modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#C03939] flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-[#E5F7EE] border border-[#CBD5CD] text-xs text-[#087F5B] flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Grant New Permission Form */}
        <form onSubmit={handleGrant} className="mt-5 p-4 rounded-2xl bg-white border border-[#E3E9E4] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#17231D] flex items-center space-x-1.5">
              <UserPlus className="w-4 h-4 text-[#087F5B]" />
              <span>Grant New Access</span>
            </span>
            <span className="text-[11px] text-[#68756D]">Zero-trust per-document delegation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            <div className="sm:col-span-7">
              <label className="block text-[11px] font-medium text-[#68756D] mb-1">Select Registered User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
              >
                <option value="">Choose collaborator...</option>
                {candidateUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-medium text-[#68756D] mb-1">Permission Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as any)}
                className="w-full px-2.5 py-2 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
              >
                <option value="VIEW">VIEW (Read & Download)</option>
                <option value="EDIT">EDIT (Metadata Edit + Download)</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={loading || !selectedUserId}
                className="w-full py-2 px-3 rounded-xl text-xs font-medium text-white bg-[#087F5B] hover:bg-[#076b4d] disabled:opacity-50 transition-all cursor-pointer shadow-xs shadow-emerald-900/10"
              >
                Grant
              </button>
            </div>
          </div>
        </form>

        {/* Active Collaborators List */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-[#17231D]">Active Access Grants</h4>
            <span className="text-[11px] text-[#68756D]">
              {permissions.length} {permissions.length === 1 ? 'user' : 'users'} granted access
            </span>
          </div>

          <div className="space-y-2">
            {permissions.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-[#CBD5CD] rounded-2xl bg-white/50 text-[#68756D] text-xs">
                This document is currently private to the owner. No external grants have been issued.
              </div>
            ) : (
              permissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E9E4] text-xs hover:border-[#CBD5CD] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center font-bold text-xs">
                      {perm.userName ? perm.userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-[#17231D]">{perm.userName || perm.userEmail}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            perm.permissionLevel === 'EDIT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {perm.permissionLevel}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-[#68756D] mt-0.5">
                        <span>{perm.userEmail}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-0.5 text-stone-400" />
                          Granted {new Date(perm.grantedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(perm.userId, perm.userEmail)}
                    disabled={loading}
                    className="p-1.5 text-[#C03939] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Revoke access immediately (blocks subsequent downloads and requests)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Policy Notice Footer */}
        <div className="mt-5 p-3 rounded-xl bg-[#F0F3EF] border border-[#E3E9E4] text-[11px] text-[#68756D] leading-relaxed">
          <p className="font-semibold text-[#17231D] mb-0.5">Immediate Revocation Guarantee</p>
          Revoking access invalidates the recipient&apos;s authorization on the server in real-time. Any concurrent or subsequent file download request will result in an immediate HTTP 403 Forbidden.
        </div>
      </div>
    </div>
  );
};
