# Pairing Flow

> How two users establish a secure encrypted channel using ECDH key exchange.

---

## Overview

PM-Chat uses anonymous pairing — users connect by sharing their invite ID (which is their user ID). No email, phone number, or password is required.

```
┌──────────┐                    ┌──────────┐
│  Alice    │                    │   Bob    │
│  Device   │                    │  Device  │
└────┬──────┘                    └────┬─────┘
     │                                │
     │  1. Register (nickname + pubkey)│
     │────────────────►               │
     │                                │  1. Register (nickname + pubkey)
     │               ◄────────────────│
     │                                │
     │  2. Share invite ID            │
     │  (out-of-band: QR, text, etc.) │
     │◄──────────────────────────────►│
     │                                │
     │  3. Create conversation        │
     │────────────────►               │
     │                                │
     │  4. Fetch Bob's public key     │
     │────────────────►               │
     │                                │
     │  5. Derive shared key (ECDH)   │
     │  6. Send first encrypted msg   │
     │────────────────►               │
     │                                │
     │               7. Fetch Alice's public key
     │               ◄────────────────│
     │                                │
     │               8. Derive shared key (ECDH)
     │               9. Decrypt message
     │               ◄────────────────│
     │                                │
     │  ═══ Secure channel established ═══
     │                                │
```

---

## Detailed Steps

### Step 1: Registration

Each user registers independently. On first visit:

1. Client generates an ECDH P-256 key pair
2. Client exports the public key as JWK (JSON Web Key)
3. Client sends `POST /api/auth/register` with:
   ```json
   {
     "nickname": "alice_secure",
     "publicKey": "{\"kty\":\"EC\",\"crv\":\"P-256\",\"x\":\"...\",\"y\":\"...\"}",
     "deviceFingerprint": "browser-fingerprint-hash"
   }
   ```
4. Server stores the public key and returns:
   ```json
   {
     "userId": "507f1f77bcf86cd799439011",
     "nickname": "alice_secure",
     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
     "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
   }
   ```
5. Client stores private key in `sessionStorage` (never sent to server)

### Step 2: Share Invite ID

Users share their `userId` (invite ID) through any external channel:
- Copy/paste in another chat app
- QR code scan
- Show on screen

The invite ID is displayed in the app's settings and home page with a copy button.

### Step 3: Create Conversation

Alice starts a new conversation:

```
POST /api/conversations
{
  "participantIds": ["507f1f77bcf86cd799439012"],  // Bob's userId
  "selfDestruct": false
}
```

Server creates the conversation and adds both users as participants.

### Step 4: Fetch Peer's Public Key

When Alice opens the conversation, the client:

1. Fetches Bob's user profile (includes public key JWK)
2. Imports the JWK as a `CryptoKey` object
3. Caches the public key in the Zustand crypto store

### Step 5: Derive Shared Key

Using ECDH (Elliptic Curve Diffie-Hellman):

```javascript
// Alice's side
const sharedKey = await crypto.subtle.deriveKey(
  { name: 'ECDH', public: bobPublicKey },
  alicePrivateKey,
  { name: 'AES-GCM', length: 256 },
  false,  // non-extractable
  ['encrypt', 'decrypt']
);
```

The derived key is cached per-conversation in the crypto store.

### Step 6: Send First Message

Alice encrypts and sends the first message using the derived shared key. See [Message Lifecycle](./message-lifecycle.md) for details.

### Steps 7-9: Bob's Side

When Bob receives the message:
1. Bob fetches Alice's public key (if not cached)
2. Bob derives the same shared key: `ECDH(bobPrivate, alicePublic)`
3. Bob decrypts the message with the shared key

Because ECDH is symmetric, both parties derive the same shared secret.

---

## Key Properties

| Property                      | Detail                                    |
|-------------------------------|-------------------------------------------|
| Key pair algorithm            | ECDH with P-256 curve                     |
| Shared key algorithm          | AES-GCM 256-bit                           |
| Key exchange                  | Implicit (via fetched public keys)         |
| Out-of-band requirement       | Only user ID sharing                       |
| Forward secrecy               | Not yet (planned: ratchet protocol)        |
| Multi-device                  | Not yet (single session per device)        |

---

## Security Considerations

1. **Public key authenticity**: Currently relies on the server to honestly deliver public keys. A compromised server could perform a MITM attack by substituting keys.
   - **Mitigation (future)**: Key fingerprint verification — users compare key fingerprints out-of-band.

2. **No forward secrecy**: If a private key is compromised, all past messages can be decrypted.
   - **Mitigation (planned)**: Double Ratchet protocol (similar to Signal).

3. **Session-bound keys**: Private keys live only in `sessionStorage`. Closing the tab destroys the key.
   - This is a security feature, not a bug — it prevents key persistence.

4. **Device fingerprint**: Used as a weak device binding, not as authentication. Do not rely on it for security.
