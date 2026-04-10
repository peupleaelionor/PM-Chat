# Checklist pré-arrivée matériel

> Tout ce qui doit être prêt avant la réception du matériel LoRa.

---

## Objectif

Ce document recense l'ensemble des éléments — architecture, protocole, sécurité, firmware, documentation et plateforme en ligne — qui doivent être finalisés avant l'arrivée du matériel physique (RAK3172-E, écran OLED, boutons, batterie).

L'objectif est de s'assurer que le premier flashage sera productif : le firmware est structuré, le protocole est défini, la documentation est prête. Il ne restera que la validation physique.

---

## Architecture

> Structure logicielle du firmware et flux de fonctionnement.

- [x] Structure modulaire du firmware
  - `radio` — Abstraction du pilote LoRa (RadioLib/STM32WLx)
  - `mesh` — Routage maillé, TTL, déduplication, relais
  - `crypto` — Chiffrement AES-256-GCM, génération de nonces
  - `message` — Stockage en RAM, files de messages, états
  - `ui` — Affichage OLED, 14 écrans, navigation
  - `input` — Gestion des 3 boutons, anti-rebond, appui long
  - `storage` — Persistance EEPROM (identité, clé, config)
  - `provisioning` — Détection premier démarrage, flux de configuration
  - `diagnostics` — Surveillance batterie, watchdog
  - `system` — Machine à états, boucle principale

- [x] Machine à états du dispositif
  ```
  BOOT → SETUP → IDLE → SENDING / RECEIVING → ERROR
  ```
  - `BOOT` : initialisation matérielle, détection du provisionnement
  - `SETUP` : premier démarrage, saisie du Mesh PIN, génération d'identité
  - `IDLE` : attente de messages ou d'action utilisateur
  - `SENDING` : composition et envoi d'un message
  - `RECEIVING` : réception et déchiffrement d'un message entrant
  - `ERROR` : état de récupération après défaillance

- [x] Logique des boutons
  - Anti-rebond matériel (50 ms)
  - Détection d'appui court, appui long (500 ms), maintien
  - Détection d'effacement d'urgence (3 boutons maintenus 3 secondes)
  - Navigation contextuelle selon l'écran actif

- [x] Flux de l'interface utilisateur (14 écrans)
  - Splash, accueil configuration, saisie Mesh PIN, affichage identité
  - Boîte de réception, lecture de message, composition
  - Envoi en cours, confirmation d'envoi, erreur d'envoi
  - Paramètres, informations appareil, confirmation de réinitialisation
  - Effacement d'urgence

- [x] Modèle de stockage EEPROM local (256 octets)
  - Marqueur de provisionnement (1 octet)
  - Identifiant de l'appareil (4 octets)
  - Clé AES-256 dérivée (32 octets)
  - Mesh PIN chiffré (4 octets)
  - Paramètres utilisateur
  - Espace réservé pour extensions

- [x] Cycle de vie des messages avec états et logique de réessai
  - États : `QUEUED → SENDING → SENT → DELIVERED → READ → EXPIRED`
  - Réessai automatique en cas d'échec (3 tentatives, backoff exponentiel)
  - Expiration après durée de vie configurable

- [x] Appairage via Mesh PIN partagé
  - Tous les appareils d'un même réseau saisissent le même PIN à 4 chiffres
  - Dérivation de clé AES-256 : `SHA-256(mesh_pin + salt)`
  - Pas de serveur d'échange — clé partagée hors bande

- [x] Flux de réinitialisation et d'effacement
  - Réinitialisation usine via menu Paramètres (avec confirmation)
  - Effacement d'urgence via 3 boutons maintenus (sans confirmation)
  - Suppression de l'identité, des clés, des messages et des paramètres
  - Redémarrage en mode SETUP

- [x] Flux de provisionnement (détection premier démarrage)
  - Lecture du marqueur EEPROM au démarrage
  - Si non provisionné → mode SETUP automatique
  - Si provisionné → mode IDLE direct

- [ ] Amélioration du module de diagnostics
  - Extension de la surveillance au-delà de la batterie
  - Métriques radio (RSSI, SNR du dernier paquet)
  - Compteurs de messages envoyés/reçus/relayés
  - Journalisation des erreurs en mémoire

---

## Protocole

> Format des paquets, règles de routage et comportement réseau.

- [x] Format binaire compact des paquets (246 octets maximum)
  ```
  Offset  Taille  Champ          Description
  ──────  ──────  ─────          ───────────
  0       1       version        Version du protocole (0x01)
  1       1       type           PKT_TEXT / ACK / PING / PAIR_REQ / PAIR_ACK
  2       4       sender_id      Identifiant source
  6       4       dest_id        Destination (0xFFFFFFFF = diffusion)
  10      4       msg_id         Identifiant unique (aléatoire 32 bits)
  14      1       ttl            Sauts restants (défaut : 3, max : 7)
  15      1       flags          burn | ack_req | relayed | priority | encrypted
  16      12      nonce          Nonce AES-GCM (aléatoire par message)
  28      2       payload_len    Longueur du contenu chiffré
  30      N       payload        Contenu chiffré (max 200 octets)
  30+N    16      tag            Tag d'authentification AES-GCM
  ```

- [x] Modèle émetteur/récepteur
  - Adressage unicast (dest_id spécifique) et broadcast (0xFFFFFFFF)
  - Identification de l'émetteur par sender_id

- [x] Structure de l'identifiant de message (aléatoire 32 bits)
  - Généré par le RNG matériel
  - Utilisé pour la déduplication et le suivi des acquittements

- [x] Règles de relais TTL
  - TTL par défaut : 3 sauts
  - TTL maximum : 7 sauts
  - Décrémentation à chaque relais
  - Paquet abandonné quand TTL atteint 0

- [x] Déduplication des paquets
  - Cache de 64 entrées (msg_id + sender_id)
  - Fenêtre de 60 secondes
  - Rejet immédiat des doublons

- [x] Comportement de relais avec délai aléatoire
  - Délai aléatoire de 0-100 ms avant retransmission
  - Évite les collisions entre nœuds relais simultanés
  - Activation du flag `RELAYED` dans le paquet

- [x] Logique de réessai et backoff
  - 3 tentatives de réessai
  - Backoff exponentiel entre les tentatives
  - Abandon après épuisement des tentatives

- [x] Rejet des paquets malformés
  - Vérification de la version du protocole
  - Validation de la longueur du paquet
  - Vérification de la cohérence payload_len / taille réelle
  - Rejet des types inconnus

- [ ] Validation temporelle avancée (au-delà de la déduplication)
  - Horodatage dans le paquet pour rejet des messages anciens
  - Fenêtre de validité configurable
  - Protection complémentaire à la déduplication par msg_id

- [ ] Amélioration de la confirmation de livraison (ACK)
  - Extension du mécanisme ACK existant
  - Confirmation de bout en bout (pas seulement du premier saut)
  - Gestion du timeout ACK et de la notification à l'utilisateur

---

## Sécurité

> Chiffrement, gestion des clés et protections.

- [x] Chiffrement AES-256-GCM
  - Algorithme de chiffrement authentifié
  - Tag d'authentification de 16 octets sur chaque paquet
  - AAD (Additional Authenticated Data) : en-tête du paquet (14 octets)

- [x] RNG matériel pour les nonces
  - Utilisation du TRNG intégré au STM32WLE5CC
  - `HAL_RNG_MODULE_ENABLED` activé dans la compilation

- [x] Nonce aléatoire par message (12 octets)
  - Généré pour chaque message individuel
  - Inclus en clair dans le paquet (nécessaire au déchiffrement)
  - Jamais réutilisé grâce au RNG matériel

- [x] Les nœuds relais ne peuvent pas déchiffrer le contenu
  - Le relais opère sur le paquet complet sans accéder au contenu
  - Seuls les appareils possédant la clé partagée peuvent déchiffrer

- [x] Comportement d'effacement d'urgence
  - 3 boutons maintenus pendant 3 secondes
  - Effacement immédiat de toute la mémoire Flash
  - Aucune confirmation requise — action instantanée
  - Redémarrage en état vierge

- [x] Remise à zéro sécurisée des buffers
  - `memset` sécurisé sur les buffers sensibles après utilisation
  - Clés et contenus déchiffrés nettoyés de la RAM

- [ ] Renforcement du PIN (actuellement 4 chiffres uniquement)
  - Le Mesh PIN actuel offre 10 000 combinaisons
  - Extension possible : PIN alphanumérique ou plus long
  - Ajout d'un salt par réseau pour diversifier la dérivation
  - Les stubs `PAIR_REQ` / `PAIR_ACK` permettent un échange de clés par pair

- [ ] Échange de clés par pair (stubs PAIR_REQ/PAIR_ACK existants)
  - Les types de paquets `PAIR_REQ` et `PAIR_ACK` sont définis
  - Implémentation de l'échange de clés Diffie-Hellman par pair
  - Permettrait un chiffrement unique par conversation
  - Complément au chiffrement de groupe actuel (Mesh PIN)

---

## Dépôt firmware

> Qualité et maintenabilité du code source.

- [x] Arborescence modulaire et propre
  ```
  firmware/
  ├── include/    → 13 en-têtes, un par module
  ├── src/        → 12 fichiers source, correspondance 1:1 avec les en-têtes
  ├── test/       → Harnais de test Unity
  └── platformio.ini
  ```

- [x] Pas de code mort
  - Chaque fichier source a un rôle actif
  - Pas de fonctions commentées ni de modules désactivés

- [x] Interfaces claires entre modules
  - Chaque en-tête définit un contrat public
  - Les dépendances entre modules sont explicites via les `#include`
  - Pas de variables globales non contrôlées

- [x] Testable avec le framework Unity
  - Configuration de test définie dans `platformio.ini` (`[env:test]`)
  - Harnais de test dans `test/test_main.cpp`
  - Exécution via `pio test -e test`

- [x] Structure orientée production
  - Flags de compilation optimisés (`-Os`, `-Wall`, `-Wextra`)
  - Version du firmware intégrée (`FIRMWARE_VERSION`)
  - Protocole de flashage ST-LINK configuré
  - Watchdog indépendant de 8 secondes

---

## Couche Setup

> Documentation opérationnelle pour le déploiement terrain.

- [x] Guide de démarrage rapide
  - Procédure minimale pour un premier message en 5 minutes

- [x] Guide du premier démarrage
  - Flux complet du premier allumage à la boîte de réception

- [x] Guide d'appairage
  - Explication du Mesh PIN, rejoindre un réseau existant, vérification

- [x] Guide de flashage
  - Prérequis (PlatformIO, ST-LINK), compilation, flashage pas à pas

- [x] Guide de mise à jour
  - Procédure de mise à jour du firmware sur un appareil provisionné

- [x] Guide de réinitialisation
  - Réinitialisation usine via menu et effacement d'urgence

- [x] Guide de validation de relais
  - Test de portée, vérification du multi-sauts, diagnostic réseau

- [x] Matrice de dépannage
  - Symptômes courants, causes probables, solutions

- [x] Checklist de déploiement
  - Liste complète des vérifications avant mise en service terrain

---

## Couche Online

> Plateforme numérique compagnon.

- [x] Frontend Next.js
  - Application web Next.js 15 avec React 18 et Tailwind CSS
  - Composants d'authentification, de chat, de mise en page
  - Chiffrement côté client via Web Crypto API

- [x] Backend Express
  - API REST complète (auth, conversations, messages, pièces jointes)
  - Socket.IO pour le temps réel (messages, présence, saisie)
  - Gardes de sécurité en profondeur

- [x] Messagerie chiffrée de bout en bout
  - ECDH P-256 pour l'échange de clés
  - AES-GCM 256 pour le chiffrement des messages
  - Architecture zero-knowledge côté serveur

- [x] Structure de documentation
  - Architecture, sécurité, protocole, flux d'appairage
  - Guide de déploiement, exemples de code

- [x] Positionnement produit
  - Identité de marque premium
  - Présentation des fonctionnalités et de la différenciation
  - README bilingue, documentation structurée

---

## Ce qui reste pour l'arrivée du matériel

> Actions physiques impossibles sans le matériel en main.

| Étape | Référence | Description |
|-------|-----------|-------------|
| **Câblage physique** | `firmware/WIRING.md` | Connexion du RAK3172-E, de l'écran OLED, des boutons, de la batterie et du diviseur de tension selon le schéma documenté |
| **Flashage du firmware** | Guide de flashage | Premier flashage via ST-LINK sur le matériel réel |
| **Test de portée radio** | Guide de validation de relais | Mesure de la portée effective en conditions réelles (ligne de vue et milieu urbain) |
| **Calibration batterie** | Module `battery` | Vérification des seuils ADC avec la batterie LiPo réelle, ajustement des alertes |
| **Assemblage du boîtier** | `firmware/BOITIER.md` | Montage dans le boîtier selon les spécifications documentées |
| **Validation de bout en bout** | Checklist de déploiement | Test complet : appairage de deux appareils, envoi/réception, relais, effacement d'urgence |

---

## Synthèse

```
 Catégorie               Prêt    En cours    Restant
 ─────────               ────    ────────    ───────
 Architecture            9/10       1           —
 Protocole               8/10       2           —
 Sécurité                6/8        2           —
 Dépôt firmware          5/5        —           —
 Couche Setup            9/9        —           —
 Couche Online           5/5        —           —
 Validation physique      —         —          6 étapes
```

**État global :** le logiciel est prêt. Les éléments restants relèvent soit d'améliorations incrémentales (diagnostics, ACK, PIN), soit de la validation physique qui nécessite le matériel. Le premier flashage peut être productif dès réception.
