import React, { useState } from 'react';
import { BookOpen, ShieldCheck, Sparkles, ExternalLink, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import type { CitationDto, VerificationStatus } from '../../types/assistant';

interface SourceCitationListProps {
  citations: CitationDto[];
  highlightedIndex?: number | null;
  messageId?: string | number;
}

const getStatusBadge = (status: VerificationStatus) => {
  switch (status) {
    case 'VERIFIED':
      return {
        label: 'Chính sử / Đã kiểm định',
        className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        icon: ShieldCheck,
      };
    case 'LEGEND':
      return {
        label: 'Dân gian / Huyền tích',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        icon: Sparkles,
      };
    case 'UNVERIFIED':
    default:
      return {
        label: 'Chưa kiểm chứng',
        className: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        icon: HelpCircle,
      };
  }
};

export const SourceCitationList: React.FC<SourceCitationListProps> = ({
  citations,
  highlightedIndex,
  messageId,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-slate-400 hover:text-amber-400 transition-colors py-1 group"
      >
        <div className="flex items-center space-x-1.5 font-medium">
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Tài liệu & Nguồn trích dẫn ({citations.length})</span>
        </div>
        <span className="text-slate-500 group-hover:text-slate-300">
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-1.5 pl-1">
          {citations.map((cite, idx) => {
            const index = idx + 1;
            const isHighlighted = highlightedIndex === index;
            const statusConfig = getStatusBadge(cite.status);
            const StatusIcon = statusConfig.icon;
            const elementId = messageId ? `citation-item-${messageId}-${index}` : `citation-item-${index}`;

            return (
              <div
                key={cite.sourceId || idx}
                id={elementId}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-lg border transition-all ${
                  isHighlighted
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-900/60 border-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-800 text-amber-400 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    [{index}]
                  </span>
                  <div>
                    <span className="font-medium text-slate-200 block sm:inline">
                      {cite.sourceName}
                    </span>
                    {cite.provinceSlug && (
                      <span className="text-[10px] text-slate-400 sm:ml-2 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50">
                        {cite.provinceSlug}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto pl-7 sm:pl-0">
                  <span
                    className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${statusConfig.className}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusConfig.label}</span>
                  </span>

                  {cite.url && (
                    <a
                      href={cite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-amber-400 p-1 hover:bg-slate-800 rounded transition-colors"
                      title="Mở tài liệu nguồn"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

