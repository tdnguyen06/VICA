import type { ChatRequest } from '../../../types/assistant';
import { SceneAssistantError } from './assistant';
import type { AssistantTransport } from './assistant';

export function createBrowserAssistantTransport(): AssistantTransport {
  let controller: AbortController | null = null;
  return {
    cancel: () => controller?.abort(),
    async send(payload, credentials) {
      const request: ChatRequest = payload;
      const current = new AbortController();
      controller = current;
      let timedOut = false;
      const timer = window.setTimeout(() => { timedOut = true; current.abort(); }, 30000);
      try {
        // Dedicated guest conversation: never read auth/chat storage or call assistantApi side effects.
        const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
        const response = await fetch(base + '/assistant/chat', {
          method: 'POST', credentials: 'omit', signal: current.signal,
          headers: { 'Content-Type': 'application/json', ...(credentials ? { 'X-Guest-Token': credentials.guestToken } : {}) },
          body: JSON.stringify(request),
        });
        if (!response.ok) throw new SceneAssistantError(response.status === 401 || response.status === 403 ? 'access_denied' : 'http_error');
        const envelope = await response.json();
        if (!envelope || envelope.success !== true) throw new SceneAssistantError('invalid_reply');
        return envelope.data;
      } catch (error) {
        if (timedOut) throw new SceneAssistantError('timeout');
        throw error;
      } finally {
        window.clearTimeout(timer);
        if (controller === current) controller = null;
      }
    },
  };
}
