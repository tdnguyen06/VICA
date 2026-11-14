import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Shared building blocks of the auth pages (login, register, verify, forgot password, profile). */

export const AuthCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }> = ({
  title,
  subtitle,
  children,
  wide = false,
}) => (
  <div className={`mx-auto mt-8 w-full ${wide ? 'max-w-2xl' : 'max-w-sm'} rounded-3xl border border-white/70 bg-clay-cream p-6 clay-soft`}>
    <h2 className="mb-1 text-xl font-bold text-clay-900">{title}</h2>
    {subtitle && <p className="mb-5 text-xs text-clay-600">{subtitle}</p>}
    {children}
  </div>
);

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const TextField: React.FC<TextFieldProps> = ({ label, hint, className = '', type, ...input }) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <label className={`block text-sm ${className}`}>
      <span className="text-clay-700">{label}</span>
      <span className="relative mt-1 block">
        <input
          {...input}
          type={isPassword && visible ? 'text' : type}
          className={`w-full rounded-xl border border-clay-200 bg-white/85 px-3 py-2 text-clay-900 outline-none focus:border-amber-400 disabled:opacity-60 ${
            isPassword ? 'pr-10' : ''
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-clay-600 hover:text-amber-700"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </span>
      {hint && <span className="mt-1 block text-[11px] text-clay-500">{hint}</span>}
    </label>
  );
};

export const Notice: React.FC<{ kind: 'error' | 'success'; children: React.ReactNode }> = ({ kind, children }) => (
  <p
    role={kind === 'error' ? 'alert' : 'status'}
    className={`rounded-lg border p-2.5 text-xs ${
      kind === 'error'
        ? 'border-red-200/60 bg-red-50/40 text-red-700'
        : 'border-emerald-200/60 bg-emerald-50/40 text-emerald-700'
    }`}
  >
    {children}
  </p>
);

export const SubmitButton: React.FC<{ pending: boolean; children: React.ReactNode; pendingText?: string }> = ({
  pending,
  children,
  pendingText = 'Đang xử lý…',
}) => (
  <button
    type="submit"
    disabled={pending}
    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-2.5 font-semibold text-white shadow-rose-500/30 clay disabled:opacity-60"
  >
    {pending ? pendingText : children}
  </button>
);

export const PASSWORD_HINT = 'Tối thiểu 8 ký tự, gồm chữ thường, chữ hoa, chữ số và ký tự đặc biệt.';