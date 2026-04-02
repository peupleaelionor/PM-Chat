import { create } from 'zustand';

interface CryptoState {
  /** Our own ECDH key pair (kept in memory only) */
  keyPair: CryptoKeyPair | null;
  /** Derived shared AES-GCM keys per conversation (keyed by conversationId) */
  sessionKeys: Record<string, CryptoKey>;
  /** Cached peer public keys (keyed by userId) */
  peerPublicKeys: Record<string, CryptoKey>;

  setKeyPair: (kp: CryptoKeyPair) => void;
  setSessionKey: (conversationId: string, key: CryptoKey) => void;
  getSessionKey: (conversationId: string) => CryptoKey | undefined;
  setPeerPublicKey: (userId: string, key: CryptoKey) => void;
  getPeerPublicKey: (userId: string) => CryptoKey | undefined;
  clearKeys: () => void;
}

export const useCryptoStore = create<CryptoState>((set, get) => ({
  keyPair: null,
  sessionKeys: {},
  peerPublicKeys: {},

  setKeyPair: (kp) => set({ keyPair: kp }),

  setSessionKey: (conversationId, key) =>
    set((s) => ({ sessionKeys: { ...s.sessionKeys, [conversationId]: key } })),

  getSessionKey: (conversationId) => get().sessionKeys[conversationId],

  setPeerPublicKey: (userId, key) =>
    set((s) => ({ peerPublicKeys: { ...s.peerPublicKeys, [userId]: key } })),

  getPeerPublicKey: (userId) => get().peerPublicKeys[userId],

  clearKeys: () => set({ keyPair: null, sessionKeys: {}, peerPublicKeys: {} }),
}));
