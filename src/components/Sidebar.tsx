/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Files,
  Search,
  UploadCloud,
  FolderTree,
  ShieldAlert,
  Users,
  Settings,
  X,
  FileCheck2,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  mobileOpen,
  onCloseMobile
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'documents', label: 'Vault Documents', icon: Files },
    { id: 'search', label: 'Search & Filters', icon: Search },
    {
      id: 'upload',
      label: 'Upload Document',
      icon: UploadCloud,
      restricted: isViewer,
      badge: isViewer ? 'Owners Only' : undefined
    },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    ...(isAdmin
      ? [
          { id: 'audit', label: 'Security Audit Logs', icon: ShieldAlert, badge: 'Admin' },
          { id: 'users', label: 'User Management', icon: Users, badge: 'Admin' }
        ]
      : []),
    { id: 'profile', label: 'Security & Profile', icon: Settings }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="px-3 mb-4">
          <p className="text-[11px] font-semibold text-[#68756D] uppercase tracking-wider">Navigation</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isRestricted = item.restricted;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isRestricted) {
                    alert('Viewers cannot upload documents. Please switch to an Owner persona to test uploads.');
                    return;
                  }
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#E5F7EE] text-[#087F5B] font-semibold shadow-2xs'
                    : isRestricted
                    ? 'text-[#68756D]/60 hover:bg-[#F0F3EF]/60 cursor-not-allowed'
                    : 'text-[#17231D] hover:bg-white hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#087F5B]' : isRestricted ? 'text-stone-400' : 'text-[#68756D]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      item.badge === 'Admin'
                        ? 'bg-[#087F5B]/10 text-[#087F5B]'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Role Summary Box */}
      {user && (
        <div className="p-3 mt-4 rounded-xl bg-white border border-[#E3E9E4] text-xs">
          <div className="flex items-center space-x-2 text-[#087F5B] font-semibold mb-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Active RBAC Policy</span>
          </div>
          <p className="text-[11px] text-[#68756D] leading-relaxed">
            {isAdmin && 'Full administrative oversight: all documents & audit logs accessible; user states toggleable.'}
            {user.role === 'owner' && 'Full owner rights: upload, download, metadata edit, delete, and granular sharing.'}
            {isViewer && 'Strict viewer policy: read-only access to documents explicitly shared with you.'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:block w-60 shrink-0 pr-4">
        <div className="glass-panel rounded-2xl p-4 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-stone-900/30 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative ml-auto w-72 max-w-full h-full bg-[#F7F8F5] p-5 shadow-2xl flex flex-col justify-between border-l border-[#E3E9E4] z-50">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3E9E4]">
              <span className="font-heading font-bold text-base text-[#17231D]">Navigation Menu</span>
              <button
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-[#68756D] hover:bg-white"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-4 overflow-y-auto">{sidebarContent}</div>
          </div>
        </div>
      )}
    </>
  );
};
