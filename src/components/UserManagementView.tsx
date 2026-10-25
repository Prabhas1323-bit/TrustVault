/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, Search, ShieldCheck, UserX, UserCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api.ts';
import { User } from '../types/index.ts';

interface UserManagementViewProps {
  currentUser: User;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message || 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser.id) {
      setError('You cannot deactivate your own active administrator account.');
      return;
    }

    setActionLoading(targetUser.id);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.toggleUserStatus(targetUser.id);
      setSuccessMsg(res.message);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-heading font-bold text-xl text-[#17231D]">User Access & Identity Directory</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#087F5B] text-white">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-[#68756D] mt-0.5">
            Manage organization members, verify roles, and toggle active account credentials. Deactivated accounts are immediately barred from all endpoints.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E3E9E4] text-xs font-medium text-[#17231D] hover:bg-[#F7F8F5] transition-all shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#087F5B] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#C03939] flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-[#E5F7EE] border border-[#CBD5CD] text-xs text-[#087F5B]">
          {successMsg}
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-card rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#68756D]" />
          <input
            type="text"
            placeholder="Search by user name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] focus:outline-none focus:border-[#087F5B] text-[#17231D]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="py-1.5 px-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
        >
          <option value="ALL">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="owner">Owners</option>
          <option value="viewer">Viewers</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-[#E3E9E4]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E3E9E4] bg-white/50 text-[11px] font-semibold text-[#68756D] uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-3">Assigned Role</th>
                <th className="py-3 px-3">Account Status</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 px-4 text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E9E4]/60 text-xs">
              {filteredUsers.map((u) => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-white/80 transition-colors">
                    {/* User Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center font-bold text-xs border border-[#CBD5CD]/40">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-[#17231D]">{u.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-[#087F5B] bg-[#E5F7EE] px-1.5 py-0.2 rounded">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#68756D]">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-[#087F5B] text-white'
                            : u.role === 'owner'
                            ? 'bg-[#E5F7EE] text-[#087F5B]'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E5F7EE] text-[#087F5B]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#087F5B] mr-1.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-[#C03939]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C03939] mr-1.5" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className="py-3 px-3 text-[11px] text-[#68756D]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Toggle Status Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={isCurrent || actionLoading === u.id}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isCurrent
                            ? 'text-stone-300 cursor-not-allowed opacity-50'
                            : u.isActive
                            ? 'text-[#C03939] hover:bg-rose-50 border border-red-200 cursor-pointer'
                            : 'text-[#087F5B] hover:bg-[#E5F7EE] border border-[#CBD5CD] cursor-pointer'
                        }`}
                        title={isCurrent ? 'Cannot deactivate self' : u.isActive ? 'Deactivate user' : 'Reactivate user'}
                      >
                        {actionLoading === u.id
                          ? 'Updating...'
                          : u.isActive
                          ? 'Deactivate'
                          : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
