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
- **Self-healing** — built-in security monitoring, rate limiting, and auto-defense

---

## Architecture

```
pm-chat/                   ← monorepo root (npm workspaces)
├── apps/
│   ├── server/            ← Express + Socket.IO + MongoDB + Redis
│   └── web/               ← Next.js 15 App Router + Tailwind CSS
└── packages/
    └── shared/            ← Shared TypeScript types & Zod validators
```

### Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | Next.js 15, React 18, Tailwind CSS, Zustand, TanStack Query + Virtual |
| Backend    | Node.js, Express, Socket.IO, MongoDB (Mongoose), Redis (ioredis) |
| Crypto     | Web Crypto API — ECDH P-256 + AES-GCM 256 |
| Auth       | JWT (access + refresh tokens), anonymous registration |
| Realtime   | Socket.IO with JWT-authenticated connections |
| Security   | Helmet, rate limiting, security guards, auto-defense, monitoring |
| Shared     | `@pm-chat/shared` — Zod schemas + TypeScript interfaces |

---

## Security Model

### Key Exchange
Each user generates an ECDH P-256 key pair on registration. The **public key** is stored on the server (as a JWK JSON string). The **private key never leaves the device** — it lives only in memory for the session.

### Message Encryption
1. Alice fetches Bob's public key from the server.
2. Alice derives a shared AES-GCM 256-bit key using her private key + Bob's public key (ECDH).
3. Alice encrypts the plaintext with the derived key and a random 12-byte IV.
4. The encrypted payload (`encryptedPayload`), IV, and a unique nonce are sent inside a `MessageEnvelope`.
5. Server validates the nonce (Redis SET NX for replay protection) and stores only the ciphertext.
6. Bob derives the same shared key using his private key + Alice's public key.
7. Bob decrypts the payload locally.

The server sees only opaque base64 blobs. Replay attacks are prevented by per-message `nonce` fields stored in Redis.

### Zero Knowledge
- No plaintext messages stored
- No private keys transmitted
- Server cannot decrypt any message
- Logs never contain message content

### Security Guards

| Guard | Purpose |
|---|---|
| Network Guard | Auto-blocks IPs after repeated violations |
| Integrity Guard | Validates content types, rejects malformed requests |
| Session Guard | Detects excessive per-user request rates |
| Input Guard | Strips NUL bytes, validates via Zod schemas |
| Socket Rate Limiter | Limits Socket.IO events per user per time window |

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
cp apps/server/.env.example apps/server/.env
# Edit and set JWT_SECRET (≥ 32 chars) and database URLs
```

**Dev-safe mode:** In development, the server auto-generates a temporary JWT secret and uses default localhost database URLs if none are set.

**Production mode:** All required secrets (`JWT_SECRET`, `MONGODB_URI`, `REDIS_URL`) must be explicitly set or the server will not start.

### 3. Run in development

```bash
npm run dev
```

This starts both the server (port 4000) and the web app (port 3000) concurrently.

---

## Docker

Start the full stack (MongoDB, Redis, server, web) with health-checked service ordering:

```bash
export JWT_SECRET=$(openssl rand -hex 32)
docker compose up --build
```

Services:
- Web: http://localhost:3000
- API: http://localhost:4000
- MongoDB: localhost:27017
- Redis: localhost:6379

All services include health checks — the server waits for healthy MongoDB and Redis before starting, and the web app waits for a healthy server.

---

## Deployment

### Web — Vercel

Set these environment variables in your Vercel project:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the deployed server (e.g. `https://api.pm-chat.app`) |
| `NEXT_PUBLIC_WS_URL` | Same as API URL (used for Socket.IO) |

### Server — Render / Railway

Deploy `apps/server` as a Node.js service. Required environment variables:

```
NODE_ENV=production
PORT=4000
MONGODB_URI=<your Atlas or managed MongoDB URI>
REDIS_URL=<your managed Redis URL>
JWT_SECRET=<long random string, ≥ 32 chars>
CORS_ORIGINS=https://your-web-domain.com
```

---

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register with nickname + public key |
| `POST` | `/api/auth/login` | Login with credentials |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Logout and revoke tokens |
| `GET`  | `/api/auth/me` | Get current user profile |
| `GET`  | `/api/conversations` | List user's conversations |
| `POST` | `/api/conversations` | Start a new conversation |
| `GET`  | `/api/conversations/:id` | Get conversation details |
| `DELETE` | `/api/conversations/:id` | Delete a conversation |
| `GET`  | `/api/messages/:conversationId` | Fetch message history (paginated) |
| `POST` | `/api/attachments` | Upload encrypted attachment |
| `GET`  | `/api/attachments/:filename` | Download encrypted attachment |
| `GET`  | `/health` | Health check (MongoDB + Redis status) |
| `GET`  | `/health/detailed` | Dev-only: detailed metrics dashboard |

### Socket.IO Events

**Client → Server**

| Event | Payload |
|---|---|
| `message:send` | `{ conversationId, encryptedPayload, iv, nonce, … }` |
| `typing:start` / `typing:stop` | `{ conversationId }` |
| `conversation:join` / `conversation:leave` | `{ conversationId }` |
| `message:delivered` / `message:read` | `{ messageId, conversationId }` |
| `key:exchange` | `{ targetUserId, encryptedKey, conversationId }` |

**Server → Client**

| Event | Payload |
|---|---|
| `message:new` | `{ messageId, conversationId, senderId, encryptedPayload, iv, … }` |
| `typing:indicator` | `{ conversationId, userId, isTyping }` |
| `user:presence` | `{ userId, isOnline, lastSeen? }` |
| `message:status` | `{ messageId, conversationId, status }` |
| `key:received` | `{ fromUserId, conversationId, encryptedKey }` |
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
| `keyStorage.ts` | Secure in-memory private key storage (sessionStorage) |
| `messagePackaging.ts` | Pack/unpack wire-format `MessageEnvelope` with nonce |

Shared types for the envelope format live in `packages/shared/src/types/message.ts`.

---

## What's Done

- [x] Anonymous registration (nickname + ECDH public key)
- [x] JWT access + refresh token auth with rotation
- [x] ECDH P-256 key generation and exchange
- [x] AES-GCM 256 message encryption/decryption
- [x] Socket.IO real-time messaging with rate limiting
- [x] Typing indicators and online presence
- [x] Message delivery & read receipts
- [x] Burn-after-reading messages
- [x] Self-destructing conversations with TTL
- [x] Conversation management (create, list, delete)
- [x] File attachment support (encrypted upload/download)
- [x] Security guards (network, integrity, session, input)
- [x] Security monitor with auto-defense
- [x] Rate limiting (REST global + auth + Socket.IO events)
- [x] Dev-safe mode (auto-generated secrets, strict production mode)
- [x] Security mode indicator (DEV/PRODUCTION) in UI
- [x] Connection status indicator (online/offline/reconnecting)
- [x] Message reactions (UI component)
- [x] Quick search (client-side over decrypted messages)
- [x] Dark mode
- [x] Virtual scrolling for large message lists
- [x] Optimistic UI with skeleton loading
- [x] Crypto unit tests (15 passing)
- [x] Docker Compose with health checks
- [x] Vercel + separate backend deployment config
- [x] Shared TypeScript types (`@pm-chat/shared`)

## What's Next

- [ ] Per-message forward secrecy (ratchet protocol)
- [ ] Multi-device key sync (secure key re-derivation)
- [ ] Group conversations
- [ ] Push notifications
- [ ] E2E integration tests
- [ ] Mobile app (React Native)
