# Modèle de sécurité

> PM-Chat implémente une sécurité en profondeur. Le serveur est conçu comme un relais à connaissance nulle — il n'a jamais accès aux messages en clair ni aux clés privées.

---

## Modèle de menaces

| Menace                           | Atténuation                                                       |
|----------------------------------|-------------------------------------------------------------------|
| Compromission du serveur          | E2EE — le serveur ne stocke que du texte chiffré qu'il ne peut pas déchiffrer |
| Attaque de l'homme du milieu     | Échange de clés ECDH + transport HTTPS/WSS                        |
| Attaques par rejeu               | Nonce par message, stocké dans Redis avec SET NX                   |
| Force brute sur l'auth           | Limitation de débit sur les endpoints d'auth + délais progressifs  |
| XSS                              | En-têtes CSP, DOMPurify, Helmet, assainissement des entrées        |
| Injection                        | Validation de schéma Zod, suppression des octets NUL, requêtes paramétrées |
| Détournement de session          | Jetons d'accès JWT à courte durée de vie, rotation du rafraîchissement |
| Bourrage d'identifiants          | Pas de mots de passe — inscription anonyme                         |
| Exfiltration de données          | Aucune donnée personnelle stockée, pas de messages en clair sur le serveur |
| DDoS                             | Limitation de débit globale + par utilisateur, régulation des événements socket |
| Accès non autorisé à l'API       | Authentification JWT sur toutes les routes protégées               |

---

## Architecture de chiffrement

### Échange de clés (ECDH P-256)

```
     Alice                                   Bob
       │                                      │
       │  1. Générer paire de clés ECDH P-256 │  1. Générer paire de clés ECDH P-256
       │     (privateA, publicA)              │     (privateB, publicB)
       │                                      │
       │  2. publicA ──────────────────────►  │  2. Stocker publicA
       │                                      │
       │  3. Stocker publicB ◄──────────────── │  3. publicB
       │                                      │
       │  4. SharedSecret =                   │  4. SharedSecret =
       │     ECDH(privateA, publicB)          │     ECDH(privateB, publicA)
       │                                      │
       │  Les deux dérivent une clé AES-GCM 256 bits identique
       └──────────────────────────────────────┘
```

### Chiffrement des messages (AES-GCM 256)

```
Message en clair
        │
        ▼
┌───────────────────┐
│ Générer un IV      │
│ aléatoire 12 octets│
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Chiffrement        │◄── Clé partagée (dérivée via ECDH)
│ AES-GCM (clé 256) │
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
  Envoyé au serveur
  (le serveur ne voit que des blobs base64 opaques)
```

### Flux de déchiffrement

```
Réception du MessageEnvelope depuis le serveur
        │
        ▼
┌───────────────────┐
│ Dériver la clé     │◄── Notre clé privée + clé publique de l'expéditeur
│ partagée (ECDH)   │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ Déchiffrement      │◄── IV de l'enveloppe
│ AES-GCM           │
└───────┬───────────┘
        │
        ▼
   Message en clair
   (affiché à l'utilisateur)
```

---

## Gestion des clés

| Propriété                | Implémentation                                    |
|--------------------------|---------------------------------------------------|
| Génération de clés       | ECDH P-256 via Web Crypto API                     |
| Stockage des clés        | Clé privée dans `sessionStorage` uniquement        |
| Durée de vie des clés    | Limitée à la session (perdue à la fermeture de l'onglet) |
| Extraction des clés      | Les clés dérivées sont **non-extractables**        |
| Format de clé publique   | JWK (JSON Web Key)                                 |
| Accès serveur aux clés   | Clés publiques uniquement — les clés privées ne quittent jamais l'appareil |

### Pourquoi sessionStorage ?

- **Pas** `localStorage` — empêche la persistance des clés entre les onglets/sessions
- Les clés sont automatiquement effacées lorsque l'onglet du navigateur se ferme
- Empêche le vol de clés via XSS depuis le stockage persistant
- Compromis : les utilisateurs doivent se réinscrire en ouvrant un nouvel onglet

---

## Protection anti-rejeu

Chaque message inclut un `nonce` cryptographiquement aléatoire (16 octets, encodé en base64).

```
Le client envoie un message avec un nonce
        │
        ▼
Serveur : Redis SET NX (nonce, 1, TTL=24h)
        │
        ├── Succès (nouveau nonce) → Traiter le message
        └── Échec (doublon) → Rejeter comme rejeu
```

- Les nonces sont stockés dans Redis avec un TTL de 24 heures
- `SET NX` assure une vérification atomique (pas de conditions de course)
- Après l'expiration du TTL, les anciens nonces sont automatiquement nettoyés

---

## Authentification

### Architecture des jetons JWT

```
Inscription/Connexion
        │
        ▼
┌───────────────────┐
│  Jeton d'accès     │  Courte durée de vie (15 min par défaut)
│ (en mémoire seul.) │  Utilisé pour les requêtes API
└───────────────────┘
        +
┌───────────────────┐
│  Jeton de rafraîch.│  Durée de vie plus longue (7 jours par défaut)
│  (sessionStorage)  │  Utilisé pour obtenir de nouveaux jetons d'accès
└───────────────────┘
```

- Les jetons d'accès ne sont **jamais persistés** dans le stockage
- Les jetons de rafraîchissement utilisent la rotation — les anciens jetons sont invalidés lors du rafraîchissement
- La révocation des jetons est suivie dans Redis pour une invalidation immédiate

### Identité anonyme

- Pas d'e-mail, pas de téléphone, pas de mot de passe
- Les utilisateurs s'inscrivent avec seulement un `nickname` + une `publicKey` ECDH
- Un `deviceFingerprint` fournit une liaison faible à l'appareil
- L'identité est éphémère par conception

---

## Gardes de sécurité côté serveur

### Défense en couches

```
Requête entrante
        │
        ▼
┌────────────────────┐
│  Garde réseau       │  Blocage auto des IP après violations répétées
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Helmet             │  En-têtes de sécurité (CSP, HSTS, X-Frame, etc.)
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Limiteur de débit  │  Global : 100 req/15min, Auth : 10 req/15min
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Garde d'entrée     │  Suppression octets NUL, validation schéma Zod
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Garde d'intégrité  │  Validation Content-Type, rejet des malformés
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Garde de session   │  Détection du taux de requêtes par utilisateur
└────────┬───────────┘
        │
        ▼
┌────────────────────┐
│  Auth JWT           │  Vérification du jeton, extraction de l'utilisateur
└────────┬───────────┘
        │
        ▼
  Gestionnaire de route
```

### Sécurité Socket.IO

| Garde                    | Objectif                                           |
|--------------------------|-----------------------------------------------------|
| Auth Socket JWT          | Valide le JWT lors du handshake de connexion         |
| Limiteur de débit Socket | Limite les événements par utilisateur par fenêtre de temps |
| Validation d'événements  | Valide les payloads des événements via les schémas Zod |

---

## Moniteur de sécurité

Le serveur inclut un moniteur de sécurité automatisé qui :

1. **Suit les violations** par adresse IP
2. **Bloque automatiquement** les IP dépassant les seuils de violations
3. **Journalise les événements de sécurité** avec des niveaux de gravité
4. **Rapporte les métriques** via les endpoints de santé (mode dev uniquement)

---

## Propriétés de connaissance nulle

| Propriété                                       | Statut |
|-------------------------------------------------|--------|
| Le serveur ne peut pas lire les messages         | ✅      |
| Le serveur ne peut pas lire les clés privées     | ✅      |
| Le serveur ne peut pas falsifier les messages    | ✅      |
| Le serveur ne peut pas identifier le contenu des conversations | ✅ |
| Le serveur peut voir les métadonnées (qui parle à qui) | ⚠️ |
| Le serveur peut voir l'horodatage des messages   | ⚠️      |
| Le serveur peut voir la taille des messages      | ⚠️      |

### Considérations sur les métadonnées

Bien que le *contenu* des messages soit entièrement chiffré, le serveur peut observer :
- Les participants aux conversations
- Les horodatages des messages
- La fréquence des messages
- La taille approximative des messages

Ce sont des compromis inhérents à une architecture à relais serveur. Des améliorations futures comme le routage en oignon ou le rembourrage à taux constant pourraient atténuer ces problèmes.

---

## Recommandations pour la production

1. **Toujours utiliser HTTPS/WSS** en production
2. **Définir des secrets JWT robustes** (≥ 32 octets aléatoires)
3. **Activer l'authentification MongoDB** avec des identifiants forts
4. **Activer Redis AUTH** avec un mot de passe fort
5. **Vérifier les origines CORS** — restreindre à votre domaine uniquement
6. **Activer la limitation de débit** au niveau du proxy inverse (ex. : Nginx, Cloudflare)
7. **Surveiller les journaux de sécurité** pour détecter les schémas anormaux
8. **Effectuer la rotation des secrets JWT** périodiquement
9. **Maintenir les dépendances à jour** pour les correctifs de sécurité
10. **Utiliser des pare-feu réseau** pour restreindre l'accès aux bases de données au serveur uniquement
