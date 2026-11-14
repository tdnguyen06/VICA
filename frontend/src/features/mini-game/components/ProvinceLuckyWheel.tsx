import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Compass, RotateCw, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import type { ProvinceExperience } from '../catalog';
import { chooseRandomExperience } from '../catalog';

interface ProvinceLuckyWheelProps {
  readonly allProvinces: readonly ProvinceExperience[];
  readonly onSelect?: (province: ProvinceExperience) => void;
}

const SLICE_COLORS_PALETTE = [
  '#b45309', // amber-700
  '#0369a1', // sky-700
  '#047857', // emerald-700
  '#6d28d9', // violet-700
  '#c2410c', // orange-700
  '#be185d', // pink-700
  '#1d4ed8', // blue-700
  '#0f766e', // teal-700
  '#a16207', // yellow-700
  '#b91c1c', // red-700
  '#4d7c0f', // lime-700
  '#4338ca', // indigo-700
];

function formatShortName(name: string): string {
  return name
    .replace(/^Thành phố\s+/i, 'TP. ')
    .replace(/^Tỉnh\s+/i, '')
    .replace('Bà Rịa - Vũng Tàu', 'BR-Vũng Tàu')
    .replace('Thừa Thiên Huế', 'TT-Huế');
}

export function ProvinceLuckyWheel({
  allProvinces,
  onSelect,
}: ProvinceLuckyWheelProps) {
  // Mode: 'all' (all 63 provinces) or 'ready' (ready provinces)
  const [mode, setMode] = useState<'all' | 'ready'>('all');
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<ProvinceExperience | null>(null);
  const targetIndexRef = useRef<number | null>(null);
  const wheelRef = useRef<SVGGElement>(null);

  const readyProvinces = allProvinces.filter(p => p.status === 'ready');
  const activeProvinces = mode === 'all' ? allProvinces : readyProvinces;

  const n = activeProvinces.length;
  const theta = 360 / n;
  const radius = 240;
  const center = 270;

  const handleModeChange = (newMode: 'all' | 'ready') => {
    if (isSpinning) return;
    setMode(newMode);
    setRotation(0);
    setWinner(null);
  };

  const handleSpin = () => {
    if (isSpinning || n === 0) return;

    let finalIdx = 0;
    if (mode === 'ready') {
      const picked = chooseRandomExperience(allProvinces);
      const targetIdx = readyProvinces.findIndex(p => p.slug === picked?.slug);
      finalIdx = targetIdx >= 0 ? targetIdx : Math.floor(Math.random() * n);
    } else {
      // Pick random from all 63 provinces
      finalIdx = Math.floor(Math.random() * n);
    }

    targetIndexRef.current = finalIdx;
    setWinner(null);
    setIsSpinning(true);

    // Rotation calculation:
    // Slice i center angle before spin is (i + 0.5) * theta - 90 deg.
    // Pointer is at the top (12 o'clock = -90 deg).
    // Target offset to align slice finalIdx center exactly at 12 o'clock:
    const targetOffset = (360 - ((finalIdx + 0.5) * theta) % 360) % 360;
    const currentAngle = rotation % 360;
    const delta = (targetOffset - currentAngle + 360) % 360;
    const extraRotations = 360 * 6; // 6 full spins
    const nextRotation = rotation + extraRotations + delta;

    setRotation(nextRotation);
  };

  const handleTransitionEnd = () => {
    setIsSpinning(false);
    if (targetIndexRef.current !== null && activeProvinces[targetIndexRef.current]) {
      const selected = activeProvinces[targetIndexRef.current];
      setWinner(selected);
      onSelect?.(selected);
    }
  };

  // Generate wheel slices
  const slices = activeProvinces.map((province, i) => {
    const startAngle = (i * theta - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * theta - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
    
    // Exact center angle of slice i
    const sliceAngle = (i + 0.5) * theta - 90;
    const sliceAngleRad = sliceAngle * (Math.PI / 180);

    const shortName = formatShortName(province.name);
    const isReady = province.status === 'ready';

    return (
      <g key={province.slug + '-' + i}>
        {/* Slice wedge */}
        <path
          d={pathData}
          fill={SLICE_COLORS_PALETTE[i % SLICE_COLORS_PALETTE.length]}
          stroke="#0b0f19"
          strokeWidth={mode === 'all' ? '0.75' : '1.5'}
        />

        {/* Ready province golden dot indicator near outer rim */}
        {mode === 'all' && isReady && (
          <circle
            cx={center + 233 * Math.cos(sliceAngleRad)}
            cy={center + 233 * Math.sin(sliceAngleRad)}
            r="2.5"
            fill="#fde047"
            stroke="#78350f"
            strokeWidth="0.5"
          />
        )}

        {/* Province Name Text: rotated to sliceAngle, anchored at outer rim (x = center + 226) extending inward */}
        <g transform={`rotate(${sliceAngle}, ${center}, ${center})`}>
          <text
            x={center + (mode === 'all' ? (isReady ? 224 : 228) : 226)}
            y={center}
            textAnchor="end"
            dominantBaseline="central"
            fill="#ffffff"
            fontSize={mode === 'all' ? '7.5' : '11'}
            fontWeight={isReady ? '700' : '600'}
            className="select-none"
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.9)',
              letterSpacing: mode === 'all' ? '-0.2px' : '0.2px',
            }}
          >
            {shortName}
          </text>
        </g>
      </g>
    );
  });

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      {/* Top Section: Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Compass className="h-3.5 w-3.5" />
            <span>Vòng quay may mắn</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Khám phá ngẫu nhiên điểm đến tiếp theo
          </h2>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
          <button
            type="button"
            disabled={isSpinning}
            onClick={() => handleModeChange('all')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              mode === 'all'
                ? 'bg-amber-400 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tất cả 63 tỉnh thành
          </button>
          <button
            type="button"
            disabled={isSpinning}
            onClick={() => handleModeChange('ready')}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              mode === 'ready'
                ? 'bg-amber-400 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            11 tỉnh sẵn sàng
          </button>
        </div>
      </div>

      {/* Main Wheel & Result Section */}
      <div className="flex flex-col lg:flex-row items-center justify-around gap-6 pt-1">
        {/* The Wheel */}
        <div className="relative flex items-center justify-center">
          {/* Outer glowing aura */}
          <div className="absolute h-[340px] w-[340px] sm:h-[420px] sm:w-[420px] rounded-full bg-gradient-to-tr from-amber-500/20 via-sky-500/10 to-rose-500/20 blur-2xl" />

          {/* Top Pointer */}
          <div className="absolute -top-3.5 z-20 flex flex-col items-center">
            <div className="h-0 w-0 border-x-[10px] border-x-transparent border-t-[24px] border-t-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" />
            <div className="-mt-1 h-2.5 w-2.5 rounded-full bg-amber-200 ring-2 ring-amber-500 shadow" />
          </div>

          {/* SVG Wheel (540x540 ViewBox for high resolution) */}
          <svg
            viewBox="0 0 540 540"
            className="relative z-10 h-[320px] w-[320px] sm:h-[400px] sm:w-[400px] md:h-[440px] md:w-[440px] drop-shadow-2xl"
          >
            {/* Outer Rim */}
            <circle cx="270" cy="270" r="252" fill="#0b0f19" stroke="#d97706" strokeWidth="5" />

            {/* Decorative Golden Studs */}
            {Array.from({ length: 32 }).map((_, i) => {
              const ang = (i * (360 / 32)) * (Math.PI / 180);
              const sx = 270 + 248 * Math.cos(ang);
              const sy = 270 + 248 * Math.sin(ang);
              return <circle key={i} cx={sx} cy={sy} r="2.5" fill="#fef08a" />;
            })}

            {/* Rotatable wheel group */}
            <g
              ref={wheelRef}
              transform={`rotate(${rotation}, 270, 270)`}
              style={{
                transition: isSpinning
                  ? 'transform 4300ms cubic-bezier(0.12, 0.85, 0.18, 1)'
                  : 'none',
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {slices}
            </g>

            {/* Center Hub */}
            <circle cx="270" cy="270" r="46" fill="#0b0f19" stroke="#d97706" strokeWidth="4" />
            <circle cx="270" cy="270" r="40" fill="#1e293b" />
          </svg>

          {/* Center Spin Button */}
          <button
            type="button"
            disabled={isSpinning}
            onClick={handleSpin}
            className={`absolute z-30 flex h-16 w-16 items-center justify-center rounded-full font-black text-xs uppercase tracking-wider shadow-2xl transition-all ${
              isSpinning
                ? 'cursor-not-allowed bg-slate-800 text-slate-500 ring-2 ring-slate-700'
                : 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 text-slate-950 ring-4 ring-amber-500/60 hover:scale-105 active:scale-95 animate-pulse'
            }`}
          >
            {isSpinning ? (
              <RotateCw className="h-6 w-6 animate-spin text-amber-400" />
            ) : (
              'QUAY'
            )}
          </button>
        </div>

        {/* Result Showcase Card */}
        <div className="w-full max-w-sm space-y-3 text-center lg:text-left">
          {winner ? (
            <div className="rounded-2xl border border-amber-400/60 bg-gradient-to-b from-amber-500/15 to-slate-950/80 p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-center lg:justify-start gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Bánh xe đã dừng lại tại:</span>
              </div>

              <h3 className="text-2xl font-black text-white flex items-center justify-center lg:justify-start gap-2">
                <MapPin className="h-6 w-6 text-amber-400 shrink-0" />
                <span>{winner.name}</span>
              </h3>

              {winner.experience ? (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Đã sẵn sàng kịch bản</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {winner.experience.title}
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center lg:justify-start">
                    <Link
                      to={winner.experience.path}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-400 px-5 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-lg transition-transform hover:bg-amber-300 active:scale-95"
                    >
                      Khám phá {winner.name} ngay
                    </Link>
                    <button
                      type="button"
                      disabled={isSpinning}
                      onClick={handleSpin}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                    >
                      Quay lại
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                    <span>Đang biên tập kịch bản</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {winner.adminUnit} • Kịch bản trải nghiệm tương tác cho {winner.name} đang được ban biên tập hoàn thiện và sẽ sớm ra mắt.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center lg:justify-start">
                    <button
                      type="button"
                      disabled={isSpinning}
                      onClick={handleSpin}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-400 px-5 text-xs font-bold uppercase tracking-wider text-slate-950 transition-transform hover:bg-amber-300 active:scale-95"
                    >
                      Quay tỉnh khác
                    </button>
                    <Link
                      to={`/?q=${winner.slug}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                    >
                      Xem trên bản đồ
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-center space-y-3">
              <p className="text-xs text-slate-400">
                Vòng quay đang hiển thị <strong className="text-amber-300">{n} tỉnh thành</strong>. Hãy nhấn nút <strong className="text-amber-300">QUAY</strong> ở tâm bánh xe để chọn điểm dừng chân cho bạn.
              </p>
              <button
                type="button"
                disabled={isSpinning}
                onClick={handleSpin}
                className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-400/10 px-4 text-xs font-bold uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-400/20 active:scale-95"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Bắt đầu quay may mắn</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
