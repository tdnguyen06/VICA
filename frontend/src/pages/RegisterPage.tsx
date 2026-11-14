import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { authErrorMessage, register, type RegisterInput } from '../api/authApi';
import { AuthCard, Notice, PASSWORD_HINT, SubmitButton, TextField } from '../components/Auth/AuthForm';

const EMPTY: RegisterInput = { username: '', email: '', password: '', fullName: '', phone: '', dateOfBirth: '' };

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const field = (key: keyof RegisterInput) => ({
    value: form[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await register(form);
      // The account exists but the email is not verified yet: go enter the 6-digit code.
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard title="Tạo tài khoản" subtitle="Tài khoản mới có quyền người dùng. Mã xác minh sẽ được gửi tới email.">
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <TextField label="Họ và tên" {...field('fullName')} autoComplete="name" required />
        <TextField label="Tên đăng nhập" {...field('username')} autoComplete="username" required
          hint="3–20 ký tự: chữ, số, dấu chấm, gạch dưới, gạch ngang." />
        <TextField label="Email" type="email" {...field('email')} autoComplete="email" required />
        <TextField label="Mật khẩu" type="password" {...field('password')} autoComplete="new-password" required
          hint={PASSWORD_HINT} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Số điện thoại" {...field('phone')} placeholder="0xxxxxxxxx" autoComplete="tel" />
          <TextField label="Ngày sinh" type="date" {...field('dateOfBirth')} />
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        <SubmitButton pending={pending} pendingText="Đang tạo tài khoản…">
          <UserPlus className="h-4 w-4" aria-hidden="true" /> Đăng ký
        </SubmitButton>
      </form>
      <p className="mt-3 text-center text-xs text-clay-600">
        Đã có tài khoản? <Link to="/login" className="text-amber-700 hover:text-amber-700">Đăng nhập</Link>
      </p>
    </AuthCard>
  );
};