# 🔒 PM-Chat — Zero-Knowledge Encrypted Messaging

> **Private. Anonymous. End-to-end encrypted. The server never sees your messages.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://typescriptlang.org)

---

## What is PM-Chat?

PM-Chat is an open-source, anonymous, end-to-end encrypted messaging platform. Users register with only a nickname — **no email, no phone number, no password**. All messages are encrypted in the browser using ECDH key exchange and AES-GCM 256-bit encryption before they leave your device. The server stores only ciphertext it cannot read.

### Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **End-to-End Encryption** | ECDH P-256 key exchange + AES-GCM 256-bit — messages encrypted/decrypted entirely in the browser |
| 👻 **Zero-Knowledge Server** | Server stores only opaque ciphertext — cannot decrypt any message |
| 🎭 **Anonymous** | No PII required — register with a nickname only |
| 💨 **Ephemeral** | Burn-after-reading messages and self-destructing conversations |
| ⚡ **Real-Time** | Socket.IO-powered presence, typing indicators, and delivery receipts |
| 🛡️ **Defense-in-Depth** | Rate limiting, security guards, auto-blocking, input sanitization |
| 🔄 **Replay Protection** | Per-message nonces validated via Redis SET NX |
| 📎 **Encrypted Attachments** | File uploads encrypted client-side before transmission |

---

## Architecture

```
pm-chat/
├── apps/
│   ├── server/            ← Express + Socket.IO + MongoDB + Redis
│   └── web/               ← Next.js 15 + Tailwind CSS + Web Crypto API
├── packages/
│   └── shared/            ← TypeScript types + Zod validators
└── docs/                  ← Architecture, security, protocol documentation
```

### How Encryption Works

```
  Alice                          Server                         Bob
    │                              │                              │
    │ 1. Generate ECDH key pair    │   1. Generate ECDH key pair  │
    │ 2. Send public key ─────────►│◄────────── Send public key  2.│
    │                              │                              │
    │ 3. Fetch Bob's public key    │                              │
    │◄─────────────────────────────│                              │
    │                              │                              │
    │ 4. Derive shared AES key     │                              │
    │    ECDH(privA, pubB)         │                              │
    │                              │                              │
    │ 5. Encrypt message           │                              │
    │    AES-GCM-256(key, msg)     │                              │
    │                              │                              │
    │ 6. Send ciphertext ─────────►│ 7. Store ciphertext          │
    │                              │    (cannot decrypt)          │
    │                              │────────────► 8. Receive      │
    │                              │                              │
    │                              │   9. Derive shared AES key   │
    │                              │      ECDH(privB, pubA)       │
    │                              │                              │
    │                              │  10. Decrypt message          │
    │                              │      AES-GCM-256(key, ct)    │
    └──────────────────────────────┴──────────────────────────────┘
```

### Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | Next.js 15, React 18, Tailwind CSS, Zustand, TanStack Query |
| Backend    | Node.js, Express, Socket.IO, MongoDB (Mongoose), Redis (ioredis) |
| Crypto     | Web Crypto API — ECDH P-256 + AES-GCM 256 |
| Auth       | JWT (access + refresh tokens), anonymous registration |
| Validation | Zod schemas (shared between client & server) |
| Security   | Helmet, rate limiting, security guards, auto-defense, CSP |

---

## Quick Start

### Prerequisites

- Node.js ≥ 18, npm ≥ 9
- MongoDB 7, Redis 7 (or use Docker)

### Development

```bash
git clone https://github.com/peupleaelionor/PM-Chat.git
cd PM-Chat
npm install

# Copy environment files
cp .env.example .env
cp apps/server/.env.example apps/server/.env

# Start databases (Docker)
docker compose up mongodb redis -d

# Start dev servers (server:4000 + web:3000)
npm run dev
```

> **Dev-safe mode**: In development, the server auto-generates temporary secrets and uses localhost defaults. No configuration required.

### Docker (Full Stack)

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)
docker compose up --build
```

| Service  | URL                     |
|----------|-------------------------|
| Web      | http://localhost:3000    |
| API      | http://localhost:4000    |
| MongoDB  | localhost:27017          |
| Redis    | localhost:6379           |

---

## Security Model

### Zero-Knowledge Properties

| Property | Status |
|----------|--------|
| Server cannot read messages | ✅ |
| Server cannot access private keys | ✅ |
| Server cannot forge messages | ✅ |
| Replay attacks prevented | ✅ |
| Per-message random IVs | ✅ |
| Non-extractable derived keys | ✅ |
| Session-scoped key storage | ✅ |

### Server-Side Defense Layers

```
Request → Network Guard → Helmet → Rate Limiter → Input Guard →
          Integrity Guard → Session Guard → JWT Auth → Route Handler
```

| Guard | Purpose |
|-------|---------|
| Network Guard | Auto-blocks IPs after repeated violations |
| Rate Limiter | Global: 100 req/15min, Auth: 10 req/15min |
| Input Guard | NUL byte stripping, Zod schema validation |
| Integrity Guard | Content-Type validation, malformed rejection |
| Session Guard | Per-user request rate detection |
| Socket Rate Limiter | Socket.IO event throttling per user |

📖 Full details: [Security Model](docs/security-model.md)

---

## API Reference

### REST Endpoints

| Method   | Path                           | Auth | Description |
|----------|--------------------------------|------|-------------|
| `POST`   | `/api/auth/register`           | No   | Register with nickname + public key |
| `POST`   | `/api/auth/login`              | No   | Login |
| `POST`   | `/api/auth/refresh`            | No   | Refresh access token |
| `POST`   | `/api/auth/logout`             | Yes  | Logout and revoke tokens |
| `GET`    | `/api/auth/me`                 | Yes  | Get current user profile |
| `GET`    | `/api/conversations`           | Yes  | List conversations |
| `POST`   | `/api/conversations`           | Yes  | Create conversation |
| `GET`    | `/api/conversations/:id`       | Yes  | Get conversation details |
| `DELETE` | `/api/conversations/:id`       | Yes  | Delete conversation |
| `GET`    | `/api/messages/:conversationId`| Yes  | Fetch messages (paginated) |
| `POST`   | `/api/attachments`             | Yes  | Upload encrypted attachment |
| `GET`    | `/api/attachments/:filename`   | Yes  | Download encrypted attachment |
| `GET`    | `/health`                      | No   | Health check |

### Socket.IO Events

**Client → Server**: `message:send`, `typing:start`, `typing:stop`, `conversation:join`, `conversation:leave`, `message:delivered`, `message:read`, `key:exchange`

**Server → Client**: `message:new`, `typing:indicator`, `user:presence`, `message:status`, `key:received`, `error`

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture Overview](docs/architecture.md) | System design, module layout, data flows |
| [Security Model](docs/security-model.md) | Threat model, encryption details, defense layers |
| [Message Lifecycle](docs/message-lifecycle.md) | End-to-end message flow from send to receive |
| [Packet Format](docs/packet-format.md) | Wire protocol and MessageEnvelope schema |
| [Pairing Flow](docs/pairing-flow.md) | How users establish encrypted channels |
| [Deployment Guide](docs/deployment.md) | Dev, Docker, and production setup |
| [Examples](docs/examples.md) | Code examples for common operations |

---

## Project Structure

```
apps/server/src/
├── config.ts             ← Environment configuration
├── db.ts                 ← MongoDB connection
├── redis.ts              ← Redis connection
├── index.ts              ← Server bootstrap + shutdown
├── models/               ← User, Message, Conversation schemas
├── routes/               ← REST API (auth, conversations, messages, attachments, health)
├── socket/               ← Real-time handlers (messages, presence, typing)
├── middleware/            ← Auth, rate limiting, security guards
└── utils/                ← JWT, logging, security monitor

apps/web/src/
├── app/                  ← Next.js pages and layouts
├── components/           ← React components (auth, chat, layout, ui)
├── hooks/                ← Custom hooks (crypto, socket, messages, presence)
├── lib/
│   ├── crypto/           ← E2EE layer (ECDH + AES-GCM) — isolated from UI
│   ├── store/            ← Zustand state management
│   ├── api.ts            ← REST client
│   └── socket.ts         ← Socket.IO client
├── workers/              ← Web workers
└── __tests__/            ← Jest crypto tests

packages/shared/src/
├── types/                ← Shared TypeScript interfaces
└── validators/           ← Zod validation schemas
```

---

## Build & Test

```bash
# Build all (shared → server → web)
npm run build

# Run tests
npm run test

# Lint
npm run lint

# Type check
npm run type-check --workspace=apps/web
```

---

## Roadmap

### ✅ Completed

- End-to-end encryption (ECDH P-256 + AES-GCM 256)
- Anonymous registration and JWT auth
- Real-time messaging with Socket.IO
- Burn-after-reading and self-destructing conversations
- Delivery and read receipts
- Encrypted file attachments
- Security guards and auto-defense
- Rate limiting (REST + Socket.IO)
- Docker Compose with health checks
- Crypto unit tests (15 passing)
- CI pipeline (lint, build, test)

### 🔜 Planned

- [ ] Per-message forward secrecy (Double Ratchet protocol)
- [ ] Multi-device key synchronization
- [ ] Group conversations
- [ ] Push notifications
- [ ] Key fingerprint verification (anti-MITM)
- [ ] End-to-end integration tests
- [ ] Mobile app (React Native)
- [ ] Onion routing for metadata protection

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for our security policy and responsible disclosure process.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
