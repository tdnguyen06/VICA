import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Trash2 } from 'lucide-react';
import { fetchUsers, fetchUserStats, restoreUser, softDeleteUser } from '../api/adminApi';
import { UserStatsChart } from '../components/Admin/UserStatsChart';
import {
  ActivityChart,
  ProfileCard,
  ProgressRing,
  RecentUsers,
  ShareBar,
  StatTile,
  WelcomeBanner,
} from '../components/Admin/DashboardWidgets';
import { useAuthStore } from '../stores/authStore';

export const AdminUsersPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(0);

  const isAdmin = user?.role === 'ROLE_ADMIN';
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: fetchUserStats, enabled: isAdmin });
  const list = useQuery({
    queryKey: ['admin-users', q, includeDeleted, page],
    queryFn: () => fetchUsers(q, includeDeleted, page),
    enabled: isAdmin,
  });
  const recent = useQuery({
    queryKey: ['admin-users', 'recent'],
    queryFn: () => fetchUsers('', true, 0),
    enabled: isAdmin,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };
  const remove = useMutation({ mutationFn: softDeleteUser, onSuccess: refresh });
  const restore = useMutation({ mutationFn: restoreUser, onSuccess: refresh });

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const displayName = user.fullName || user.username;
  const s = stats.data;
  const verifiedPct = s && s.all.active > 0 ? Math.round((s.all.emailVerified / s.all.active) * 100) : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      {/* Main column */}
      <div className="min-w-0 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-clay-900">Bảng điều khiển</h2>
          <p className="text-xs text-clay-600">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>

        <WelcomeBanner name={displayName} newUsers={s?.all.newLast7Days ?? 0} deleted={s?.all.deleted ?? 0} />

        {stats.isPending && <p className="text-sm text-clay-600">Đang tải thống kê…</p>}
        {stats.isError && <p className="text-sm text-red-700">Không tải được thống kê.</p>}
        {s && (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr]">
              <ActivityChart data={s.signups} />
              <ProgressRing
                title="Tỷ lệ hoạt động"
                value={s.all.active}
                total={s.all.total}
                caption={`${s.all.active}/${s.all.total} tài khoản`}
              />
              <div className="grid gap-4">
                <StatTile label="Quản trị viên" value={s.admin.total} tone="amber" />
                <StatTile label="Người dùng" value={s.user.total} tone="sky" />
              </div>
            </div>
            <UserStatsChart stats={s} />
          </>
        )}

        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-clay-900">Quản lý người dùng</h3>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo email, tên, username"
              className="w-full max-w-sm rounded-lg border border-clay-300 bg-clay-50 px-3 py-2 text-sm text-clay-900"
            />
            <label className="flex items-center gap-2 text-sm text-clay-700">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => {
                  setIncludeDeleted(e.target.checked);
                  setPage(0);
                }}
              />
              Hiện cả tài khoản đã xoá
            </label>
          </div>

          {(remove.error || restore.error) && (
            <p className="text-sm text-red-700">Thao tác thất bại. Vui lòng thử lại.</p>
          )}

          <div className="overflow-x-auto rounded-xl border border-clay-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-clay-100 text-xs uppercase text-clay-600">
                <tr>
                  <th className="p-3">Người dùng</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3">Ngày tạo</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {list.data?.items.map((u) => (
                  <tr key={u.id} className={`border-t border-clay-200 ${u.deletedAt ? 'opacity-50' : ''}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-clay-200" />
                        )}
                        <div>
                          <p className="text-clay-900">{u.fullName || u.username}</p>
                          <p className="text-xs text-clay-600">
                            {u.email}
                            {u.googleLinked && ' · Google'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-clay-700">{u.role === 'ROLE_ADMIN' ? 'Quản trị' : 'Người dùng'}</td>
                    <td className="p-3">
                      {u.deletedAt ? (
                        <span className="text-red-700">Đã xoá</span>
                      ) : (
                        <span className="text-emerald-700">Hoạt động</span>
                      )}
                    </td>
                    <td className="p-3 text-clay-600">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="p-3 text-right">
                      {u.deletedAt ? (
                        <button
                          type="button"
                          onClick={() => restore.mutate(u.id)}
                          className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800"
                        >
                          <RotateCcw className="h-4 w-4" /> Khôi phục
                        </button>
                      ) : (
                        u.username !== user.username && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Xoá mềm tài khoản ${u.email}?`)) remove.mutate(u.id);
                            }}
                            className="inline-flex items-center gap-1 text-red-700 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" /> Xoá
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.isPending && <p className="p-4 text-sm text-clay-600">Đang tải…</p>}
            {list.isError && <p className="p-4 text-sm text-red-700">Không tải được danh sách người dùng.</p>}
            {list.data && list.data.items.length === 0 && (
              <p className="p-4 text-sm text-clay-600">Không có người dùng phù hợp.</p>
            )}
          </div>

          {list.data && list.data.totalPages > 1 && (
            <div className="flex items-center gap-3 text-sm text-clay-700">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="disabled:opacity-40">
                ← Trước
              </button>
              <span>
                Trang {page + 1} / {list.data.totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= list.data.totalPages}
                onClick={() => setPage(page + 1)}
                className="disabled:opacity-40"
              >
                Sau →
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Side column */}
      <aside className="space-y-6">
        <ProfileCard name={displayName} email={user.email} avatarUrl={user.avatarUrl} verifiedPct={verifiedPct} />
        <RecentUsers users={(recent.data?.items ?? []).slice(0, 5)} />
        {s && <ShareBar title="Liên kết Google" value={s.all.googleLinked} total={s.all.active} />}
      </aside>
    </div>
  );
};
