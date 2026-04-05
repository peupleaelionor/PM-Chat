# Architecture Overview

> PM-Chat is a privacy-first, end-to-end encrypted messaging platform. The server never sees plaintext messages.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PM-Chat System                           │
│                                                                 │
│  ┌─────────────┐       ┌─────────────┐       ┌──────────────┐  │
│  │  Web Client  │◄─────►│   Server    │◄─────►│   Database   │  │
│  │  (Next.js)   │  WS   │  (Express)  │       │  (MongoDB)   │  │
│  │              │  HTTP  │             │       │              │  │
│  └──────┬───────┘       └──────┬──────┘       └──────────────┘  │
│         │                      │                                │
│         │                      │              ┌──────────────┐  │
│         │               ┌──────┴──────┐       │    Redis      │  │
│         │               │  Socket.IO   │◄─────►│  (Sessions)  │  │
│         │               │  (Realtime)  │       │  (Nonces)    │  │
│         └───────────────┴─────────────┘       └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Layout

```
pm-chat/
├── apps/
│   ├── server/              ← Express + Socket.IO backend
│   │   ├── src/
│   │   │   ├── config.ts         ← Environment + runtime configuration
│   │   │   ├── db.ts             ← MongoDB connection
│   │   │   ├── redis.ts          ← Redis connection
│   │   │   ├── index.ts          ← Server bootstrap + graceful shutdown
│   │   │   ├── models/           ← Mongoose schemas (User, Message, Conversation)
│   │   │   ├── routes/           ← REST API endpoints
│   │   │   ├── socket/           ← Socket.IO event handlers + guards
│   │   │   ├── middleware/       ← Auth, rate limiting, security guards
│   │   │   └── utils/            ← JWT, logging, security monitor
│   │   └── Dockerfile
│   │
│   └── web/                 ← Next.js 15 frontend
│       ├── src/
│       │   ├── app/              ← Next.js pages and layouts
│       │   ├── components/       ← UI components (auth, chat, layout, ui)
│       │   ├── hooks/            ← React hooks (crypto, socket, messages, presence)
│       │   ├── lib/
│       │   │   ├── crypto/       ← E2EE encryption layer (ECDH + AES-GCM)
│       │   │   ├── store/        ← Zustand state stores
│       │   │   ├── api.ts        ← REST API client
│       │   │   ├── socket.ts     ← Socket.IO client
│       │   │   └── utils.ts      ← Utility functions
│       │   ├── workers/          ← Web workers for crypto
│       │   └── __tests__/        ← Jest tests
│       └── Dockerfile
│
├── packages/
│   └── shared/              ← Shared types + validators
│       └── src/
│           ├── types/            ← TypeScript interfaces
│           └── validators/       ← Zod validation schemas
│
├── docs/                    ← Project documentation
├── docker-compose.yml       ← Full-stack Docker setup
└── package.json             ← Monorepo root (npm workspaces)
```

## Module Responsibilities

### Crypto Module (`apps/web/src/lib/crypto/`)

The crypto module is **isolated from all UI and network code**. It provides pure functions for:

| File                 | Responsibility                                   |
|----------------------|--------------------------------------------------|
| `keyGeneration.ts`   | Generate ECDH P-256 key pairs, import/export JWK |
| `keyExchange.ts`     | Derive shared AES-GCM 256 keys via ECDH          |
| `encrypt.ts`         | AES-GCM 256-bit encryption with random IV         |
| `decrypt.ts`         | AES-GCM 256-bit decryption                        |
| `keyStorage.ts`      | Session-scoped private key persistence             |
| `messagePackaging.ts`| Message envelope creation, nonce generation        |

### Server Module (`apps/server/src/`)

| Module          | Responsibility                                      |
|-----------------|-----------------------------------------------------|
| `models/`       | MongoDB data models for users, messages, conversations |
| `routes/`       | REST API endpoints (auth, conversations, messages, attachments, health) |
| `socket/`       | Real-time event handling (messages, presence, typing, key exchange) |
| `middleware/`   | Security layers (auth, rate limiting, input guards)  |
| `utils/`        | Cross-cutting concerns (JWT, logging, security monitoring) |

### Shared Module (`packages/shared/`)

| Module          | Responsibility                                      |
|-----------------|-----------------------------------------------------|
| `types/`        | TypeScript interfaces shared between client & server |
| `validators/`   | Zod schemas for runtime validation                   |

## Data Flow

### Boot Sequence

```
Server Start
    │
    ├─► Connect MongoDB
    ├─► Connect Redis
    ├─► Initialize Express middleware
    │     ├─ Helmet (security headers)
    │     ├─ CORS
    │     ├─ Rate limiting
    │     ├─ Input guards
    │     └─ JWT auth
    ├─► Register REST routes
    ├─► Initialize Socket.IO
    │     ├─ JWT socket auth guard
    │     ├─ Socket rate limiter
    │     └─ Event handlers
    └─► Listen on PORT (default 4000)
```

### Client Boot

```
Next.js App Load
    │
    ├─► Check for persisted auth (localStorage)
    │     ├─ If found → Restore session, load private key from sessionStorage
    │     └─ If not → Show login screen
    │
    ├─► On Login/Register
    │     ├─ Generate ECDH P-256 key pair
    │     ├─ Store private key in sessionStorage
    │     ├─ Send public key to server
    │     └─ Store auth tokens
    │
    ├─► Initialize Socket.IO connection (JWT auth)
    │     ├─ Register message handlers
    │     ├─ Register presence handlers
    │     └─ Register typing handlers
    │
    └─► Load conversations list
```

## Technology Stack

| Layer          | Technology                                |
|----------------|-------------------------------------------|
| Frontend       | Next.js 15, React 18, Tailwind CSS        |
| State          | Zustand (client), TanStack Query (server)  |
| Backend        | Node.js, Express, Socket.IO               |
| Database       | MongoDB (Mongoose)                         |
| Cache/Sessions | Redis (ioredis)                            |
| Crypto         | Web Crypto API (ECDH P-256, AES-GCM 256)  |
| Auth           | JWT (access + refresh tokens)              |
| Validation     | Zod                                        |
| Shared Types   | `@pm-chat/shared` TypeScript package       |
