/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  Share2,
  Edit3,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  File,
  Shield,
  Eye,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DocumentRecord, User } from '../types/index.ts';

interface DocumentTableProps {
  documents: DocumentRecord[];
  currentUser: User;
  onDownload: (doc: DocumentRecord) => void;
  onShare: (doc: DocumentRecord) => void;
  onEditMetadata: (doc: DocumentRecord) => void;
  onDelete: (doc: DocumentRecord) => void;
  onSelectDoc?: (doc: DocumentRecord) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FileText className="w-4 h-4 text-rose-600" />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <FileImage className="w-4 h-4 text-blue-600" />;
    case 'txt':
    case 'md':
      return <FileCode className="w-4 h-4 text-stone-600" />;
    default:
      return <File className="w-4 h-4 text-stone-500" />;
  }
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  currentUser,
  onDownload,
  onShare,
  onEditMetadata,
  onDelete,
  onSelectDoc
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');

  const categories = ['All', 'Legal', 'Finance', 'Work', 'Academic', 'Personal', 'Other'];

  const filteredDocs = documents
    .filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.ownerEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return b.fileSize - a.fileSize;
      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass-card rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#68756D]" />
          <input
            type="text"
            placeholder="Search by title, filename, description, owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] focus:outline-none focus:border-[#087F5B] text-[#17231D]"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Category Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-[#68756D]">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="py-1.5 px-2.5 rounded-xl bg-[#F7F8F5] border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Document Title</option>
            <option value="size">File Size</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-[#E3E9E4]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E3E9E4] bg-white/50 text-[11px] font-semibold text-[#68756D] uppercase tracking-wider">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Size & Format</th>
                <th className="py-3 px-3">Ownership / Access</th>
                <th className="py-3 px-3">Permission</th>
                <th className="py-3 px-4 text-right">Authorized Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E9E4]/60 text-xs">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#68756D]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center">
                        <Shield className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-sm text-[#17231D]">No documents found</p>
                      <p className="text-xs max-w-sm">
                        {searchTerm || selectedCategory !== 'All'
                          ? 'No authorized documents match your current filter criteria.'
                          : 'You currently have no documents in your vault. Upload one or switch personas to view shared documents.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const isOwner = doc.ownerId === currentUser.id;
                  const isAdmin = currentUser.role === 'admin';
                  const canEdit = isOwner || doc.userPermission === 'EDIT';
                  const canShare = isOwner;
                  const canDelete = isOwner;

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-white/90 transition-colors group"
                    >
                      {/* Title & Metadata */}
                      <td className="py-3 px-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 rounded-xl bg-white border border-[#E3E9E4] mt-0.5 shadow-2xs">
                            {getFileIcon(doc.originalFilename)}
                          </div>
                          <div>
                            <button
                              onClick={() => onSelectDoc?.(doc)}
                              className="font-medium text-sm text-[#17231D] hover:text-[#087F5B] text-left transition-colors font-heading"
                            >
                              {doc.title}
                            </button>
                            <p className="text-[11px] text-[#68756D] line-clamp-1 mt-0.5">
                              {doc.description || doc.originalFilename}
                            </p>
                            <span className="text-[10px] text-stone-400">
                              Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F0F3EF] text-[#17231D] border border-[#CBD5CD]/40">
                          {doc.category}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-3">
                        <div className="text-[11px] text-[#17231D] font-medium">{formatBytes(doc.fileSize)}</div>
                        <span className="text-[10px] text-[#68756D] uppercase font-mono">
                          {doc.originalFilename.split('.').pop()}
                        </span>
                      </td>

                      {/* Ownership */}
                      <td className="py-3 px-3">
                        {isOwner ? (
                          <span className="inline-flex items-center text-[11px] text-[#087F5B] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#087F5B] mr-1.5" />
                            You (Owner)
                          </span>
                        ) : (
                          <div>
                            <span className="text-[11px] text-[#17231D] font-medium truncate block max-w-[130px]">
                              {doc.ownerEmail || 'Unknown Owner'}
                            </span>
                            <span className="text-[10px] text-[#68756D]">Shared with you</span>
                          </div>
                        )}
                        {doc.sharedCount !== undefined && doc.sharedCount > 0 && (
                          <div className="text-[10px] text-[#087F5B] mt-0.5">
                            {doc.sharedCount} {doc.sharedCount === 1 ? 'grant' : 'grants'}
                          </div>
                        )}
                      </td>

                      {/* Granted Permission Badge */}
                      <td className="py-3 px-3">
                        {isOwner ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E5F7EE] text-[#087F5B]">
                            OWNER
                          </span>
                        ) : isAdmin ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#087F5B] text-white">
                            ADMIN AUDIT
                          </span>
                        ) : doc.userPermission === 'EDIT' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            EDIT GRANT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700">
                            VIEW ONLY
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Download */}
                          <button
                            onClick={() => onDownload(doc)}
                            className="p-1.5 text-[#087F5B] hover:bg-[#E5F7EE] rounded-lg transition-colors cursor-pointer"
                            title="Download document (Zero-trust verified)"
                            aria-label={`Download ${doc.title}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Share (Owner only) */}
                          <button
                            onClick={() => (canShare ? onShare(doc) : null)}
                            disabled={!canShare}
                            className={`p-1.5 rounded-lg transition-colors ${
                              canShare
                                ? 'text-[#17231D] hover:bg-[#F0F3EF] cursor-pointer'
                                : 'text-stone-300 cursor-not-allowed opacity-50'
                            }`}
                            title={
                              canShare
                                ? 'Manage sharing permissions & collaborators'
                                : 'Only the document owner can grant or revoke sharing permissions'
                            }
                            aria-label={`Share ${doc.title}`}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Edit Metadata */}
                          <button
                            onClick={() => (canEdit ? onEditMetadata(doc) : null)}
                            disabled={!canEdit}
                            className={`p-1.5 rounded-lg transition-colors ${
                              canEdit
                                ? 'text-[#17231D] hover:bg-[#F0F3EF] cursor-pointer'
                                : 'text-stone-300 cursor-not-allowed opacity-50'
                            }`}
                            title={
                              canEdit
                                ? 'Edit document title and description'
                                : 'EDIT permission or ownership required to modify metadata'
                            }
                            aria-label={`Edit ${doc.title}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete (Owner only) */}
                          <button
                            onClick={() => (canDelete ? onDelete(doc) : null)}
                            disabled={!canDelete}
                            className={`p-1.5 rounded-lg transition-colors ${
                              canDelete
                                ? 'text-[#C03939] hover:bg-rose-50 cursor-pointer'
                                : 'text-stone-300 cursor-not-allowed opacity-50'
                            }`}
                            title={
                              canDelete
                                ? 'Delete document permanently'
                                : 'Only the document owner can delete this document'
                            }
                            aria-label={`Delete ${doc.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
