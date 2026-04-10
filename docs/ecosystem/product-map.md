# Carte produit PM-Chat

> Vue d'ensemble des trois couches qui composent l'écosystème PM-Chat.

---

## Philosophie

PM-Chat est conçu autour d'un principe fondamental : **la communication privée ne doit dépendre d'aucune infrastructure externe**. Le dispositif matériel fonctionne de manière totalement autonome. Les couches numériques accompagnent, documentent et enrichissent l'expérience — sans jamais devenir une condition au fonctionnement hors ligne.

L'écosystème se structure en trois couches distinctes, chacune avec un périmètre précis.

---

## Les trois couches

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Écosystème PM-Chat                           │
│                                                                     │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────────────┐ │
│  │  PM-Chat       │   │  PM-Chat       │   │  PM-Chat              │ │
│  │  Device        │   │  Setup         │   │  Online               │ │
│  │                │   │                │   │                       │ │
│  │  Matériel      │   │  Déploiement   │   │  Plateforme           │ │
│  │  autonome      │   │  & config      │   │  numérique            │ │
│  └───────┬───────┘   └───────┬───────┘   └───────────┬───────────┘ │
│          │                   │                       │             │
│          │   ◄── guides ──►  │  ◄── présentation ──► │             │
│          │                   │                       │             │
└──────────┴───────────────────┴───────────────────────┴─────────────┘
```

---

## PM-Chat Device — Communication matérielle hors ligne

**Ce que c'est :** un appareil de messagerie chiffrée, entièrement autonome, communiquant via radio LoRa en maillage. Aucune connexion Internet, Wi-Fi, carte SIM ou infrastructure externe n'est nécessaire pour le transport des messages.

### Caractéristiques

| Composant | Détail |
|-----------|--------|
| **Radio** | LoRa RAK3172-E (STM32WLE5CC), bande EU868 |
| **Chiffrement** | AES-256-GCM, nonce aléatoire par message (12 octets), RNG matériel |
| **Réseau** | Mesh multi-sauts avec TTL, déduplication, relais avec délai aléatoire |
| **Interface** | Écran OLED 128×64 (SSD1306), navigation à 3 boutons |
| **Alimentation** | Batterie LiPo, surveillance de tension, alerte basse/critique |
| **Stockage** | EEPROM intégrée (256 octets), 32 messages en RAM |
| **Sécurité** | Effacement d'urgence (3 boutons), remise à zéro sécurisée des buffers |
| **Firmware** | C++ (PlatformIO/Arduino), architecture modulaire, tests Unity |

### Principes de conception

- **Zéro dépendance réseau** : aucun serveur, aucun cloud, aucune connexion de données.
- **Chiffrement par défaut** : chaque message est chiffré avant transmission radio.
- **Relais opaque** : les nœuds intermédiaires transmettent sans pouvoir déchiffrer.
- **Autonomie complète** : l'appareil fonctionne seul, indéfiniment, avec sa batterie.

### Emplacement dans le dépôt

```
firmware/
├── include/         # En-têtes (.h)
├── src/             # Sources (.cpp)
├── test/            # Tests unitaires (Unity)
├── platformio.ini   # Configuration de compilation
├── WIRING.md        # Schéma de câblage
└── BOITIER.md       # Spécifications du boîtier
```

---

## PM-Chat Setup — Déploiement et configuration

**Ce que c'est :** la couche documentaire et opérationnelle qui facilite la mise en service, la configuration et la maintenance des appareils PM-Chat.

### Périmètre

| Domaine | Contenu |
|---------|---------|
| **Démarrage** | Guide de premier démarrage, onboarding utilisateur |
| **Provisionnement** | Instructions de flashage, configuration initiale |
| **Appairage** | Guide de saisie du Mesh PIN, rejoindre un réseau existant |
| **Maintenance** | Mise à jour du firmware, réinitialisation usine |
| **Diagnostics** | Dépannage, matrice de résolution des problèmes |
| **Déploiement** | Checklist de mise en service, validation de relais |
| **Support** | FAQ, procédures de support |

### Principes

- **Réduction des frictions** : chaque guide est conçu pour minimiser les erreurs lors du déploiement.
- **Aucune dépendance de transport** : Setup documente le Device, mais n'ajoute aucune exigence réseau.
- **Pont entre les couches** : connecte l'univers matériel (Device) à l'univers numérique (Online) sans créer de couplage.

### Emplacement dans le dépôt

```
docs/setup/          # Guides de déploiement et configuration
```

---

## PM-Chat Online — Plateforme numérique compagnon

**Ce que c'est :** la vitrine et la plateforme en ligne de PM-Chat. Elle présente le produit, donne accès à la documentation, permet le contact et propose un service de messagerie chiffrée en ligne distinct.

### Composants

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Frontend** | Next.js 15, React 18, Tailwind CSS | Site public premium, présentation produit, documentation |
| **Backend** | Express, Socket.IO, MongoDB, Redis | API, messagerie en ligne E2EE, temps réel |
| **Partagé** | TypeScript, Zod | Types et validateurs communs |

### Fonctionnalités

- Présentation produit et positionnement technique
- Accès à la documentation et aux guides
- Formulaire de contact et programme pilote
- Feuille de route publique
- Téléchargement du firmware
- Service de messagerie chiffrée en ligne (ECDH P-256 + AES-GCM 256)
  - Inscription anonyme (pseudonyme uniquement)
  - Messages éphémères, accusés de réception
  - Pièces jointes chiffrées côté client

### Principes

- **Complémentaire, jamais nécessaire** : PM-Chat Online enrichit l'écosystème, mais n'est jamais requis pour le fonctionnement hors ligne.
- **Service distinct** : la messagerie en ligne est un service séparé du dispositif matériel.
- **Qualité premium** : l'expérience en ligne reflète le même niveau de soin que le produit matériel.

### Emplacement dans le dépôt

```
apps/
├── server/          # Backend Express + Socket.IO
└── web/             # Frontend Next.js 15
packages/
└── shared/          # Types TypeScript et validateurs Zod partagés
```

---

## Relations entre les couches

```
                    ┌─────────────────┐
                    │  PM-Chat Online  │
                    │  (plateforme     │
                    │   numérique)     │
                    └────────┬────────┘
                             │
                   présente, documente,
                   distribue le firmware
                             │
                    ┌────────┴────────┐
                    │  PM-Chat Setup   │
                    │  (guides &       │
                    │   déploiement)   │
                    └────────┬────────┘
                             │
                    facilite la mise
                    en service
                             │
                    ┌────────┴────────┐
                    │  PM-Chat Device  │
                    │  (matériel       │
                    │   autonome)      │
                    └─────────────────┘
```

### Règles fondamentales

| Règle | Description |
|-------|-------------|
| **Device est autonome** | PM-Chat Device fonctionne sans aucune connexion à PM-Chat Online. La communication LoRa est indépendante de tout serveur. |
| **Setup réduit les frictions** | PM-Chat Setup facilite le déploiement mais n'introduit aucune dépendance de transport entre Device et Online. |
| **Online accompagne sans remplacer** | PM-Chat Online soutient l'écosystème (documentation, présentation, firmware) mais ne transporte jamais de messages hors ligne. |
| **Aucun couplage de transport** | Il n'existe aucun chemin technique par lequel un message envoyé via LoRa transiterait par les serveurs Online. |
| **Indépendance par défaut** | Si PM-Chat Online est indisponible, PM-Chat Device continue de fonctionner normalement. |

---

## Résumé

| Couche | Fonction principale | Nécessite Internet | Nécessite les autres couches |
|--------|--------------------|--------------------|------------------------------|
| **PM-Chat Device** | Messagerie chiffrée hors ligne | Non | Non |
| **PM-Chat Setup** | Guides de déploiement et configuration | Non | Documente Device |
| **PM-Chat Online** | Plateforme numérique compagnon | Oui | Présente Device et Setup |
