# Deployment & Setup Guide

> How to run PM-Chat in development, production, and demo modes.

---

## Prerequisites

| Requirement       | Version   | Purpose                        |
|-------------------|-----------|--------------------------------|
| Node.js           | ≥ 18      | Runtime                        |
| npm               | ≥ 9       | Package management (workspaces)|
| MongoDB           | 7.x       | Message & user storage          |
| Redis             | 7.x       | Sessions, nonces, rate limiting |
| Docker (optional) | ≥ 24      | Containerized deployment        |

---

## Quick Start (Development)

```bash
# Clone
git clone https://github.com/your-org/pm-chat.git
cd pm-chat

# Install all dependencies (monorepo)
npm install

# Copy environment files
cp .env.example .env
cp apps/server/.env.example apps/server/.env

# Start MongoDB and Redis (if not already running)
# Option A: Docker
docker compose up mongodb redis -d

# Option B: Local installs
mongod --dbpath /data/db &
redis-server &

# Start development servers
npm run dev
```

This starts:
- **Server** on `http://localhost:4000`
- **Web app** on `http://localhost:3000`

### Dev-Safe Mode

In development (`NODE_ENV !== 'production'`), the server:
- Auto-generates a temporary JWT secret if none is set
- Uses `localhost` defaults for MongoDB and Redis
- Shows a "DEV MODE" security indicator in the UI
- Exposes detailed health metrics at `/health/detailed`

---

## Docker Deployment (Full Stack)

```bash
# Generate secrets
export JWT_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Build and start all services
docker compose up --build -d

# Check health
curl http://localhost:4000/health
```

### Services

| Service  | Port  | Description                |
|----------|-------|----------------------------|
| `web`    | 3000  | Next.js frontend           |
| `server` | 4000  | Express + Socket.IO backend|
| `mongodb`| 27017 | MongoDB database           |
| `redis`  | 6379  | Redis cache                |

All services include health checks with dependency ordering:
- `mongodb` and `redis` start first
- `server` waits for healthy `mongodb` and `redis`
- `web` waits for healthy `server`

---

## Production Deployment

### Environment Variables

**Server** (`apps/server/.env`):

| Variable              | Required | Default     | Description                          |
|-----------------------|----------|-------------|--------------------------------------|
| `NODE_ENV`            | Yes      | —           | Must be `production`                  |
| `PORT`                | No       | `4000`      | Server listen port                    |
| `JWT_SECRET`          | Yes      | —           | ≥ 32 random bytes, hex encoded        |
| `JWT_REFRESH_SECRET`  | Yes      | —           | ≥ 32 random bytes, hex encoded        |
| `MONGODB_URI`         | Yes      | —           | Full MongoDB connection string         |
| `REDIS_URL`           | Yes      | —           | Full Redis connection URL              |
| `CORS_ORIGINS`        | Yes      | —           | Comma-separated allowed origins        |
| `UPLOAD_DIR`          | No       | `./uploads` | File attachment storage path           |
| `MAX_FILE_SIZE_MB`    | No       | `10`        | Max attachment size                    |

**Web** (`apps/web/.env`):

| Variable               | Required | Default                | Description            |
|------------------------|----------|------------------------|------------------------|
| `NEXT_PUBLIC_API_URL`  | Yes      | `http://localhost:4000` | Backend API URL        |
| `NEXT_PUBLIC_WS_URL`   | Yes      | `http://localhost:4000` | WebSocket URL          |

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong JWT secrets (`openssl rand -hex 32`)
- [ ] Use managed MongoDB (e.g., MongoDB Atlas) with authentication
- [ ] Use managed Redis (e.g., Redis Cloud) with AUTH
- [ ] Set CORS origins to your domain only
- [ ] Use HTTPS/WSS (terminate TLS at reverse proxy)
- [ ] Set up monitoring and alerting
- [ ] Configure backup for MongoDB
- [ ] Review rate limiting thresholds

### Hosting Recommendations

| Component | Recommended Platform          |
|-----------|-------------------------------|
| Web       | Vercel, Netlify, Cloudflare   |
| Server    | Render, Railway, Fly.io, AWS  |
| MongoDB   | MongoDB Atlas                  |
| Redis     | Redis Cloud, Upstash           |

---

## Vercel Deployment (Web)

1. Connect your GitHub repo to Vercel
2. Set root directory to `apps/web`
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL` = your server URL
   - `NEXT_PUBLIC_WS_URL` = your server URL
4. Deploy

---

## Build Commands

```bash
# Build everything (shared → server → web)
npm run build

# Build individual packages
npm run build --workspace=packages/shared
npm run build --workspace=apps/server
npm run build --workspace=apps/web

# Run tests
npm run test

# Lint
npm run lint

# Type check
npm run type-check --workspace=apps/web
npm run type-check --workspace=packages/shared

# Clean
npm run clean
```

---

## Demo Mode

For demonstrations without external database dependencies:

1. Start MongoDB and Redis via Docker:
   ```bash
   docker compose up mongodb redis -d
   ```

2. Start the server in dev mode (auto-generates secrets):
   ```bash
   cd apps/server && npm run dev
   ```

3. Start the web app:
   ```bash
   cd apps/web && npm run dev
   ```

4. Open two browser tabs at `http://localhost:3000`
5. Register two different users
6. Share invite IDs between tabs
7. Start an encrypted conversation

The UI will show "DEV MODE" indicators, and the server will use auto-generated temporary secrets.

---

## Hardware Requirements

### Minimum (Development)

| Resource | Requirement |
|----------|-------------|
| CPU      | 2 cores     |
| RAM      | 4 GB        |
| Disk     | 10 GB       |

### Recommended (Production)

| Resource | Requirement  |
|----------|-------------|
| CPU      | 4+ cores    |
| RAM      | 8+ GB       |
| Disk     | 50+ GB SSD  |
| Network  | 100+ Mbps   |

### Scaling Considerations

- **Horizontal scaling**: The server is stateless (sessions in Redis) — run multiple instances behind a load balancer
- **MongoDB**: Use replica sets for high availability
- **Redis**: Use Redis Cluster for large-scale deployments
- **Socket.IO**: Use the Redis adapter for multi-instance Socket.IO
