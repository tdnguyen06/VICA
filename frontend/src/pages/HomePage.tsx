import React from 'react';
import { MapViewer } from '../components/Map/MapViewer';
import { ProvinceDetailDrawer } from '../components/Culture/ProvinceDetailDrawer';   // ← của bạn
import { Globe } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Intro hero banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Khám phá Văn hóa & Địa lý
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Bản đồ Văn hóa Việt Nam Tương tác
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Nền tảng số hóa di sản, văn hóa, lịch sử và địa lý của 63 tỉnh thành Việt Nam kết hợp Trợ lý Trí tuệ Nhân tạo thông minh.
          </p>
        </div>
      </div>

      {/* Map Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold">
          <Globe className="h-5 w-5 text-amber-400" />
          <h3 className="text-base sm:text-lg">Bản đồ Văn hóa Địa lý tương tác</h3>
        </div>
        <MapViewer className="h-[620px] w-full" />
        <ProvinceDetailDrawer />                                                     {/* ← của bạn */}
      </div>
    </div>
  );
};
