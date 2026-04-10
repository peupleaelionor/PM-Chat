# Vue d'ensemble de l'architecture

> PM-Chat est une plateforme de messagerie chiffrée de bout en bout axée sur la confidentialité. Le serveur ne voit jamais les messages en clair.

---

## Architecture du système

```
┌─────────────────────────────────────────────────────────────────┐
│                      Système PM-Chat                            │
│                                                                 │
│  ┌─────────────┐       ┌─────────────┐       ┌──────────────┐  │
│  │ Client Web   │◄─────►│   Serveur   │◄─────►│ Base de      │  │
│  │  (Next.js)   │  WS   │  (Express)  │       │ données      │  │
│  │              │  HTTP  │             │       │ (MongoDB)    │  │
│  └──────┬───────┘       └──────┬──────┘       └──────────────┘  │
│         │                      │                                │
│         │                      │              ┌──────────────┐  │
│         │               ┌──────┴──────┐       │    Redis      │  │
│         │               │  Socket.IO   │◄─────►│  (Sessions)  │  │
│         │               │ (Temps réel) │       │  (Nonces)    │  │
│         └───────────────┴─────────────┘       └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Organisation des composants

```
pm-chat/
├── apps/
│   ├── server/              ← Backend Express + Socket.IO
│   │   ├── src/
│   │   │   ├── config.ts         ← Configuration d'environnement et d'exécution
│   │   │   ├── db.ts             ← Connexion MongoDB
│   │   │   ├── redis.ts          ← Connexion Redis
│   │   │   ├── index.ts          ← Démarrage du serveur + arrêt gracieux
│   │   │   ├── models/           ← Schémas Mongoose (User, Message, Conversation)
│   │   │   ├── routes/           ← Points de terminaison API REST
│   │   │   ├── socket/           ← Gestionnaires d'événements Socket.IO + gardes
│   │   │   ├── middleware/       ← Auth, limitation de débit, gardes de sécurité
│   │   │   └── utils/            ← JWT, journalisation, moniteur de sécurité
│   │   └── Dockerfile
│   │
│   └── web/                 ← Frontend Next.js 15
│       ├── src/
│       │   ├── app/              ← Pages et mises en page Next.js
│       │   ├── components/       ← Composants UI (auth, chat, mise en page, ui)
│       │   ├── hooks/            ← Hooks React (crypto, socket, messages, présence)
│       │   ├── lib/
│       │   │   ├── crypto/       ← Couche de chiffrement E2EE (ECDH + AES-GCM)
│       │   │   ├── store/        ← Magasins d'état Zustand
│       │   │   ├── api.ts        ← Client API REST
│       │   │   ├── socket.ts     ← Client Socket.IO
│       │   │   └── utils.ts      ← Fonctions utilitaires
│       │   ├── workers/          ← Web workers pour le chiffrement
│       │   └── __tests__/        ← Tests Jest
│       └── Dockerfile
│
├── packages/
│   └── shared/              ← Types et validateurs partagés
│       └── src/
│           ├── types/            ← Interfaces TypeScript
│           └── validators/       ← Schémas de validation Zod
│
├── docs/                    ← Documentation du projet
├── docker-compose.yml       ← Configuration Docker complète
└── package.json             ← Racine du monorepo (npm workspaces)
```

## Responsabilités des modules

### Module Crypto (`apps/web/src/lib/crypto/`)

Le module crypto est **isolé de tout code UI et réseau**. Il fournit des fonctions pures pour :

| Fichier              | Responsabilité                                           |
|----------------------|----------------------------------------------------------|
| `keyGeneration.ts`   | Générer des paires de clés ECDH P-256, importer/exporter JWK |
| `keyExchange.ts`     | Dériver des clés partagées AES-GCM 256 via ECDH              |
| `encrypt.ts`         | Chiffrement AES-GCM 256 bits avec IV aléatoire               |
| `decrypt.ts`         | Déchiffrement AES-GCM 256 bits                               |
| `keyStorage.ts`      | Persistance des clés privées limitée à la session             |
| `messagePackaging.ts`| Création d'enveloppes de messages, génération de nonces       |

### Module Serveur (`apps/server/src/`)

| Module          | Responsabilité                                                  |
|-----------------|-----------------------------------------------------------------|
| `models/`       | Modèles de données MongoDB pour les utilisateurs, messages, conversations |
| `routes/`       | Points de terminaison API REST (auth, conversations, messages, pièces jointes, santé) |
| `socket/`       | Gestion d'événements en temps réel (messages, présence, saisie, échange de clés) |
| `middleware/`   | Couches de sécurité (auth, limitation de débit, gardes d'entrée)  |
| `utils/`        | Préoccupations transversales (JWT, journalisation, surveillance de sécurité) |

### Module Partagé (`packages/shared/`)

| Module          | Responsabilité                                              |
|-----------------|-------------------------------------------------------------|
| `types/`        | Interfaces TypeScript partagées entre le client et le serveur |
| `validators/`   | Schémas Zod pour la validation à l'exécution                  |

## Flux de données

### Séquence de démarrage

```
Démarrage du serveur
    │
    ├─► Connexion à MongoDB
    ├─► Connexion à Redis
    ├─► Initialisation des middlewares Express
    │     ├─ Helmet (en-têtes de sécurité)
    │     ├─ CORS
    │     ├─ Limitation de débit
    │     ├─ Gardes d'entrée
    │     └─ Auth JWT
    ├─► Enregistrement des routes REST
    ├─► Initialisation de Socket.IO
    │     ├─ Garde d'auth JWT pour les sockets
    │     ├─ Limiteur de débit pour les sockets
    │     └─ Gestionnaires d'événements
    └─► Écoute sur le PORT (par défaut 4000)
```

### Démarrage du client

```
Chargement de l'application Next.js
    │
    ├─► Vérifier l'auth persistante (localStorage)
    │     ├─ Si trouvée → Restaurer la session, charger la clé privée depuis sessionStorage
    │     └─ Sinon → Afficher l'écran de connexion
    │
    ├─► À la connexion/inscription
    │     ├─ Générer une paire de clés ECDH P-256
    │     ├─ Stocker la clé privée dans sessionStorage
    │     ├─ Envoyer la clé publique au serveur
    │     └─ Stocker les jetons d'auth
    │
    ├─► Initialiser la connexion Socket.IO (auth JWT)
    │     ├─ Enregistrer les gestionnaires de messages
    │     ├─ Enregistrer les gestionnaires de présence
    │     └─ Enregistrer les gestionnaires de saisie
    │
    └─► Charger la liste des conversations
```

## Pile technologique

| Couche          | Technologie                               |
|-----------------|-------------------------------------------|
| Frontend        | Next.js 15, React 18, Tailwind CSS        |
| État            | Zustand (client), TanStack Query (serveur) |
| Backend         | Node.js, Express, Socket.IO               |
| Base de données | MongoDB (Mongoose)                         |
| Cache/Sessions  | Redis (ioredis)                            |
| Crypto          | Web Crypto API (ECDH P-256, AES-GCM 256)  |
| Auth            | JWT (jetons d'accès + de rafraîchissement) |
| Validation      | Zod                                        |
| Types partagés  | Paquet TypeScript `@pm-chat/shared`        |
