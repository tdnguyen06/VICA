import React from 'react';
import { MapViewer } from '../components/Map/MapViewer';
import { Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

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

      <section aria-labelledby="explore-heading" className="space-y-3">
        <h2 id="explore-heading" className="text-xl font-bold text-clay-900">Khám phá</h2>
        <Link to="/experiences" className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-clay-butter sheen p-5 transition-colors hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 sm:flex-row sm:items-center sm:justify-between clay-soft">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Chọn tỉnh · Trải nghiệm kể chuyện</p>
            <h3 className="text-xl font-bold text-clay-900">Bạn muốn sống một ngày ở đâu?</h3>
            <p className="text-sm leading-6 text-clay-700">Tìm tỉnh thành, chọn trải nghiệm hoặc để VICA chọn ngẫu nhiên một kịch bản đã sẵn sàng.</p>
            <p className="text-xs text-amber-800/80">Bản MVP · truyện hư cấu, ghi chú văn hóa và ảnh có nguồn</p>
          </div>
          <span className="inline-flex min-h-12 shrink-0 items-center gap-2 font-semibold text-amber-700">Chọn tỉnh trải nghiệm <ArrowRight className="h-4 w-4" /></span>
        </Link>
      </section>

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
