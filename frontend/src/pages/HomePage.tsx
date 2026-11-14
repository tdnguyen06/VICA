import React from 'react';
import { MapViewer } from '../components/Map/MapViewer';
import { Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

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

      <section aria-labelledby="explore-heading" className="space-y-3">
        <h2 id="explore-heading" className="text-xl font-bold text-slate-100">Khám phá</h2>
        <Link to="/experiences" className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900 to-slate-800 p-5 transition-colors hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">Chọn tỉnh · Trải nghiệm kể chuyện</p>
            <h3 className="text-xl font-bold text-white">Bạn muốn sống một ngày ở đâu?</h3>
            <p className="text-sm leading-6 text-slate-300">Tìm tỉnh thành, chọn trải nghiệm hoặc để VICA chọn ngẫu nhiên một kịch bản đã sẵn sàng.</p>
            <p className="text-xs text-amber-200/80">Khám phá văn hóa bản địa qua góc nhìn của người địa phương</p>
          </div>
          <span className="inline-flex min-h-12 shrink-0 items-center gap-2 font-semibold text-amber-300">Chọn tỉnh trải nghiệm <ArrowRight className="h-4 w-4" /></span>
        </Link>
      </section>

      {/* Map Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold">
          <Globe className="h-5 w-5 text-amber-400" />
          <h3 className="text-base sm:text-lg">Bản đồ Văn hóa Địa lý tương tác</h3>
        </div>
        <MapViewer className="h-[620px] w-full" />
      </div>
    </div>
  );
};
