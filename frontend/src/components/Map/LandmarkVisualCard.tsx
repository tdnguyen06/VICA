import React from 'react';
import { getLandmarkImageData } from '../../data/vietnamLandmarkImages';
import {
  Camera,
  Sparkles,
  Calendar,
  MapPin,
} from 'lucide-react';

interface LandmarkVisualCardProps {
  provinceName: string;
  landmarkName: string;
  categoryLabel?: string;
  historicalPeriod?: string;
  isSovereignty?: boolean;
  className?: string;
}

export const LandmarkVisualCard: React.FC<LandmarkVisualCardProps> = ({
  provinceName,
  landmarkName,
  categoryLabel,
  historicalPeriod,
  isSovereignty = false,
  className = '',
}) => {
  const imgData = getLandmarkImageData(provinceName);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Real Landmark Photo */}
      <div className="relative w-full h-52 rounded-xl overflow-hidden border border-clay-300/80 bg-clay-50 select-none clay-soft">
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

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-clay-50 via-clay-50/20 to-transparent pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 z-10 flex items-center space-x-1">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-clay-50/85 backdrop-blur-md text-amber-700 border border-amber-400/40 shadow flex items-center">
            <Camera className="w-2.5 h-2.5 mr-1 text-amber-700" />
            Ảnh tư liệu
          </span>
          {isSovereignty && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600/90 backdrop-blur-md text-white border border-amber-300 shadow">
              🇻🇳 Lãnh thổ Biển Đảo
            </span>
          )}
        </div>

        {/* Bottom Caption Overlay */}
        <div className="absolute bottom-2 left-2.5 right-2.5 z-10 pointer-events-none">
          <p className="text-xs font-bold text-clay-900 truncate">
            {imgData.caption}
          </p>
          <div className="flex items-center justify-between text-[10px] text-clay-700 mt-0.5">
            <span className="text-amber-700 font-semibold flex items-center">
              <MapPin className="w-3 h-3 mr-0.5 text-rose-700" />
              {provinceName}
            </span>
          </div>
        </div>
      </div>

      {/* Heritage Details */}
      <div className="p-2.5 bg-clay-butter/60 rounded-xl border border-clay-200 text-xs text-clay-800 clay-soft">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="font-bold text-amber-700 flex items-center">
            <Sparkles className="w-3 h-3 mr-1" />
            {categoryLabel || 'Di sản Cổ truyền Dân tộc'}
          </span>
          {historicalPeriod && (
            <span className="text-amber-800/80 font-medium flex items-center">
              <Calendar className="w-3 h-3 mr-1 text-clay-600" />
              {historicalPeriod}
            </span>
          )}
        </div>
        <div className="font-bold text-sm text-clay-900">{landmarkName}</div>
      </div>
    </div>
  );
};
