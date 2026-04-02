# PM-Chat

> **Private, ephemeral, end-to-end encrypted messaging. Zero knowledge — the server never sees your messages.**

---

## What is PM-Chat?

PM-Chat is an open-source, anonymous chat platform built for privacy. Users register with only a nickname — no email, no phone number. All messages are encrypted client-side using ECDH key exchange and AES-GCM 256-bit encryption before they leave your device. The server stores only ciphertext it cannot read.

Key properties:
- **End-to-end encrypted (E2EE)** — messages are encrypted/decrypted entirely in the browser
- **Zero-knowledge server** — the server never has access to plaintext content or private keys
- **Anonymous** — no personally identifiable information required
- **Ephemeral** — optional burn-after-reading and self-destructing conversations
- **Real-time** — Socket.IO-powered presence, typing indicators, and delivery receipts

---

## Architecture

```
pm-chat/                   ← monorepo root (npm workspaces)
├── apps/
│   ├── server/            ← Express + Socket.IO + MongoDB + Redis
│   └── web/               ← Next.js 14 App Router + Tailwind CSS
└── packages/
    └── shared/            ← Shared TypeScript types & Zod validators
```

### Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | Next.js 14, React 18, Tailwind CSS, Zustand, TanStack Query |
| Backend    | Node.js, Express, Socket.IO, MongoDB (Mongoose), Redis (ioredis) |
| Crypto     | Web Crypto API — ECDH P-256 + AES-GCM 256 |
| Auth       | JWT (access + refresh tokens), anonymous registration |
| Realtime   | Socket.IO with JWT-authenticated connections |
| Shared     | `@pm-chat/shared` — Zod schemas + TypeScript interfaces |

---

## Security Model

### Key Exchange
Each user generates an ECDH P-256 key pair on registration. The **public key** is stored on the server (as a JWK JSON string). The **private key never leaves the device** — it lives only in memory for the session.

### Message Encryption
1. Alice fetches Bob's public key from the server.
2. Alice derives a shared AES-GCM 256-bit key using her private key + Bob's public key (ECDH).
3. Alice encrypts the plaintext with the derived key and a random 12-byte IV.
4. The encrypted payload (`encryptedPayload`) and IV are sent to the server inside a `MessageEnvelope`.
5. Bob derives the same shared key using his private key + Alice's public key.
6. Bob decrypts the payload locally.

The server sees only opaque base64 blobs. Replay attacks are prevented by per-message `nonce` fields.

### Zero Knowledge
- No plaintext messages stored
- No private keys transmitted
- Server cannot decrypt any message

---

## Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB 7
- Redis 7
- npm ≥ 9 (workspaces support)

### 1. Clone and install

```bash
git clone https://github.com/your-org/pm-chat.git
cd pm-chat
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET, JWT_REFRESH_SECRET, and database URLs
```

### 3. Run in development

```bash
npm run dev
```

This starts both the server (port 4000) and the web app (port 3000) concurrently.

---

## Docker

Start the full stack (MongoDB, Redis, server, web):

```bash
# Set required secrets
export JWT_SECRET=your-secret
export JWT_REFRESH_SECRET=your-refresh-secret

docker compose up --build
```

Services:
- Web: http://localhost:3000
- API: http://localhost:4000
- MongoDB: localhost:27017
- Redis: localhost:6379

---

## Deployment

### Web — Vercel

The `apps/web/vercel.json` is pre-configured. Set these environment variables in your Vercel project:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the deployed server (e.g. `https://api.pm-chat.app`) |
| `NEXT_PUBLIC_SOCKET_URL` | Same as API URL |

Using Vercel environment variable references:
- `@pm-chat-api-url`
- `@pm-chat-socket-url`

### Server — Render / Railway

Deploy `apps/server` as a Node.js service. Required environment variables:

```
NODE_ENV=production
PORT=4000
MONGODB_URI=<your Atlas or managed MongoDB URI>
REDIS_URL=<your managed Redis URL>
JWT_SECRET=<long random string>
JWT_REFRESH_SECRET=<long random string>
CORS_ORIGIN=https://your-web-domain.com
```

---

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register with nickname + public key |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET`  | `/api/conversations` | List user's conversations |
| `POST` | `/api/conversations` | Start a new conversation |
| `GET`  | `/api/conversations/:id/messages` | Fetch message history |
| `POST` | `/api/messages` | Send a message (REST fallback) |
| `GET`  | `/api/health` | Health check |

### Socket.IO Events

**Client → Server**

| Event | Payload |
|---|---|
| `message:send` | `MessageEnvelope` |
| `typing:start` / `typing:stop` | `conversationId` |
| `conversation:join` / `conversation:leave` | `conversationId` |
| `message:delivered` / `message:read` | `messageId` |
| `key:exchange` | `{ recipientId, publicKey }` |

**Server → Client**

| Event | Payload |
|---|---|
| `message:new` | `MessageEnvelope` |
| `typing:indicator` | `{ conversationId, userId, isTyping }` |
| `user:presence` | `{ userId, isOnline, lastSeen? }` |
| `message:status` | `{ messageId, status, timestamp }` |
| `key:received` | `{ senderId, publicKey }` |
| `error` | `{ code, message }` |

---

## Crypto Layer

All crypto lives in `apps/web/src/lib/crypto/`:

| File | Responsibility |
|---|---|
| `keyGeneration.ts` | Generate ECDH P-256 key pair, import/export JWK |
| `keyExchange.ts` | Derive shared AES-GCM key via ECDH |
| `encrypt.ts` | AES-GCM 256-bit encryption with random IV |
| `decrypt.ts` | AES-GCM 256-bit decryption |
| `keyStorage.ts` | Secure in-memory private key storage |
| `messagePackaging.ts` | Pack/unpack wire-format `MessageEnvelope` |

Shared types for the envelope format live in `packages/shared/src/types/message.ts`.

---

## What's Done

- [x] Anonymous registration (nickname + ECDH public key)
- [x] JWT access + refresh token auth
- [x] ECDH P-256 key generation and exchange
- [x] AES-GCM 256 message encryption/decryption
- [x] Socket.IO real-time messaging
- [x] Typing indicators
- [x] Online presence / last seen
- [x] Message delivery & read receipts
- [x] Conversation management
- [x] File attachment support (server-side)
- [x] Rate limiting and input sanitization
- [x] Shared TypeScript types (`@pm-chat/shared`)
- [x] Docker Compose for local development
- [x] Vercel deployment config

## What's Next

- [ ] Multi-device key sync (secure key re-derivation)
- [ ] Self-destructing messages (burn-after-reading UI)
- [ ] Push notifications
- [ ] Group conversations
- [ ] Message search (client-side, over decrypted content)
- [ ] Mobile app (React Native)
