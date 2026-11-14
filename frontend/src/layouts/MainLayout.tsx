import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Map, Bot } from 'lucide-react';
import { CulturalAiAssistant } from '../components/Chat/CulturalAiAssistant';
import { ProvinceDetailDrawer } from '../components/Culture/ProvinceDetailDrawer';
import { useAppStore } from '../stores/appStore';
import { UserMenu } from '../components/Auth/UserMenu';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col text-clay-900">
      <header className="relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div>
              <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-600 via-rose-600 to-red-700 bg-clip-text text-transparent">
                Vietnam Cultural Atlas
              </h1>
              <p className="text-xs text-clay-600">Nền tảng Bản đồ Văn hóa & AI</p>
            </div>
          </Link>

          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className="flex items-center space-x-1.5 text-clay-700 hover:text-amber-700 transition-colors">
              <Map className="h-4 w-4" />
              <span>Bản đồ</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                const state = useAppStore.getState();
                state.setIsAssistantOpen(!state.isAssistantOpen);
              }}
              className="flex items-center space-x-1.5 text-clay-700 hover:text-amber-700 transition-colors cursor-pointer group"
            >
              <Bot className="h-4 w-4 text-amber-700 group-hover:rotate-12 transition-transform" />
              <span>Trợ lý AI</span>
            </button>
            <UserMenu />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-clay-200 bg-clay-50/60 backdrop-blur-sm py-4 text-center text-xs text-clay-500">
        Bản đồ Văn hóa Việt Nam &copy; 2026. Nền tảng số hóa Văn hóa, Địa lý & Di sản Việt Nam.
      </footer>

      {/* Floating Cultural AI Assistant Drawer */}
      <CulturalAiAssistant />

      {/* Cultural Exploration Drawer (Người 2 - Cultural Overview) */}
      <ProvinceDetailDrawer />
    </div>
  );
};

