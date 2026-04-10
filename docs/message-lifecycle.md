# Cycle de vie d'un message

> Ce document retrace le parcours d'un message de sa rédaction à sa livraison, couvrant le chiffrement, la transmission, le stockage, le déchiffrement et le suivi de statut.

---

## Vue d'ensemble

```
┌──────────┐    Chiffrer    ┌──────────┐    Stocker     ┌──────────┐   Déchiffrer   ┌──────────┐
│ Expéditeur│──────────────►│  Serveur  │──────────────►│  Serveur  │──────────────►│Destinataire│
│  (Alice)  │   Socket.IO   │  (Relais) │   MongoDB    │  (Relais) │   Socket.IO   │  (Bob)    │
└──────────┘                └──────────┘                └──────────┘                └──────────┘
```

---

## Flux étape par étape

### 1. Rédaction du message

Alice saisit un message dans le champ de chat. L'interface stocke le texte en clair localement.

### 2. Chiffrement (côté client)

```
Appareil d'Alice
│
├─ 1. S'assurer que la clé de session existe
│     ├─ Récupérer la clé publique de Bob depuis le serveur (si pas en cache)
│     ├─ Importer la clé publique en tant que CryptoKey
│     └─ Dériver la clé partagée AES-GCM : ECDH(alicePrivate, bobPublic)
│
├─ 2. Chiffrer le texte en clair
│     ├─ Générer un IV aléatoire de 12 octets
│     └─ AES-GCM encrypt(sharedKey, IV, plaintext) → ciphertext
│
├─ 3. Empaqueter l'enveloppe
│     ├─ Générer un nonce aléatoire de 16 octets
│     └─ Créer MessageEnvelope { version, iv, ciphertext, nonce, senderId, timestamp }
│
└─ 4. Créer un message optimiste dans le magasin local (affiché immédiatement dans l'interface)
```

### 3. Transmission via Socket.IO

```
Alice → Serveur :  événement 'message:send'
{
  conversationId: "conv_abc123",
  encryptedPayload: "base64...",   // Texte chiffré AES-GCM
  iv: "base64...",                 // IV de 12 octets
  nonce: "base64...",              // Nonce anti-rejeu de 16 octets
  expiresInMs: null,               // TTL optionnel
  burnAfterReading: false          // optionnel
}
```

### 4. Traitement par le serveur

```
Le serveur reçoit 'message:send'
│
├─ 1. Valider le JWT (garde d'auth socket)
├─ 2. Vérifier la limite de débit du socket
├─ 3. Valider le schéma du payload (Zod)
├─ 4. Vérification anti-rejeu : Redis SET NX (nonce) → rejet si doublon
├─ 5. Vérifier que l'expéditeur est participant à la conversation
├─ 6. Créer le document Message dans MongoDB
│     ├─ Stocker uniquement : encryptedPayload, iv, nonce, senderId, conversationId
│     └─ Le serveur NE PEUT PAS lire le contenu du message
├─ 7. Mettre à jour conversation.lastMessageAt
├─ 8. Émettre 'message:new' à tous les participants dans la salle de conversation
└─ 9. Envoyer 'message:status' { status: 'sent' } à l'expéditeur
```

### 5. Réception et déchiffrement (côté client)

```
L'appareil de Bob reçoit l'événement 'message:new'
│
├─ 1. Ajouter le message chiffré au magasin local
├─ 2. Incrémenter le compteur de non-lus pour la conversation
├─ 3. Émettre l'accusé de réception 'message:delivered' au serveur
│
├─ 4. Déchiffrer le message
│     ├─ S'assurer de la clé de session : ECDH(bobPrivate, alicePublic) → même clé partagée
│     └─ AES-GCM decrypt(sharedKey, iv, ciphertext) → texte en clair
│
├─ 5. Mettre à jour le message dans le magasin avec le texte déchiffré
└─ 6. Afficher dans le composant MessageBubble
```

### 6. Suivi de statut

```
Chronologie :
  Alice envoie        → statut : 'sending' (optimiste)
  Le serveur stocke   → statut : 'sent'
  Bob reçoit          → statut : 'delivered'
  Bob consulte        → statut : 'read'
  
Flux des mises à jour de statut :
  Serveur → Alice :  'message:status' { messageId, status: 'delivered' }
  Serveur → Alice :  'message:status' { messageId, status: 'read' }
```

---

## Types de messages spéciaux

### Lecture unique (Burn-After-Reading)

```
Alice envoie avec burnAfterReading: true
│
├─ Le serveur stocke le message normalement
├─ Bob reçoit et déchiffre
├─ Bob lit le message → émet 'message:read'
├─ Le serveur marque comme lu
└─ Le client supprime le message de l'interface après consultation
```

### Messages autodestructeurs (TTL)

```
Alice envoie avec expiresInMs: 60000 (1 minute)
│
├─ Le serveur stocke avec expiresAt = maintenant + 60s
├─ L'index TTL de MongoDB supprime automatiquement après expiration
└─ Le client masque les messages expirés de l'interface
```

### Conversations autodestructrices

```
Conversation créée avec selfDestruct: true, expiresAt: <horodatage>
│
├─ Tous les messages de la conversation héritent de l'expiration
└─ L'index TTL de MongoDB supprime automatiquement la conversation et les messages après expiration
```

---

## Cas d'erreur

| Erreur                           | Traitement                                                    |
|----------------------------------|---------------------------------------------------------------|
| Échec du déchiffrement           | Afficher « [Impossible de déchiffrer] » — incompatibilité de clés ou corruption |
| Rejeu détecté                    | Le serveur rejette avec une erreur, message non stocké         |
| Limite de débit atteinte         | Le serveur rejette, le client affiche un toast d'erreur        |
| Socket déconnecté                | Message mis en file d'attente localement, renvoyé à la reconnexion |
| Payload invalide                 | La validation Zod rejette, erreur retournée au client          |
| Conversation introuvable         | Le serveur retourne 404                                        |
| Utilisateur non participant      | Le serveur retourne 403                                        |

---

## Stockage des messages

### Document MongoDB (Serveur)

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: ObjectId,
  encryptedPayload: "base64...",    // Opaque pour le serveur
  iv: "base64...",                  // Opaque pour le serveur
  nonce: "base64...",               // Utilisé pour la protection anti-rejeu
  burnAfterReading: false,
  expiresAt: null,                  // ou Date pour le TTL
  deliveredAt: null,                // ou Date
  readAt: null,                     // ou Date
  createdAt: Date,
  updatedAt: Date
}
```

### Magasin côté client (Zustand)

```typescript
{
  _id: "msg_abc123",
  conversationId: "conv_xyz",
  senderId: "user_alice",
  encryptedPayload: "base64...",
  iv: "base64...",
  plaintext: "Bonjour Bob !",       // Déchiffré localement
  optimistic: false,                // Confirmé par le serveur
  localId: "temp_123"              // Avant l'attribution de l'ID par le serveur
}
```
