# 🔒 PM-Chat — Messagerie Chiffrée à Connaissance Nulle

> **Privé. Anonyme. Chiffré de bout en bout. Le serveur ne voit jamais vos messages.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://typescriptlang.org)

---

## Qu'est-ce que PM-Chat ?

PM-Chat est une plateforme de messagerie open-source, anonyme et chiffrée de bout en bout. Les utilisateurs s'inscrivent avec un simple pseudonyme — **pas d'e-mail, pas de numéro de téléphone, pas de mot de passe**. Tous les messages sont chiffrés dans le navigateur via l'échange de clés ECDH et le chiffrement AES-GCM 256 bits avant de quitter votre appareil. Le serveur ne stocke que du texte chiffré qu'il ne peut pas lire.

### Fonctionnalités clés

| Fonctionnalité | Description |
|---------|-------------|
| 🔐 **Chiffrement de bout en bout** | Échange de clés ECDH P-256 + AES-GCM 256 bits — messages chiffrés/déchiffrés entièrement dans le navigateur |
| 👻 **Serveur Zero-Knowledge** | Le serveur ne stocke que du texte chiffré opaque — ne peut déchiffrer aucun message |
| 🎭 **Anonyme** | Aucune donnée personnelle requise — inscription avec un pseudonyme uniquement |
| 💨 **Éphémère** | Messages à lecture unique et conversations autodestructibles |
| ⚡ **Temps réel** | Présence, indicateurs de saisie et accusés de réception propulsés par Socket.IO |
| 🛡️ **Défense en profondeur** | Limitation de débit, gardes de sécurité, blocage automatique, assainissement des entrées |
| 🔄 **Protection anti-rejeu** | Nonces par message validés via Redis SET NX |
| 📎 **Pièces jointes chiffrées** | Fichiers chiffrés côté client avant transmission |

---

## Architecture

```
pm-chat/
├── apps/
│   ├── server/            ← Express + Socket.IO + MongoDB + Redis
│   └── web/               ← Next.js 15 + Tailwind CSS + Web Crypto API
├── packages/
│   └── shared/            ← TypeScript types + Zod validators
└── docs/                  ← Architecture, sécurité, documentation du protocole
```

### Comment fonctionne le chiffrement

```
  Alice                          Server                         Bob
    │                              │                              │
    │ 1. Generate ECDH key pair    │   1. Generate ECDH key pair  │
    │ 2. Send public key ─────────►│◄────────── Send public key  2.│
    │                              │                              │
    │ 3. Fetch Bob's public key    │                              │
    │◄─────────────────────────────│                              │
    │                              │                              │
    │ 4. Derive shared AES key     │                              │
    │    ECDH(privA, pubB)         │                              │
    │                              │                              │
    │ 5. Encrypt message           │                              │
    │    AES-GCM-256(key, msg)     │                              │
    │                              │                              │
    │ 6. Send ciphertext ─────────►│ 7. Store ciphertext          │
    │                              │    (cannot decrypt)          │
    │                              │────────────► 8. Receive      │
    │                              │                              │
    │                              │   9. Derive shared AES key   │
    │                              │      ECDH(privB, pubA)       │
    │                              │                              │
    │                              │  10. Decrypt message          │
    │                              │      AES-GCM-256(key, ct)    │
    └──────────────────────────────┴──────────────────────────────┘
```

### Stack technique

| Couche     | Technologie |
|------------|------------|
| Frontend   | Next.js 15, React 18, Tailwind CSS, Zustand, TanStack Query |
| Backend    | Node.js, Express, Socket.IO, MongoDB (Mongoose), Redis (ioredis) |
| Crypto     | Web Crypto API — ECDH P-256 + AES-GCM 256 |
| Auth       | JWT (tokens d'accès + de rafraîchissement), inscription anonyme |
| Validation | Schémas Zod (partagés entre client et serveur) |
| Sécurité   | Helmet, limitation de débit, gardes de sécurité, défense automatique, CSP |

---

## Démarrage rapide

### Prérequis

- Node.js ≥ 18, npm ≥ 9
- MongoDB 7, Redis 7 (ou utiliser Docker)

### Développement

```bash
git clone https://github.com/peupleaelionor/PM-Chat.git
cd PM-Chat
npm install

# Copier les fichiers d'environnement
cp .env.example .env
cp apps/server/.env.example apps/server/.env

# Démarrer les bases de données (Docker)
docker compose up mongodb redis -d

# Démarrer les serveurs de développement (server:4000 + web:3000)
npm run dev
```

> **Mode dev-safe** : En développement, le serveur génère automatiquement des secrets temporaires et utilise les paramètres localhost par défaut. Aucune configuration requise.

### Docker (Full Stack)

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)
docker compose up --build
```

| Service  | URL                     |
|----------|-------------------------|
| Web      | http://localhost:3000    |
| API      | http://localhost:4000    |
| MongoDB  | localhost:27017          |
| Redis    | localhost:6379           |

---

## Modèle de sécurité

### Propriétés Zero-Knowledge

| Propriété | Statut |
|----------|--------|
| Le serveur ne peut pas lire les messages | ✅ |
| Le serveur ne peut pas accéder aux clés privées | ✅ |
| Le serveur ne peut pas falsifier les messages | ✅ |
| Attaques par rejeu empêchées | ✅ |
| IV aléatoires par message | ✅ |
| Clés dérivées non extractibles | ✅ |
| Stockage des clés limité à la session | ✅ |

### Couches de défense côté serveur

```
Request → Network Guard → Helmet → Rate Limiter → Input Guard →
          Integrity Guard → Session Guard → JWT Auth → Route Handler
```

| Garde | Fonction |
|-------|---------|
| Network Guard | Bloque automatiquement les IP après des violations répétées |
| Rate Limiter | Global : 100 req/15min, Auth : 10 req/15min |
| Input Guard | Suppression des octets NUL, validation de schéma Zod |
| Integrity Guard | Validation du Content-Type, rejet des requêtes malformées |
| Session Guard | Détection du taux de requêtes par utilisateur |
| Socket Rate Limiter | Limitation des événements Socket.IO par utilisateur |

📖 Détails complets : [Modèle de sécurité](docs/security-model.md)

---

## Référence API

### Points d'accès REST

| Méthode  | Chemin                         | Auth | Description |
|----------|--------------------------------|------|-------------|
| `POST`   | `/api/auth/register`           | Non  | Inscription avec pseudonyme + clé publique |
| `POST`   | `/api/auth/login`              | Non  | Connexion |
| `POST`   | `/api/auth/refresh`            | Non  | Rafraîchir le token d'accès |
| `POST`   | `/api/auth/logout`             | Oui  | Déconnexion et révocation des tokens |
| `GET`    | `/api/auth/me`                 | Oui  | Obtenir le profil de l'utilisateur actuel |
| `GET`    | `/api/conversations`           | Oui  | Lister les conversations |
| `POST`   | `/api/conversations`           | Oui  | Créer une conversation |
| `GET`    | `/api/conversations/:id`       | Oui  | Obtenir les détails d'une conversation |
| `DELETE` | `/api/conversations/:id`       | Oui  | Supprimer une conversation |
| `GET`    | `/api/messages/:conversationId`| Oui  | Récupérer les messages (paginés) |
| `POST`   | `/api/attachments`             | Oui  | Téléverser une pièce jointe chiffrée |
| `GET`    | `/api/attachments/:filename`   | Oui  | Télécharger une pièce jointe chiffrée |
| `GET`    | `/health`                      | Non  | Vérification de l'état de santé |

### Événements Socket.IO

**Client → Serveur** : `message:send`, `typing:start`, `typing:stop`, `conversation:join`, `conversation:leave`, `message:delivered`, `message:read`, `key:exchange`

**Serveur → Client** : `message:new`, `typing:indicator`, `user:presence`, `message:status`, `key:received`, `error`

---

## Documentation

| Document | Description |
|----------|-------------|
| [Vue d'ensemble de l'architecture](docs/architecture.md) | Conception du système, organisation des modules, flux de données |
| [Modèle de sécurité](docs/security-model.md) | Modèle de menaces, détails du chiffrement, couches de défense |
| [Cycle de vie des messages](docs/message-lifecycle.md) | Flux de bout en bout d'un message, de l'envoi à la réception |
| [Format des paquets](docs/packet-format.md) | Protocole réseau et schéma MessageEnvelope |
| [Flux d'appairage](docs/pairing-flow.md) | Comment les utilisateurs établissent des canaux chiffrés |
| [Guide de déploiement](docs/deployment.md) | Configuration dev, Docker et production |
| [Exemples](docs/examples.md) | Exemples de code pour les opérations courantes |

---

## Structure du projet

```
apps/server/src/
├── config.ts             ← Configuration de l'environnement
├── db.ts                 ← Connexion MongoDB
├── redis.ts              ← Connexion Redis
├── index.ts              ← Démarrage du serveur + arrêt
├── models/               ← Schémas User, Message, Conversation
├── routes/               ← API REST (auth, conversations, messages, attachments, health)
├── socket/               ← Gestionnaires temps réel (messages, présence, saisie)
├── middleware/            ← Auth, limitation de débit, gardes de sécurité
└── utils/                ← JWT, journalisation, moniteur de sécurité

apps/web/src/
├── app/                  ← Pages et layouts Next.js
├── components/           ← Composants React (auth, chat, layout, ui)
├── hooks/                ← Hooks personnalisés (crypto, socket, messages, présence)
├── lib/
│   ├── crypto/           ← Couche E2EE (ECDH + AES-GCM) — isolée de l'UI
│   ├── store/            ← Gestion d'état Zustand
│   ├── api.ts            ← Client REST
│   └── socket.ts         ← Client Socket.IO
├── workers/              ← Web workers
└── __tests__/            ← Tests crypto Jest

packages/shared/src/
├── types/                ← Interfaces TypeScript partagées
└── validators/           ← Schémas de validation Zod
```

---

## Build & Tests

```bash
# Tout compiler (shared → server → web)
npm run build

# Lancer les tests
npm run test

# Lint
npm run lint

# Vérification des types
npm run type-check --workspace=apps/web
```

---

## Feuille de route

### ✅ Terminé

- Chiffrement de bout en bout (ECDH P-256 + AES-GCM 256)
- Inscription anonyme et authentification JWT
- Messagerie en temps réel avec Socket.IO
- Messages à lecture unique et conversations autodestructibles
- Accusés de réception et de lecture
- Pièces jointes chiffrées
- Gardes de sécurité et défense automatique
- Limitation de débit (REST + Socket.IO)
- Docker Compose avec vérifications de santé
- Tests unitaires crypto (15 réussis)
- Pipeline CI (lint, build, test)

### 🔜 Planifié

- [ ] Confidentialité persistante par message (protocole Double Ratchet)
- [ ] Synchronisation des clés multi-appareils
- [ ] Conversations de groupe
- [ ] Notifications push
- [ ] Vérification d'empreintes de clés (anti-MITM)
- [ ] Tests d'intégration de bout en bout
- [ ] Application mobile (React Native)
- [ ] Routage en oignon pour la protection des métadonnées

---

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md) pour les directives.

## Sécurité

Voir [SECURITY.md](SECURITY.md) pour notre politique de sécurité et le processus de divulgation responsable.

## Licence

Ce projet est sous licence MIT — voir [LICENSE](LICENSE) pour les détails.
