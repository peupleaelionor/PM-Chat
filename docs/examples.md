# Exemples

> Exemples de code pratiques montrant le fonctionnement du chiffrement et de la messagerie de PM-Chat.

---

## Envoi d'un message

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
  // 1. Dériver la clé partagée AES-GCM à partir d'ECDH
  const sharedKey = await deriveSharedKey(myPrivateKey, peerPublicKey);

  // 2. Chiffrer le texte en clair
  const { iv, ciphertext } = await encryptMessage(sharedKey, plaintext);

  // 3. Empaqueter dans une enveloppe avec un nonce de protection contre le rejeu
  const envelope = packEnvelope(iv, ciphertext, myUserId);

  // 4. Envoyer via Socket.IO
  socket.emit('message:send', {
    conversationId,
    encryptedPayload: ciphertext,
    iv,
    nonce: envelope.nonce,
  });
}
```

---

## Réception d'un message

```typescript
import { deriveSharedKey } from '@/lib/crypto/keyExchange';
import { decryptMessage } from '@/lib/crypto/decrypt';

async function handleIncomingMessage(
  message: { encryptedPayload: string; iv: string; senderId: string },
  myPrivateKey: CryptoKey,
  senderPublicKey: CryptoKey
) {
  // 1. Dériver la même clé partagée (ECDH est symétrique)
  const sharedKey = await deriveSharedKey(myPrivateKey, senderPublicKey);

  // 2. Déchiffrer le message
  try {
    const plaintext = await decryptMessage(sharedKey, message.iv, message.encryptedPayload);
    console.log('Message déchiffré :', plaintext);
    return plaintext;
  } catch (error) {
    console.error('Échec du déchiffrement — possible incompatibilité de clés ou altération');
    return '[Impossible de déchiffrer]';
  }
}
```

---

## Gestion de l'expiration TTL

```typescript
// Lors de la création d'un message autodestructeur :
socket.emit('message:send', {
  conversationId: 'conv_abc123',
  encryptedPayload: ciphertext,
  iv: iv,
  nonce: nonce,
  expiresInMs: 60000, // Le message expire dans 60 secondes
});

// Côté serveur : MongoDB stocke expiresAt = Date.now() + expiresInMs
// L'index TTL de MongoDB supprime automatiquement le document après expiration.

// Côté client : Lors du rendu des messages, vérifier l'expiration :
function isExpired(message: { expiresAt?: string }): boolean {
  if (!message.expiresAt) return false;
  return new Date(message.expiresAt).getTime() < Date.now();
}

// Filtrer les messages expirés dans l'interface
const visibleMessages = messages.filter(msg => !isExpired(msg));
```

---

## Gestion de la lecture unique (Burn-After-Reading)

```typescript
// Envoyer un message à lecture unique :
socket.emit('message:send', {
  conversationId: 'conv_abc123',
  encryptedPayload: ciphertext,
  iv: iv,
  nonce: nonce,
  burnAfterReading: true,
});

// Côté destinataire, après lecture :
function markAsRead(socket: Socket, messageId: string, burnAfterReading: boolean) {
  // Accuser réception de la lecture
  socket.emit('message:read', messageId);

  if (burnAfterReading) {
    // Supprimer du magasin local après un bref délai
    setTimeout(() => {
      chatStore.getState().removeMessage(conversationId, messageId);
    }, 3000); // Afficher pendant 3 secondes avant destruction
  }
}
```

---

## Gestion des paquets invalides

```typescript
import { MessageEnvelopeSchema } from '@pm-chat/shared';

// Validation côté serveur avant le traitement de tout message :
function validateMessagePayload(payload: unknown) {
  const result = MessageEnvelopeSchema.safeParse(payload);

  if (!result.success) {
    // Journaliser l'erreur de validation (ne jamais journaliser le contenu du payload)
    logger.warn('Payload de message invalide', {
      errors: result.error.issues.map(i => i.message),
    });

    // Retourner l'erreur au client
    return { valid: false, error: 'INVALID_PAYLOAD' };
  }

  return { valid: true, data: result.data };
}

// Vérification de protection contre le rejeu :
async function checkReplay(nonce: string, redis: Redis): Promise<boolean> {
  // SET NX : ne réussit que si la clé n'existe pas
  // EX 86400 : expire après 24 heures
  const result = await redis.set(`nonce:${nonce}`, '1', 'EX', 86400, 'NX');

  if (result === null) {
    // Le nonce existe déjà — il s'agit d'une attaque par rejeu
    logger.warn('Attaque par rejeu détectée', { nonce });
    return false;
  }

  return true; // Le nonce est nouveau, le message est valide
}
```

---

## Génération et échange de clés

```typescript
import { generateKeyPair, exportPublicKey } from '@/lib/crypto/keyGeneration';
import { storePrivateKey } from '@/lib/crypto/keyStorage';

// À l'inscription :
async function setupEncryption() {
  // 1. Générer une paire de clés ECDH P-256
  const keyPair = await generateKeyPair();

  // 2. Exporter la clé publique au format JWK (sûr à envoyer au serveur)
  const publicKeyJwk = await exportPublicKey(keyPair.publicKey);

  // 3. Stocker la clé privée de manière sécurisée dans sessionStorage
  storePrivateKey(keyPair.privateKey);

  // 4. Envoyer la clé publique au serveur lors de l'inscription
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

## Exemple complet de bout en bout

```typescript
// === APPAREIL D'ALICE ===

// 1. Alice génère les clés et s'inscrit
const aliceKeys = await generateKeyPair();
const alicePublicJwk = await exportPublicKey(aliceKeys.publicKey);
// Inscription auprès du serveur...

// 2. Alice crée une conversation avec Bob
// POST /api/conversations { participantIds: [bobUserId] }

// 3. Alice récupère la clé publique de Bob
const bobProfile = await getUser(bobUserId);
const bobPublicKey = await importPublicKey(bobProfile.publicKey);

// 4. Alice dérive la clé partagée
const sharedKey = await deriveSharedKey(aliceKeys.privateKey, bobPublicKey);

// 5. Alice chiffre et envoie
const { iv, ciphertext } = await encryptMessage(sharedKey, 'Bonjour Bob ! Ceci est privé.');
const envelope = packEnvelope(iv, ciphertext, aliceUserId);
socket.emit('message:send', {
  conversationId,
  encryptedPayload: ciphertext,
  iv,
  nonce: envelope.nonce,
});


// === APPAREIL DE BOB ===

// 6. Bob reçoit le message via Socket.IO
socket.on('message:new', async (msg) => {
  // 7. Bob récupère la clé publique d'Alice (si pas en cache)
  const alicePublicKey = await importPublicKey(aliceProfile.publicKey);

  // 8. Bob dérive la même clé partagée
  const sharedKey = await deriveSharedKey(bobKeys.privateKey, alicePublicKey);

  // 9. Bob déchiffre
  const plaintext = await decryptMessage(sharedKey, msg.iv, msg.encryptedPayload);
  console.log(plaintext); // "Bonjour Bob ! Ceci est privé."
});
```
