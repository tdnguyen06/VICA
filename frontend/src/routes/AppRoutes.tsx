import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ProfilePage } from '../pages/ProfilePage';

const ExperienceCatalogPage = lazy(() => import('../pages/ExperienceCatalogPage'));
const ProvinceExperiencePage = lazy(() => import('../pages/ProvinceExperiencePage'));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="experiences" element={<Suspense fallback={<p role="status">Đang mở danh sách trải nghiệm…</p>}><ExperienceCatalogPage /></Suspense>} />
        <Route path="experiences/:provinceSlug" element={<Suspense fallback={<p role="status">Đang mở trải nghiệm…</p>}><ProvinceExperiencePage /></Suspense>} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<AdminUsersPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

