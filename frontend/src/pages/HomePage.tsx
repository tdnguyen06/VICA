import React from 'react';
import { MapViewer } from '../components/Map/MapViewer';
import { ProvinceDetailDrawer } from '../components/Culture/ProvinceDetailDrawer';
import { useHealth } from '../hooks/useHealth';
import { formatDate } from '../utils/formatters';
import { Server, Activity, CheckCircle2, XCircle, Database, Cpu, Globe } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { data: health, isLoading, isError, error, refetch } = useHealth();

  return (
    <div className="space-y-8">
      {/* Intro hero banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            Khởi tạo Nền tảng (Phase 1)
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Bản đồ Văn hóa Việt Nam Tương tác
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Hệ thống nền tảng kiến trúc Modular Monolith kết hợp GIS không gian (PostGIS), 
            Vector Search (pgvector), Spring Boot 3.x, React, Vite và MapLibre GL JS.
          </p>
        </div>
      </div>

      {/* Backend Health Check Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Backend API Health Status</h3>
              <p className="text-xs text-slate-400">Kiểm tra kết nối trực tiếp đến Spring Boot /api/v1/health</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            Làm mới
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-400 text-sm py-3">
            <Activity className="h-4 w-4 animate-spin text-amber-400" />
            <span>Đang kết nối backend server...</span>
          </div>
        )}

        {isError && (
          <div className="flex items-start space-x-3 bg-red-950/40 border border-red-800/60 rounded-lg p-3 text-sm text-red-300">
            <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Chưa kết nối được Backend:</p>
              <p className="text-xs text-red-400/80 mt-1">{(error as Error)?.message || 'Connection refused (hãy chắc chắn backend đang chạy tại port 8080)'}</p>
            </div>
          </div>
        )}

        {health && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/60 rounded-lg p-4 border border-slate-800 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Trạng thái</span>
              <span className="inline-flex items-center space-x-1.5 font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>{health.status}</span>
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Ứng dụng</span>
              <span className="font-medium text-slate-200">{health.app}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Môi trường</span>
              <span className="font-medium text-amber-400 uppercase">{health.environment}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Thời gian hệ thống</span>
              <span className="font-mono text-xs text-slate-300">{formatDate(health.timestamp)}</span>
            </div>
          </div>
        )}
      </div>

      {/* MapLibre Viewer Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-200 font-semibold">
            <Globe className="h-5 w-5 text-amber-400" />
            <h3>Bản đồ Văn hóa Địa lý tương tác (MapLibre GL JS)</h3>
          </div>
          <span className="text-xs text-slate-400">Tọa độ mẫu: Hà Nội & TP. Hồ Chí Minh</span>
        </div>
        <MapViewer className="h-[580px] w-full" />
        <ProvinceDetailDrawer />        
      </div>

      {/* Architecture Foundations Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-amber-400 mb-2">
            <Database className="h-4 w-4" />
            <h4 className="font-semibold text-sm">Database & GIS</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            PostgreSQL 16 kết hợp extension PostGIS (Spatial Data) & pgvector (Vector Embeddings) cho lưu trữ địa lý & tìm kiếm tương đồng.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-rose-400 mb-2">
            <Cpu className="h-4 w-4" />
            <h4 className="font-semibold text-sm">AI Framework Ready</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Kiến trúc Spring AI với dynamic LLM providers (Gemini/OpenAI) qua biến môi trường, sẵn sàng cho RAG và AI Agent.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-blue-400 mb-2">
            <Server className="h-4 w-4" />
            <h4 className="font-semibold text-sm">Modular Monolith</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Thiết kế ranh giới nghiệp vụ độc lập: auth, user, geography, culture, heritage, document, ai, recommendation, journey.
          </p>
        </div>
      </div>
    </div>
  );
};

