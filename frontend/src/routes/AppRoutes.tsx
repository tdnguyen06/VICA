import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { HomePage } from '../pages/HomePage';

const ExperienceCatalogPage = lazy(() => import('../pages/ExperienceCatalogPage'));
const ProvinceExperiencePage = lazy(() => import('../pages/ProvinceExperiencePage'));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="experiences" element={<Suspense fallback={<p role="status">Đang mở danh sách trải nghiệm…</p>}><ExperienceCatalogPage /></Suspense>} />
        <Route path="experiences/:provinceSlug" element={<Suspense fallback={<p role="status">Đang mở trải nghiệm…</p>}><ProvinceExperiencePage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

