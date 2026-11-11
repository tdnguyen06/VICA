import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Compass, Map, Bot } from 'lucide-react';
import { CulturalAiAssistant } from '../components/Chat/CulturalAiAssistant';
import { useAppStore } from '../stores/appStore';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <span className="p-2 bg-gradient-to-tr from-amber-500 to-red-600 rounded-lg text-white shadow-lg shadow-red-500/20">
              <Compass className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-amber-400 via-rose-400 to-red-500 bg-clip-text text-transparent">
                Vietnam Cultural Atlas
              </h1>
              <p className="text-xs text-slate-400">Nền tảng Bản đồ Văn hóa & AI</p>
            </div>
          </Link>

          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className="flex items-center space-x-1.5 text-slate-300 hover:text-amber-400 transition-colors">
              <Map className="h-4 w-4" />
              <span>Bản đồ</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                const state = useAppStore.getState();
                state.setIsAssistantOpen(!state.isAssistantOpen);
              }}
              className="flex items-center space-x-1.5 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer group"
            >
              <Bot className="h-4 w-4 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span>Trợ lý AI</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Bản đồ Văn hóa Việt Nam &copy; 2026. Nền tảng số hóa Văn hóa, Địa lý & Di sản Việt Nam.
      </footer>

      {/* Floating Cultural AI Assistant Drawer */}
      <CulturalAiAssistant />
    </div>
  );
};

