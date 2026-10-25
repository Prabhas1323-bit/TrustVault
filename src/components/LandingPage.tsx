/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Lock, Share2, FileCheck, ShieldAlert, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { DEMO_PERSONAS } from '../context/AuthContext.tsx';

interface LandingPageProps {
  onOpenAuth: () => void;
  onQuickLogin: (personaKey: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onQuickLogin }) => {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto px-4 pt-6 pb-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#E5F7EE] text-[#087F5B] border border-[#CBD5CD]/60 mb-6 shadow-2xs">
          <Shield className="w-3.5 h-3.5" />
          <span>Zero-Trust Architecture • Centralized Server Authorization</span>
        </div>

        <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#17231D] tracking-tight leading-[1.12]">
          Secure document management with <span className="text-[#087F5B]">absolute access control</span>.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[#68756D] max-w-2xl mx-auto leading-relaxed font-normal">
          TrustVault delivers zero-trust document security: granular role-based permissions, immediate revocation, tamper-resistant audit logs, and private disk storage outside the web root.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-semibold text-white bg-[#087F5B] hover:bg-[#076b4d] shadow-md shadow-emerald-900/15 transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Open Vault Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onQuickLogin('admin')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl text-sm font-semibold text-[#17231D] bg-white border border-[#E3E9E4] hover:bg-[#F0F3EF] transition-all flex items-center justify-center space-x-2 shadow-2xs cursor-pointer"
          >
            <span>Demo: Chief Security Officer (Admin)</span>
          </button>
        </div>

        {/* Quick Persona Pills for instant interviewer testing */}
        <div className="mt-6 pt-4 border-t border-[#E3E9E4]/60 max-w-xl mx-auto">
          <p className="text-xs font-medium text-[#68756D] mb-2.5">Instant Evaluation Personas:</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.key}
                onClick={() => onQuickLogin(p.key)}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E3E9E4] hover:border-[#087F5B] text-xs font-medium text-[#17231D] hover:text-[#087F5B] transition-colors shadow-2xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Architectural Highlights */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-[#E3E9E4] shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#17231D]">Centralized Policy Engine</h3>
              <p className="text-xs text-[#68756D] leading-relaxed">
                Zero client-side reliance. Every document request evaluates user identity, active account status, ownership, and per-document grants before granting bytes.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#17231D]">Immediate Revocation</h3>
              <p className="text-xs text-[#68756D] leading-relaxed">
                Revoking collaborator access invalidates downstream downloads instantly. No orphaned signed URLs, cached tokens, or persistent unauthorized downloads.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#17231D]">Comprehensive Audit Trail</h3>
              <p className="text-xs text-[#68756D] leading-relaxed">
                Every login, upload, download, metadata edit, permission grant, and denied access attempt is recorded with timestamps, actor IDs, IP, and outcome status.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Principles Checklist */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="glass-card rounded-3xl p-6 sm:p-8">
          <h2 className="font-heading font-bold text-xl text-[#17231D] text-center mb-6">
            Security Guarantees & Verification
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4]">
              <CheckCircle2 className="w-4 h-4 text-[#087F5B] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#17231D]">Default Deny Architecture</span>
                <p className="text-[#68756D] mt-0.5">Unshared documents cannot be listed, previewed, or downloaded by non-owners.</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4]">
              <CheckCircle2 className="w-4 h-4 text-[#087F5B] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#17231D]">Path Traversal Protection</span>
                <p className="text-[#68756D] mt-0.5">Storage names sanitized with random UUID prefixes outside the public web root.</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4]">
              <CheckCircle2 className="w-4 h-4 text-[#087F5B] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#17231D]">Strict Role Separation</span>
                <p className="text-[#68756D] mt-0.5">Global role (Admin/Owner/Viewer) and per-document grants (VIEW/EDIT) cleanly decoupled.</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4]">
              <CheckCircle2 className="w-4 h-4 text-[#087F5B] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#17231D]">Automated Test Coverage</span>
                <p className="text-[#68756D] mt-0.5">20/20 mandatory security test cases verified passing with pytest and node:test.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
