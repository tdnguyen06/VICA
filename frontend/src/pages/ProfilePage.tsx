import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BadgeCheck, MailWarning, Save } from 'lucide-react';
import {
  authErrorMessage,
  changePassword,
  fetchProfile,
  updateProfile,
  type Profile,
  type ProfileInput,
} from '../api/authApi';
import { ROLE_LABEL, useAuthStore } from '../stores/authStore';
import { AuthCard, Notice, PASSWORD_HINT, SubmitButton, TextField } from '../components/Auth/AuthForm';

const toForm = (p: Profile): ProfileInput => ({
  fullName: p.fullName ?? '',
  phone: p.phone ?? '',
  address: p.address ?? '',
  gender: p.gender ?? '',
  dateOfBirth: p.dateOfBirth ?? '',
});

export const ProfilePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const setFullName = useAuthStore((s) => s.setFullName);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<ProfileInput | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [pwPending, setPwPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setForm(toForm(p));
      })
      .catch((e) => setLoadError(authErrorMessage(e)));
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;
  if (loadError) return <AuthCard title="Hồ sơ"><Notice kind="error">{loadError}</Notice></AuthCard>;
  if (!profile || !form) return <AuthCard title="Hồ sơ"><p className="text-sm text-slate-400">Đang tải…</p></AuthCard>;

  const set = (key: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await updateProfile(form);
      setProfile(updated);
      setForm(toForm(updated));
      setFullName(updated.fullName);
      setSaveMsg({ kind: 'success', text: 'Đã lưu hồ sơ.' });
    } catch (err) {
      setSaveMsg({ kind: 'error', text: authErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwPending(true);
    setPwMsg(null);
    try {
      await changePassword(pw.oldPassword, pw.newPassword);
      setPw({ oldPassword: '', newPassword: '' });
      setPwMsg({ kind: 'success', text: 'Đã đổi mật khẩu.' });
    } catch (err) {
      setPwMsg({ kind: 'error', text: authErrorMessage(err) });
    } finally {
      setPwPending(false);
    }
  };

  return (
    <AuthCard title="Hồ sơ cá nhân" wide>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-300">
        <span className="font-semibold text-white">{profile.username}</span>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]">{ROLE_LABEL[profile.role]}</span>
        <span className="text-slate-400">{profile.email}</span>
        {profile.emailVerified ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5" /> Email đã xác minh
          </span>
        ) : (
          <Link to={`/verify-email?email=${encodeURIComponent(profile.email)}`}
            className="inline-flex items-center gap-1 text-xs text-amber-300 hover:underline">
            <MailWarning className="h-3.5 w-3.5" /> Chưa xác minh email
          </Link>
        )}
      </div>

      <form onSubmit={(e) => void save(e)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Họ và tên" value={form.fullName} onChange={set('fullName')} required className="sm:col-span-2" />
        <TextField label="Số điện thoại" value={form.phone} onChange={set('phone')} placeholder="0xxxxxxxxx" />
        <TextField label="Ngày sinh" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
        <label className="block text-sm">
          <span className="text-slate-300">Giới tính</span>
          <select value={form.gender} onChange={set('gender')}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-amber-400">
            <option value="">Không chọn</option>
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
            <option value="OTHER">Khác</option>
          </select>
        </label>
        <TextField label="Địa chỉ" value={form.address} onChange={set('address')} />
        {saveMsg && <div className="sm:col-span-2"><Notice kind={saveMsg.kind}>{saveMsg.text}</Notice></div>}
        <div className="sm:col-span-2">
          <SubmitButton pending={saving} pendingText="Đang lưu…">
            <Save className="h-4 w-4" aria-hidden="true" /> Lưu hồ sơ
          </SubmitButton>
        </div>
      </form>

      <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">Đổi mật khẩu</h3>
      <form onSubmit={(e) => void submitPassword(e)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Mật khẩu hiện tại" type="password" value={pw.oldPassword} autoComplete="current-password"
          onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} required />
        <TextField label="Mật khẩu mới" type="password" value={pw.newPassword} autoComplete="new-password" hint={PASSWORD_HINT}
          onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
        {pwMsg && <div className="sm:col-span-2"><Notice kind={pwMsg.kind}>{pwMsg.text}</Notice></div>}
        <div className="sm:col-span-2">
          <SubmitButton pending={pwPending}>Đổi mật khẩu</SubmitButton>
        </div>
      </form>
    </AuthCard>
  );
};