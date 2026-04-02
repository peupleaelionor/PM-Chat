'use client';

import { useCallback } from 'react';
import { useCryptoStore } from '@/lib/store/cryptoStore';
import { useAuthStore } from '@/lib/store/authStore';
import {
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  importPublicKey,
  packEnvelope,
  generateNonce,
} from '@/lib/crypto';
import { getSocket } from '@/lib/socket';
import type { Participant } from '@/lib/api';

export function useCrypto() {
  const { keyPair, getSessionKey, setSessionKey, setPeerPublicKey, getPeerPublicKey } =
    useCryptoStore();
  const userId = useAuthStore((s) => s.userId);

  /**
   * Ensure a session key exists for the given conversation.
   * Imports the peer's public key JWK, derives a shared ECDH key, and caches it.
   */
  const ensureSessionKey = useCallback(
    async (conversationId: string, peerParticipants: Participant[]): Promise<CryptoKey | null> => {
      const existing = getSessionKey(conversationId);
      if (existing) return existing;

      if (!keyPair) return null;

      // Find a peer that isn't us
      const peer = peerParticipants.find((p) => p._id !== userId);
      if (!peer) return null;

      let peerPubKey = getPeerPublicKey(peer._id);
      if (!peerPubKey) {
        try {
          peerPubKey = await importPublicKey(peer.publicKey);
          setPeerPublicKey(peer._id, peerPubKey);
        } catch {
          return null;
        }
      }

      try {
        const sharedKey = await deriveSharedKey(keyPair.privateKey, peerPubKey);
        setSessionKey(conversationId, sharedKey);
        return sharedKey;
      } catch {
        return null;
      }
    },
    [keyPair, userId, getSessionKey, setSessionKey, getPeerPublicKey, setPeerPublicKey]
  );

  /**
   * Encrypt a plaintext message and emit via socket.
   */
  const sendEncryptedMessage = useCallback(
    async (
      conversationId: string,
      plaintext: string,
      participants: Participant[],
      options?: { burnAfterReading?: boolean; expiresInMs?: number }
    ): Promise<{ nonce: string; iv: string; ciphertext: string } | null> => {
      const sessionKey = await ensureSessionKey(conversationId, participants);
      if (!sessionKey || !userId) return null;

      try {
        const { iv, ciphertext } = await encryptMessage(sessionKey, plaintext);
        const nonce = generateNonce();
        const envelope = packEnvelope(iv, ciphertext, userId);

        getSocket().emit('message:send', {
          conversationId,
          encryptedPayload: envelope.ciphertext,
          iv: envelope.iv,
          nonce,
          ...options,
        });

        return { nonce, iv: envelope.iv, ciphertext: envelope.ciphertext };
      } catch {
        return null;
      }
    },
    [ensureSessionKey, userId]
  );

  /**
   * Decrypt a received message payload.
   */
  const decryptReceivedMessage = useCallback(
    async (
      conversationId: string,
      iv: string,
      ciphertext: string,
      participants: Participant[]
    ): Promise<string | null> => {
      const sessionKey = await ensureSessionKey(conversationId, participants);
      if (!sessionKey) return null;

      try {
        return await decryptMessage(sessionKey, iv, ciphertext);
      } catch {
        return '[Unable to decrypt]';
      }
    },
    [ensureSessionKey]
  );

  return { ensureSessionKey, sendEncryptedMessage, decryptReceivedMessage };
}
