# PM-Chat
### Secure Messaging Infrastructure with End-to-End Encryption (E2EE)

PM-Chat est une plateforme de messagerie haute performance conçue avec une approche **Security-by-Design**. Elle implémente un modèle de confiance zéro (Zero-Knowledge) où le serveur n'a jamais accès au contenu des messages ou aux clés privées des utilisateurs.

---

### 🛡️ Architecture de Sécurité

Le système repose sur une pile cryptographique robuste utilisant la **Web Crypto API** :
*   **Échange de clés** : Protocole Diffie-Hellman sur courbes elliptiques (ECDH P-256).
*   **Chiffrement symétrique** : AES-GCM 256-bit pour chaque message.
*   **Dérivations de clés** : PBKDF2 avec sel unique pour la protection des secrets locaux.
*   **Zero-Knowledge Storage** : Les messages sont stockés sous forme de blobs chiffrés ; seul le destinataire possède la clé de déchiffrement.

---

### 🏗️ Stack Technique

*   **Frontend** : Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand (State Management).
*   **Backend** : Node.js, Express, Socket.IO (Temps réel).
*   **Data & Cache** : MongoDB (Persistance), Redis (Gestion des sessions et présence).
*   **Infrastructure** : Docker Compose, CI/CD via GitHub Actions.

---

### 🧩 Structure du Projet

```text
apps/
├── server/           # Backend Node.js, Socket.IO handlers, API REST
└── web/              # Frontend Next.js, Crypto Layer, UI Components
packages/
└── shared/           # Types TypeScript et schémas de validation (Zod)
```

---

### 🚀 Fonctionnalités Critiques

*   **Messagerie Temps Réel** : Latence minimale via WebSockets.
*   **Confidentialité Totale** : Chiffrement de bout en bout pour textes et pièces jointes.
*   **Auto-destruction** : Support des messages à lecture unique.
*   **Indicateurs de Présence** : Statut en ligne et indicateurs de saisie en temps réel.
*   **Sécurité Réseau** : Rate limiting agressif et protection contre les attaques par force brute.

---

### 🛠️ Installation & Exécution

Le projet est entièrement conteneurisé pour garantir une parité parfaite entre les environnements.

```bash
# Cloner le dépôt
git clone https://github.com/peupleaelionor/PM-Chat.git
cd PM-Chat

# Lancer l'infrastructure complète (Web, Server, DB, Redis)
docker-compose up --build
```

---

### 🗺️ Roadmap Technique

- [ ] Implémentation du protocole **Double Ratchet** pour une confidentialité persistante (Forward Secrecy).
- [ ] Support des conversations de groupe chiffrées.
- [ ] Audit de sécurité externe et tests d'intrusion.
- [ ] Application mobile native via React Native.

---

### 📫 Travailler avec moi / Techflow Agency

Ce projet démontre ma capacité à concevoir des systèmes où la sécurité n'est pas une option, mais le fondement de l'architecture.

*   **Expertise** : Audit de sécurité, Architecture E2EE, Systèmes temps réel.
*   **Contact** : [TechFlow Solutions](https://www.techflowsolutions.space)

---
<div align="center">
  <sub>Licence MIT. Développé par Kevin Bolele.</sub>
</div>
