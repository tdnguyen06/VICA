import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  RotateCcw,
  Scale,
  MapPin,
  Bot,
  User as UserIcon,
  Compass,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import {
  sendChatMessage,
  sendCompareMessage,
  getLastConversationId,
  clearLastConversationId,
  fetchConversationDetail,
} from '../../api/assistantApi';
import type {
  ChatMessageItem,
  CompareAspect,
  CitationDto,
} from '../../types/assistant';
import { SourceCitationList } from './SourceCitationList';
import { ComparisonModal } from './ComparisonModal';

const STARTER_PROMPTS = [
  'Giới thiệu các di sản văn hóa thế giới UNESCO tại Việt Nam',
  'Ẩm thực Hà Nội có những nét tinh hoa nào đặc trưng?',
  'Kể về truyền thuyết Hồ Gươm và Rùa Vàng Thần Kim Quy',
  'Nhã nhạc Cung đình Huế có giá trị lịch sử như thế nào?',
];

export const CulturalAiAssistant: React.FC = () => {
  const currentProvince = useAppStore((state) => state.currentProvince);
  const isStoreOpen = useAppStore((state) => state.isAssistantOpen);
  const setIsStoreOpen = useAppStore((state) => state.setIsAssistantOpen);
  const assistantInitialPrompt = useAppStore((state) => state.assistantInitialPrompt);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [activeProvinceSlug, setActiveProvinceSlug] = useState<string | null>(null);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync open state with store
  useEffect(() => {
    setIsOpen(isStoreOpen);
  }, [isStoreOpen]);

  const setDrawerOpen = (open: boolean) => {
    setIsOpen(open);
    setIsStoreOpen(open);
  };

  const handleSendMessage = async (textToSend?: string, provinceOverride?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || isLoading) return;

    const targetProvince = provinceOverride !== undefined ? provinceOverride : activeProvinceSlug;
    if (provinceOverride) {
      setActiveProvinceSlug(provinceOverride);
    }

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessageItem = {
      id: userMessageId,
      role: 'USER',
      content: messageContent,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) {
      setInputText('');
    }
    setIsLoading(true);
    setHighlightedCitation(null);

    try {
      const response = await sendChatMessage({
        conversationId,
        message: messageContent,
        provinceSlug: targetProvince,
      });

      setConversationId(response.conversationId);
      if (response.provinceSlug) {
        setActiveProvinceSlug(response.provinceSlug);
      }

      const assistantMessage: ChatMessageItem = {
        id: response.messageId || `asst-${Date.now()}`,
        role: 'ASSISTANT',
        content: response.content,
        provinceSlug: response.provinceSlug,
        citations: response.citations,
        suggestedQuestions: response.suggestedQuestions,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessageText =
        error.response?.data?.message ||
        'Hệ thống trợ lý văn hóa VICA hiện đang tạm thời gián đoạn kết nối. Xin bạn vui lòng thử lại sau ít phút.';

      const errorMessage: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'ASSISTANT',
        content: errorMessageText,
        isError: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  // Sync active province with appStore when user selects a province on map
  useEffect(() => {
    if (currentProvince) {
      setActiveProvinceSlug(currentProvince);
    }
  }, [currentProvince]);

  // Handle triggered prompt from other components (e.g. Map card)
  useEffect(() => {
    if (assistantInitialPrompt) {
      handleSendMessage(assistantInitialPrompt, currentProvince || undefined);
      useAppStore.setState({ assistantInitialPrompt: null });
    }
  }, [assistantInitialPrompt]);

  // Close drawer on Escape key (if comparison modal is not open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isCompareModalOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCompareModalOpen]);

  // Try restoring previous conversation on initial mount
  useEffect(() => {
    const savedId = getLastConversationId();
    if (savedId) {
      setConversationId(savedId);
      fetchConversationDetail(savedId)
        .then((detail) => {
          if (detail && detail.messages && detail.messages.length > 0) {
            const restored: ChatMessageItem[] = detail.messages.map((m) => {
              let parsedCitations: CitationDto[] = [];
              try {
                parsedCitations = JSON.parse(m.citations || '[]');
              } catch {
                parsedCitations = [];
              }
              return {
                id: m.id,
                role: m.role,
                content: m.content,
                citations: parsedCitations,
                createdAt: m.createdAt,
              };
            });
            setMessages(restored);
            if (detail.currentProvinceSlug) {
              setActiveProvinceSlug(detail.currentProvinceSlug);
            }
          }
        })
        .catch(() => {
          setConversationId(null);
        });
    }
  }, []);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);


  const handleCompareSubmit = async (
    provinceSlugs: string[],
    aspect: CompareAspect,
    provinceNames?: string[]
  ) => {
    setIsLoading(true);
    setDrawerOpen(true);
    setHighlightedCitation(null);

    const aspectMap: Record<CompareAspect, string> = {
      CUISINE: 'Ẩm thực truyền thống',
      HERITAGE: 'Di sản & Lịch sử',
      FESTIVALS: 'Lễ hội & Phong tục',
      ALL: 'Toàn diện',
    };

    const displayNameList =
      provinceNames && provinceNames.length > 0
        ? provinceNames.join(' và ')
        : provinceSlugs.join(', ');

    const userPrompt = `So sánh văn hóa giữa ${displayNameList} về khía cạnh ${aspectMap[aspect]}.`;
    const userMessage: ChatMessageItem = {
      id: `compare-user-${Date.now()}`,
      role: 'USER',
      content: userPrompt,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await sendCompareMessage({
        conversationId,
        provinceSlugs,
        aspect,
      });

      setConversationId(response.conversationId);

      const assistantMessage: ChatMessageItem = {
        id: response.messageId || `compare-asst-${Date.now()}`,
        role: 'ASSISTANT',
        content: response.content,
        citations: response.citations,
        suggestedQuestions: response.suggestedQuestions,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Compare error:', error);
      const errorMessageText =
        error.response?.data?.message ||
        'Không thể hoàn thành yêu cầu so sánh văn hóa vào lúc này. Xin vui lòng thử lại.';

      const errorMessage: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'ASSISTANT',
        content: errorMessageText,
        isError: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConversation = () => {
    clearLastConversationId();
    setConversationId(null);
    setMessages([]);
    setHighlightedCitation(null);
  };

  const renderInlineFormatted = (
    text: string,
    messageId: string | number,
    citations?: CitationDto[]
  ) => {
    // Split by citation markers [1] and bold **text**
    const parts = text.split(/(\[\d+\]|\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
      const citeMatch = part.match(/^\[(\d+)\]$/);
      if (citeMatch) {
        const citeNum = parseInt(citeMatch[1], 10);
        const targetCite = citations?.[citeNum - 1];
        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              setHighlightedCitation(citeNum);
              const el = document.getElementById(`citation-item-${messageId}-${citeNum}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }}
            className={`inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-bold border transition ${
              highlightedCitation === citeNum
                ? 'bg-amber-400 text-slate-950 border-amber-300 scale-110 shadow-sm'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
            title={targetCite ? `Nguồn: ${targetCite.sourceName}` : `Trích dẫn [${citeNum}]`}
          >
            [{citeNum}]
          </button>
        );
      }

      const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        return (
          <strong key={index} className="font-semibold text-amber-200/90">
            {boldMatch[1]}
          </strong>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  const renderFormattedText = (
    content: string,
    messageId: string | number,
    citations?: CitationDto[]
  ) => {
    if (!content) return null;

    const lines = content.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-slate-200 text-xs sm:text-sm font-normal">
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={lIdx} className="h-1" />;
          }

          // Heading ### or ##
          if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
            const headingText = trimmed.replace(/^#{2,3}\s+/, '');
            return (
              <h5 key={lIdx} className="font-bold text-amber-300 text-xs sm:text-sm pt-1.5 pb-0.5">
                {renderInlineFormatted(headingText, messageId, citations)}
              </h5>
            );
          }

          // Bullet items
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.replace(/^[-*]\s+/, '');
            return (
              <div key={lIdx} className="flex items-start space-x-2 pl-2">
                <span className="text-amber-400 font-bold leading-5">•</span>
                <div className="flex-1">
                  {renderInlineFormatted(bulletText, messageId, citations)}
                </div>
              </div>
            );
          }

          // Numbered items
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={lIdx} className="flex items-start space-x-1.5 pl-2">
                <span className="text-amber-400 font-mono font-bold text-xs">{numMatch[1]}.</span>
                <div className="flex-1">
                  {renderInlineFormatted(numMatch[2], messageId, citations)}
                </div>
              </div>
            );
          }

          return (
            <p key={lIdx} className="leading-relaxed">
              {renderInlineFormatted(line, messageId, citations)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Assistant Launcher Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setDrawerOpen(!isOpen)}
          className="relative group p-4 bg-gradient-to-tr from-amber-500 via-rose-500 to-red-600 rounded-full text-white shadow-xl shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center"
          title="Trợ lý Tri thức Văn hóa VICA"
        >
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 opacity-60 blur-sm group-hover:opacity-100 transition animate-pulse" />
          <div className="relative flex items-center justify-center">
            {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
          </div>
          {!isOpen && (
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-900/90 text-amber-300 text-xs font-semibold border border-amber-500/30 shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition duration-200 pointer-events-none">
              Trợ lý Văn hóa VICA
            </span>
          )}
        </button>
      </div>

      {/* Slide-over Chat Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[520px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-xl text-white shadow-md shadow-rose-500/20">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">Trợ lý Văn hóa VICA</h3>
                <p className="text-xs text-slate-400">Trợ lý Tri thức Văn hóa 63 Tỉnh Thành</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-lg transition"
                title="So sánh văn hóa vùng miền"
              >
                <Scale className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetConversation}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
                title="Bắt đầu phiên hội thoại mới"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition"
                title="Đóng bảng chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          {activeProvinceSlug && (
            <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center space-x-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Bối cảnh địa phương:</span>
                <span className="font-bold uppercase tracking-wider">{activeProvinceSlug}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveProvinceSlug(null)}
                className="text-[11px] text-amber-400/80 hover:text-amber-300 underline ml-2 shrink-0"
              >
                Bỏ bối cảnh
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="py-8 px-2 text-center space-y-6">
                <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-rose-500/10 border border-amber-500/20 text-amber-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-slate-100">Khám phá Văn hóa Việt Nam</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Hỏi đáp di tích, truyền thuyết, ẩm thực và lễ hội 63 tỉnh thành có trích dẫn nguồn kiểm chứng độc lập.
                  </p>
                </div>

                <div className="space-y-2 text-left pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block px-1">
                    Gợi ý câu hỏi bắt đầu:
                  </span>
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/40 text-xs text-slate-300 hover:text-amber-300 transition flex items-center justify-between group"
                    >
                      <span>{prompt}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0 ml-2 transition" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${
                    msg.role === 'USER' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role !== 'USER' && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm ${
                      msg.role === 'USER'
                        ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md shadow-rose-600/10'
                        : msg.isError
                        ? 'bg-red-950/40 border border-red-800/60 text-red-200'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 shadow-sm'
                    }`}
                  >
                    {msg.isError && (
                      <div className="flex items-center space-x-1.5 text-red-400 font-semibold mb-1 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Thông báo từ hệ thống</span>
                      </div>
                    )}

                    {renderFormattedText(msg.content, msg.id, msg.citations)}

                    {/* Source citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <SourceCitationList
                        citations={msg.citations}
                        highlightedIndex={highlightedCitation}
                        messageId={msg.id}
                      />
                    )}

                    {/* Suggested questions */}
                    {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Câu hỏi gợi ý mở rộng:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestedQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendMessage(q.question)}
                              className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition"
                            >
                              {q.question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'USER' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-400 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Trợ lý VICA đang tra cứu dữ liệu văn hóa...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end space-x-2"
            >
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-amber-500/80 transition">
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    activeProvinceSlug
                      ? `Hỏi về văn hóa tại ${activeProvinceSlug}...`
                      : 'Hỏi về di sản, ẩm thực, lịch sử Việt Nam...'
                  }
                  rows={2}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className={`p-3 rounded-xl transition shadow-md shrink-0 ${
                  inputText.trim() && !isLoading
                    ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white hover:from-amber-400 hover:to-rose-500 shadow-rose-600/20 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
                title="Gửi câu hỏi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1">
              <span>Nhấn Enter để gửi, Shift+Enter xuống dòng</span>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="hover:text-amber-400 transition flex items-center space-x-1"
              >
                <Scale className="w-3 h-3" />
                <span>So sánh vùng miền</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      <ComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        onCompare={handleCompareSubmit}
        initialProvinceSlug={activeProvinceSlug}
      />
    </>
  );
};
