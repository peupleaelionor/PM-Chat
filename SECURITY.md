# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅         |

## Reporting a Vulnerability

If you discover a security vulnerability in PM-Chat, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email: [Create a private security advisory](../../security/advisories/new) on GitHub
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment** within 48 hours
- **Assessment** within 7 days
- **Fix** within 30 days for confirmed vulnerabilities
- **Credit** in the release notes (unless you prefer anonymity)

## Security Design

PM-Chat is designed with security as a core principle:

### Encryption

- **ECDH P-256** for key exchange
- **AES-GCM 256-bit** for message encryption
- **Random 12-byte IV** per message
- **16-byte nonce** for replay protection
- Private keys **never leave the device**
- Derived keys are **non-extractable**

### Server Security

- Zero-knowledge architecture — server cannot read messages
- JWT authentication with short-lived access tokens
- Token refresh rotation
- Per-IP rate limiting (REST + Socket.IO)
- Input validation via Zod schemas
- NUL byte stripping
- Content-Type enforcement
- Helmet security headers
- Automated IP blocking for repeated violations
- Security monitoring with anomaly detection

### Known Limitations

These are known trade-offs, not vulnerabilities:

1. **No forward secrecy** — compromised private key exposes past messages (planned: Double Ratchet)
2. **Metadata visible to server** — who communicates with whom, message timing and size
3. **Session-bound keys** — closing the tab destroys the private key (this is intentional)
4. **No key fingerprint verification** — trust-on-first-use for public keys (planned: out-of-band verification)
5. **Single-device** — no multi-device key synchronization yet

## Scope

The following are **in scope** for security reports:
- Encryption bypass or weaknesses
- Authentication bypass
- Authorization flaws
- Injection vulnerabilities
- Information disclosure
- Rate limiting bypass
- Replay attack vectors

The following are **out of scope**:
- Denial of service (unless trivially exploitable)
- Social engineering
- Physical device access attacks
- Browser extension interference
- Issues requiring user action (phishing, etc.)
