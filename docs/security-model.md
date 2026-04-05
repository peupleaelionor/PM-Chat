# Security Model

> PM-Chat implements defense-in-depth security. The server is designed as a zero-knowledge relay — it never has access to plaintext messages or private keys.

---

## Threat Model

| Threat                          | Mitigation                                                      |
|----------------------------------|-----------------------------------------------------------------|
| Server compromise                | E2EE — server stores only ciphertext it cannot decrypt           |
| Man-in-the-middle               | ECDH key exchange + HTTPS/WSS transport                          |
| Replay attacks                   | Per-message nonce, stored in Redis with SET NX                   |
| Brute force auth                 | Rate limiting on auth endpoints + progressive delays             |
| XSS                              | CSP headers, DOMPurify, Helmet, input sanitization               |
| Injection                        | Zod schema validation, NUL byte stripping, parameterized queries |
| Session hijacking                | Short-lived JWT access tokens, refresh rotation                  |
| Credential stuffing              | No passwords — anonymous registration                            |
| Data exfiltration                | No PII stored, no plaintext messages on server                   |
| DDoS                             | Global + per-user rate limiting, socket event throttling          |
| Unauthorized API access          | JWT authentication on all protected routes                       |

---

## Encryption Architecture

### Key Exchange (ECDH P-256)

```
     Alice                                   Bob
       │                                      │
       │  1. Generate ECDH P-256 key pair     │  1. Generate ECDH P-256 key pair
       │     (privateA, publicA)              │     (privateB, publicB)
       │                                      │
       │  2. publicA ──────────────────────►  │  2. Store publicA
       │                                      │
       │  3. Store publicB  ◄──────────────── │  3. publicB
       │                                      │
       │  4. SharedSecret =                   │  4. SharedSecret =
       │     ECDH(privateA, publicB)          │     ECDH(privateB, publicA)
       │                                      │
       │  Both derive identical AES-GCM 256-bit key
       └──────────────────────────────────────┘
```

### Message Encryption (AES-GCM 256)

```
Plaintext Message
        │
        ▼
┌───────────────────┐
│ Generate 12-byte  │
│   random IV       │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  AES-GCM Encrypt  │◄── Shared Key (derived via ECDH)
│  (256-bit key)    │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  MessageEnvelope   │
│  {                 │
│    version: 1      │
│    iv: base64      │
│    ciphertext: b64 │
│    nonce: unique   │
│    senderId        │
│    timestamp       │
│  }                 │
└───────────────────┘
        │
        ▼
  Sent to Server
  (server sees only opaque base64 blobs)
```

### Decryption Flow

```
Receive MessageEnvelope from server
        │
        ▼
┌───────────────────┐
│ Derive shared key  │◄── Our private key + Sender's public key
│ (ECDH)            │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│  AES-GCM Decrypt  │◄── IV from envelope
│                    │
└───────┬───────────┘
        │
        ▼
   Plaintext Message
   (displayed to user)
```

---

## Key Management

| Property             | Implementation                                  |
|----------------------|--------------------------------------------------|
| Key generation       | ECDH P-256 via Web Crypto API                    |
| Key storage          | Private key in `sessionStorage` only              |
| Key lifetime         | Session-scoped (lost on tab close)                |
| Key extraction       | Derived keys are **non-extractable**              |
| Public key format    | JWK (JSON Web Key)                                |
| Server key access    | Public keys only — private keys never leave device |

### Why sessionStorage?

- **Not** `localStorage` — prevents key persistence across tabs/sessions
- Keys are automatically cleared when the browser tab closes
- Prevents key theft via XSS from persisted storage
- Trade-off: Users must re-register when opening a new tab

---

## Replay Protection

Each message includes a cryptographically random `nonce` (16 bytes, base64-encoded).

```
Client sends message with nonce
        │
        ▼
Server: Redis SET NX (nonce, 1, TTL=24h)
        │
        ├── Success (new nonce) → Process message
        └── Failure (duplicate) → Reject as replay
```

- Nonces are stored in Redis with a 24-hour TTL
- `SET NX` ensures atomic check-and-set (no race conditions)
- After TTL expiration, old nonces are automatically cleaned up

---

## Authentication

### JWT Token Architecture

```
Registration/Login
        │
        ▼
┌───────────────────┐
│  Access Token      │  Short-lived (15 min default)
│  (in memory only)  │  Used for API requests
└───────────────────┘
        +
┌───────────────────┐
│  Refresh Token     │  Longer-lived (7 days default)
│  (sessionStorage)  │  Used to get new access tokens
└───────────────────┘
```

- Access tokens are **never persisted** to storage
- Refresh tokens use rotation — old tokens are invalidated on refresh
- Token revocation tracked in Redis for immediate invalidation

### Anonymous Identity

- No email, no phone, no password
- Users register with only a `nickname` + ECDH `publicKey`
- A `deviceFingerprint` provides weak device binding
- Identity is ephemeral by design

---

## Server-Side Security Guards

### Layered Defense

```
Incoming Request
        │
        ▼
┌────────────────────┐
│  Network Guard      │  Auto-blocks IPs after repeated violations
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Helmet             │  Security headers (CSP, HSTS, X-Frame, etc.)
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Rate Limiter       │  Global: 100 req/15min, Auth: 10 req/15min
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Input Guard        │  NUL byte stripping, Zod schema validation
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Integrity Guard    │  Content-Type validation, malformed rejection
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Session Guard      │  Per-user request rate detection
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  JWT Auth           │  Token verification, user extraction
└────────┬───────────┘
        │
        ▼
  Route Handler
```

### Socket.IO Security

| Guard                 | Purpose                                      |
|-----------------------|----------------------------------------------|
| JWT Socket Auth       | Validates JWT on connection handshake          |
| Socket Rate Limiter   | Limits events per user per time window         |
| Event Validation      | Validates event payloads via Zod schemas       |

---

## Security Monitor

The server includes an automated security monitor that:

1. **Tracks violations** per IP address
2. **Auto-blocks** IPs exceeding violation thresholds
3. **Logs security events** with severity levels
4. **Reports metrics** via health endpoints (dev mode only)

---

## Zero-Knowledge Properties

| Property                           | Status |
|-------------------------------------|--------|
| Server cannot read messages          | ✅      |
| Server cannot read private keys      | ✅      |
| Server cannot forge messages         | ✅      |
| Server cannot identify conversation content | ✅ |
| Server can see metadata (who talks to whom) | ⚠️ |
| Server can see message timing        | ⚠️      |
| Server can see message size          | ⚠️      |

### Metadata Considerations

While message *content* is fully encrypted, the server can observe:
- Conversation participants
- Message timestamps
- Message frequency
- Approximate message sizes

These are inherent trade-offs in a server-relay architecture. Future enhancements like onion routing or constant-rate padding could mitigate these.

---

## Recommendations for Production

1. **Always use HTTPS/WSS** in production
2. **Set strong JWT secrets** (≥ 32 random bytes)
3. **Enable MongoDB authentication** with strong credentials
4. **Enable Redis AUTH** with a strong password
5. **Review CORS origins** — restrict to your domain only
6. **Enable rate limiting** at the reverse proxy level (e.g., Nginx, Cloudflare)
7. **Monitor security logs** for anomalous patterns
8. **Rotate JWT secrets** periodically
9. **Keep dependencies updated** for security patches
10. **Use network firewalls** to restrict database access to the server only
