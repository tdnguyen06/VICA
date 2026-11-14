import React from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';

export const LoadingState: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-2" role="status" aria-label="Đang tải">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="h-16 animate-pulse rounded-xl bg-clay-200/60 clay-soft" />
    ))}
  </div>
);

export const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200/60 bg-red-50/40 p-3 text-xs text-red-700">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <div className="space-y-1.5">
      <p>Không tải được dữ liệu văn hóa. Hãy kiểm tra backend đang chạy.</p>
      <button type="button" onClick={onRetry} className="font-semibold text-red-800 underline underline-offset-2">
        Thử lại
      </button>
    </div>
  </div>
);

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-clay-200 p-6 text-center text-xs text-clay-500">
    <Inbox className="h-6 w-6" aria-hidden="true" />
    <p>{message}</p>
  </div>
);