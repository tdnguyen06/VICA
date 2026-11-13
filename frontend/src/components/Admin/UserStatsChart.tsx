import React from 'react';
import type { RoleStats, UserStats } from '../../api/adminApi';

const METRICS: [keyof RoleStats, string][] = [
  ['total', 'Tổng tài khoản'],
  ['active', 'Đang hoạt động'],
  ['deleted', 'Đã xoá mềm'],
  ['googleLinked', 'Liên kết Google'],
  ['emailVerified', 'Email đã xác minh'],
  ['newLast7Days', 'Mới trong 7 ngày'],
];

const ADMIN_COLOR = '#fbbf24'; // amber-400
const USER_COLOR = '#38bdf8'; // sky-400

const Legend: React.FC<{ color: string; label: string; value: number; total: number }> = ({ color, label, value, total }) => (
  <p className="flex items-center gap-2 text-slate-300">
    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
    {label}: <span className="font-semibold text-white">{value}</span>
    <span className="text-slate-500">({total === 0 ? 0 : Math.round((value / total) * 100)}%)</span>
  </p>
);

/** Donut: share of admin vs user accounts. */
const RoleDonut: React.FC<{ admin: number; user: number }> = ({ admin, user }) => {
  const total = admin + user;
  const r = 52;
  const c = 2 * Math.PI * r;
  const adminLen = total === 0 ? 0 : (admin / total) * c;
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 140 140" className="h-40 w-40" role="img" aria-label={`${admin} quản trị viên, ${user} người dùng`}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="18" />
        {total > 0 && (
          <>
            <circle cx="70" cy="70" r={r} fill="none" stroke={USER_COLOR} strokeWidth="18"
                    strokeDasharray={`${c - adminLen} ${c}`} strokeDashoffset={-adminLen}
                    transform="rotate(-90 70 70)" />
            <circle cx="70" cy="70" r={r} fill="none" stroke={ADMIN_COLOR} strokeWidth="18"
                    strokeDasharray={`${adminLen} ${c}`} transform="rotate(-90 70 70)" />
          </>
        )}
        <text x="70" y="68" textAnchor="middle" fill="#ffffff" fontSize="24" fontWeight="700">{total}</text>
        <text x="70" y="86" textAnchor="middle" fill="#94a3b8" fontSize="10">tài khoản</text>
      </svg>
      <div className="space-y-1 text-sm">
        <Legend color={ADMIN_COLOR} label="Quản trị viên" value={admin} total={total} />
        <Legend color={USER_COLOR} label="Người dùng" value={user} total={total} />
      </div>
    </div>
  );
};

/** Grouped horizontal bars: admin vs user for each metric, on one shared scale. */
const MetricBars: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const max = Math.max(1, ...METRICS.flatMap(([k]) => [stats.admin[k], stats.user[k]]));
  return (
    <div className="space-y-4">
      {METRICS.map(([key, label]) => {
        const bars: [string, number, string][] = [
          ['Quản trị viên', stats.admin[key], ADMIN_COLOR],
          ['Người dùng', stats.user[key], USER_COLOR],
        ];
        return (
          <div key={key}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-300">{label}</span>
              <span className="text-slate-500">
                Tổng: <span className="font-semibold text-white">{stats.all[key]}</span>
              </span>
            </div>
            {bars.map(([name, value, color]) => (
              <div key={name} className="mb-1 flex items-center gap-2" title={`${name}: ${value}`}>
                <div className="h-3 flex-1 rounded bg-slate-800">
                  <div
                    className="h-3 rounded transition-all duration-500"
                    style={{ width: `${(value / max) * 100}%`, backgroundColor: color, minWidth: value > 0 ? 4 : 0 }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-semibold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export const UserStatsChart: React.FC<{ stats: UserStats }> = ({ stats }) => (
  <div className="grid gap-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5 md:grid-cols-[auto_1fr]">
    <RoleDonut admin={stats.admin.total} user={stats.user.total} />
    <MetricBars stats={stats} />
  </div>
);
