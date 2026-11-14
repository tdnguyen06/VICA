import type { ChatRequest } from '../../../types/assistant';
import { ACCESS_KEY } from '../../../services/apiClient';
import { SceneAssistantError } from './assistant';
import type { AssistantTransport } from './assistant';

function readAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function createBrowserAssistantTransport(): AssistantTransport {
  let controller: AbortController | null = null;
  return {
    // AI requires login: requests carry the user's token, so replies have no guest credentials.
    get authenticated() { return readAccessToken() !== null; },
    cancel: () => controller?.abort(),
    async send(payload, credentials) {
      const request: ChatRequest = payload;
      const current = new AbortController();
      controller = current;
      let timedOut = false;
      const timer = window.setTimeout(() => { timedOut = true; current.abort(); }, 30000);
      try {
        // Separate conversation per run: does not read or write the main assistant's chat storage.
        const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
        const token = readAccessToken();
        const response = await fetch(base + '/assistant/chat', {
          method: 'POST', credentials: 'omit', signal: current.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: 'Bearer ' + token } : credentials ? { 'X-Guest-Token': credentials.guestToken } : {}),
          },
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
