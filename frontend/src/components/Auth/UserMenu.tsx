import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, Shield, UserRound } from 'lucide-react';
import { logoutRequest } from '../../api/authApi';
import { getRefreshToken, ROLE_LABEL, useAuthStore } from '../../stores/authStore';

/** Header area: "Đăng nhập" link, or the signed-in user (link to profile) with a logout button. */
export const UserMenu: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  if (!user) {
    return (
      <Link to="/login" className="flex items-center space-x-1.5 text-clay-700 hover:text-amber-700 transition-colors">
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
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
      {user.role === 'ROLE_ADMIN' && (
        <Link to="/admin" className="flex items-center gap-1 text-clay-700 hover:text-amber-700">
          <Shield className="h-4 w-4 text-amber-700" /> <span>Quản trị</span>
        </Link>
      )}
      <Link to="/profile" className="flex min-w-0 max-w-full items-center gap-1.5 text-clay-800 hover:text-amber-700" title={user.email}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full object-cover" />
        ) : (
          <UserRound className="h-4 w-4 text-amber-700" />
        )}
        <span className="max-w-[9rem] truncate sm:max-w-[12rem]">{user.fullName || user.username}</span>
        <span className="rounded bg-clay-200 px-1.5 py-0.5 text-[10px] text-clay-700">{ROLE_LABEL[user.role]}</span>
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="flex items-center gap-1 text-clay-600 hover:text-red-700"
      >
        <LogOut className="h-4 w-4" />
        <span>Đăng xuất</span>
      </button>
    </div>
  );
};