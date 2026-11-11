import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { logoutRequest } from '../../api/authApi';
import { getRefreshToken, ROLE_LABEL, useAuthStore } from '../../stores/authStore';

/** Header area: "Đăng nhập" link, or the signed-in user (link to profile) with a logout button. */
export const UserMenu: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  if (!user) {
    return (
      <Link to="/login" className="flex items-center space-x-1.5 text-slate-300 hover:text-amber-400 transition-colors">
        <LogIn className="h-4 w-4" />
        <span>Đăng nhập</span>
      </Link>
    );
  }

  const logout = async () => {
    try {
      await logoutRequest(getRefreshToken()); // revokes the tokens on the server
    } catch {
      // Expired token or server down: still clear the local session.
    } finally {
      signOut();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Link to="/profile" className="flex items-center gap-1.5 text-slate-200 hover:text-amber-300" title={user.email}>
        <UserRound className="h-4 w-4 text-amber-400" />
        <span>{user.fullName || user.username}</span>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">{ROLE_LABEL[user.role]}</span>
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="flex items-center gap-1 text-slate-400 hover:text-red-300"
      >
        <LogOut className="h-4 w-4" />
        <span>Đăng xuất</span>
      </button>
    </div>
  );
};