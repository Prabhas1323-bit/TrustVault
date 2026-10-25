/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  isDestructive = true,
  loading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md glass-panel-elevated rounded-3xl p-6 shadow-2xl border border-[#E3E9E4]">
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isDestructive ? 'bg-red-50 text-[#C03939]' : 'bg-[#E5F7EE] text-[#087F5B]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-bold text-base text-[#17231D]">{title}</h3>
            <p className="text-xs text-[#68756D] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2.5 mt-6 pt-4 border-t border-[#E3E9E4]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#68756D] hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 rounded-xl text-xs font-medium text-white transition-all shadow-xs cursor-pointer ${
              isDestructive
                ? 'bg-[#C03939] hover:bg-red-700'
                : 'bg-[#087F5B] hover:bg-[#076b4d]'
            } disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
