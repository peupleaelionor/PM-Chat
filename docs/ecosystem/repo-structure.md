# Structure du dépôt PM-Chat

> Organisation des fichiers et des dossiers du monorepo PM-Chat.

---

## Vue d'ensemble

Le dépôt PM-Chat est un monorepo qui contient l'ensemble de l'écosystème : le firmware matériel (Device), la documentation opérationnelle (Setup) et la plateforme numérique (Online). Chaque composant est isolé dans son propre espace, avec des interfaces claires entre les couches.

---

## Arborescence complète

```
pm-chat/
│
├── apps/                          # Applications web (PM-Chat Online)
│   ├── server/                    # Backend Express + Socket.IO
│   │   ├── src/
│   │   │   ├── config.ts              # Configuration d'environnement
│   │   │   ├── db.ts                  # Connexion MongoDB
│   │   │   ├── redis.ts               # Connexion Redis
│   │   │   ├── index.ts               # Démarrage serveur + arrêt gracieux
│   │   │   ├── models/                # Schémas Mongoose (User, Message, Conversation)
│   │   │   ├── routes/                # Points de terminaison REST
│   │   │   ├── socket/                # Gestionnaires Socket.IO + gardes
│   │   │   ├── middleware/            # Auth, limitation de débit, gardes de sécurité
│   │   │   └── utils/                 # JWT, journalisation, moniteur de sécurité
│   │   └── Dockerfile
│   │
│   └── web/                       # Frontend Next.js 15
│       ├── src/
│       │   ├── app/                   # Pages et layouts Next.js
│       │   ├── components/            # Composants React (auth, chat, layout, ui)
│       │   ├── hooks/                 # Hooks personnalisés (crypto, socket, messages)
│       │   ├── lib/
│       │   │   ├── crypto/            # Couche E2EE (ECDH P-256 + AES-GCM 256)
│       │   │   ├── store/             # Magasins d'état Zustand
│       │   │   ├── api.ts             # Client API REST
│       │   │   ├── socket.ts          # Client Socket.IO
│       │   │   └── utils.ts           # Fonctions utilitaires
│       │   ├── workers/               # Web workers (chiffrement en arrière-plan)
│       │   └── __tests__/             # Tests Jest
│       └── Dockerfile
│
├── docs/                          # Documentation du projet
│   ├── ecosystem/                 # Documentation produit (ce dossier)
│   │   ├── product-map.md            # Carte des 3 couches PM-Chat
│   │   ├── service-hierarchy.md      # Hiérarchie des services et responsabilités
│   │   ├── repo-structure.md         # Structure du dépôt (ce fichier)
│   │   └── pre-hardware-checklist.md # Checklist pré-arrivée matériel
│   │
│   ├── setup/                     # Guides de déploiement (PM-Chat Setup)
│   │   ├── quick-start.md            # Démarrage rapide
│   │   ├── first-boot.md             # Guide du premier démarrage
│   │   ├── pairing.md                # Guide d'appairage
│   │   ├── flashing.md               # Guide de flashage
│   │   ├── update.md                 # Guide de mise à jour
│   │   ├── reset.md                  # Guide de réinitialisation
│   │   ├── relay-validation.md       # Validation de relais
│   │   ├── troubleshooting.md        # Matrice de dépannage
│   │   └── deployment-checklist.md   # Checklist de déploiement terrain
│   │
│   ├── firmware/                  # Documentation architecture firmware
│   ├── online/                    # Structure plateforme en ligne & copywriting
│   │
│   ├── architecture.md            # Vue d'ensemble de l'architecture système
│   ├── security-model.md          # Modèle de menaces et couches de défense
│   ├── message-lifecycle.md       # Cycle de vie d'un message de bout en bout
│   ├── packet-format.md           # Format binaire des paquets LoRa
│   ├── pairing-flow.md            # Flux d'appairage entre appareils
│   ├── deployment.md              # Guide de déploiement (dev, Docker, production)
│   └── examples.md                # Exemples de code
│
├── firmware/                      # Firmware C++ (PM-Chat Device)
│   ├── include/                   # En-têtes (.h)
│   │   ├── config.h                   # Constantes, types, énumérations
│   │   ├── pins.h                     # Définitions des broches matérielles
│   │   ├── packet.h                   # Format binaire des paquets
│   │   ├── crypto_engine.h            # Interface AES-256-GCM
│   │   ├── device_identity.h          # Gestion de l'identifiant appareil
│   │   ├── radio.h                    # Abstraction radio LoRa
│   │   ├── mesh.h                     # Moteur de routage mesh
│   │   ├── message_store.h            # Stockage et files de messages
│   │   ├── storage.h                  # Persistance EEPROM
│   │   ├── button.h                   # Gestionnaire de 3 boutons
│   │   ├── battery.h                  # Moniteur de batterie
│   │   ├── ui.h                       # Affichage OLED et écrans
│   │   └── state_machine.h            # Machine à états du système
│   │
│   ├── src/                       # Sources (.cpp)
│   │   ├── main.cpp                   # Point d'entrée et boucle principale
│   │   ├── packet.cpp                 # Encodage/décodage des paquets
│   │   ├── crypto_engine.cpp          # AES-GCM + RNG matériel
│   │   ├── device_identity.cpp        # Provisionnement de l'identité
│   │   ├── radio.cpp                  # Pilote RadioLib STM32WLx
│   │   ├── mesh.cpp                   # TTL, dédup, logique de relais
│   │   ├── message_store.cpp          # Gestion des messages en RAM
│   │   ├── storage.cpp                # Lecture/écriture EEPROM
│   │   ├── button.cpp                 # Anti-rebond et détection d'événements
│   │   ├── battery.cpp                # Lecture de tension ADC
│   │   ├── ui.cpp                     # Rendu OLED U8g2
│   │   └── state_machine.cpp          # Transitions et logique FSM
│   │
│   ├── test/                      # Tests unitaires
│   │   └── test_main.cpp             # Harnais de test Unity
│   │
│   ├── platformio.ini             # Configuration PlatformIO
│   ├── WIRING.md                  # Schéma de câblage complet
│   ├── BOITIER.md                 # Spécifications du boîtier
│   └── README.md                  # Documentation firmware
│
├── packages/                      # Paquets partagés
│   └── shared/                    # Types TypeScript et validateurs Zod
│       └── src/
│           ├── types/                 # Interfaces TypeScript partagées
│           └── validators/            # Schémas de validation Zod
│
├── .github/                       # Configuration GitHub (CI/CD, templates)
├── docker-compose.yml             # Orchestration Docker (web, server, MongoDB, Redis)
├── package.json                   # Racine monorepo (npm workspaces)
├── package-lock.json              # Verrouillage des dépendances
├── .env.example                   # Variables d'environnement modèle
├── README.md                      # Documentation principale du projet
├── CONTRIBUTING.md                # Guide de contribution
├── SECURITY.md                    # Politique de sécurité
└── LICENSE                        # Licence MIT
```

---

## Correspondance couches / dossiers

| Couche PM-Chat | Dossiers principaux | Description |
|----------------|---------------------|-------------|
| **Device** | `firmware/` | Firmware C++ complet, compilable via PlatformIO |
| **Setup** | `docs/setup/` | Guides opérationnels pour le déploiement terrain |
| **Online** | `apps/server/`, `apps/web/`, `packages/shared/` | Plateforme web complète (frontend + backend + partagé) |
| **Écosystème** | `docs/ecosystem/` | Documentation produit transversale |
| **Architecture** | `docs/` (fichiers racine) | Spécifications techniques (protocole, sécurité, flux) |

---

## Conventions de nommage

| Convention | Exemple | Règle |
|------------|---------|-------|
| Fichiers firmware | `crypto_engine.cpp` | snake_case, nom descriptif du module |
| En-têtes firmware | `crypto_engine.h` | Même nom que le fichier source correspondant |
| Documentation | `service-hierarchy.md` | kebab-case, en anglais ou français selon le contexte |
| Composants React | `ChatWindow.tsx` | PascalCase |
| Modules TypeScript | `keyGeneration.ts` | camelCase |
| Validateurs | `messageSchema.ts` | camelCase avec suffixe descriptif |

---

## Principes d'organisation

1. **Isolation par couche.** Chaque couche possède son propre espace dans l'arborescence. Le firmware ne dépend d'aucun fichier dans `apps/` et vice versa.

2. **Documentation centralisée.** Toute la documentation vit dans `docs/`, organisée par domaine (écosystème, setup, firmware, online, architecture).

3. **Monorepo cohérent.** Le `package.json` racine gère les workspaces npm pour `apps/server`, `apps/web` et `packages/shared`. Le firmware est géré séparément par PlatformIO.

4. **Pas de code mort.** Chaque fichier dans le dépôt a un rôle actif. Les fichiers obsolètes sont supprimés, pas commentés.

5. **Interfaces claires.** Les en-têtes dans `firmware/include/` définissent les contrats entre modules. Les types dans `packages/shared/` définissent les contrats entre frontend et backend.
