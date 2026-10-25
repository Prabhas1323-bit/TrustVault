/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Files, Share2, ShieldAlert, Users, HardDrive, ShieldCheck, UserCheck } from 'lucide-react';
import { DashboardStats, User } from '../types/index.ts';

interface StatsCardsProps {
  stats: DashboardStats | null;
  user: User;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, user }) => {
  if (!stats) return null;

  const isAdmin = user.role === 'admin';
  const isViewer = user.role === 'viewer';

  const cards = isAdmin
    ? [
        {
          label: 'Total Registered Users',
          value: stats.totalUsers,
          sub: 'Accounts managed',
          icon: Users,
          tint: 'bg-[#E5F7EE] text-[#087F5B]'
        },
        {
          label: 'Vault Documents',
          value: stats.totalDocuments,
          sub: 'Across all workspaces',
          icon: Files,
          tint: 'bg-[#E5F7EE] text-[#087F5B]'
        },
        {
          label: 'Active Grants',
          value: stats.activeGrantsCount,
          sub: `${stats.sharedDocumentsCount} shared documents`,
          icon: Share2,
          tint: 'bg-emerald-50 text-emerald-700'
        },
        {
          label: 'Total Encrypted Storage',
          value: formatBytes(stats.totalStorageBytes),
          sub: 'Zero public exposure',
          icon: HardDrive,
          tint: 'bg-stone-100 text-stone-700'
        },
        {
          label: 'Security Audit Events',
          value: stats.recentAuditCount,
          sub: 'Immutable system trail',
          icon: ShieldCheck,
          tint: 'bg-[#E5F7EE] text-[#087F5B]'
        },
        {
          label: 'Denied Access Attempts',
          value: stats.deniedAttemptsCount,
          sub: 'Blocked by authorization',
          icon: ShieldAlert,
          tint: stats.deniedAttemptsCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-600'
        }
      ]
    : isViewer
    ? [
        {
          label: 'Documents Shared With Me',
          value: stats.sharedWithMeCount,
          sub: 'Authorized for access',
          icon: Files,
          tint: 'bg-[#E5F7EE] text-[#087F5B]'
        },
        {
          label: 'Global RBAC Status',
          value: 'Viewer',
          sub: 'Read-only authorized scope',
          icon: UserCheck,
          tint: 'bg-stone-100 text-[#17231D]'
        },
        {
          label: 'Active Document Grants',
          value: stats.sharedWithMeCount,
          sub: 'Granted by owners',
          icon: Share2,
          tint: 'bg-[#E5F7EE] text-[#087F5B]'
        },
        {
          label: 'Security Policy',
          value: 'Strict Deny',
          sub: 'No uploads or deletions',
          icon: ShieldCheck,
          tint: 'bg-emerald-50 text-[#087F5B]'
        }
      ]
    : [
        // Owner View
        {
          label: 'My Uploaded Documents',
          value: stats.myDocumentsCount,
          sub: 'Owned by you',
          icon: Files,
          tint: 'bg-[#E5F7EE] text-[#087F5B]'
        },
        {
          label: 'Documents Shared With Me',
          value: stats.sharedWithMeCount,
          sub: 'Collaborator access',
          icon: Share2,
          tint: 'bg-emerald-50 text-[#087F5B]'
        },
        {
          label: 'Total Active Grants',
          value: stats.activeGrantsCount,
          sub: 'Delegated permissions',
          icon: Users,
          tint: 'bg-[#E5F7EE] text-[#087F5B]'
        },
        {
          label: 'Total Encrypted Storage',
          value: formatBytes(stats.totalStorageBytes),
          sub: 'Private disk storage',
          icon: HardDrive,
          tint: 'bg-stone-100 text-stone-700'
        }
      ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="glass-card rounded-2xl p-4 flex flex-col justify-between hover:translate-y-[-1px]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-[#68756D]">{c.label}</span>
              <div className={`p-1.5 rounded-lg ${c.tint}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="font-heading text-2xl font-bold text-[#17231D] tracking-tight">{c.value}</div>
              <p className="text-[11px] text-[#68756D] mt-0.5">{c.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
