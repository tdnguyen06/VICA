import { apiClient } from '../services/apiClient';
import type { ApiResponse } from '../types';
import type {
  ChatRequest,
  ChatResponse,
  CompareRequest,
  CompareResponse,
  ConversationDetailResponse,
  ConversationSummaryDto,
  GuestSessionCredentialsDto,
  PageResponse,
} from '../types/assistant';

const GUEST_TOKEN_KEY = 'vica_guest_token';
const GUEST_SESSION_UUID_KEY = 'vica_guest_session_uuid';
const LAST_CONVERSATION_ID_KEY = 'vica_last_conversation_id';

/**
 * Lấy thông tin xác thực Guest đã lưu trong localStorage (nếu có).
 */
export function getGuestCredentials(): GuestSessionCredentialsDto | null {
  try {
    const token = localStorage.getItem(GUEST_TOKEN_KEY);
    const sessionUuid = localStorage.getItem(GUEST_SESSION_UUID_KEY);
    if (token && sessionUuid) {
      return { guestToken: token, guestSessionUuid: sessionUuid };
    }
  } catch (e) {
    console.warn('Không thể đọc guest credentials từ localStorage:', e);
  }
  return null;
}

/**
 * Lưu thông tin xác thực Guest mới vào localStorage.
 */
export function saveGuestCredentials(credentials: GuestSessionCredentialsDto): void {
  try {
    localStorage.setItem(GUEST_TOKEN_KEY, credentials.guestToken);
    localStorage.setItem(GUEST_SESSION_UUID_KEY, credentials.guestSessionUuid);
  } catch (e) {
    console.warn('Không thể lưu guest credentials vào localStorage:', e);
  }
}

/**
 * Lưu ID cuộc hội thoại gần nhất.
 */
export function saveLastConversationId(conversationId: number): void {
  try {
    localStorage.setItem(LAST_CONVERSATION_ID_KEY, String(conversationId));
  } catch (e) {
    console.warn('Không thể lưu last conversation ID:', e);
  }
}

export function getLastConversationId(): number | null {
  try {
    const raw = localStorage.getItem(LAST_CONVERSATION_ID_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Xóa ID phiên hội thoại gần nhất (khi người dùng chủ động reset hội thoại mới).
 */
export function clearLastConversationId(): void {
  try {
    localStorage.removeItem(LAST_CONVERSATION_ID_KEY);
  } catch (e) {
    console.warn('Không thể xóa last conversation ID:', e);
  }
}

/**
 * Xóa thông tin xác thực Guest (khi tạo phiên mới hoàn toàn hoặc đăng nhập).
 */
export function clearGuestCredentials(): void {
  try {
    localStorage.removeItem(GUEST_TOKEN_KEY);
    localStorage.removeItem(GUEST_SESSION_UUID_KEY);
    localStorage.removeItem(LAST_CONVERSATION_ID_KEY);
  } catch (e) {
    console.warn('Không thể xóa guest credentials:', e);
  }
}

/**
 * Tạo header bảo mật cho yêu cầu của Guest.
 */
function buildGuestHeaders(): Record<string, string> {
  const creds = getGuestCredentials();
  const headers: Record<string, string> = {};
  if (creds?.guestToken) {
    headers['X-Guest-Token'] = creds.guestToken;
  }
  if (creds?.guestSessionUuid) {
    headers['X-Guest-Session-Uuid'] = creds.guestSessionUuid;
  }
  return headers;
}

/**
 * Gửi tin nhắn hỏi đáp văn hóa tới VICA Assistant.
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const creds = getGuestCredentials();
  const payload: ChatRequest = {
    ...request,
    guestSessionUuid: request.guestSessionUuid || creds?.guestSessionUuid || null,
  };

  try {
    const response = await apiClient.post<ApiResponse<ChatResponse>>('/assistant/chat', payload, {
      headers: buildGuestHeaders(),
      timeout: 30000,
    });

    const chatResponse = response.data.data;
    if (chatResponse.credentials) {
      saveGuestCredentials(chatResponse.credentials);
    }
    if (chatResponse.conversationId) {
      saveLastConversationId(chatResponse.conversationId);
    }

    return chatResponse;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearGuestCredentials();
    }
    throw error;
  }
}

/**
 * Gửi yêu cầu so sánh văn hóa giữa 2-3 địa phương.
 */
export async function sendCompareMessage(request: CompareRequest): Promise<CompareResponse> {
  const creds = getGuestCredentials();
  const payload: CompareRequest = {
    ...request,
    guestSessionUuid: request.guestSessionUuid || creds?.guestSessionUuid || null,
  };

  try {
    const response = await apiClient.post<ApiResponse<CompareResponse>>('/assistant/compare', payload, {
      headers: buildGuestHeaders(),
      timeout: 35000,
    });

    const compareResponse = response.data.data;
    if (compareResponse.credentials) {
      saveGuestCredentials(compareResponse.credentials);
    }
    if (compareResponse.conversationId) {
      saveLastConversationId(compareResponse.conversationId);
    }

    return compareResponse;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearGuestCredentials();
    }
    throw error;
  }
}

/**
 * Lấy danh sách lịch sử các phiên hội thoại (phân trang).
 */
export async function fetchConversations(page = 0, size = 10): Promise<PageResponse<ConversationSummaryDto>> {
  try {
    const response = await apiClient.get<ApiResponse<PageResponse<ConversationSummaryDto>>>('/assistant/conversations', {
      params: { page, size },
      headers: buildGuestHeaders(),
    });
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearGuestCredentials();
    }
    throw error;
  }
}

/**
 * Lấy chi tiết toàn bộ lịch sử tin nhắn của một phiên hội thoại.
 */
export async function fetchConversationDetail(conversationId: number): Promise<ConversationDetailResponse> {
  try {
    const response = await apiClient.get<ApiResponse<ConversationDetailResponse>>(`/assistant/conversations/${conversationId}`, {
      headers: buildGuestHeaders(),
    });
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      clearGuestCredentials();
    }
    throw error;
  }
}

