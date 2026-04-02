const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((error as { error?: string }).error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface RegisterResponse {
  userId: string;
  nickname: string;
  accessToken: string;
  refreshToken: string;
}

export async function register(payload: {
  publicKey: string;
  deviceFingerprint: string;
}): Promise<RegisterResponse> {
  return request<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface MeResponse {
  _id: string;
  nickname: string;
  publicKey: string;
  createdAt: string;
}

export async function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/api/auth/me');
}

export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  return request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function logout(refreshToken: string): Promise<void> {
  return request('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

// ── Conversations ─────────────────────────────────────────────────────────────

export interface Participant {
  _id: string;
  nickname: string;
  publicKey: string;
}

export interface Conversation {
  _id: string;
  participants: Participant[];
  lastMessageAt: string;
  selfDestruct: boolean;
  expiresAt?: string;
}

export interface ConversationsResponse {
  conversations: Conversation[];
  nextCursor: string | null;
}

export async function getConversations(cursor?: string): Promise<ConversationsResponse> {
  const params = cursor ? `?before=${encodeURIComponent(cursor)}` : '';
  return request<ConversationsResponse>(`/api/conversations${params}`);
}

export async function getConversation(id: string): Promise<{ conversation: Conversation }> {
  return request<{ conversation: Conversation }>(`/api/conversations/${id}`);
}

export async function createConversation(payload: {
  participantIds: string[];
  selfDestruct?: boolean;
  expiresInMs?: number;
}): Promise<{ conversation: Conversation }> {
  return request<{ conversation: Conversation }>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteConversation(id: string): Promise<void> {
  return request(`/api/conversations/${id}`, { method: 'DELETE' });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  encryptedPayload: string;
  iv: string;
  timestamp: string;
  delivered: boolean;
  read: boolean;
  burnAfterReading: boolean;
  expiresAt?: string;
  encryptedAttachmentUrl?: string;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
}

export async function getMessages(
  conversationId: string,
  cursor?: string
): Promise<MessagesResponse> {
  const params = cursor ? `?before=${encodeURIComponent(cursor)}` : '';
  return request<MessagesResponse>(`/api/messages/${conversationId}${params}`);
}
