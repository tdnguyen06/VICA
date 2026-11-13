import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { authErrorMessage, loginWithGoogle, loginWithPassword, type LoginResult } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';
import { GoogleSignInButton } from '../components/Auth/GoogleSignInButton';
import { AuthCard, Notice, SubmitButton, TextField } from '../components/Auth/AuthForm';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const finish = async (attempt: () => Promise<LoginResult>) => {
    setPending(true);
    setError(null);
    try {
      signIn(await attempt());
      navigate('/', { replace: true });
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard title="Đăng nhập" subtitle="Đăng nhập để quản lý hồ sơ và nội dung văn hóa (theo quyền tài khoản).">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void finish(() => loginWithPassword(username, password));
        }}
        className="space-y-3"
      >
        <TextField label="Tên đăng nhập" value={username} onChange={(e) => setUsername(e.target.value)}
          autoComplete="username" required />
        <TextField label="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" required />
        {error && <Notice kind="error">{error}</Notice>}
        <SubmitButton pending={pending} pendingText="Đang đăng nhập…">
          <LogIn className="h-4 w-4" aria-hidden="true" /> Đăng nhập
        </SubmitButton>
      </form>

      <div className="mt-3 flex justify-between text-xs">
        <Link to="/forgot-password" className="text-slate-400 hover:text-amber-300">Quên mật khẩu?</Link>
        <Link to="/register" className="text-amber-400 hover:text-amber-300">Tạo tài khoản</Link>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-800" /> hoặc <span className="h-px flex-1 bg-slate-800" />
      </div>

      <GoogleSignInButton onCredential={(idToken) => void finish(() => loginWithGoogle(idToken))} />
    </AuthCard>
  );
};