/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, FileCheck, AlertCircle, Shield, Users } from 'lucide-react';
import { api } from '../services/api.ts';
import { User, DocumentCategory } from '../types/index.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  users: User[];
  currentUser: User;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  users,
  currentUser
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Work');
  const [description, setDescription] = useState('');
  const [shareUserId, setShareUserId] = useState('');
  const [shareLevel, setShareLevel] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      if (!title) {
        // Strip extension from default title
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setTitle(nameWithoutExt);
      }
    }
  }, [file]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setError(null);
    const allowed = ['.pdf', '.docx', '.doc', '.xlsx', '.txt', '.csv', '.md', '.png', '.jpg', '.jpeg'];
    const ext = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Disallowed format: ${ext}. Supported: PDF, Word, Excel, TXT, CSV, Markdown, Images`);
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(`File is too large (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB). Limit is 10 MB.`);
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select or drag a file into the upload zone.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      formData.append('category', category);
      formData.append('description', description);
      if (shareUserId) {
        formData.append('shareWithUserId', shareUserId);
        formData.append('sharePermissionLevel', shareLevel);
      }

      await api.uploadDocument(formData);
      onUploadSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  // Filter out current user from initial share dropdown
  const shareableUsers = users.filter((u) => u.id !== currentUser.id && u.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg glass-panel-elevated rounded-3xl p-6 shadow-2xl border border-[#E3E9E4] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#E3E9E4]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#17231D]">Upload Secure Document</h3>
              <p className="text-[11px] text-[#68756D]">Encrypted private disk storage outside public web root</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#68756D] hover:bg-stone-100 transition-colors"
            aria-label="Close upload modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#C03939] flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#087F5B] bg-[#E5F7EE]/60'
                : file
                ? 'border-[#087F5B]/50 bg-white'
                : 'border-[#CBD5CD] hover:border-[#087F5B] bg-[#F7F8F5]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center mb-2">
                  <FileCheck className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm text-[#17231D] max-w-[280px] truncate">{file.name}</p>
                <p className="text-[11px] text-[#68756D] mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB • Click or drop to replace
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-2xl bg-white border border-[#E3E9E4] text-[#68756D] flex items-center justify-center mb-2 shadow-2xs">
                  <UploadCloud className="w-5 h-5 text-[#087F5B]" />
                </div>
                <p className="font-medium text-sm text-[#17231D]">
                  Drag and drop your file here, or <span className="text-[#087F5B] underline">browse</span>
                </p>
                <p className="text-[11px] text-[#68756D] mt-1">
                  Supported formats: PDF, DOCX, XLSX, TXT, CSV, MD, PNG, JPG (Max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block font-medium text-[#17231D] mb-1">Document Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Services Agreement 2026"
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-medium text-[#17231D] mb-1">Classification Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
            >
              <option value="Work">Work</option>
              <option value="Legal">Legal</option>
              <option value="Finance">Finance</option>
              <option value="Academic">Academic</option>
              <option value="Personal">Personal</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-[#17231D] mb-1">Confidentiality Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes, security caveats, or scope of document..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
            />
          </div>

          {/* Optional Initial Sharing Preset */}
          <div className="p-3 rounded-2xl bg-[#F7F8F5] border border-[#E3E9E4] space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#17231D]">
              <Users className="w-3.5 h-3.5 text-[#087F5B]" />
              <span>Initial Collaborator Grant (Optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={shareUserId}
                onChange={(e) => setShareUserId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
              >
                <option value="">Keep Private (No initial share)</option>
                {shareableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>

              {shareUserId && (
                <select
                  value={shareLevel}
                  onChange={(e) => setShareLevel(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
                >
                  <option value="VIEW">VIEW (Read-only download)</option>
                  <option value="EDIT">EDIT (Metadata editing + download)</option>
                </select>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#E3E9E4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#68756D] hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-[#087F5B] hover:bg-[#076b4d] disabled:opacity-50 transition-all shadow-sm shadow-emerald-900/10 cursor-pointer"
            >
              {loading ? 'Encrypting & Storing...' : 'Upload & Encrypt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
