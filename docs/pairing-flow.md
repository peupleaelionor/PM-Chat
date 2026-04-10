# Flux d'appairage

> Comment deux utilisateurs établissent un canal chiffré sécurisé en utilisant l'échange de clés ECDH.

---

## Vue d'ensemble

PM-Chat utilise un appairage anonyme — les utilisateurs se connectent en partageant leur identifiant d'invitation (qui est leur identifiant utilisateur). Aucun e-mail, numéro de téléphone ou mot de passe n'est requis.

```
┌──────────┐                    ┌──────────┐
│  Alice    │                    │   Bob    │
│ Appareil  │                    │ Appareil │
└────┬──────┘                    └────┬─────┘
     │                                │
     │  1. Inscription (pseudo + clé pub)│
     │────────────────►               │
     │                                │  1. Inscription (pseudo + clé pub)
     │               ◄────────────────│
     │                                │
     │  2. Partager l'ID d'invitation │
     │  (hors bande : QR, texte, etc.)│
     │◄──────────────────────────────►│
     │                                │
     │  3. Créer la conversation      │
     │────────────────►               │
     │                                │
     │  4. Récupérer la clé publique de Bob │
     │────────────────►               │
     │                                │
     │  5. Dériver la clé partagée (ECDH)   │
     │  6. Envoyer le 1er msg chiffré │
     │────────────────►               │
     │                                │
     │               7. Récupérer la clé publique d'Alice
     │               ◄────────────────│
     │                                │
     │               8. Dériver la clé partagée (ECDH)
     │               9. Déchiffrer le message
     │               ◄────────────────│
     │                                │
     │  ═══ Canal sécurisé établi ═══
     │                                │
```

---

## Étapes détaillées

### Étape 1 : Inscription

Chaque utilisateur s'inscrit indépendamment. À la première visite :

1. Le client génère une paire de clés ECDH P-256
2. Le client exporte la clé publique au format JWK (JSON Web Key)
3. Le client envoie `POST /api/auth/register` avec :
   ```json
   {
     "nickname": "alice_secure",
     "publicKey": "{\"kty\":\"EC\",\"crv\":\"P-256\",\"x\":\"...\",\"y\":\"...\"}",
     "deviceFingerprint": "browser-fingerprint-hash"
   }
   ```
4. Le serveur stocke la clé publique et retourne :
   ```json
   {
     "userId": "507f1f77bcf86cd799439011",
     "nickname": "alice_secure",
     "accessToken": "eyJhbGciOiJIUzI1NiIs...",
     "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
   }
   ```
5. Le client stocke la clé privée dans `sessionStorage` (jamais envoyée au serveur)

### Étape 2 : Partage de l'identifiant d'invitation

Les utilisateurs partagent leur `userId` (identifiant d'invitation) via n'importe quel canal externe :
- Copier/coller dans une autre application de messagerie
- Scan de code QR
- Affichage à l'écran

L'identifiant d'invitation est affiché dans les paramètres et la page d'accueil de l'application avec un bouton de copie.

### Étape 3 : Création de la conversation

Alice démarre une nouvelle conversation :

```
POST /api/conversations
{
  "participantIds": ["507f1f77bcf86cd799439012"],  // userId de Bob
  "selfDestruct": false
}
```

Le serveur crée la conversation et ajoute les deux utilisateurs comme participants.

### Étape 4 : Récupération de la clé publique du pair

Lorsqu'Alice ouvre la conversation, le client :

1. Récupère le profil utilisateur de Bob (incluant la clé publique JWK)
2. Importe le JWK en tant qu'objet `CryptoKey`
3. Met en cache la clé publique dans le magasin crypto Zustand

### Étape 5 : Dérivation de la clé partagée

En utilisant ECDH (Elliptic Curve Diffie-Hellman) :

```javascript
// Côté Alice
const sharedKey = await crypto.subtle.deriveKey(
  { name: 'ECDH', public: bobPublicKey },
  alicePrivateKey,
  { name: 'AES-GCM', length: 256 },
  false,  // non-extractable
  ['encrypt', 'decrypt']
);
```

La clé dérivée est mise en cache par conversation dans le magasin crypto.

### Étape 6 : Envoi du premier message

Alice chiffre et envoie le premier message en utilisant la clé partagée dérivée. Voir le [Cycle de vie d'un message](./message-lifecycle.md) pour plus de détails.

### Étapes 7-9 : Côté Bob

Lorsque Bob reçoit le message :
1. Bob récupère la clé publique d'Alice (si pas en cache)
2. Bob dérive la même clé partagée : `ECDH(bobPrivate, alicePublic)`
3. Bob déchiffre le message avec la clé partagée

Comme ECDH est symétrique, les deux parties dérivent le même secret partagé.

---

## Propriétés des clés

| Propriété                       | Détail                                      |
|---------------------------------|---------------------------------------------|
| Algorithme de paire de clés     | ECDH avec courbe P-256                      |
| Algorithme de clé partagée      | AES-GCM 256 bits                            |
| Échange de clés                 | Implicite (via les clés publiques récupérées)|
| Exigence hors bande             | Uniquement le partage de l'ID utilisateur    |
| Confidentialité persistante     | Pas encore (prévu : protocole ratchet)       |
| Multi-appareils                 | Pas encore (session unique par appareil)     |

---

## Considérations de sécurité

1. **Authenticité de la clé publique** : Repose actuellement sur le serveur pour livrer honnêtement les clés publiques. Un serveur compromis pourrait effectuer une attaque MITM en substituant les clés.
   - **Atténuation (future)** : Vérification de l'empreinte de clé — les utilisateurs comparent les empreintes de clés hors bande.

2. **Pas de confidentialité persistante** : Si une clé privée est compromise, tous les messages passés peuvent être déchiffrés.
   - **Atténuation (prévue)** : Protocole Double Ratchet (similaire à Signal).

3. **Clés liées à la session** : Les clés privées ne résident que dans `sessionStorage`. Fermer l'onglet détruit la clé.
   - C'est une fonctionnalité de sécurité, pas un bug — cela empêche la persistance des clés.

4. **Empreinte de l'appareil** : Utilisée comme liaison faible à l'appareil, pas comme authentification. Ne pas s'y fier pour la sécurité.
