import React, { useState, useEffect } from 'react';
import { X, Scale, Utensils, Landmark, Calendar, Sparkles, AlertCircle, Loader2, Check } from 'lucide-react';
import type { CompareAspect } from '../../types/assistant';
import { fetchProvinces, type ProvinceDto } from '../../api/geographicApi';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompare: (provinceSlugs: string[], aspect: CompareAspect, provinceNames?: string[]) => void;
  initialProvinceSlug?: string | null;
}

const ASPECT_OPTIONS: { aspect: CompareAspect; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
  {
    aspect: 'HERITAGE',
    label: 'Di sản & Lịch sử',
    desc: 'Đối sánh các di tích, danh thắng và dấu ấn lịch sử hào hùng.',
    icon: Landmark,
  },
  {
    aspect: 'CUISINE',
    label: 'Ẩm thực truyền thống',
    desc: 'So sánh hương vị, phong cách và nét tinh hoa ẩm thực vùng miền.',
    icon: Utensils,
  },
  {
    aspect: 'FESTIVALS',
    label: 'Lễ hội & Phong tục',
    desc: 'Khám phá sự giao thoa và nét đặc thù trong hội làng, tín ngưỡng.',
    icon: Calendar,
  },
  {
    aspect: 'ALL',
    label: 'Toàn diện',
    desc: 'Phân tích tổng hợp đa khía cạnh: Lịch sử, Di sản, Ẩm thực và Lễ hội.',
    icon: Sparkles,
  },
];

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  onCompare,
  initialProvinceSlug,
}) => {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [selectedAspect, setSelectedAspect] = useState<CompareAspect>('HERITAGE');
  const [provinces, setProvinces] = useState<{ slug: string; name: string }[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingProvinces(true);
    fetchProvinces()
      .then((data: ProvinceDto[]) => {
        if (isMounted && data && data.length > 0) {
          setProvinces(data.map((p) => ({ slug: p.slug, name: p.name })));
        }
      })
      .catch((err) => {
        console.warn('Lỗi khi tải danh sách tỉnh thành từ API:', err);
        if (isMounted) {
          setErrorMsg('Không thể tải danh sách tỉnh thành từ máy chủ.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingProvinces(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialProvinceSlug) {
        setSelectedSlugs([initialProvinceSlug]);
      } else {
        setSelectedSlugs([]);
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialProvinceSlug]);

  // Support closing with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleProvince = (slug: string) => {
    setErrorMsg(null);
    if (selectedSlugs.includes(slug)) {
      setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
    } else {
      if (selectedSlugs.length >= 3) {
        setErrorMsg('Chỉ được chọn tối đa 3 địa phương để so sánh chuyên sâu.');
        return;
      }
      setSelectedSlugs([...selectedSlugs, slug]);
    }
  };

  const handleStartComparison = () => {
    if (selectedSlugs.length < 2) {
      setErrorMsg('Vui lòng chọn ít nhất 2 địa phương để thực hiện đối sánh văn hóa.');
      return;
    }
    if (selectedSlugs.length > 3) {
      setErrorMsg('Tối đa chỉ được chọn 3 địa phương.');
      return;
    }
    const provinceNames = selectedSlugs.map((slug) => {
      const match = provinces.find((p) => p.slug === slug);
      return match ? match.name : slug;
    });
    onCompare(selectedSlugs, selectedAspect, provinceNames);
    onClose();
  };

  const filteredProvinces = provinces.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-clay-900/25 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-clay-cream border border-white/70 rounded-3xl shadow-red-950/20 overflow-hidden flex flex-col max-h-[90vh] clay-soft">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/60 bg-clay-lilac sheen">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-lg text-white shadow-rose-500/20 clay">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-clay-900">Đối sánh Văn hóa Vùng miền</h3>
              <p className="text-xs text-clay-600">Chọn 2-3 tỉnh thành để phân tích điểm tương đồng và dị biệt</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-clay-600 hover:text-clay-900 hover:bg-clay-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Choose Provinces */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-clay-700 uppercase tracking-wider">
                1. Chọn địa phương so sánh ({selectedSlugs.length}/3)
              </label>
              {selectedSlugs.length >= 2 && (
                <span className="text-[11px] text-emerald-700 flex items-center space-x-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã đủ điều kiện đối sánh</span>
                </span>
              )}
            </div>

            {/* Selected badges */}
            <div className="flex flex-wrap gap-2 mb-3 min-h-[36px] p-2 bg-clay-mint/50 rounded-xl border border-clay-200 clay-soft">
              {selectedSlugs.length === 0 ? (
                <span className="text-xs text-clay-500 italic py-1 px-1">Chưa chọn địa phương nào...</span>
              ) : (
                selectedSlugs.map((slug) => {
                  const prov = provinces.find((p) => p.slug === slug);
                  return (
                    <span
                      key={slug}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 text-xs font-medium"
                    >
                      <span>{prov?.name || slug}</span>
                      <button
                        type="button"
                        onClick={() => toggleProvince(slug)}
                        className="hover:text-red-700 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Search input */}
            <input
              type="text"
              placeholder="Tìm kiếm tỉnh thành (VD: Huế, Hà Nội, Ninh Bình...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-white/85 border border-clay-200 rounded-xl px-3 py-2 text-clay-800 placeholder-clay-500 focus:outline-none focus:border-amber-500 transition clay-soft"
            />

            {/* Province Pills */}
            <div className="mt-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {isLoadingProvinces ? (
                <div className="w-full flex items-center justify-center py-4 text-xs text-clay-600 space-x-2">
                  <Loader2 className="w-4 h-4 text-amber-700 animate-spin" />
                  <span>Đang tải danh sách 63 tỉnh thành...</span>
                </div>
              ) : filteredProvinces.length === 0 ? (
                <div className="w-full text-center py-3 text-xs text-clay-500 italic">
                  Không tìm thấy địa phương phù hợp
                </div>
              ) : (
                filteredProvinces.map((prov) => {
                  const isSelected = selectedSlugs.includes(prov.slug);
                  return (
                    <button
                      key={prov.slug}
                      type="button"
                      onClick={() => toggleProvince(prov.slug)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                        isSelected
                          ? 'bg-amber-500 text-clay-900 font-semibold border-amber-400'
                          : 'bg-clay-200/60 hover:bg-clay-200 text-clay-700 border-clay-300/60'
                      }`}
                    >
                      {prov.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 2: Choose Aspect */}
          <div>
            <label className="text-xs font-semibold text-clay-700 uppercase tracking-wider block mb-2">
              2. Khía cạnh văn hóa đối sánh
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ASPECT_OPTIONS.map((opt) => {
                const isSelected = selectedAspect === opt.aspect;
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.aspect}
                    type="button"
                    onClick={() => setSelectedAspect(opt.aspect)}
                    className={`flex items-start space-x-3 p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500/50 shadow-sm shadow-rose-500/10'
                        : 'bg-clay-50/60 border-clay-200/80 hover:border-clay-300'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-rose-500/20 text-rose-700' : 'bg-clay-200 text-clay-600'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-clay-800">{opt.label}</div>
                      <div className="text-[11px] text-clay-600 mt-0.5 leading-snug">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center space-x-2 p-3 bg-red-50/40 border border-red-200/50 rounded-xl text-red-700 text-xs clay-soft">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-clay-200 bg-clay-50/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-clay-600 hover:text-clay-800 transition"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleStartComparison}
            disabled={selectedSlugs.length < 2 || selectedSlugs.length > 3}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition ${
              selectedSlugs.length >= 2 && selectedSlugs.length <= 3
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-rose-600/20 cursor-pointer'
                : 'bg-clay-200 text-clay-500 cursor-not-allowed border border-clay-300/50'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Thực hiện đối sánh ({selectedSlugs.length} tỉnh)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
