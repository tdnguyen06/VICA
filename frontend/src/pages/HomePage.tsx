import React from 'react';
import { MapViewer } from '../components/Map/MapViewer';
import { Globe } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Intro hero banner */}
      <div className="bg-clay-pink sheen border border-white/60 rounded-3xl p-6 sm:p-8 clay-soft">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-clay-cream/85 border border-white/80 text-rose-700 text-xs font-semibold uppercase tracking-wider mb-4">
            Khám phá Văn hóa & Địa lý
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-clay-900 tracking-tight mb-3">
            Bản đồ Văn hóa Việt Nam Tương tác
          </h2>
          <p className="text-clay-800 text-sm sm:text-base leading-relaxed">
            Nền tảng số hóa di sản, văn hóa, lịch sử và địa lý của 63 tỉnh thành Việt Nam kết hợp Trợ lý Trí tuệ Nhân tạo thông minh.
          </p>
        </div>
      </div>

      {/* Map Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-clay-800 font-semibold">
          <Globe className="h-5 w-5 text-amber-700" />
          <h3 className="text-base sm:text-lg">Bản đồ Văn hóa Địa lý tương tác</h3>
        </div>
        <MapViewer className="h-[620px] w-full" />
      </div>
    </div>
  );
};
