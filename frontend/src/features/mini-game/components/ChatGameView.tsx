import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Clock, Compass, FastForward, Info, MapPin, RotateCcw, RotateCw, Send } from 'lucide-react';
import type { Scenario, ChoiceScene } from '../scenario';
import type { GameEvent, GameState } from '../state';
import { buildJournal, renderNarrative } from '../journal';
import { CulturalReferences } from './CulturalReferences';
import { Link } from 'react-router-dom';
import { createSceneAssistant } from '../assistant/assistant';
import type { SceneCitation } from '../assistant/assistant';
import { createBrowserAssistantTransport } from '../assistant/browserTransport';
import { hanoiVisuals } from '../content/media';
import { regionalPhotos } from '../content/regional-media';
import { resolveRegionalPhoto } from '../regional-photo';

export interface ChatChoiceOption {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly choiceId: string;
  readonly category: string;
}

export interface ResultReactionOption {
  readonly id: string;
  readonly text: string;
}

export interface ChatMessage {
  readonly id: string;
  readonly type: 'companion' | 'user' | 'narrator' | 'culture' | 'visual' | 'divider';
  readonly speaker?: string;
  readonly text?: string;
  readonly assetId?: string | null;
  readonly imageUrl?: string | null;
  readonly imageCaption?: string;
  readonly citations?: SceneCitation[];
  readonly isAiGenerated?: boolean;
}

// ── ANIME VISUAL ASSETS (FOR HANOI IMMERSIVE STORYPLAY) ──
interface AnimeVisual {
  readonly src: string;
  readonly caption: string;
  readonly tag: string;
}

const HANOI_ANIME_VISUALS: Record<string, AnimeVisual> = {
  'hanoi-lake': {
    src: '/mini-game/anime/hanoi-lake-anime.jpg',
    caption: 'Hồ Hoàn Kiếm sương sớm • Tháp Rùa huyền ảo trong ánh bình minh',
    tag: 'Bình minh Hồ Gươm',
  },
  'hanoi-morning-walk': {
    src: '/mini-game/anime/hanoi-walk-anime.jpg',
    caption: 'Con đường ven hồ rợp bóng liễu • Không khí sớm mai trong lành',
    tag: 'Tản bộ ven hồ',
  },
  'morning-walk': {
    src: '/mini-game/anime/hanoi-walk-anime.jpg',
    caption: 'Con đường ven hồ rợp bóng liễu • Không khí sớm mai trong lành',
    tag: 'Tản bộ ven hồ',
  },
  'hanoi-bun-cha': {
    src: '/mini-game/anime/hanoi-bun-cha-anime.jpg',
    caption: 'Bún chả Hà Nội nướng than hoa thơm nức • Ẩm thực truyền thống',
    tag: 'Bún chả Hà Nội',
  },
  'lunch-bun-cha': {
    src: '/mini-game/anime/hanoi-bun-cha-anime.jpg',
    caption: 'Bún chả Hà Nội nướng than hoa thơm nức • Ẩm thực truyền thống',
    tag: 'Bún chả Hà Nội',
  },
  'hanoi-pho': {
    src: '/mini-game/anime/hanoi-pho-anime.jpg',
    caption: 'Bát phở bò gia truyền nghi ngút khói • Hương vị tinh hoa Tràng An',
    tag: 'Phở bò Hà Nội',
  },
  'lunch-pho': {
    src: '/mini-game/anime/hanoi-pho-anime.jpg',
    caption: 'Bát phở bò gia truyền nghi ngút khói • Hương vị tinh hoa Tràng An',
    tag: 'Phở bò Hà Nội',
  },
  'lunch-table': {
    src: '/mini-game/anime/hanoi-bun-cha-anime.jpg',
    caption: 'Mâm cơm ẩm thực trưa Hà Nội chuẩn bị sẵn sàng',
    tag: 'Ẩm thực trưa',
  },
  'hanoi-cafe': {
    src: '/mini-game/anime/hanoi-cafe-anime.jpg',
    caption: 'Quán cà phê góc phố cổ • Tách cà phê trứng bồng bềnh chiều vàng',
    tag: 'Cà phê trứng phố cổ',
  },
  'cafe-street': {
    src: '/mini-game/anime/hanoi-cafe-anime.jpg',
    caption: 'Quán cà phê góc phố cổ • Tách cà phê trứng bồng bềnh chiều vàng',
    tag: 'Cà phê trứng phố cổ',
  },
  'cafe-chat': {
    src: '/mini-game/anime/hanoi-cafe-anime.jpg',
    caption: 'Quán cà phê góc phố cổ • Tách cà phê trứng bồng bềnh chiều vàng',
    tag: 'Cà phê trứng phố cổ',
  },
  'cup-blank': {
    src: '/mini-game/anime/hanoi-pottery-anime.jpg',
    caption: 'Xưởng gốm Bát Tràng • Chiếc phôi gốm trắng tinh khôi chờ tạo tác',
    tag: 'Xưởng gốm Bát Tràng',
  },
  'cup-geometric': {
    src: '/mini-game/anime/hanoi-pottery-anime.jpg',
    caption: 'Tác phẩm gốm mộc mạc với hoa văn hình học cổ truyền',
    tag: 'Gốm họa tiết cổ',
  },
  'pottery-geometric': {
    src: '/mini-game/anime/hanoi-pottery-anime.jpg',
    caption: 'Tác phẩm gốm mộc mạc với hoa văn hình học cổ truyền',
    tag: 'Gốm họa tiết cổ',
  },
  'cup-leaves': {
    src: '/mini-game/anime/hanoi-pottery-anime.jpg',
    caption: 'Tác phẩm gốm Bát Tràng với nét vẽ hoa sen thanh tao',
    tag: 'Gốm họa tiết hoa lá',
  },
  'pottery-leaves': {
    src: '/mini-game/anime/hanoi-pottery-anime.jpg',
    caption: 'Tác phẩm gốm Bát Tràng với nét vẽ hoa sen thanh tao',
    tag: 'Gốm họa tiết hoa lá',
  },
};

// Clean caption: remove Wikimedia noise like "ảnh tham khảo...", "London", "đối chiếu..."
function cleanCaption(raw: string, provinceName: string): string {
  if (!raw) return `Không gian văn hóa ${provinceName}`;
  let clean = raw.split(';')[0].split('—')[0].trim();
  clean = clean.replace(/, ảnh năm \d{4}/g, '');
  clean = clean.replace(/, ảnh chụp năm \d{4}/g, '');
  clean = clean.replace(/; ảnh chụp năm \d{4}/g, '');
  clean = clean.replace(/ theo mô tả của tác giả/g, '');
  clean = clean.replace(/\.$/, '');
  return clean || `Không gian văn hóa ${provinceName}`;
}

// ── RESOLVE DISPLAY VISUAL ACCURATELY FOR ALL 63 PROVINCES (NO CREDITS DISPLAYED) ──
function resolveDisplayVisual(
  story: Scenario,
  assetId?: string | null,
  choiceId?: string | null,
  selectedMorningChoiceId?: string
): {
  src: string;
  caption: string;
  tag: string;
} {
  const isHanoi = story.provinceSlug === 'hanoi';

  // 1. For Hanoi, prioritize anime visuals
  if (isHanoi) {
    const cleanId = (assetId?.includes(':') ? assetId.split(':')[1] : assetId) ?? '';
    const anime = HANOI_ANIME_VISUALS[cleanId] || (choiceId ? HANOI_ANIME_VISUALS[choiceId] : null);
    if (anime) {
      return {
        src: anime.src,
        caption: anime.caption,
        tag: anime.tag,
      };
    }
    const realHanoi = assetId ? hanoiVisuals[assetId] : hanoiVisuals['hanoi-lake'];
    if (realHanoi && realHanoi.kind === 'photo') {
      return {
        src: realHanoi.src,
        caption: cleanCaption(realHanoi.caption, story.provinceName),
        tag: 'Không gian văn hóa Hà Nội',
      };
    }
  }

  // 2. For regional provinces (Đà Nẵng, Huế, TP. HCM, Cần Thơ, Ninh Bình, Hạ Long, v.v.)
  // Use the canonical regional resolver with prefix: `slug:suffix`
  const normalizedAssetId = assetId?.includes(':')
    ? assetId
    : `${story.provinceSlug}:${assetId ?? 'intro'}`;

  const resolved = resolveRegionalPhoto(normalizedAssetId, selectedMorningChoiceId ?? choiceId ?? undefined);
  if (resolved) {
    const tag =
      resolved.role === 'meal-preview'
        ? 'Ẩm thực truyền thống'
        : resolved.role === 'pause' || resolved.role === 'postcard-scene'
          ? 'Không gian lưu niệm'
          : 'Danh lam & Di sản';

    return {
      src: resolved.photo.src,
      caption: cleanCaption(resolved.photo.caption, story.provinceName),
      tag: `${tag} • ${story.provinceName}`,
    };
  }

  // 3. Fallback: match directly in regionalPhotos
  const cleanId = (assetId?.includes(':') ? assetId.split(':')[1] : assetId) ?? '';
  const foundPhoto = regionalPhotos.find(
    p => p.id === cleanId || p.choiceId === cleanId || p.choiceId === choiceId
  );
  if (foundPhoto) {
    return {
      src: foundPhoto.src,
      caption: cleanCaption(foundPhoto.caption, story.provinceName),
      tag: `Không gian ${story.provinceName}`,
    };
  }

  // 4. Any photo belonging to this province slug
  const provincePhoto = regionalPhotos.find(p => p.id.startsWith(story.provinceSlug));
  if (provincePhoto) {
    return {
      src: provincePhoto.src,
      caption: cleanCaption(provincePhoto.caption, story.provinceName),
      tag: `Khám phá ${story.provinceName}`,
    };
  }

  // 5. Ultimate fallback
  return {
    src: '/mini-game/hanoi/hanoi-lake.jpg',
    caption: `Khám phá di sản ${story.provinceName}`,
    tag: `Điểm đến ${story.provinceName}`,
  };
}

// ── CONTEXTUAL SMART QUICK PROMPTS FOR PRECISE AI REPLIES ──
function getSmartQuickPrompts(story: Scenario, game: GameState): string[] {
  const province = story.provinceName;
  const scene = game.sceneId !== 'intro' && game.sceneId !== 'journal' ? story.scenes[game.sceneId] : null;
  const lastChoice = game.choices[game.choices.length - 1];

  // In result phase: specifically ask about the selected spot/dish
  if (game.phase === 'result' && lastChoice) {
    const chosenScene = story.scenes[lastChoice.sceneId];
    const chosenOption = chosenScene?.choices.find(c => c.id === lastChoice.choiceId);
    if (chosenOption) {
      const optName = chosenOption.label;
      return [
        `Nét đặc sắc và ý nghĩa văn hóa của ${optName}`,
        `Lịch sử gắn liền với ${optName} tại ${province}`,
        `Người dân ${province} có thói quen gì gắn liền với ${optName}?`,
        `Thời điểm nào trong năm thích hợp nhất để trải nghiệm ${optName}?`,
      ];
    }
  }

  // In completed phase: reflections and future recommendations
  if (game.phase === 'completed') {
    return [
      `Những nét văn hóa tiêu biểu nhất của ${province}`,
      `Ẩm thực ${province} có gì khác biệt so với các vùng khác?`,
      `Nếu có thêm thời gian tại ${province}, mình nên ghé thăm nơi nào nữa?`,
      `Ý nghĩa lịch sử và phong tục của người dân ${province}`,
    ];
  }

  // In choice phase: create concrete prompts for each available choice
  if (scene && scene.choices && scene.choices.length >= 2) {
    const c1 = scene.choices[0].label;
    const c2 = scene.choices[1].label;
    const isMorning = game.sceneId === 'morning';
    const isLunch = game.sceneId === 'lunch';

    if (isMorning) {
      return [
        `Tìm hiểu chi tiết về ${c1}`,
        `Vẻ đẹp và nét văn hóa tại ${c2}`,
        `Buổi sáng ở ${province} có nét sinh hoạt gì đặc biệt?`,
        `Ý nghĩa văn hóa các địa danh buổi sớm tại ${province}`,
      ];
    }

    if (isLunch) {
      return [
        `Hương vị và cách chế biến món ${c1}`,
        `Nét đặc sắc của món ${c2} tại ${province}`,
        `Gia vị và nguyên liệu tạo nên nét riêng của ẩm thực ${province}`,
        `Văn hóa thưởng thức bữa trưa của người dân ${province}`,
      ];
    }

    return [
      `Khám phá nét độc đáo của ${c1}`,
      `Ý nghĩa văn hóa của ${c2}`,
      `Buổi chiều tại ${province} nên lưu giữ kỷ niệm gì?`,
      `Nghề thủ công và nghệ thuật truyền thống của ${province}`,
    ];
  }

  // General fallback
  return [
    `Những nét đặc sắc nhất của văn hóa ${province}`,
    `Ẩm thực truyền thống nổi tiếng tại ${province}`,
    `Thời điểm lý tưởng nhất để khám phá ${province}`,
    `Phong tục và đời sống thường nhật của người dân ${province}`,
  ];
}

export function ChatGameView({
  story,
  game,
  dispatch,
  onRestart,
  blocked,
}: {
  story: Scenario;
  game: GameState;
  dispatch: (event: GameEvent) => void;
  onRestart: () => void;
  blocked: boolean;
}) {
  const [customInput, setCustomInput] = useState('');
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [freeChatMessages, setFreeChatMessages] = useState<ChatMessage[]>([]);
  const [aiStoryOverrides, setAiStoryOverrides] = useState<Record<string, { content: string; citations: SceneCitation[] }>>({});

  // Progressive streaming of chat dialogue
  const [revealedCount, setRevealedCount] = useState<number>(() => (game.choices.length > 0 ? 9999 : 0));

  const assistantClient = useRef(createSceneAssistant(createBrowserAssistantTransport()));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const guideName = story.cast?.guide ?? 'An';
  const visitorName = story.cast?.visitor ?? 'Linh';

  const journal = buildJournal(story, game);
  const scene: ChoiceScene | null =
    game.phase !== 'intro' && game.phase !== 'completed' ? story.scenes[game.sceneId] ?? null : null;

  // Active visual resolution for left cinematic showcase (exact province-specific matching)
  const morningChoice = game.choices.find(c => c.sceneId === 'morning');
  const lastChoice = game.choices[game.choices.length - 1];
  const activeSceneChoice = lastChoice
    ? story.scenes[lastChoice.sceneId]?.choices.find(c => c.id === lastChoice.choiceId)
    : null;
  const activeAssetId = activeSceneChoice?.result.imageRef ?? story.introImageRef ?? 'intro';
  const activeVisual = resolveDisplayVisual(story, activeAssetId, lastChoice?.choiceId, morningChoice?.choiceId);

  // Time-of-day label (Clean, no emojis)
  const sessionLabel =
    game.sceneId === 'morning'
      ? 'Buổi sáng • Di tích & Đời sống'
      : game.sceneId === 'lunch'
        ? 'Buổi trưa • Ẩm thực truyền thống'
        : 'Buổi chiều • Văn hóa & Nghỉ ngơi';

  // Build the continuous chat stream from real authored content
  const baseChatMessages = buildChatHistory(story, game, visitorName, guideName, aiStoryOverrides);
  const allChatMessages = [...baseChatMessages, ...freeChatMessages];

  // Progressive reveal timer with human-like reading pacing
  useEffect(() => {
    if (revealedCount >= allChatMessages.length) return;

    const nextMsg = allChatMessages[revealedCount];
    const textLen = nextMsg?.text?.length ?? 20;
    const delay =
      nextMsg?.type === 'companion'
        ? Math.min(1800, Math.max(700, textLen * 18))
        : nextMsg?.type === 'visual'
          ? 400
          : 250;

    const timer = setTimeout(() => {
      setRevealedCount(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [revealedCount, allChatMessages.length]);

  const isStreaming = revealedCount < allChatMessages.length;
  const isWaitingForCompanion = isStreaming || isAiReplying;
  const isCompanionTyping = isStreaming && allChatMessages[revealedCount]?.type === 'companion';
  const visibleMessages = allChatMessages.slice(0, revealedCount);

  // Skip wait button
  const handleSkipWait = () => {
    setRevealedCount(allChatMessages.length);
  };

  // Auto scroll smoothly to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [revealedCount, visibleMessages.length, isAiReplying]);

  // Handle choice selection with Real AI assistant enhancement
  const sendChoice = async (opt: ChatChoiceOption) => {
    if (blocked || isWaitingForCompanion) return;

    // Show user speaking their selected choice aloud in chat
    const userMsg: ChatMessage = {
      id: `user-choice-${Date.now()}`,
      type: 'user',
      speaker: guideName,
      text: `Chúng mình cùng chọn: "${opt.title}" nhé! ${opt.description}`,
    };
    setFreeChatMessages(prev => [...prev, userMsg]);

    const origin = { expectedRunId: game.runId, expectedSceneId: game.sceneId, expectedRevision: game.revision };
    dispatch({ ...origin, type: 'choose', choiceId: opt.choiceId });

    setIsAiReplying(true);
    try {
      const prompt = `Người chơi ${guideName} vừa lựa chọn: "${opt.title}" tại ${story.provinceName}. Hãy đưa ra cảm nhận chân thực của ${visitorName} về không gian văn hóa này và đặt một câu hỏi mở tự nhiên để tiếp tục hành trình. Trả lời ngắn gọn, chân thực, dựa trên dữ liệu văn hóa chính xác của ${story.provinceName}.`;
      const res = await assistantClient.current.ask(story, game, prompt);
      if (res.status === 'answered' && res.content) {
        setAiStoryOverrides(prev => ({
          ...prev,
          [game.sceneId]: { content: res.content, citations: res.citations },
        }));
      }
    } catch {
      // Gracefully uses authored story blocks from scenario
    } finally {
      setIsAiReplying(false);
    }
  };

  // Intro greeting choice when in 'intro' phase
  const sendIntroChoice = (opt: ResultReactionOption) => {
    if (blocked || isWaitingForCompanion) return;
    const userMsg: ChatMessage = {
      id: `user-intro-${Date.now()}`,
      type: 'user',
      speaker: guideName,
      text: opt.text,
    };
    setFreeChatMessages(prev => [...prev, userMsg]);

    const origin = { expectedRunId: game.runId, expectedSceneId: game.sceneId, expectedRevision: game.revision };
    dispatch({ ...origin, type: 'start' });
  };

  // Dialogue reaction choice when in 'result' phase
  const sendReactionChoice = (opt: ResultReactionOption) => {
    if (blocked || isWaitingForCompanion) return;
    const userMsg: ChatMessage = {
      id: `user-res-${Date.now()}`,
      type: 'user',
      speaker: guideName,
      text: opt.text,
    };
    setFreeChatMessages(prev => [...prev, userMsg]);

    const origin = { expectedRunId: game.runId, expectedSceneId: game.sceneId, expectedRevision: game.revision };
    dispatch({ ...origin, type: 'continue' });
  };

  // Dialogue choice when in 'completed' phase
  const sendCompletedChoice = (opt: ResultReactionOption) => {
    if (blocked || isWaitingForCompanion) return;
    const userMsg: ChatMessage = {
      id: `user-comp-${Date.now()}`,
      type: 'user',
      speaker: guideName,
      text: opt.text,
    };
    setFreeChatMessages(prev => [...prev, userMsg]);
  };

  // Lucky roulette choice pick
  const handleLuckyChoiceSpin = () => {
    if (blocked || isWaitingForCompanion || richChoices.length === 0) return;
    const randomChoice = richChoices[Math.floor(Math.random() * richChoices.length)];
    if (randomChoice) {
      sendChoice(randomChoice);
    }
  };

  // Quick 1-click question prompt for AI friend (precise contextual query)
  const handleQuickPromptClick = async (prompt: string) => {
    if (isAiReplying || blocked) return;
    const userMsgId = `user-free-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      type: 'user',
      speaker: guideName,
      text: prompt,
    };
    setFreeChatMessages(prev => [...prev, userMsg]);
    setIsAiReplying(true);
    try {
      const res = await assistantClient.current.ask(story, game, prompt);
      if (res.status === 'answered' && res.content) {
        const aiMsg: ChatMessage = {
          id: `ai-free-${Date.now()}`,
          type: 'companion',
          speaker: visitorName,
          text: res.content,
          citations: res.citations,
          isAiGenerated: true,
        };
        setFreeChatMessages(prev => [...prev, aiMsg]);
      } else {
        const fallbackMsg: ChatMessage = {
          id: `ai-fallback-${Date.now()}`,
          type: 'companion',
          speaker: visitorName,
          text: `${story.provinceName} mang lại thật nhiều nét văn hóa độc đáo. Chúng mình cùng khám phá tiếp nhé!`,
        };
        setFreeChatMessages(prev => [...prev, fallbackMsg]);
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        type: 'companion',
        speaker: visitorName,
        text: `Điểm dừng chân tại ${story.provinceName} thật đáng nhớ. Chúng mình cùng tiếp tục nhé.`,
      };
      setFreeChatMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsAiReplying(false);
    }
  };

  // Free-form direct conversation with the AI companion
  const handleFreeChatSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = customInput.trim();
    if (!text || isAiReplying || blocked) return;

    const userMsgId = `user-free-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      type: 'user',
      speaker: guideName,
      text,
    };

    setFreeChatMessages(prev => [...prev, userMsg]);
    setCustomInput('');
    setIsAiReplying(true);

    try {
      const res = await assistantClient.current.ask(story, game, text);
      if (res.status === 'answered' && res.content) {
        const aiMsg: ChatMessage = {
          id: `ai-free-${Date.now()}`,
          type: 'companion',
          speaker: visitorName,
          text: res.content,
          citations: res.citations,
          isAiGenerated: true,
        };
        setFreeChatMessages(prev => [...prev, aiMsg]);
      } else {
        const errMsg: ChatMessage = {
          id: `ai-fallback-${Date.now()}`,
          type: 'companion',
          speaker: visitorName,
          text: `Không gian ${story.provinceName} thật nhiều điều thú vị. Chúng mình cùng đi tiếp nhé.`,
        };
        setFreeChatMessages(prev => [...prev, errMsg]);
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        type: 'companion',
        speaker: visitorName,
        text: `Khoảnh khắc này tại ${story.provinceName} thật đáng nhớ. Chúng mình cùng tiếp tục nhé.`,
      };
      setFreeChatMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsAiReplying(false);
    }
  };

  // Dynamic clean choices and contextual smart prompts
  const introChoices = getCleanIntroChoices(story, visitorName, guideName);
  const richChoices = scene ? getRealSceneChoices(story, scene) : [];
  const resultReactions = getCleanResultReactions(story, visitorName, game.sceneId);
  const completedChoices = getCleanCompletedChoices(story, visitorName);
  const quickPrompts = getSmartQuickPrompts(story, game);

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-5.5rem)] min-h-[640px] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* ── 2-Panel Split Layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
        {/* ── LEFT PANEL: CINEMATIC VISUAL SHOWCASE (Pure Photo, No Credits Displayed) ── */}
        <div className="relative flex lg:w-[45%] xl:w-[42%] shrink-0 flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900 min-h-[220px] lg:min-h-full">
          {/* Background Illustration / Photo */}
          <div className="absolute inset-0 z-0">
            <img
              src={activeVisual.src}
              alt={activeVisual.caption}
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
            {/* Dark Gradients for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />
          </div>

          {/* Top Location Bar */}
          <div className="relative z-10 flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 backdrop-blur-md">
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                {story.provinceName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-slate-300 backdrop-blur-md">
              <Clock className="h-3 w-3 text-amber-400" />
              <span>{sessionLabel}</span>
            </div>
          </div>

          {/* Bottom Caption (Clean, Pure Image Info, No Credits) */}
          <div className="relative z-10 p-4 sm:p-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-3.5 sm:p-4 backdrop-blur-xl shadow-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                <Info className="h-3.5 w-3.5" />
                <span>{activeVisual.tag}</span>
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-white leading-relaxed">
                {activeVisual.caption}
              </h3>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: MESSENGER DIALOGUE (No emojis, no AI sparkles) ── */}
        <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden bg-slate-950">
          {/* Header */}
          <header className="z-10 flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-900/95 px-4 py-2.5 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                to="/experiences"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                title="Về danh mục trải nghiệm"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-sm font-semibold text-amber-300 shadow-md overflow-hidden">
                  <img
                    src="/mini-game/anime/companion-linh-anime.jpg"
                    alt={visitorName}
                    className="h-full w-full object-cover"
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="hidden">{visitorName[0] ?? 'L'}</span>
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-emerald-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">{visitorName}</h2>
                  <span className="text-[10px] text-emerald-400">Trực tuyến</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Bạn nhập vai <strong className="text-amber-300">{guideName}</strong> • Người bạn đồng hành tại {story.provinceName}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {isStreaming && (
                <button
                  type="button"
                  onClick={handleSkipWait}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
                  title="Hiện nhanh toàn bộ đoạn hội thoại"
                >
                  <FastForward className="h-3 w-3 text-slate-400" />
                  <span>Hiện nhanh</span>
                </button>
              )}

              <button
                type="button"
                onClick={onRestart}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                title="Bắt đầu lại hành trình"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          {/* Chat Messages Stream */}
          <div
            ref={chatContainerRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800 sm:px-6"
          >
            {visibleMessages.map(msg => (
              <ChatMessageBubble
                key={msg.id}
                message={msg}
                guideName={guideName}
                visitorName={visitorName}
              />
            ))}

            {/* Companion Typing Indicator (Clean) */}
            {isCompanionTyping && (
              <div className="flex items-end gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300 shadow overflow-hidden">
                  <img
                    src="/mini-game/anime/companion-linh-anime.jpg"
                    alt={visitorName}
                    className="h-full w-full object-cover"
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="hidden">{visitorName[0] ?? 'L'}</span>
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{visitorName} đang soạn tin</span>
                    <span className="inline-flex gap-1 pt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Completed state summary & journal */}
            {game.phase === 'completed' && journal && !isWaitingForCompanion && (
              <div className="my-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Nhật ký chuyến đi đã ghi nhận
                  </span>
                  <span className="text-xs text-slate-400">
                    {journal.entries.length} chặng trải nghiệm
                  </span>
                </div>

                <div className="space-y-2">
                  {journal.entries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-xl border border-slate-800/80 bg-slate-950/60 p-2.5 text-xs text-slate-300"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-amber-300">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-white">{entry.result.title || entry.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{entry.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cultural sources references */}
                {journal.sourceRefs.length > 0 && (
                  <div className="border-t border-slate-800 pt-2">
                    <CulturalReferences sourceIds={journal.sourceRefs} />
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onRestart}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    Bắt đầu lại từ đầu
                  </button>
                  <Link
                    to="/"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    Về bản đồ di sản
                  </Link>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* ── Footer: Choices Tray & Chat Input (Clean, Compact, Wait-Until-Done) ── */}
          <footer className="z-10 border-t border-slate-800/90 bg-slate-900/95 p-2.5 backdrop-blur-md sm:p-3">
            {isWaitingForCompanion ? (
              /* Waiting state: choices are strictly hidden until companion finishes replying */
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span>{visitorName} đang soạn câu trả lời...</span>
                </div>
                <button
                  type="button"
                  onClick={handleSkipWait}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-slate-700 hover:text-amber-200"
                >
                  Hiện nhanh
                </button>
              </div>
            ) : game.phase === 'intro' ? (
              /* Intro Phase: 4 Greeting choices to catch the story */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-amber-300">
                    <Compass className="h-3 w-3" />
                    <span>Chọn câu chào mở đầu của bạn ({guideName}) để bắt đầu:</span>
                  </span>
                  <span className="text-[10px] text-slate-400">4 câu chào</span>
                </div>

                {/* 4 Compact Greeting Choices - Full text visible, no truncation */}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {introChoices.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={blocked || isAiReplying}
                      onClick={() => sendIntroChoice(opt)}
                      className="group flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 text-left transition-all hover:border-amber-400/80 hover:bg-slate-850 active:scale-[0.99] disabled:opacity-50"
                    >
                      <span className="text-xs font-normal leading-snug text-slate-200 group-hover:text-amber-300">
                        "{opt.text}"
                      </span>
                      <span className="shrink-0 text-slate-500 group-hover:text-amber-400 text-xs mt-0.5">
                        →
                      </span>
                    </button>
                  ))}
                </div>

                {/* Contextual Smart Quick Prompts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Gợi ý hỏi thêm:</span>
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isAiReplying || blocked}
                      onClick={() => handleQuickPromptClick(p)}
                      className="rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-amber-400/60 hover:text-white leading-snug text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Free chat input in intro phase */}
                <form onSubmit={handleFreeChatSend} className="flex items-center gap-1.5 pt-0.5 border-t border-slate-800/80">
                  <input
                    type="text"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    placeholder={`Trò chuyện cùng ${visitorName}...`}
                    disabled={blocked || isAiReplying}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!customInput.trim() || isAiReplying || blocked}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-950 transition-transform hover:bg-amber-300 active:scale-95 disabled:opacity-40"
                    title="Gửi tin nhắn"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ) : game.phase === 'choice' && scene ? (
              /* Choice Phase: Compact 2x2 grid */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-amber-300">
                    <Compass className="h-3 w-3" />
                    <span>Lựa chọn của bạn ({guideName}):</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={blocked || isWaitingForCompanion || richChoices.length === 0}
                      onClick={handleLuckyChoiceSpin}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-medium text-amber-300 transition-all hover:bg-amber-500/20 active:scale-95 disabled:opacity-50"
                      title="Quay ngẫu nhiên chọn một hành trình"
                    >
                      <RotateCw className="h-2.5 w-2.5" />
                      <span>Quay ngẫu nhiên</span>
                    </button>
                    <span className="text-[10px] text-slate-400">
                      {game.sceneId === 'morning' ? 'Chặng sáng' : game.sceneId === 'lunch' ? 'Chặng trưa' : 'Chặng chiều'}
                    </span>
                  </div>
                </div>

                {/* Compact Choice Cards - Full text visible, no truncation */}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {richChoices.map((opt, index) => (
                    <button
                      key={opt.id + '-' + index}
                      type="button"
                      disabled={blocked || isAiReplying}
                      onClick={() => sendChoice(opt)}
                      className="group flex flex-col items-start gap-1 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 text-left transition-all hover:border-amber-400/80 hover:bg-slate-850 active:scale-[0.99] disabled:opacity-50"
                    >
                      <div className="flex w-full items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold leading-snug text-slate-100 group-hover:text-amber-300">
                          {opt.title}
                        </span>
                        <span className="shrink-0 rounded bg-slate-800/80 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                          {opt.category}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-400 group-hover:text-slate-300">
                        {opt.description}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Contextual Smart Quick Prompts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Gợi ý hỏi thêm:</span>
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isAiReplying || blocked}
                      onClick={() => handleQuickPromptClick(p)}
                      className="rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-amber-400/60 hover:text-white leading-snug text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Free chat input */}
                <form onSubmit={handleFreeChatSend} className="flex items-center gap-1.5 pt-0.5 border-t border-slate-800/80">
                  <input
                    type="text"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    placeholder={`Nhập câu hỏi gửi ${visitorName}...`}
                    disabled={blocked || isAiReplying}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!customInput.trim() || isAiReplying || blocked}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-950 transition-transform hover:bg-amber-300 active:scale-95 disabled:opacity-40"
                    title="Gửi tin nhắn"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ) : game.phase === 'result' ? (
              /* Result Phase: Compact dialogue reactions */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-amber-300">
                    <Compass className="h-3 w-3" />
                    <span>Chọn câu phản hồi của bạn ({guideName}) để đi tiếp:</span>
                  </span>
                  <span className="text-[10px] text-slate-400">4 câu trả lời</span>
                </div>

                {/* 4 Compact Dialogue Reactions - Full text visible, no truncation */}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {resultReactions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={blocked || isAiReplying}
                      onClick={() => sendReactionChoice(opt)}
                      className="group flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 text-left transition-all hover:border-amber-400/80 hover:bg-slate-850 active:scale-[0.99] disabled:opacity-50"
                    >
                      <span className="text-xs font-normal leading-snug text-slate-200 group-hover:text-amber-300">
                        "{opt.text}"
                      </span>
                      <span className="shrink-0 text-slate-500 group-hover:text-amber-400 text-xs mt-0.5">
                        →
                      </span>
                    </button>
                  ))}
                </div>

                {/* Contextual Smart Quick Prompts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">Gợi ý hỏi thêm:</span>
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isAiReplying || blocked}
                      onClick={() => handleQuickPromptClick(p)}
                      className="rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300 transition-colors hover:border-amber-400/60 hover:text-white leading-snug text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Free chat input in result phase */}
                <form onSubmit={handleFreeChatSend} className="flex items-center gap-1.5 pt-0.5 border-t border-slate-800/80">
                  <input
                    type="text"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    placeholder={`Trò chuyện thêm cùng ${visitorName}...`}
                    disabled={blocked || isAiReplying}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!customInput.trim() || isAiReplying || blocked}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-950 transition-transform hover:bg-amber-300 active:scale-95 disabled:opacity-40"
                    title="Gửi tin nhắn"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            ) : game.phase === 'completed' ? (
              /* Completed Phase: Dialogue Reactions + Navigation */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-amber-300">Chọn câu chia sẻ bế mạc của bạn ({guideName}):</span>
                  <span className="text-[10px] text-slate-400">4 câu chia sẻ</span>
                </div>

                {/* 4 Completed Dialogue Choices - Full text visible, no truncation */}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {completedChoices.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={blocked || isAiReplying}
                      onClick={() => sendCompletedChoice(opt)}
                      className="group flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 text-left transition-all hover:border-amber-400/80 hover:bg-slate-850 active:scale-[0.99] disabled:opacity-50"
                    >
                      <span className="text-xs font-normal leading-snug text-slate-200 group-hover:text-amber-300">
                        "{opt.text}"
                      </span>
                      <span className="shrink-0 text-slate-500 group-hover:text-amber-400 text-xs mt-0.5">
                        →
                      </span>
                    </button>
                  ))}
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={onRestart}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-slate-900/90 px-3 py-2 text-left transition-all hover:border-amber-400 hover:bg-slate-850"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-white">Chơi lại hành trình mới</p>
                      <p className="text-[10px] text-slate-400">Khám phá các ngã rẽ khác tại {story.provinceName}</p>
                    </div>
                  </button>
                  <Link
                    to="/"
                    className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-left transition-all hover:border-amber-400 hover:bg-slate-850"
                  >
                    <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-white">Về bản đồ 63 tỉnh thành</p>
                      <p className="text-[10px] text-slate-400">Khám phá di sản các vùng đất khác</p>
                    </div>
                  </Link>
                </div>
              </div>
            ) : null}
          </footer>
        </div>
      </div>
    </div>
  );
}

// ── Chat Bubble Renderer ──
function ChatMessageBubble({
  message,
  guideName,
  visitorName,
}: {
  message: ChatMessage;
  guideName: string;
  visitorName: string;
}) {
  if (message.type === 'divider') {
    return (
      <div className="my-2.5 flex items-center gap-2.5">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="rounded-full border border-slate-700/60 bg-slate-900 px-3 py-0.5 text-[10.5px] font-medium tracking-wide text-amber-300/90 shadow-sm">
          {message.text}
        </span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
    );
  }

  // Visual thumbnail (pure photo/illustration, no credits)
  if (message.type === 'visual') {
    if (!message.imageUrl) return null;
    return (
      <div className="my-2 max-w-[85%] rounded-2xl overflow-hidden border border-slate-800 shadow-md">
        <img
          src={message.imageUrl}
          alt={message.text || 'Minh họa'}
          className="aspect-video w-full object-cover"
        />
        {message.text && (
          <div className="bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 flex items-center gap-1.5">
            <MapPin className="h-3 w-3 text-amber-400" />
            <span>{message.text}</span>
          </div>
        )}
      </div>
    );
  }

  if (message.type === 'culture') {
    return (
      <div className="my-1.5 max-w-[90%] rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-200">
        <span className="mb-0.5 block font-semibold text-amber-300 text-[11px]">Tri thức văn hóa:</span>
        <p>{message.text}</p>
      </div>
    );
  }

  if (message.type === 'narrator') {
    return (
      <div className="my-1.5 mx-auto max-w-[90%] rounded-xl border border-slate-800 bg-slate-900/60 px-3.5 py-2 text-xs italic leading-relaxed text-slate-300 text-center">
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    );
  }

  if (message.type === 'user') {
    return (
      <div className="flex items-end justify-end gap-2 my-1">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-amber-500 px-3.5 py-2 text-xs sm:text-[13px] font-medium leading-relaxed text-slate-950 shadow-md">
          <p className="mb-0.5 text-[9.5px] font-semibold text-amber-950/70">{guideName} (Bạn)</p>
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-semibold text-slate-950 shadow">
          {guideName[0] ?? 'A'}
        </div>
      </div>
    );
  }

  // Companion message (Linh avatar with anime character portrait)
  return (
    <div className="flex items-end gap-2.5 my-1">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300 shadow overflow-hidden">
        <img
          src="/mini-game/anime/companion-linh-anime.jpg"
          alt={visitorName}
          className="h-full w-full object-cover"
          onError={e => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <span className="hidden">{visitorName[0] ?? 'L'}</span>
      </div>

      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-800/80 bg-slate-900 px-3.5 py-2 text-xs sm:text-[13px] leading-relaxed text-slate-200 shadow-sm">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold text-amber-300">{visitorName}</span>
          {message.isAiGenerated && (
            <span className="text-[9px] text-slate-400">Trực tiếp</span>
          )}
        </div>

        <p className="whitespace-pre-wrap">{message.text}</p>

        {/* Real citations from RAG */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-1.5 border-t border-slate-800 pt-1 text-[10.5px] text-slate-400">
            <span className="font-semibold text-amber-300">Nguồn tư liệu: </span>
            {message.citations.map((c, i) => (
              <span key={c.sourceId + '-' + i} className="mr-2">
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">
                    {c.sourceName}
                  </a>
                ) : (
                  c.sourceName
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chat Stream Reconstructor from Real Authored Scenario Data ──
function buildChatHistory(
  story: Scenario,
  game: GameState,
  visitorName: string,
  guideName: string,
  aiStoryOverrides: Record<string, { content: string; citations: SceneCitation[] }>
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const morningChoice = game.choices.find(c => c.sceneId === 'morning');

  // Stage 0: Intro message divider
  messages.push({ id: 'div-intro', type: 'divider', text: `Khởi đầu hành trình tại ${story.provinceName}` });

  // Real authored intro blocks
  story.intro.forEach((b, i) => {
    if (b.kind === 'gameplay') return; // skip dev guidelines
    const rendered = renderNarrative(story, game, b);
    if (rendered.speaker === visitorName) {
      messages.push({ id: `intro-block-${i}`, type: 'companion', speaker: visitorName, text: rendered.text });
    } else if (rendered.speaker === guideName) {
      messages.push({ id: `intro-block-${i}`, type: 'user', speaker: guideName, text: rendered.text });
    } else if (rendered.kind === 'culture') {
      messages.push({ id: `intro-block-${i}`, type: 'culture', text: rendered.text });
    } else {
      messages.push({ id: `intro-block-${i}`, type: 'narrator', text: rendered.text });
    }
  });

  // Intro visual (matching the exact province)
  if (story.introImageRef) {
    const visual = resolveDisplayVisual(story, story.introImageRef, null, undefined);
    messages.push({
      id: 'intro-visual',
      type: 'visual',
      assetId: story.introImageRef,
      imageUrl: visual.src,
      text: visual.caption,
    });
  }

  // Stage history through past choices using REAL authored scenario blocks
  game.choices.forEach(record => {
    const sc = story.scenes[record.sceneId];
    if (!sc) return;

    const choice = sc.choices.find(c => c.id === record.choiceId);
    if (!choice) return;

    // Divider
    const dividerTitle =
      record.sceneId === 'morning'
        ? `Buổi sáng tại ${story.provinceName}`
        : record.sceneId === 'lunch'
          ? `Bữa trưa đặc sản`
          : `Buổi chiều`;

    messages.push({ id: `div-${record.sceneId}`, type: 'divider', text: dividerTitle });

    // Initial scene blocks
    sc.blocks.forEach((b, idx) => {
      if (b.kind === 'gameplay') return;
      const rendered = renderNarrative(story, game, b);
      if (rendered.speaker === visitorName) {
        messages.push({ id: `sc-${record.sceneId}-${idx}`, type: 'companion', speaker: visitorName, text: rendered.text });
      } else if (rendered.speaker === guideName) {
        messages.push({ id: `sc-${record.sceneId}-${idx}`, type: 'user', speaker: guideName, text: rendered.text });
      } else if (rendered.kind === 'culture') {
        messages.push({ id: `sc-${record.sceneId}-${idx}`, type: 'culture', text: rendered.text });
      } else {
        messages.push({ id: `sc-${record.sceneId}-${idx}`, type: 'narrator', text: rendered.text });
      }
    });

    // Visual illustration for this choice (exact province food or landscape)
    if (choice.result.imageRef) {
      const visual = resolveDisplayVisual(story, choice.result.imageRef, choice.id, morningChoice?.choiceId);
      messages.push({
        id: `visual-${record.choiceId}`,
        type: 'visual',
        imageUrl: visual.src,
        text: visual.caption,
      });
    }

    // The user's spoken choice decision
    messages.push({
      id: `user-decided-${record.sceneId}`,
      type: 'user',
      speaker: guideName,
      text: `Chúng mình cùng chọn: "${choice.label}" nhé!`,
    });

    // AI live story override if present
    const aiResponse = aiStoryOverrides[record.sceneId];
    if (aiResponse) {
      messages.push({
        id: `ai-story-${record.sceneId}`,
        type: 'companion',
        speaker: visitorName,
        text: aiResponse.content,
        citations: aiResponse.citations,
        isAiGenerated: true,
      });
    } else {
      // Real authored narrative blocks for this choice
      choice.result.blocks.forEach((b, idx) => {
        if (b.kind === 'gameplay') return;
        const rendered = renderNarrative(story, game, b);
        if (rendered.speaker === visitorName) {
          messages.push({ id: `result-${record.choiceId}-${idx}`, type: 'companion', speaker: visitorName, text: rendered.text });
        } else if (rendered.speaker === guideName) {
          messages.push({ id: `result-${record.choiceId}-${idx}`, type: 'user', speaker: guideName, text: rendered.text });
        } else if (rendered.kind === 'culture') {
          messages.push({ id: `result-${record.choiceId}-${idx}`, type: 'culture', text: rendered.text });
        } else {
          messages.push({ id: `result-${record.choiceId}-${idx}`, type: 'narrator', text: rendered.text });
        }
      });
    }
  });

  // Current Scene blocks if in 'choice' phase and not yet selected
  if (game.phase === 'choice' && story.scenes[game.sceneId]) {
    const curScene = story.scenes[game.sceneId]!;
    const isNew = !game.choices.some(c => c.sceneId === game.sceneId);
    if (isNew) {
      const dividerTitle =
        game.sceneId === 'morning'
          ? `Buổi sáng tại ${story.provinceName}`
          : game.sceneId === 'lunch'
            ? `Bữa trưa đặc sản`
            : `Buổi chiều`;

      messages.push({ id: `div-current-${game.sceneId}`, type: 'divider', text: dividerTitle });

      curScene.blocks.forEach((b, idx) => {
        if (b.kind === 'gameplay') return;
        const rendered = renderNarrative(story, game, b);
        if (rendered.speaker === visitorName) {
          messages.push({ id: `cur-${game.sceneId}-${idx}`, type: 'companion', speaker: visitorName, text: rendered.text });
        } else if (rendered.speaker === guideName) {
          messages.push({ id: `cur-${game.sceneId}-${idx}`, type: 'user', speaker: guideName, text: rendered.text });
        } else if (rendered.kind === 'culture') {
          messages.push({ id: `cur-${game.sceneId}-${idx}`, type: 'culture', text: rendered.text });
        } else {
          messages.push({ id: `cur-${game.sceneId}-${idx}`, type: 'narrator', text: rendered.text });
        }
      });
    }
  }

  return messages;
}

// ── REAL SCENE CHOICES (BUILT DIRECTLY FROM SCENARIO GRAPH, NO MOCK DATA, NO EMOJIS) ──
function getRealSceneChoices(_story: Scenario, scene: ChoiceScene): ChatChoiceOption[] {
  const choices = scene.choices;
  if (!choices || choices.length === 0) return [];

  const list: ChatChoiceOption[] = [];

  choices.forEach((c, idx) => {
    // Primary valid choice
    list.push({
      id: `${c.id}-opt-1`,
      choiceId: c.id,
      title: c.label,
      description: c.result.title || `Trải nghiệm ${c.label.toLowerCase()} cùng bạn đồng hành.`,
      category: `Lựa chọn ${idx + 1}`,
    });

    // Secondary perspective on the same real choice
    const secondaryDesc = c.result.journalLabel
      ? `Góc nhìn chi tiết: ${c.result.journalLabel}`
      : `Tìm hiểu sâu về nét văn hóa tại ${c.label.toLowerCase()}.`;

    list.push({
      id: `${c.id}-opt-2`,
      choiceId: c.id,
      title: `Khám phá chi tiết: ${c.label}`,
      description: secondaryDesc,
      category: `Góc nhìn bổ trợ`,
    });
  });

  return list.slice(0, 4);
}

// ── 4 CLEAN INTRO GREETING CHOICES (NO EMOJIS, PURE HUMAN CONVERSATION) ──
function getCleanIntroChoices(story: Scenario, visitorName: string, guideName: string): ResultReactionOption[] {
  const province = story.provinceName;
  return [
    { id: 'intro-1', text: `Chào ${visitorName}! Mình là ${guideName}, rất vui được làm bạn đồng hành cùng bạn khám phá ${province} hôm nay!` },
    { id: 'intro-2', text: `Chào ${visitorName}! Buổi sáng ở ${province} không khí trong lành lắm, chúng mình cùng bắt đầu dạo quanh các góc phố nhé!` },
    { id: 'intro-3', text: `Chào bạn! Chào mừng bạn đến với ${province}, để mình đưa bạn đi trải nghiệm nét văn hóa đặc trưng nhất nơi đây.` },
    { id: 'intro-4', text: `Chào ${visitorName}! Hôm nay chúng ta sẽ cùng sống một ngày thật đáng nhớ như người bản địa nhé!` },
  ];
}

// ── 4 CLEAN RESULT DIALOGUE REACTIONS (NO EMOJIS, PURE HUMAN CONVERSATION) ──
function getCleanResultReactions(story: Scenario, visitorName: string, sceneId: string): ResultReactionOption[] {
  const province = story.provinceName;
  if (sceneId === 'morning') {
    return [
      { id: 'res-m-1', text: `Buổi sáng tại ${province} thật trong lành ${visitorName} nhỉ, giờ mình cùng đi ăn trưa nhé!` },
      { id: 'res-m-2', text: `Không gian buổi sáng ở đây thanh bình quá. Mình cùng sang chặng ẩm thực trưa nhé!` },
      { id: 'res-m-3', text: `Được ngắm nhìn đời sống sớm tại ${province} thú vị thật. Mình đi tiếp thôi!` },
      { id: 'res-m-4', text: `Mình thấy vui khi ${visitorName} thích nơi này. Giờ mình tiếp tục hành trình nhé!` },
    ];
  }
  if (sceneId === 'lunch') {
    return [
      { id: 'res-l-1', text: `Bữa trưa đặc sản ${province} ngon miệng thật, giờ mình chuẩn bị sang chặng buổi chiều nhé!` },
      { id: 'res-l-2', text: `Hương vị truyền thống ở đây rất độc đáo. Mình cùng đi tiếp chặng chiều nào!` },
      { id: 'res-l-3', text: `Nghỉ trưa xong rồi, giờ mình dẫn ${visitorName} đi khám phá tiếp nhé!` },
      { id: 'res-l-4', text: `Ăn trưa xong thật ấm lòng. Mình sẵn sàng cho chặng tiếp theo rồi!` },
    ];
  }
  return [
    { id: 'res-a-1', text: `Một ngày khám phá ${province} thật trọn vẹn và nhiều kỷ niệm đáng nhớ cùng ${visitorName}!` },
    { id: 'res-a-2', text: `Cảm ơn ${visitorName} đã đồng hành cùng mình qua các góc phố di sản ${province} hôm nay!` },
    { id: 'res-a-3', text: `Trải nghiệm ở ${province} hôm nay rất tuyệt vời. Hẹn gặp lại bạn trong những chuyến đi tới nhé!` },
    { id: 'res-a-4', text: `Chuyến đi ${province} hôm nay để lại thật nhiều ấn tượng sâu sắc trong lòng mình!` },
  ];
}

// ── 4 CLEAN COMPLETED DIALOGUE CHOICES ──
function getCleanCompletedChoices(story: Scenario, visitorName: string): ResultReactionOption[] {
  const province = story.provinceName;
  return [
    { id: 'comp-1', text: `Cảm ơn ${visitorName}! Chuyến đi tại ${province} hôm nay thật trọn vẹn và để lại nhiều kỷ niệm đẹp trong lòng mình.` },
    { id: 'comp-2', text: `Nhìn lại cuốn nhật ký hành trình hôm nay, chúng mình đã lưu giữ được thật nhiều nét đẹp văn hóa độc đáo.` },
    { id: 'comp-3', text: `Hẹn gặp lại ${visitorName} trong những chuyến hành trình khám phá các tỉnh thành tiếp theo của Việt Nam nhé!` },
    { id: 'comp-4', text: `Được cùng bạn dạo quanh các góc phố di sản và thưởng thức ẩm thực ${province} quả thực là một ngày tuyệt vời!` },
  ];
}
