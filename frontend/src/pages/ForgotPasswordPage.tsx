import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { authErrorMessage, forgotPassword, resetPassword } from '../api/authApi';
import { AuthCard, Notice, PASSWORD_HINT, SubmitButton, TextField } from '../components/Auth/AuthForm';

/** Step 1: request a code by email. Step 2: code + new password. Step 3: done. */
export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = async (action: () => Promise<void>, next: 2 | 3) => {
    setPending(true);
    setError(null);
    try {
      await action();
      setStep(next);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (step === 3) {
    return (
      <AuthCard title="Đã đặt lại mật khẩu">
        <Notice kind="success">Hãy đăng nhập bằng mật khẩu mới.</Notice>
        <Link to="/login" className="mt-4 block text-center text-sm font-semibold text-amber-700 hover:text-amber-700">
          Đến trang đăng nhập
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Quên mật khẩu"
      subtitle={step === 1 ? 'Nhập email tài khoản để nhận mã đặt lại.' : `Nhập mã đã gửi tới ${email} và mật khẩu mới.`}>
      {step === 1 ? (
        <form onSubmit={(e) => { e.preventDefault(); void run(() => forgotPassword(email.trim()), 2); }} className="space-y-3">
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="email" required />
          {error && <Notice kind="error">{error}</Notice>}
          <SubmitButton pending={pending}>Gửi mã</SubmitButton>
        </form>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void run(() => resetPassword(email.trim(), code.trim(), newPassword), 3); }}
          className="space-y-3">
          <TextField label="Mã xác minh" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric"
            pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required />
          <TextField label="Mật khẩu mới" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password" required hint={PASSWORD_HINT} />
          {error && <Notice kind="error">{error}</Notice>}
          <SubmitButton pending={pending}>
            <KeyRound className="h-4 w-4" aria-hidden="true" /> Đặt lại mật khẩu
          </SubmitButton>
          <button type="button" onClick={() => setStep(1)} className="w-full text-center text-xs text-clay-600 hover:text-amber-700">
            Dùng email khác
          </button>
        </form>
      )}
      <p className="mt-3 text-center text-xs text-clay-600">
        <Link to="/login" className="hover:text-amber-700">Quay lại đăng nhập</Link>
      </p>
    </AuthCard>
  );
};