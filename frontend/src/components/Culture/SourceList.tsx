import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import type { CultureSource } from '../../api/cultureApi';

const SOURCE_TYPE_LABEL: Record<string, string> = {
  BOOK: 'Sách',
  ARTICLE: 'Bài báo',
  WEBSITE: 'Website',
  GOV_DOCUMENT: 'Văn bản nhà nước',
  UNESCO: 'UNESCO',
  FIELDWORK: 'Điền dã',
  ORAL: 'Truyền khẩu',
};

interface SourceListProps {
  sources: CultureSource[];
}

export const SourceList: React.FC<SourceListProps> = ({ sources }) => {
  if (sources.length === 0) {
    return (
      <p className="rounded-lg border border-red-200/60 bg-red-50/40 p-3 text-xs text-red-700">
        Nội dung này chưa có nguồn tham khảo đã kiểm duyệt.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {sources.map((source, index) => {
        const meta = [source.author, source.publisher, source.publishedYear].filter(Boolean).join(' · ');
        return (
          <li key={source.id} className="flex gap-2 rounded-lg border border-clay-200 bg-clay-50/60 p-2.5 text-xs">
            <span className="mt-0.5 font-mono text-clay-500">[{index + 1}]</span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-clay-600" aria-hidden="true" />
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-words font-medium text-sky-700 underline-offset-2 hover:underline"
                  >
                    {source.title}
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="break-words font-medium text-clay-800">{source.title}</span>
                )}
                <span className="rounded bg-clay-200 px-1.5 py-0.5 text-[10px] text-clay-700">
                  {SOURCE_TYPE_LABEL[source.sourceType] ?? source.sourceType}
                </span>
              </div>
              {meta && <p className="text-clay-600">{meta}</p>}
              {source.citationNote && <p className="italic text-clay-500">{source.citationNote}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};