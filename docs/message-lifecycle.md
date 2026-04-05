# Message Lifecycle

> This document traces a message from composition to delivery, covering encryption, transmission, storage, decryption, and status tracking.

---

## Overview

```
┌──────────┐    Encrypt     ┌──────────┐    Store      ┌──────────┐    Decrypt     ┌──────────┐
│  Sender   │──────────────►│  Server   │──────────────►│  Server   │──────────────►│ Receiver  │
│  (Alice)  │   Socket.IO   │  (Relay)  │   MongoDB    │  (Relay)  │   Socket.IO   │  (Bob)    │
└──────────┘                └──────────┘                └──────────┘                └──────────┘
```

---

## Step-by-Step Flow

### 1. Compose Message

Alice types a message in the chat input. The UI stores the plaintext locally.

### 2. Encrypt (Client-Side)

```
Alice's Device
│
├─ 1. Ensure session key exists
│     ├─ Fetch Bob's public key from server (if not cached)
│     ├─ Import public key as CryptoKey
│     └─ Derive shared AES-GCM key: ECDH(alicePrivate, bobPublic)
│
├─ 2. Encrypt plaintext
│     ├─ Generate random 12-byte IV
│     └─ AES-GCM encrypt(sharedKey, IV, plaintext) → ciphertext
│
├─ 3. Package envelope
│     ├─ Generate random 16-byte nonce
│     └─ Create MessageEnvelope { version, iv, ciphertext, nonce, senderId, timestamp }
│
└─ 4. Create optimistic message in local store (shown immediately in UI)
```

### 3. Transmit via Socket.IO

```
Alice → Server:  'message:send' event
{
  conversationId: "conv_abc123",
  encryptedPayload: "base64...",   // AES-GCM ciphertext
  iv: "base64...",                 // 12-byte IV
  nonce: "base64...",              // 16-byte replay nonce
  expiresInMs: null,               // optional TTL
  burnAfterReading: false          // optional
}
```

### 4. Server Processing

```
Server receives 'message:send'
│
├─ 1. Validate JWT (socket auth guard)
├─ 2. Check socket rate limit
├─ 3. Validate payload schema (Zod)
├─ 4. Replay check: Redis SET NX (nonce) → reject if duplicate
├─ 5. Verify sender is conversation participant
├─ 6. Create Message document in MongoDB
│     ├─ Store only: encryptedPayload, iv, nonce, senderId, conversationId
│     └─ Server CANNOT read the message content
├─ 7. Update conversation.lastMessageAt
├─ 8. Emit 'message:new' to all participants in the conversation room
└─ 9. Send 'message:status' { status: 'sent' } back to sender
```

### 5. Receive and Decrypt (Client-Side)

```
Bob's Device receives 'message:new' event
│
├─ 1. Add encrypted message to local store
├─ 2. Increment unread count for conversation
├─ 3. Emit 'message:delivered' acknowledgment to server
│
├─ 4. Decrypt message
│     ├─ Ensure session key: ECDH(bobPrivate, alicePublic) → same shared key
│     └─ AES-GCM decrypt(sharedKey, iv, ciphertext) → plaintext
│
├─ 5. Update message in store with decrypted plaintext
└─ 6. Render in MessageBubble component
```

### 6. Status Tracking

```
Timeline:
  Alice sends     → status: 'sending' (optimistic)
  Server stores   → status: 'sent'
  Bob receives    → status: 'delivered'
  Bob views       → status: 'read'
  
Status updates flow:
  Server → Alice:  'message:status' { messageId, status: 'delivered' }
  Server → Alice:  'message:status' { messageId, status: 'read' }
```

---

## Special Message Types

### Burn-After-Reading

```
Alice sends with burnAfterReading: true
│
├─ Server stores message normally
├─ Bob receives and decrypts
├─ Bob reads message → emits 'message:read'
├─ Server marks as read
└─ Client removes message from UI after viewing
```

### Self-Destructing Messages (TTL)

```
Alice sends with expiresInMs: 60000 (1 minute)
│
├─ Server stores with expiresAt = now + 60s
├─ MongoDB TTL index auto-deletes after expiry
└─ Client hides expired messages from UI
```

### Self-Destructing Conversations

```
Conversation created with selfDestruct: true, expiresAt: <timestamp>
│
├─ All messages in conversation inherit the expiry
└─ MongoDB TTL index auto-deletes conversation and messages after expiry
```

---

## Error Cases

| Error                         | Handling                                                |
|-------------------------------|---------------------------------------------------------|
| Decryption failure            | Display "[Unable to decrypt]" — key mismatch or corruption |
| Replay detected               | Server rejects with error, message not stored            |
| Rate limited                  | Server rejects, client shows error toast                 |
| Socket disconnected           | Message queued locally, retried on reconnect             |
| Invalid payload               | Zod validation rejects, error returned to client         |
| Conversation not found        | Server returns 404                                       |
| User not participant          | Server returns 403                                       |

---

## Message Storage

### MongoDB Document (Server)

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: ObjectId,
  encryptedPayload: "base64...",    // Opaque to server
  iv: "base64...",                  // Opaque to server
  nonce: "base64...",               // Used for replay protection
  burnAfterReading: false,
  expiresAt: null,                  // or Date for TTL
  deliveredAt: null,                // or Date
  readAt: null,                     // or Date
  createdAt: Date,
  updatedAt: Date
}
```

### Client-Side Store (Zustand)

```typescript
{
  _id: "msg_abc123",
  conversationId: "conv_xyz",
  senderId: "user_alice",
  encryptedPayload: "base64...",
  iv: "base64...",
  plaintext: "Hello Bob!",          // Decrypted locally
  optimistic: false,                // Confirmed by server
  localId: "temp_123"              // Before server ID assignment
}
```
