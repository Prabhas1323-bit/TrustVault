/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { StatsCards } from './components/StatsCards.tsx';
import { DocumentTable } from './components/DocumentTable.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { EditMetadataModal } from './components/EditMetadataModal.tsx';
import { ConfirmDialog } from './components/ConfirmDialog.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { UserManagementView } from './components/UserManagementView.tsx';
import { CategoriesView } from './components/CategoriesView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { api } from './services/api.ts';
import { DocumentRecord, User, DashboardStats } from './types/index.ts';
import {
  UploadCloud,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Search as SearchIcon
} from 'lucide-react';

function TrustVaultApp() {
  const { user, loading: authLoading, switchPersona } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Data states
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [shareModalDoc, setShareModalDoc] = useState<DocumentRecord | null>(null);
  const [editModalDoc, setEditModalDoc] = useState<DocumentRecord | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    if (!user) return;
    setLoadingDocs(true);
    try {
      const [docsRes, usersRes, statsRes] = await Promise.all([
        api.getDocuments(),
        api.getUsers(),
        api.getStats()
      ]);
      setDocuments(docsRes.documents);
      setAllUsers(usersRes.users);
      setStats(statsRes.stats);
    } catch (err: any) {
      showToast(err.message || 'Failed to load vault data', 'error');
    } finally {
      setLoadingDocs(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Actions
  const handleDownload = async (doc: DocumentRecord) => {
    try {
      showToast(`Initiating verified download for ${doc.originalFilename}...`, 'info');
      await api.downloadDocument(doc.id, doc.originalFilename);
      showToast(`Downloaded ${doc.originalFilename} successfully.`);
    } catch (err: any) {
      showToast(err.message || 'Download forbidden: Authorization check failed', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDoc) return;
    setDeleteLoading(true);
    try {
      await api.deleteDocument(deleteConfirmDoc.id);
      showToast(`Deleted "${deleteConfirmDoc.title}" from vault.`);
      setDeleteConfirmDoc(null);
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCategorySelect = (cat: string) => {
    setCurrentView('documents');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8F5] text-[#17231D]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-medium ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-[#C03939]'
                : toast.type === 'info'
                ? 'bg-white border-[#CBD5CD] text-[#17231D]'
                : 'bg-[#E5F7EE] border-[#CBD5CD] text-[#087F5B]'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Floating Navbar */}
      <Navbar
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
        onNavigate={setCurrentView}
        currentView={currentView}
      />

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {authLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center animate-pulse">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-xs text-[#68756D] font-medium">Verifying Zero-Trust Credentials...</p>
            </div>
          </div>
        ) : !user ? (
          /* Public Landing Page */
          <LandingPage
            onOpenAuth={() => setAuthModalOpen(true)}
            onQuickLogin={switchPersona}
          />
        ) : (
          /* Authenticated Dashboard Shell */
          <div className="flex flex-col md:flex-row gap-6">
            <Sidebar
              currentView={currentView}
              onNavigate={setCurrentView}
              mobileOpen={mobileMenuOpen}
              onCloseMobile={() => setMobileMenuOpen(false)}
            />

            {/* Main View Container */}
            <div className="flex-1 min-w-0">
              {/* Dynamic View Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-[#E3E9E4] gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="font-heading font-bold text-2xl text-[#17231D] tracking-tight">
                      {currentView === 'dashboard' && 'Security Dashboard'}
                      {currentView === 'documents' && 'Vault Documents'}
                      {currentView === 'search' && 'Search & Discovery'}
                      {currentView === 'upload' && 'Upload Document'}
                      {currentView === 'categories' && 'Classification Categories'}
                      {currentView === 'audit' && 'Security Audit Logs'}
                      {currentView === 'users' && 'User Management'}
                      {currentView === 'profile' && 'Security & Profile Settings'}
                    </h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E5F7EE] text-[#087F5B] uppercase">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-[#68756D] mt-0.5">
                    {currentView === 'dashboard' &&
                      `Welcome, ${user.name}. Centralized policy enforcement active.`}
                    {currentView === 'documents' &&
                      'Browse, download, share, and manage documents with strict authorization.'}
                    {currentView === 'search' &&
                      'Discover documents across all authorized namespaces with real-time filters.'}
                    {currentView === 'categories' &&
                      'Explore documents grouped by enterprise classification tags.'}
                    {currentView === 'audit' &&
                      'Complete system-wide audit trail with immutable security events.'}
                    {currentView === 'users' &&
                      'Manage user identity states and toggle account authorization.'}
                    {currentView === 'profile' &&
                      'Review credentials, update authentication passwords, and manage sessions.'}
                  </p>
                </div>

                {/* Primary Actions */}
                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={loadAllData}
                    disabled={loadingDocs}
                    className="p-2 rounded-xl bg-white border border-[#E3E9E4] text-[#17231D] hover:bg-[#F7F8F5] transition-all shadow-2xs"
                    title="Refresh data from server"
                  >
                    <RefreshCw className={`w-4 h-4 text-[#087F5B] ${loadingDocs ? 'animate-spin' : ''}`} />
                  </button>

                  {user.role !== 'viewer' && (
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#087F5B] hover:bg-[#076b4d] shadow-sm shadow-emerald-900/15 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Document</span>
                    </button>
                  )}
                </div>
              </div>

              {/* View Router */}
              {currentView === 'dashboard' && (
                <div className="space-y-6">
                  <StatsCards stats={stats} user={user} />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-heading font-bold text-base text-[#17231D]">
                        {user.role === 'admin'
                          ? 'Recent System Vault Documents'
                          : user.role === 'viewer'
                          ? 'Documents Shared With You'
                          : 'Your Documents & Shared Files'}
                      </h2>
                      <button
                        onClick={() => setCurrentView('documents')}
                        className="text-xs text-[#087F5B] hover:underline font-medium"
                      >
                        View all documents
                      </button>
                    </div>

                    <DocumentTable
                      documents={documents.slice(0, 5)}
                      currentUser={user}
                      onDownload={handleDownload}
                      onShare={setShareModalDoc}
                      onEditMetadata={setEditModalDoc}
                      onDelete={setDeleteConfirmDoc}
                    />
                  </div>
                </div>
              )}

              {(currentView === 'documents' || currentView === 'search') && (
                <DocumentTable
                  documents={documents}
                  currentUser={user}
                  onDownload={handleDownload}
                  onShare={setShareModalDoc}
                  onEditMetadata={setEditModalDoc}
                  onDelete={setDeleteConfirmDoc}
                />
              )}

              {currentView === 'categories' && (
                <CategoriesView documents={documents} onSelectCategory={handleCategorySelect} />
              )}

              {currentView === 'audit' && user.role === 'admin' && <AuditLogView />}

              {currentView === 'users' && user.role === 'admin' && (
                <UserManagementView currentUser={user} />
              )}

              {currentView === 'profile' && <ProfileView user={user} />}
            </div>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {user && (
        <UploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onUploadSuccess={() => {
            showToast('Document uploaded and encrypted successfully.');
            loadAllData();
          }}
          users={allUsers}
          currentUser={user}
        />
      )}

      {/* Share & Permissions Modal */}
      {user && (
        <ShareModal
          isOpen={Boolean(shareModalDoc)}
          onClose={() => setShareModalDoc(null)}
          document={shareModalDoc}
          currentUser={user}
          availableUsers={allUsers}
          onPermissionsUpdated={loadAllData}
        />
      )}

      {/* Edit Metadata Modal */}
      <EditMetadataModal
        isOpen={Boolean(editModalDoc)}
        onClose={() => setEditModalDoc(null)}
        document={editModalDoc}
        onSuccess={() => {
          showToast('Document metadata updated successfully.');
          loadAllData();
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmDoc)}
        title="Delete Document"
        message={`Are you sure you want to permanently delete "${deleteConfirmDoc?.title}"? The encrypted file will be removed from private storage and all associated permission grants will be immediately deleted.`}
        confirmLabel="Delete Permanently"
        isDestructive={true}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmDoc(null)}
      />

      {/* Auth Modal (Sign In / Register) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TrustVaultApp />
    </AuthProvider>
  );
}
