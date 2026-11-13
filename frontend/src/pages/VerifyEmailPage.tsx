import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { authErrorMessage, confirmEmail, requestEmailVerification } from '../api/authApi';
import { AuthCard, Notice, SubmitButton, TextField } from '../components/Auth/AuthForm';

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await confirmEmail(email.trim(), code.trim());
      setVerified(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await requestEmailVerification(email.trim());
      setInfo('Nếu email chưa được xác minh, một mã mới đã được gửi.');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  if (verified) {
    return (
      <AuthCard title="Email đã được xác minh">
        <Notice kind="success">Bạn có thể đăng nhập ngay bây giờ.</Notice>
        <Link to="/login" className="mt-4 block text-center text-sm font-semibold text-amber-400 hover:text-amber-300">
          Đến trang đăng nhập
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Xác minh email" subtitle="Nhập mã 6 chữ số đã gửi tới email của bạn.">
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Mã xác minh" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric"
          pattern="\d{6}" maxLength={6} autoComplete="one-time-code" required />
        {error && <Notice kind="error">{error}</Notice>}
        {info && <Notice kind="success">{info}</Notice>}
        <SubmitButton pending={pending}>
          <MailCheck className="h-4 w-4" aria-hidden="true" /> Xác minh
        </SubmitButton>
      </form>
      <button type="button" onClick={() => void resend()} disabled={!email.trim()}
        className="mt-3 w-full text-center text-xs text-slate-400 hover:text-amber-300 disabled:opacity-50">
        Gửi lại mã
      </button>
    </AuthCard>
  );
};