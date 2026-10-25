/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  AlertOctagon,
  KeyRound,
  Download,
  Trash2,
  Share2,
  Upload,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AuditLogRecord } from '../types/index.ts';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAuditLogs();
      setLogs(data.logs);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesStatus && matchesAction;
  });

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return <KeyRound className="w-3.5 h-3.5 text-stone-600" />;
    if (action.includes('UPLOAD')) return <Upload className="w-3.5 h-3.5 text-[#087F5B]" />;
    if (action.includes('DOWNLOAD')) return <Download className="w-3.5 h-3.5 text-blue-600" />;
    if (action.includes('DELETE')) return <Trash2 className="w-3.5 h-3.5 text-[#C03939]" />;
    if (action.includes('PERMISSION')) return <Share2 className="w-3.5 h-3.5 text-purple-600" />;
    if (action.includes('DENIED')) return <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />;
    return <UserCheck className="w-3.5 h-3.5 text-stone-600" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E5F7EE] text-[#087F5B]">
            SUCCESS
          </span>
        );
      case 'DENIED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
            DENIED (BLOCKED)
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-[#C03939]">
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-heading font-bold text-xl text-[#17231D]">System-Wide Security Audit Logs</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#087F5B] text-white">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-[#68756D] mt-0.5">
            Immutable, non-repudiable audit trail recording all authentication, access requests, grants, and policy blocks.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E3E9E4] text-xs font-medium text-[#17231D] hover:bg-[#F7F8F5] transition-all shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#087F5B] ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-card rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#68756D]" />
          <input
            type="text"
            placeholder="Search by actor email, action, IP address, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] focus:outline-none focus:border-[#087F5B] text-[#17231D]"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-[#17231D] focus:outline-none focus:border-[#087F5B]"
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="DENIED">Denied / Blocked</option>
            <option value="FAILED">Failed</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-[#17231D] focus:outline-none focus:border-[#087F5B]"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
            <option value="LOGIN_FAILURE">Login Failure</option>
            <option value="DOCUMENT_UPLOAD">Upload</option>
            <option value="DOCUMENT_DOWNLOAD">Download</option>
            <option value="DOCUMENT_DELETE">Delete</option>
            <option value="METADATA_UPDATE">Metadata Edit</option>
            <option value="PERMISSION_GRANT">Permission Grant</option>
            <option value="PERMISSION_REVOKE">Permission Revoke</option>
            <option value="AUTHORIZATION_DENIED">Authorization Denied</option>
            <option value="USER_STATUS_CHANGE">User Status Change</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-[#E3E9E4]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E3E9E4] bg-white/50 text-[11px] font-semibold text-[#68756D] uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Outcome</th>
                <th className="py-3 px-3">IP & Client</th>
                <th className="py-3 px-4">Security Context & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E9E4]/60 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#68756D]">
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#68756D] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    {/* Actor */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-medium text-[#17231D]">{log.actorEmail}</span>
                      <span className="text-[10px] text-stone-400 block font-mono">ID: {log.actorId.substring(0, 12)}</span>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <div className="p-1 rounded bg-[#F7F8F5] border border-[#E3E9E4]">
                          {getActionIcon(log.action)}
                        </div>
                        <span className="font-semibold text-[11px] font-mono text-[#17231D]">
                          {log.action}
                        </span>
                      </div>
                    </td>

                    {/* Outcome */}
                    <td className="py-2.5 px-3 whitespace-nowrap">{getStatusBadge(log.status)}</td>

                    {/* IP */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#68756D] whitespace-nowrap">
                      {log.ipAddress}
                    </td>

                    {/* Details */}
                    <td className="py-2.5 px-4 text-[#17231D] max-w-xs break-words">
                      {log.details || `${log.resourceType}: ${log.resourceId}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
