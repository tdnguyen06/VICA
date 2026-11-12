import React from 'react';
import { BadgeCheck, ScrollText } from 'lucide-react';
import type { VerificationStatus } from '../../api/cultureApi';

interface VerificationBadgeProps {
  status: VerificationStatus;
}

// Text + icon + colour, so the status never depends on colour alone.
export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status }) =>
  status === 'VERIFIED' ? (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300"
      title="Dữ kiện được xác nhận bởi nguồn tài liệu đã kiểm duyệt"
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Đã xác minh
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
      title="Truyền thuyết, dân gian: không phải dữ kiện lịch sử đã xác minh"
    >
      <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
      Truyền thuyết
    </span>
  );