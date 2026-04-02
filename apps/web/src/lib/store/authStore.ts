import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  nickname: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (payload: {
    userId: string;
    nickname: string;
    accessToken: string;
    refreshToken: string;
  }) => void;
  clearAuth: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  nickname: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  setAuth: ({ userId, nickname, accessToken, refreshToken }) => {
    // Store non-sensitive info in localStorage for persistence
    try {
      localStorage.setItem('pm_chat_userId', userId);
      localStorage.setItem('pm_chat_nickname', nickname);
    } catch {
      // ignore if storage unavailable
    }
    // Refresh token in sessionStorage (survives refresh, not new tabs)
    try {
      sessionStorage.setItem('pm_chat_refreshToken', refreshToken);
    } catch {
      // ignore
    }
    set({ userId, nickname, accessToken, refreshToken, isAuthenticated: true });
  },

  clearAuth: () => {
    try {
      localStorage.removeItem('pm_chat_userId');
      localStorage.removeItem('pm_chat_nickname');
    } catch {
      // ignore
    }
    try {
      sessionStorage.removeItem('pm_chat_refreshToken');
    } catch {
      // ignore
    }
    set({
      userId: null,
      nickname: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  updateTokens: (accessToken, refreshToken) => {
    try {
      sessionStorage.setItem('pm_chat_refreshToken', refreshToken);
    } catch {
      // ignore
    }
    set({ accessToken, refreshToken });
  },
}));

/** Read persisted user info from localStorage (call on app init). */
export function loadPersistedAuth(): { userId: string | null; nickname: string | null; refreshToken: string | null } {
  try {
    const userId = localStorage.getItem('pm_chat_userId');
    const nickname = localStorage.getItem('pm_chat_nickname');
    const refreshToken = sessionStorage.getItem('pm_chat_refreshToken');
    return { userId, nickname, refreshToken };
  } catch {
    return { userId: null, nickname: null, refreshToken: null };
  }
}
