import React from 'react';
import { getLandmarkImageData } from '../../data/vietnamLandmarkImages';
import {
  Camera,
  Sparkles,
  Calendar,
  MapPin,
  ExternalLink,
  Box,
} from 'lucide-react';

interface LandmarkVisualCardProps {
  provinceName: string;
  landmarkName: string;
  categoryLabel?: string;
  historicalPeriod?: string;
  isSovereignty?: boolean;
  className?: string;
}

// Authentic 3D Scans, LiDAR & Virtual Digital Preservation Spaces in Vietnam
const HERITAGE_3D_SPACES: Record<string, { title: string; provider: string; url: string; badge: string }> = {
  'An Giang': {
    title: 'Không gian 3D Tiles & Hiện vật Di chỉ Óc Eo - Ba Thê',
    provider: 'OpenGIS & Ban Quản lý Di tích Văn hóa Óc Eo',
    url: 'https://oceo.opengis.vn/',
    badge: '3D Tiles & VR360',
  },
  'Thừa Thiên Huế': {
    title: 'Dữ liệu LiDAR & Scan 3D Lăng Tự Đức, Điện Thái Hòa, Hưng Miếu',
    provider: 'Open Heritage 3D & CyArk (Trung tâm BTDTCĐ Huế)',
    url: 'https://openheritage3d.org/data',
    badge: 'LiDAR / Point Cloud',
  },
  'Hà Nội': {
    title: 'Cơ sở dữ liệu số hóa 3D Văn Miếu - Quốc Tử Giám & Bia Tiến Sĩ',
    provider: 'Sở VHTT Hà Nội & Trung tâm Hoạt động VHKH Văn Miếu',
    url: 'https://sovhtt.hanoi.gov.vn/',
    badge: 'Không gian 3D số',
  },
  'Quảng Ninh': {
    title: 'Số hóa 3D & Không gian VR360 17 Di sản Non thiêng Yên Tử',
    provider: 'UBND Tỉnh Quảng Ninh & Ban Quản lý Di tích Yên Tử',
    url: 'https://openheritage3d.org/data',
    badge: 'VR360 & 3D Scan',
  },
  'Quảng Nam': {
    title: 'Dữ liệu Photogrammetry 3D Thánh địa Mỹ Sơn & Đô thị cổ Hội An',
    provider: 'UNESCO & Open Heritage 3D Digital Archive',
    url: 'https://openheritage3d.org/data',
    badge: 'UNESCO 3D Scan',
  },
};

export const LandmarkVisualCard: React.FC<LandmarkVisualCardProps> = ({
  provinceName,
  landmarkName,
  categoryLabel,
  historicalPeriod,
  isSovereignty = false,
  className = '',
}) => {
  const imgData = getLandmarkImageData(provinceName);
  const scan3d = HERITAGE_3D_SPACES[provinceName];

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 100% AUTHENTIC REAL PHOTOGRAPH */}
      <div className="relative w-full h-56 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-950 select-none">
        {/* Real Photo */}
        <img
          src={imgData.url}
          alt={imgData.caption}
          onError={(e) => {
            const fallback = isSovereignty
              ? 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Truong_Sa_lon.JPG'
              : 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Hanoi_citadel.jpg';
            (e.target as HTMLImageElement).src = fallback;
          }}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Vignette & Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent pointer-events-none" />

        {/* Top Floating Badge */}
        <div className="absolute top-2 left-2 z-10 flex items-center space-x-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-950/85 backdrop-blur-md text-amber-300 border border-amber-400/50 shadow flex items-center">
            <Camera className="w-2.5 h-2.5 mr-1 text-amber-400" />
            Ảnh chụp thực tế
          </span>
          {isSovereignty && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/90 backdrop-blur-md text-white border border-amber-300 shadow">
              🇻🇳 Lãnh thổ Biển Đảo
            </span>
          )}
        </div>

        {/* Bottom Caption Overlay */}
        <div className="absolute bottom-2 left-2.5 right-2.5 z-10 pointer-events-none">
          <p className="text-xs font-bold text-white drop-shadow-md truncate">
            {imgData.caption}
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-300 mt-0.5">
            <span className="text-amber-300 font-semibold flex items-center">
              <MapPin className="w-3 h-3 mr-0.5 text-rose-400" />
              {provinceName}
            </span>
            <span className="text-slate-400 text-[9px]">Tư liệu Di sản Lịch sử</span>
          </div>
        </div>
      </div>

      {/* Heritage Details */}
      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-200">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-bold text-amber-400 flex items-center">
            <Sparkles className="w-3 h-3 mr-1" />
            {categoryLabel || 'Di sản Cổ truyền Dân tộc'}
          </span>
          {historicalPeriod && (
            <span className="text-amber-200/80 font-medium flex items-center">
              <Calendar className="w-3 h-3 mr-1 text-slate-400" />
              {historicalPeriod}
            </span>
          )}
        </div>
        <div className="font-bold text-sm text-white">{landmarkName}</div>
      </div>

      {/* INTEGRATED AUTHENTIC 3D SCAN / DIGITAL SPACE (If Available) */}
      {scan3d && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border border-amber-400/60 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-amber-300 font-extrabold text-xs">
              <Box className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Dữ liệu số hóa 3D đã scan sẵn</span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40">
              {scan3d.badge}
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-200 mt-1">{scan3d.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Nguồn: {scan3d.provider}</p>
          <a
            href={scan3d.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center justify-center space-x-1.5 w-full py-1.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-lg transition shadow-md cursor-pointer"
          >
            <span>Mở không gian 3D số hóa di tích</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};
