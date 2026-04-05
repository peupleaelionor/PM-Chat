# Examples

> Practical code examples showing how PM-Chat's encryption and messaging works.

---

## Sending a Message

```typescript
import { deriveSharedKey } from '@/lib/crypto/keyExchange';
import { encryptMessage } from '@/lib/crypto/encrypt';
import { packEnvelope } from '@/lib/crypto/messagePackaging';

async function sendMessage(
  socket: Socket,
  conversationId: string,
  plaintext: string,
  myPrivateKey: CryptoKey,
  peerPublicKey: CryptoKey
) {
  // 1. Derive shared AES-GCM key from ECDH
  const sharedKey = await deriveSharedKey(myPrivateKey, peerPublicKey);

  // 2. Encrypt the plaintext
  const { iv, ciphertext } = await encryptMessage(sharedKey, plaintext);

  // 3. Package into an envelope with a replay-protection nonce
  const envelope = packEnvelope(iv, ciphertext, myUserId);

  // 4. Send via Socket.IO
  socket.emit('message:send', {
    conversationId,
    encryptedPayload: ciphertext,
    iv,
    nonce: envelope.nonce,
  });
}
```

---

## Receiving a Message

```typescript
import { deriveSharedKey } from '@/lib/crypto/keyExchange';
import { decryptMessage } from '@/lib/crypto/decrypt';

async function handleIncomingMessage(
  message: { encryptedPayload: string; iv: string; senderId: string },
  myPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey
) {
  // 1. Derive the same shared key (ECDH is symmetric)
  const sharedKey = await deriveSharedKey(myPrivateKey, senderPublicKey);

  // 2. Decrypt the message
  try {
    const plaintext = await decryptMessage(sharedKey, message.iv, message.encryptedPayload);
    console.log('Decrypted message:', plaintext);
    return plaintext;
  } catch (error) {
    console.error('Decryption failed — possible key mismatch or tampering');
    return '[Unable to decrypt]';
  }
}
```

---

## Handling TTL Expiration

```typescript
// When creating a self-destructing message:
socket.emit('message:send', {
  conversationId: 'conv_abc123',
  encryptedPayload: ciphertext,
  iv: iv,
  nonce: nonce,
  expiresInMs: 60000, // Message expires in 60 seconds
});

// Server-side: MongoDB stores expiresAt = Date.now() + expiresInMs
// MongoDB TTL index automatically deletes the document after expiry.

// Client-side: When rendering messages, check expiry:
function isExpired(message: { expiresAt?: string }): boolean {
  if (!message.expiresAt) return false;
  return new Date(message.expiresAt).getTime() < Date.now();
}

// Filter expired messages in the UI
const visibleMessages = messages.filter(msg => !isExpired(msg));
```

---

## Handling Burn-After-Reading

```typescript
// Send a burn-after-reading message:
socket.emit('message:send', {
  conversationId: 'conv_abc123',
  encryptedPayload: ciphertext,
  iv: iv,
  nonce: nonce,
  burnAfterReading: true,
});

// On the recipient side, after reading:
function markAsRead(socket: Socket, messageId: string, burnAfterReading: boolean) {
  // Acknowledge read
  socket.emit('message:read', messageId);

  if (burnAfterReading) {
    // Remove from local store after a brief delay
    setTimeout(() => {
      chatStore.getState().removeMessage(conversationId, messageId);
    }, 3000); // Show for 3 seconds before burning
  }
}
```

---

## Handling Invalid Packets

```typescript
import { MessageEnvelopeSchema } from '@pm-chat/shared';

// Server-side validation before processing any message:
function validateMessagePayload(payload: unknown) {
  const result = MessageEnvelopeSchema.safeParse(payload);

  if (!result.success) {
    // Log the validation error (never log the payload content)
    logger.warn('Invalid message payload', {
      errors: result.error.issues.map(i => i.message),
    });

    // Return error to client
    return { valid: false, error: 'INVALID_PAYLOAD' };
  }

  return { valid: true, data: result.data };
}

// Replay protection check:
async function checkReplay(nonce: string, redis: Redis): Promise<boolean> {
  // SET NX: only succeeds if key doesn't exist
  // EX 86400: expire after 24 hours
  const result = await redis.set(`nonce:${nonce}`, '1', 'EX', 86400, 'NX');

  if (result === null) {
    // Nonce already exists — this is a replay attack
    logger.warn('Replay attack detected', { nonce });
    return false;
  }

  return true; // Nonce is new, message is valid
}
```

---

## Key Generation and Exchange

```typescript
import { generateKeyPair, exportPublicKey } from '@/lib/crypto/keyGeneration';
import { storePrivateKey } from '@/lib/crypto/keyStorage';

// On registration:
async function setupEncryption() {
  // 1. Generate ECDH P-256 key pair
  const keyPair = await generateKeyPair();

  // 2. Export public key as JWK string (safe to send to server)
  const publicKeyJwk = await exportPublicKey(keyPair.publicKey);

  // 3. Store private key securely in sessionStorage
  storePrivateKey(keyPair.privateKey);

  // 4. Send public key to server during registration
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname: 'my_username',
      publicKey: publicKeyJwk,
    }),
  });

  return response.json();
}
```

---

## Full End-to-End Example

```typescript
// === ALICE'S DEVICE ===

// 1. Alice generates keys and registers
const aliceKeys = await generateKeyPair();
const alicePublicJwk = await exportPublicKey(aliceKeys.publicKey);
// Register with server...

// 2. Alice creates a conversation with Bob
// POST /api/conversations { participantIds: [bobUserId] }

// 3. Alice fetches Bob's public key
const bobProfile = await getUser(bobUserId);
const bobPublicKey = await importPublicKey(bobProfile.publicKey);

// 4. Alice derives shared key
const sharedKey = await deriveSharedKey(aliceKeys.privateKey, bobPublicKey);

// 5. Alice encrypts and sends
const { iv, ciphertext } = await encryptMessage(sharedKey, 'Hello Bob! This is private.');
const envelope = packEnvelope(iv, ciphertext, aliceUserId);
socket.emit('message:send', {
  conversationId,
  encryptedPayload: ciphertext,
  iv,
  nonce: envelope.nonce,
});


// === BOB'S DEVICE ===

// 6. Bob receives the message via Socket.IO
socket.on('message:new', async (msg) => {
  // 7. Bob fetches Alice's public key (if not cached)
  const alicePublicKey = await importPublicKey(aliceProfile.publicKey);

  // 8. Bob derives the same shared key
  const sharedKey = await deriveSharedKey(bobKeys.privateKey, alicePublicKey);

  // 9. Bob decrypts
  const plaintext = await decryptMessage(sharedKey, msg.iv, msg.encryptedPayload);
  console.log(plaintext); // "Hello Bob! This is private."
});
```
