import type { Scenario } from '../scenario.js';
import type { GameState } from '../state.js';
import { getCurrentResult } from '../engine.js';

export interface SceneChatRequest {
  readonly conversationId: number | null;
  readonly message: string;
  readonly provinceSlug: string;
  readonly guestSessionUuid: string | null;
}
export interface SceneGuestCredentials {
  readonly guestSessionUuid: string;
  readonly guestToken: string;
}
export interface SceneCitation {
  sourceId: string; sourceName: string; category: string;
  provinceSlug?: string | null; url?: string | null;
  status: 'VERIFIED' | 'LEGEND' | 'UNVERIFIED';
}
export interface AssistantTransport {
  send(request: SceneChatRequest, credentials: SceneGuestCredentials | null): Promise<unknown>;
  cancel(): void;
}
export class SceneAssistantError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

export function buildSceneQuestion(scenario: Scenario, state: GameState, question: string): string {
  const trimmed = question.trim();
  if (!trimmed || trimmed.length > 500) throw new SceneAssistantError('invalid_question');
  if (state.scenarioId !== scenario.id || state.scenarioVersion !== scenario.version || state.phase === 'intro') {
    throw new SceneAssistantError('invalid_context');
  }
  const labels = state.choices.map(record =>
    scenario.scenes[record.sceneId]?.choices.find(choice => choice.id === record.choiceId)?.label ?? '');
  const sceneTitle = state.phase === 'completed' ? 'Nhật ký kết thúc' : (scenario.scenes[state.sceneId]?.title ?? scenario.title);
  const facts = getCurrentResult(scenario, state)?.blocks.filter(block => block.kind === 'culture').map(block => block.text) ?? [];
  const context = [
    'Ngữ cảnh trải nghiệm VICA: ' + scenario.title + '. Nhân vật và hội thoại là hư cấu.',
    ...(scenario.cast ? ['Nhân vật hư cấu: người chơi nhập vai ' + scenario.cast.guide + '; bạn đồng hành là ' + scenario.cast.visitor + '. Không nhập vai hay viết tiếp thay họ.'] : []),
    'Địa phương: ' + scenario.provinceName + ' (' + scenario.provinceSlug + '). Cảnh: ' + sceneTitle + '. Trạng thái: ' + state.phase + '.',
    'Các lựa chọn đã thực hiện: ' + (labels.join(' → ') || 'Chưa chọn hoạt động.'),
    ...facts,
    'Chỉ giải thích điều người dùng hỏi; không quyết định lựa chọn, chuyển cảnh hoặc viết tiếp cốt truyện.',
    'Phân biệt truyền thuyết với dữ kiện; nếu thiếu nguồn thì nói rõ. Không suy đoán các nhánh chưa chơi.',
  ].join('\n');
  const suffix = '\nCâu hỏi: ' + trimmed;
  return context.slice(0, 2000 - suffix.length) + suffix;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseReply(value: unknown) {
  if (!record(value) || !Number.isSafeInteger(value.conversationId) || (value.conversationId as number) <= 0 ||
      typeof value.content !== 'string' || !value.content.trim()) throw new SceneAssistantError('invalid_reply');
  let credentials: SceneGuestCredentials | null = null;
  if (value.credentials !== undefined && value.credentials !== null) {
    const creds = value.credentials;
    if (!record(creds) || typeof creds.guestToken !== 'string' || !creds.guestToken.trim() ||
        typeof creds.guestSessionUuid !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creds.guestSessionUuid)) {
      throw new SceneAssistantError('invalid_reply');
    }
    credentials = { guestToken: creds.guestToken, guestSessionUuid: creds.guestSessionUuid };
  }
  const citations: SceneCitation[] = [];
  if (Array.isArray(value.citations)) {
    for (const cite of value.citations) {
      if (!record(cite) || typeof cite.sourceId !== 'string' || typeof cite.sourceName !== 'string') continue;
      citations.push({
        sourceId: cite.sourceId, sourceName: cite.sourceName,
        category: typeof cite.category === 'string' ? cite.category : 'KNOWLEDGE',
        status: cite.status === 'VERIFIED' || cite.status === 'LEGEND' ? cite.status : 'UNVERIFIED',
        url: typeof cite.url === 'string' && /^https?:\/\/[^\s<>]+$/i.test(cite.url) ? cite.url : null,
      });
    }
  }
  return { conversationId: value.conversationId as number, content: value.content, citations, credentials };
}

export function createSceneAssistant(transport: AssistantTransport) {
  let runId: string | null = null;
  let conversationId: number | null = null;
  let credentials: SceneGuestCredentials | null = null;
  let requestId = 0;
  let pending = false;
  const cancel = () => { requestId++; pending = false; transport.cancel(); };
  return {
    cancel,
    async ask(scenario: Scenario, state: GameState, question: string) {
      let message: string;
      try { message = buildSceneQuestion(scenario, state, question); }
      catch { return { status: 'error' as const, message: 'Hãy nhập câu hỏi từ 1 đến 500 ký tự trong một cảnh đang chơi.' }; }
      const runKey = scenario.id + ':' + state.runId;
      if (runId !== runKey) { cancel(); runId = runKey; conversationId = null; credentials = null; }
      if (pending) return { status: 'busy' as const };
      const id = ++requestId;
      pending = true;
      try {
        const raw = await transport.send({ conversationId, message, provinceSlug: scenario.provinceSlug,
          guestSessionUuid: credentials?.guestSessionUuid ?? null }, credentials);
        if (id !== requestId) return { status: 'cancelled' as const };
        const reply = parseReply(raw);
        if ((conversationId === null && reply.credentials === null) ||
            (conversationId !== null && reply.conversationId !== conversationId)) throw new SceneAssistantError('invalid_reply');
        conversationId = reply.conversationId;
        if (reply.credentials) credentials = reply.credentials;
        return { status: 'answered' as const, content: reply.content, citations: reply.citations };
      } catch (error) {
        if (id !== requestId) return { status: 'cancelled' as const };
        if (error instanceof SceneAssistantError && error.code === 'access_denied') { conversationId = null; credentials = null; }
        return { status: 'error' as const, message: error instanceof SceneAssistantError && error.code === 'timeout'
          ? 'AI phản hồi quá lâu. Bạn có thể hỏi lại hoặc đóng cửa sổ để tiếp tục chơi.'
          : 'Chưa thể nhận câu trả lời từ AI. Bạn vẫn có thể đóng cửa sổ và hoàn thành hành trình.' };
      } finally { if (id === requestId) pending = false; }
    },
  };
}
