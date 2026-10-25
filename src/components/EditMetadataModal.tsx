/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Edit3, X, AlertCircle } from 'lucide-react';
import { api } from '../services/api.ts';
import { DocumentRecord, DocumentCategory } from '../types/index.ts';

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  onSuccess: () => void;
}

export const EditMetadataModal: React.FC<EditMetadataModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Other');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setCategory(doc.category);
      setDescription(doc.description || '');
      setError(null);
    }
  }, [doc]);

  if (!isOpen || !doc) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Document title cannot be empty.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.updateMetadata(doc.id, {
        title: title.trim(),
        category,
        description: description.trim()
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update metadata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md glass-panel-elevated rounded-3xl p-6 shadow-2xl border border-[#E3E9E4]">
        <div className="flex items-center justify-between pb-4 border-b border-[#E3E9E4]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#17231D]">Edit Document Metadata</h3>
              <p className="text-[11px] text-[#68756D]">Requires Owner or EDIT collaborator grant</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-[#68756D] hover:bg-stone-100 transition-colors">
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
          <div>
            <label className="block font-medium text-[#17231D] mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
            />
          </div>

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

          <div>
            <label className="block font-medium text-[#17231D] mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3E9E4] text-xs text-[#17231D] focus:outline-none focus:border-[#087F5B]"
            />
          </div>

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
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-[#087F5B] hover:bg-[#076b4d] disabled:opacity-50 transition-all cursor-pointer shadow-xs shadow-emerald-900/10"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
