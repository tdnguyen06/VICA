import { create } from 'zustand';
import type { LoginResult, Role } from '../api/authApi';
import { ACCESS_KEY, AUTH_EXPIRED_EVENT, REFRESH_KEY, USER_KEY } from '../services/apiClient';

export interface AuthUser {
  username: string;
  email: string;
  fullName: string | null;
  role: Role;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  signIn: (result: LoginResult) => void;
  signOut: () => void;
  /** Keeps the header in sync after the profile is edited. */
  setFullName: (fullName: string | null) => void;
}

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeUser(user: AuthUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Storage blocked (private mode): the session lasts until reload.
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: readUser(),
  signIn: ({ username, email, fullName, role, avatarUrl, accessToken, refreshToken }) => {
    const user: AuthUser = { username, email, fullName, role, avatarUrl };
    try {
      localStorage.setItem(ACCESS_KEY, accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
    } catch {
      // see writeUser
    }
    writeUser(user);
    set({ user });
  },
  signOut: () => {
    try {
      [ACCESS_KEY, REFRESH_KEY, USER_KEY].forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
    set({ user: null });
  },
  setFullName: (fullName) => {
    const current = get().user;
    if (!current) return;
    const user = { ...current, fullName };
    writeUser(user);
    set({ user });
  },
}));

// apiClient could not refresh the session: reflect it in the UI.
if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_EXPIRED_EVENT, () => useAuthStore.setState({ user: null }));
}

export const ROLE_LABEL: Record<Role, string> = {
  ROLE_ADMIN: 'Quản trị',
  ROLE_RESEARCHER: 'Nghiên cứu viên',
  ROLE_USER: 'Người dùng',
};