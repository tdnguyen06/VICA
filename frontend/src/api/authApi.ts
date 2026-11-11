import { apiClient } from '../services/apiClient';

// Contract: backend /api/v1/auth (AuthController)
export type Role = 'ROLE_USER' | 'ROLE_RESEARCHER' | 'ROLE_ADMIN';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface LoginResult {
  username: string;
  email: string;
  fullName: string | null;
  role: Role;
  accessToken: string;
  refreshToken: string;
  expiresInMs: number;
}

export interface Profile {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  address: string | null;
  gender: Gender | null;
  dateOfBirth: string | null; // yyyy-MM-dd
  role: Role;
  emailVerified: boolean;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface ProfileInput {
  fullName: string;
  phone: string;
  address: string;
  gender: Gender | '';
  dateOfBirth: string;
}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/** Empty optional fields are sent as null so the backend does not validate "". */
const orNull = (value?: string) => (value && value.trim() ? value.trim() : null);

export async function loginWithPassword(username: string, password: string): Promise<LoginResult> {
  const response = await apiClient.post<Envelope<LoginResult>>('/auth/login', { username, password });
  return response.data.data;
}

export async function loginWithGoogle(googleIdToken: string): Promise<LoginResult> {
  const response = await apiClient.post<Envelope<LoginResult>>('/auth/google', { googleIdToken });
  return response.data.data;
}

export async function register(input: RegisterInput): Promise<void> {
  await apiClient.post('/auth/register', {
    ...input,
    phone: orNull(input.phone),
    dateOfBirth: orNull(input.dateOfBirth),
  });
}

export async function logoutRequest(refreshToken: string | null): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

export async function fetchProfile(): Promise<Profile> {
  const response = await apiClient.get<Envelope<Profile>>('/auth/me');
  return response.data.data;
}

export async function updateProfile(input: ProfileInput): Promise<Profile> {
  const response = await apiClient.put<Envelope<Profile>>('/auth/me', {
    fullName: input.fullName,
    phone: orNull(input.phone),
    address: orNull(input.address),
    gender: orNull(input.gender),
    dateOfBirth: orNull(input.dateOfBirth),
  });
  return response.data.data;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/change-password', { oldPassword, newPassword });
}

export async function requestEmailVerification(email: string): Promise<void> {
  await apiClient.post('/auth/verify-email/request', { email });
}

export async function confirmEmail(email: string, code: string): Promise<void> {
  await apiClient.post('/auth/verify-email/confirm', { email, code });
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { email, code, newPassword });
}

/** Turns an axios error from /auth into a message a form can show (validation details included). */
export function authErrorMessage(error: unknown): string {
  const response = (error as {
    response?: { status?: number; data?: { message?: string; details?: string[] | null } };
  })?.response;
  if (!response) return 'Không kết nối được máy chủ. Hãy kiểm tra backend đang chạy.';
  const details = response.data?.details;
  if (details && details.length > 0) return details.join(' • ');
  if (response.data?.message) return response.data.message;
  return response.status === 401 ? 'Sai tên đăng nhập hoặc mật khẩu' : 'Yêu cầu thất bại';
}