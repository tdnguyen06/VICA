import React from 'react';

/** Shared building blocks of the auth pages (login, register, verify, forgot password, profile). */

export const AuthCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }> = ({
  title,
  subtitle,
  children,
  wide = false,
}) => (
  <div className={`mx-auto mt-8 w-full ${wide ? 'max-w-2xl' : 'max-w-sm'} rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl`}>
    <h2 className="mb-1 text-xl font-bold text-white">{title}</h2>
    {subtitle && <p className="mb-5 text-xs text-slate-400">{subtitle}</p>}
    {children}
  </div>
);

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const TextField: React.FC<TextFieldProps> = ({ label, hint, className = '', ...input }) => (
  <label className={`block text-sm ${className}`}>
    <span className="text-slate-300">{label}</span>
    <input
      {...input}
      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-amber-400 disabled:opacity-60"
    />
    {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
  </label>
);

export const Notice: React.FC<{ kind: 'error' | 'success'; children: React.ReactNode }> = ({ kind, children }) => (
  <p
    role={kind === 'error' ? 'alert' : 'status'}
    className={`rounded-lg border p-2.5 text-xs ${
      kind === 'error'
        ? 'border-red-800/60 bg-red-950/40 text-red-300'
        : 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300'
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
    className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
  >
    {pending ? pendingText : children}
  </button>
);

export const PASSWORD_HINT = 'Tối thiểu 8 ký tự, gồm chữ thường, chữ hoa, chữ số và ký tự đặc biệt.';