import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { HomePage } from '../pages/HomePage';

const HanoiExperiencePage = lazy(() => import('../pages/HanoiExperiencePage'));

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="experiences/ha-noi" element={<Suspense fallback={<p role="status">Đang mở trải nghiệm…</p>}><HanoiExperiencePage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

