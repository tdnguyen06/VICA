import { apiClient } from '../services/apiClient';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  role: string;
  emailVerified: boolean;
  googleLinked: boolean;
  avatarUrl: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface UserPage {
  items: AdminUser[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface RoleStats {
  total: number;
  active: number;
  deleted: number;
  googleLinked: number;
  emailVerified: number;
  newLast7Days: number;
}

export interface DailyCount {
  date: string; // yyyy-MM-dd
  count: number;
}

export interface UserStats {
  admin: RoleStats;
  user: RoleStats;
  all: RoleStats;
  signups: DailyCount[];
}

interface Envelope<T> {
  data: T;
}

export async function fetchUserStats(): Promise<UserStats> {
  return (await apiClient.get<Envelope<UserStats>>('/admin/users/stats')).data.data;
}

export async function fetchUsers(q: string, includeDeleted: boolean, page: number): Promise<UserPage> {
  const response = await apiClient.get<Envelope<UserPage>>('/admin/users', {
    params: { q, includeDeleted, page, size: 20 },
  });
  return response.data.data;
}

export async function softDeleteUser(id: number): Promise<AdminUser> {
  return (await apiClient.delete<Envelope<AdminUser>>(`/admin/users/${id}`)).data.data;
}

export async function restoreUser(id: number): Promise<AdminUser> {
  return (await apiClient.patch<Envelope<AdminUser>>(`/admin/users/${id}/restore`)).data.data;
}
