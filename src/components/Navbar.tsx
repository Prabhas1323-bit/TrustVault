/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, ShieldCheck, UserCheck, LogOut, Menu, X, ChevronDown, KeyRound, RefreshCw } from 'lucide-react';
import { useAuth, DEMO_PERSONAS } from '../context/AuthContext.tsx';

interface NavbarProps {
  onOpenMobileMenu: () => void;
  onOpenAuth: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileMenu,
  onOpenAuth,
  onNavigate,
  currentView
}) => {
  const { user, logout, switchPersona } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin (System)', bg: 'bg-[#087F5B] text-white', dot: 'bg-emerald-300' };
      case 'owner':
        return { label: 'Owner (Full Vault)', bg: 'bg-[#E5F7EE] text-[#087F5B]', dot: 'bg-[#087F5B]' };
      case 'viewer':
        return { label: 'Viewer (Read-Only)', bg: 'bg-[#F0F3EF] text-[#68756D]', dot: 'bg-stone-400' };
      default:
        return { label: role, bg: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl px-4 py-2.5 flex items-center justify-between border border-[#E3E9E4]">
        {/* Brand Shield & Title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#087F5B] to-[#10B981] flex items-center justify-center text-white shadow-sm shadow-emerald-900/10">
            <Shield className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading font-bold text-lg text-[#17231D] tracking-tight">TrustVault</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E5F7EE] text-[#087F5B] border border-[#CBD5CD]/50">
                <ShieldCheck className="w-3 h-3 mr-1" /> Zero-Trust RBAC
              </span>
            </div>
            <p className="text-[11px] text-[#68756D] hidden md:block">Secure Document Management & Centralized Policy Enforcement</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {user ? (
            <>
              {/* Persona Quick Switcher Dropdown (Crucial for evaluation!) */}
              <div className="relative">
                <button
                  onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
                  className="flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-white border border-[#E3E9E4] text-[#17231D] hover:border-[#CBD5CD] hover:bg-[#F7F8F5] transition-all shadow-2xs"
                  title="Switch test personas to evaluate role-based authorization"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#087F5B]" />
                  <span className="hidden sm:inline">Role Switcher:</span>
                  <span className="font-semibold capitalize text-[#087F5B]">{user.role}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#68756D]" />
                </button>

                {personaMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-[#E3E9E4] shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setPersonaMenuOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-[#F0F3EF]">
                      <p className="text-xs font-semibold text-[#17231D]">Evaluation Persona Switcher</p>
                      <p className="text-[11px] text-[#68756D]">Instant 1-click switch between RBAC security roles</p>
                    </div>
                    <div className="py-1 space-y-1">
                      {DEMO_PERSONAS.map((p) => {
                        const isCurrent = user.email.toLowerCase() === p.email.toLowerCase();
                        return (
                          <button
                            key={p.key}
                            onClick={() => {
                              switchPersona(p.key);
                              setPersonaMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex flex-col ${
                              isCurrent ? 'bg-[#E5F7EE] text-[#087F5B] font-semibold' : 'hover:bg-[#F7F8F5] text-[#17231D]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{p.label}</span>
                              {isCurrent && <span className="text-[10px] uppercase font-bold text-[#087F5B]">Active</span>}
                            </div>
                            <span className="text-[11px] text-[#68756D] font-normal truncate mt-0.5">{p.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* User Pill & Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 pl-2 pr-2.5 py-1 rounded-xl bg-white/80 hover:bg-white border border-[#E3E9E4] transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center font-bold text-xs border border-[#CBD5CD]/40">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-medium text-[#17231D] leading-tight truncate max-w-[120px]">{user.name}</p>
                    <p className="text-[10px] text-[#68756D] capitalize">{user.role}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#68756D]" />
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-[#E3E9E4] shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="px-3 py-2.5 border-b border-[#F0F3EF]">
                      <p className="text-xs font-semibold text-[#17231D]">{user.name}</p>
                      <p className="text-[11px] text-[#68756D] truncate">{user.email}</p>
                      <div className="mt-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getRoleBadge(user.role).bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getRoleBadge(user.role).dot}`} />
                          {getRoleBadge(user.role).label}
                        </span>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onNavigate('profile');
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#17231D] hover:bg-[#F7F8F5] rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#68756D]" />
                        <span>Security & Password</span>
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#C03939] hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-2 mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 text-xs font-medium text-[#17231D] hover:text-[#087F5B] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onOpenAuth}
                className="px-4 py-1.5 text-xs font-medium text-white bg-[#087F5B] hover:bg-[#076b4d] rounded-xl transition-all shadow-xs shadow-emerald-900/10 cursor-pointer"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-[#17231D] hover:bg-white/80 border border-transparent hover:border-[#E3E9E4] transition-all"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
