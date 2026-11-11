export type VerificationStatus = 'VERIFIED' | 'LEGEND' | 'UNVERIFIED';

export type CompareAspect = 'CUISINE' | 'HERITAGE' | 'FESTIVALS' | 'ALL';

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export type OwnerType = 'USER' | 'GUEST';

export interface GuestSessionCredentialsDto {
  guestSessionUuid: string;
  guestToken: string;
}

export interface CitationDto {
  sourceId: string;
  sourceName: string;
  provinceSlug?: string | null;
  category: string;
  url?: string | null;
  status: VerificationStatus;
}

export interface SuggestedQuestionDto {
  question: string;
  type: string;
}

export interface ChatRequest {
  conversationId?: number | null;
  message: string;
  provinceSlug?: string | null;
  guestSessionUuid?: string | null;
}

export interface ChatResponse {
  conversationId: number;
  messageId: number;
  role: 'ASSISTANT';
  content: string;
  provinceSlug?: string | null;
  citations: CitationDto[];
  suggestedQuestions: SuggestedQuestionDto[];
  credentials?: GuestSessionCredentialsDto | null;
}

export interface CompareRequest {
  conversationId?: number | null;
  provinceSlugs: string[];
  aspect: CompareAspect;
  guestSessionUuid?: string | null;
}

export interface CompareResponse {
  conversationId: number;
  messageId: number;
  comparedProvinces: string[];
  aspect: CompareAspect;
  content: string;
  citations: CitationDto[];
  suggestedQuestions: SuggestedQuestionDto[];
  credentials?: GuestSessionCredentialsDto | null;
}

export interface ConversationSummaryDto {
  id: number;
  title: string;
  currentProvinceSlug?: string | null;
  ownerType: OwnerType;
  sessionUuid?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDetailDto {
  id: number;
  role: MessageRole;
  content: string;
  citations: string;
  toolCalls: string;
  sequenceNumber: number;
  createdAt: string;
}

export interface ConversationDetailResponse {
  id: number;
  title: string;
  currentProvinceSlug?: string | null;
  ownerType: OwnerType;
  sessionUuid?: string | null;
  createdAt: string;
  updatedAt: string;
  messages: MessageDetailDto[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ChatMessageItem {
  id: string | number;
  role: MessageRole;
  content: string;
  provinceSlug?: string | null;
  citations?: CitationDto[];
  suggestedQuestions?: SuggestedQuestionDto[];
  createdAt?: string;
  isStreaming?: boolean;
  isError?: boolean;
}

