# Format des paquets

> Tous les messages sur le réseau utilisent le format `MessageEnvelope`. Le serveur ne voit que les payloads chiffrés — il ne peut pas lire le contenu des messages.

---

## Schéma MessageEnvelope

```typescript
interface MessageEnvelope {
  version: number;           // Version du protocole (actuellement 1)
  id: string;                // UUID v4 — identifiant unique du message
  conversationId: string;    // Conversation cible
  senderId: string;          // ID de l'expéditeur authentifié
  encryptedPayload: string;  // Texte chiffré AES-GCM encodé en base64
  iv: string;                // Vecteur d'initialisation de 12 octets encodé en base64
  nonce: string;             // Nonce anti-rejeu de 16 octets encodé en base64
  timestamp: string;         // Horodatage de création ISO 8601
  expiresAt?: string;        // Expiration ISO 8601 (optionnel)
  burnAfterReading?: boolean; // Autodestruction après lecture (optionnel)
  deliveredAt?: string;      // Horodatage de livraison ISO 8601 (défini par le serveur)
  readAt?: string;           // Horodatage de lecture ISO 8601 (défini par le serveur)
  attachmentId?: string;     // Référence à une pièce jointe chiffrée (optionnel)
}
```

---

## Format réseau (événement Socket.IO)

### `message:send` (Client → Serveur)

```json
{
  "conversationId": "507f1f77bcf86cd799439011",
  "encryptedPayload": "dGhpcyBpcyBlbmNyeXB0ZWQgZGF0YQ==",
  "iv": "c29tZSByYW5kb20gaXY=",
  "nonce": "dW5pcXVlLW5vbmNlLXZhbHVl",
  "expiresInMs": null,
  "burnAfterReading": false
}
```

### `message:new` (Serveur → Client)

```json
{
  "messageId": "507f191e810c19729de860ea",
  "conversationId": "507f1f77bcf86cd799439011",
  "senderId": "507f1f77bcf86cd799439012",
  "encryptedPayload": "dGhpcyBpcyBlbmNyeXB0ZWQgZGF0YQ==",
  "iv": "c29tZSByYW5kb20gaXY=",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "expiresAt": null,
  "burnAfterReading": false
}
```

---

## Détails des champs

### `version` (requis)

Numéro de version du protocole. Actuellement `1`. Utilisé pour la compatibilité ascendante — les futurs clients peuvent détecter et gérer les anciens formats de paquets.

### `id` (requis)

UUID v4 généré par le client. Identifie de manière unique le message dans l'ensemble du système.

### `encryptedPayload` (requis)

Le contenu du message, chiffré avec AES-GCM 256 bits en utilisant la clé partagée dérivée par ECDH.

**Encodage** : `texte en clair → octets UTF-8 → chiffrement AES-GCM → chaîne base64`

Le serveur stocke ceci comme un blob opaque. Il ne peut pas déchiffrer ce champ.

### `iv` (requis)

Vecteur d'initialisation de 12 octets, généré aléatoirement pour chaque message.

**Pourquoi 12 octets ?** AES-GCM recommande des IV de 96 bits (12 octets) pour des performances et une sécurité optimales. Chaque message reçoit un IV aléatoire frais — ne jamais réutiliser les IV avec la même clé.

**Encodage** : `crypto.getRandomValues(12 bytes) → chaîne base64`

### `nonce` (requis)

Valeur cryptographiquement aléatoire de 16 octets utilisée pour la protection anti-rejeu.

**Vérification côté serveur** : `Redis SET NX nonce 1 EX 86400` — si le SET échoue (la clé existe), le message est rejeté comme étant un rejeu.

**Encodage** : `crypto.getRandomValues(16 bytes) → chaîne base64`

### `timestamp` (requis)

Horodatage ISO 8601 indiquant quand le message a été créé sur le client. Le serveur peut également enregistrer son propre horodatage de réception.

### `expiresAt` (optionnel)

Horodatage ISO 8601 après lequel le message doit être automatiquement supprimé. Utilisé pour les messages autodestructeurs. Les index TTL de MongoDB gèrent le nettoyage automatique.

### `burnAfterReading` (optionnel)

Si `true`, le message doit être supprimé de l'interface après que le destinataire l'a lu.

### `attachmentId` (optionnel)

Référence à une pièce jointe chiffrée téléversée séparément. Les pièces jointes sont chiffrées côté client avec la même clé partagée avant le téléversement.

---

## Validation (schéma Zod)

```typescript
const MessageEnvelopeSchema = z.object({
  version: z.number().int().positive(),
  id: z.string().uuid(),
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  encryptedPayload: z.string().min(1),
  iv: z.string().min(1),
  nonce: z.string().min(1),
  timestamp: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  burnAfterReading: z.boolean().optional(),
  deliveredAt: z.string().datetime().optional(),
  readAt: z.string().datetime().optional(),
  attachmentId: z.string().optional(),
});
```

Tous les messages entrants sont validés par rapport à ce schéma avant traitement. Les paquets invalides sont immédiatement rejetés.

---

## Principes de conception compacte

1. **Surcharge minimale** : Seuls les champs essentiels sont requis
2. **Encodage base64** : Les données binaires sont encodées en base64 pour la compatibilité avec le transport JSON
3. **Aucun champ en clair** : Le serveur ne voit jamais de contenu non chiffré
4. **Validation de schéma** : Chaque paquet est validé à la réception
5. **Protection anti-rejeu** : Le nonce garantit l'unicité de chaque paquet
6. **Compatibilité ascendante** : Le champ de version permet l'évolution future du protocole
