/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FolderTree, Scale, DollarSign, Briefcase, GraduationCap, User, Folder, ArrowRight } from 'lucide-react';
import { DocumentRecord } from '../types/index.ts';

interface CategoriesViewProps {
  documents: DocumentRecord[];
  onSelectCategory: (category: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({ documents, onSelectCategory }) => {
  const categoryConfigs = [
    { name: 'Legal', icon: Scale, desc: 'Contracts, NDAs, board resolutions, M&A deed pools' },
    { name: 'Finance', icon: DollarSign, desc: 'Audited ledgers, tax returns, balance sheets, payroll records' },
    { name: 'Work', icon: Briefcase, desc: 'Technical specifications, SOC2 reports, roadmaps, architecture' },
    { name: 'Academic', icon: GraduationCap, desc: 'Research papers, thesis documentation, credentials' },
    { name: 'Personal', icon: User, desc: 'Identity scans, medical records, certificates, estate docs' },
    { name: 'Other', icon: Folder, desc: 'Uncategorized or multi-domain encrypted artifacts' }
  ];

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-heading font-bold text-xl text-[#17231D]">Vault Classification Categories</h2>
        <p className="text-xs text-[#68756D] mt-0.5">
          Documents organized under zero-trust authorization partitions. Click any category to view accessible files.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryConfigs.map((cat) => {
          const Icon = cat.icon;
          const matching = documents.filter((d) => d.category === cat.name);
          const totalSize = matching.reduce((acc, d) => acc + d.fileSize, 0);

          return (
            <div
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className="glass-card rounded-2xl p-5 cursor-pointer hover:border-[#CBD5CD] hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E5F7EE] text-[#087F5B] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F0F3EF] text-[#17231D]">
                    {matching.length} {matching.length === 1 ? 'doc' : 'docs'}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-base text-[#17231D]">{cat.name}</h3>
                <p className="text-xs text-[#68756D] mt-1 line-clamp-2 leading-relaxed">{cat.desc}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#E3E9E4] flex items-center justify-between text-xs">
                <span className="text-[#68756D] font-mono">{formatBytes(totalSize)}</span>
                <span className="text-[#087F5B] font-medium flex items-center group-hover:translate-x-1 transition-transform">
                  View Files <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
