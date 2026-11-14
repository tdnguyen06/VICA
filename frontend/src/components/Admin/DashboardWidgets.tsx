import React from 'react';
import { ChevronRight, ShieldCheck, Users } from 'lucide-react';
import type { AdminUser, DailyCount } from '../../api/adminApi';

const card = 'rounded-2xl border border-white/70 bg-clay-cream p-5 clay-soft';

export const WelcomeBanner: React.FC<{ name: string; newUsers: number; deleted: number }> = ({ name, newUsers, deleted }) => (
  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/90 via-rose-500/80 to-red-600/80 p-6 clay-soft">
    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
    <div className="absolute -bottom-12 right-24 h-32 w-32 rounded-full bg-white/10" />
    <p className="relative text-2xl font-extrabold text-white">
      Xin chào, <span className="text-clay-900/80">{name}</span>
    </p>
    <p className="relative mt-2 max-w-xl text-sm leading-relaxed text-white/90">
      Tuần này có <b>{newUsers}</b> tài khoản mới và <b>{deleted}</b> tài khoản đang ở trạng thái xoá mềm. Theo dõi
      hoạt động và quản lý người dùng ngay bên dưới.
    </p>
  </div>
);

/** Short Vietnamese weekday: CN, T2 … T7. */
function dayLabel(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00`).getDay();
  return day === 0 ? 'CN' : `T${day + 1}`;
}

/** Smooth line chart of sign-ups per day; the busiest day is highlighted. */
export const ActivityChart: React.FC<{ data: DailyCount[] }> = ({ data }) => {
  const W = 320;
  const H = 120;
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.count));
  const PAD = 22; // keeps the first/last day labels inside the chart
  const pts = data.map((d, i) => ({
    x: data.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (data.length - 1),
    y: H - 12 - (d.count / max) * (H - 30),
  }));
  const path = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const mx = (prev.x + p.x) / 2;
    return `${acc} C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
  }, '');
  const peak = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0);

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-clay-900">Hoạt động</h3>
        <span className="rounded-md bg-clay-200 px-2 py-0.5 text-xs text-clay-600">Đăng ký · 7 ngày</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="h-44 w-full" role="img" aria-label="Số đăng ký mới mỗi ngày">
        <defs>
          <linearGradient id="activityFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {pts.map((p, i) => (
          <rect key={i} x={p.x - 6} y={8} width={12} height={H - 8} rx={6}
                fill={i === peak ? '#f59e0b' : '#f0dbe7'} opacity={i === peak ? 0.35 : 0.6} />
        ))}
        {pts.length > 1 && (
          <path d={`${path} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`} fill="url(#activityFill)" />
        )}
        <path d={path} fill="none" stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
        <circle cx={pts[peak].x} cy={pts[peak].y} r={6} fill="#fffdf7" stroke="#f59e0b" strokeWidth={3} />
        <text x={pts[peak].x} y={pts[peak].y - 12} textAnchor="middle" fill="#b45309" fontSize="11" fontWeight="700">
          {data[peak].count}
        </text>
        {data.map((d, i) => (
          <text key={d.date} x={pts[i].x} y={H + 18} textAnchor="middle" fill={i === peak ? '#f59e0b' : '#86687b'} fontSize="10">
            {dayLabel(d.date)}
          </text>
        ))}
      </svg>
    </div>
  );
};

export const ProgressRing: React.FC<{ title: string; value: number; total: number; caption: string }> = ({ title, value, total, caption }) => {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className={`${card} flex flex-col items-center`}>
      <h3 className="self-start font-semibold text-clay-900">{title}</h3>
      <svg viewBox="0 0 100 100" className="my-2 h-28 w-28" role="img" aria-label={`${pct}%`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f0dbe7" strokeWidth="12" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
        <text x="50" y="56" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700">{pct}%</text>
      </svg>
      <p className="text-xs text-clay-600">{caption}</p>
    </div>
  );
};

export const StatTile: React.FC<{ label: string; value: number; tone: 'amber' | 'sky' }> = ({ label, value, tone }) => {
  const Icon = tone === 'amber' ? ShieldCheck : Users;
  const color = tone === 'amber' ? 'text-amber-700 bg-amber-500/15' : 'text-sky-700 bg-sky-500/15';
  return (
    <div className={`${card} flex items-center gap-4`}>
      <span className={`rounded-full p-3 ${color}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-xs text-clay-600">{label}</p>
        <p className={`text-3xl font-extrabold ${tone === 'amber' ? 'text-amber-700' : 'text-sky-700'}`}>{value}</p>
      </div>
    </div>
  );
};

export const ProfileCard: React.FC<{ name: string; email: string; avatarUrl?: string | null; verifiedPct: number }> = ({
  name,
  email,
  avatarUrl,
  verifiedPct,
}) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className={card}>
      <h3 className="font-semibold text-clay-900">Hồ sơ của tôi</h3>
      <p className="text-xs text-clay-600">
        <span className="text-amber-700">{verifiedPct}%</span> tài khoản đã xác minh email
      </p>
      <div className="relative mx-auto my-4 h-28 w-28">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f0dbe7" strokeWidth="4" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${(verifiedPct / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
        </svg>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="absolute inset-3 rounded-full object-cover" />
        ) : (
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-amber-500/20 text-3xl font-bold text-amber-700">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <p className="text-center font-semibold text-clay-900">{name}</p>
      <p className="text-center text-xs text-clay-600">{email}</p>
    </div>
  );
};

export const RecentUsers: React.FC<{ users: AdminUser[] }> = ({ users }) => (
  <div className={card}>
    <h3 className="mb-3 font-semibold text-clay-900">Mới đăng ký</h3>
    {users.length === 0 && <p className="text-sm text-clay-600">Chưa có tài khoản.</p>}
    <ul className="space-y-3">
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-3">
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 font-semibold text-sky-700">
              {(u.fullName || u.username).charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-clay-900">{u.fullName || u.username}</p>
            <p className="truncate text-xs text-clay-500">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</p>
          </div>
          <span
            className={`h-2 w-2 rounded-full ${u.deletedAt ? 'bg-red-400' : 'bg-emerald-400'}`}
            title={u.deletedAt ? 'Đã xoá' : 'Hoạt động'}
          />
          <ChevronRight className="h-4 w-4 text-clay-400" />
        </li>
      ))}
    </ul>
  </div>
);

export const ShareBar: React.FC<{ title: string; value: number; total: number }> = ({ title, value, total }) => {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className={card}>
      <div className="mb-2 flex justify-between text-sm">
        <h3 className="font-semibold text-clay-900">{title}</h3>
        <span className="text-sky-700">
          {value}/{total}
        </span>
      </div>
      <div className="h-2 rounded-full bg-clay-200">
        <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-amber-400 clay" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-clay-500">{pct}% tài khoản đang hoạt động</p>
    </div>
  );
};
