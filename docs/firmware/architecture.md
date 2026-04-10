# PM-Chat — Architecture Firmware

> Document technique de référence — Firmware LoRa Mesh v1.0  
> Cible matérielle : RAK3172-E (STM32WLE5CC)  
> Dernière mise à jour : 2025

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Ordre de compilation](#ordre-de-compilation)
3. [Modules](#modules)
   - [radio](#1-radio)
   - [mesh](#2-mesh)
   - [crypto](#3-crypto)
   - [message](#4-message)
   - [ui](#5-ui)
   - [input](#6-input)
   - [storage](#7-storage)
   - [identity](#8-identity)
   - [packet](#9-packet)
   - [battery](#10-battery)
   - [state_machine](#11-state_machine)
   - [system](#12-system)
4. [Contrats partagés](#contrats-partagés)
5. [Environnement de test](#environnement-de-test)

---

## Vue d'ensemble

Le firmware PM-Chat est une application embarquée monolithique exécutée sur un microcontrôleur STM32WLE5CC. L'architecture est organisée en 12 modules indépendants communiquant via des interfaces C++ à liaison statique (namespaces). Aucun RTOS n'est utilisé : le système repose sur une boucle principale coopérative (`loop()`) cadencée à ~5 ms.

```
┌─────────────────────────────────────────────────────┐
│                    main.cpp (system)                 │
│  setup() → init séquentiel de tous les modules      │
│  loop()  → poll → input → fsm::tick → draw → wdg   │
├──────────┬──────────┬───────────┬───────────────────┤
│ button   │ ui       │ fsm       │ battery           │
│ (input)  │ (écran)  │ (état)    │ (ADC)             │
├──────────┴──────────┴─────┬─────┴───────────────────┤
│                           │                         │
│  msg_store (messages)     │  mesh (routage)         │
│                           │    ├─ radio (LoRa)      │
│                           │    └─ dedup (cache)     │
├───────────────────────────┴─────────────────────────┤
│  crypto (AES-256-GCM)  │  packet (encodage binaire) │
├─────────────────────────┴───────────────────────────┤
│  identity (provisionnement)  │  storage (EEPROM)    │
├──────────────────────────────┴──────────────────────┤
│  config.h  │  pins.h  │  Contrats partagés          │
└─────────────────────────────────────────────────────┘
```

**Empreinte mémoire estimée** : ~15 Ko / 64 Ko RAM disponibles.  
**Bibliothèques** : RadioLib, U8g2, Arduino Crypto (rweather), Unity (test).

---

## Ordre de compilation

L'ordre de développement et d'intégration recommandé est le suivant :

| Étape | Composant | Justification |
|-------|-----------|---------------|
| 1 | Contrats partagés (`config.h`, `pins.h`, `packet.h`) | Définit toutes les constantes, types et énumérations utilisés par l'ensemble du firmware. Aucune dépendance externe. |
| 2 | Définition du protocole (format de paquet) | Le module `packet` implémente l'encodage/décodage binaire. Nécessaire avant tout échange réseau. |
| 3 | Machine à états (`state_machine`) | Orchestre les transitions système. Structure le flot d'exécution global. |
| 4 | Mocks / simulation (environnement Unity) | Permet de tester `packet` et `crypto` sans matériel. Valide les contrats avant intégration. |
| 5 | Adaptateur radio (`radio`) | Abstraction RadioLib. Première couche matérielle. |
| 6 | Adaptateur crypto (`crypto`) | AES-256-GCM + RNG matériel. Testé en isolation via Unity. |
| 7 | Adaptateur stockage (`storage`) | EEPROM 256 octets. Couche d'abstraction indépendante. |
| 8 | Adaptateur IHM (`ui`) | Écrans OLED. Peut être développé en parallèle avec le réseau. |
| 9 | Couche de provisionnement (`identity`) | Dépend de `storage` et `crypto`. Dernière couche avant intégration. |
| 10 | Liste de contrôle d'intégration | Validation bout-en-bout : boot → setup → envoi → réception → wipe. |

---

## Modules

---

### 1. radio

**Fichiers** : `radio.cpp` / `radio.h`

#### Objectif

Abstraction de la couche physique LoRa via RadioLib. Gère l'initialisation du module SubGHz intégré au STM32WLE5, l'émission et la réception de trames brutes, ainsi que la collecte des indicateurs de qualité radio (RSSI, SNR).

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| `mesh` / `state_machine` | Tampon binaire à émettre | `const uint8_t*`, `uint16_t len` |
| Matériel | Interruption DIO1 (réception) | ISR → flag `s_rx_flag` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `mesh` | Tampon reçu + longueur | `uint8_t*`, `uint16_t&` |
| `ui` (écran réseau) | RSSI dernier paquet | `int16_t` (dBm) |
| `ui` (écran réseau) | SNR dernier paquet | `float` (dB) |

#### Dépendances

- **RadioLib** (bibliothèque externe) — pilote STM32WLx
- `config.h` — paramètres LoRa (fréquence 868,0 MHz, BW 125 kHz, SF9, CR 4/7, puissance 14 dBm)
- `pins.h` — SPI SubGHz interne (aucune broche explicite)

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| `init()` retourne `false` | Module radio absent ou défectueux | `fsm::on_error()` déclenché, écran `SCR_ERROR` |
| `send()` retourne `false` | Canal occupé, tampon trop grand | Message reste en file d'attente, retry automatique |
| Aucune réception | Antenne déconnectée, interférence | Aucun paquet traité, système reste en `STATE_IDLE` |
| Paquet tronqué à la réception | Bruit radio, collision | `pkt::decode()` échoue, paquet ignoré |

#### Stratégie de test

- **Unitaire** : Non applicable directement (dépendance matérielle RadioLib).
- **Intégration** : Vérifier l'écho entre deux appareils. Mesurer RSSI/SNR à distances variables.
- **Mode test** : Écran `SCR_TEST` affiche l'état radio en temps réel.

#### Stratégie de remplacement

Interface stable via le namespace `radio::`. Pour migrer vers un autre module LoRa (SX1262, RFM95), remplacer `radio.cpp` en conservant les signatures : `init()`, `send()`, `receive()`, `start_receive()`, `last_rssi()`, `last_snr()`, `is_busy()`.

---

### 2. mesh

**Fichiers** : `mesh.cpp` / `mesh.h`

#### Objectif

Moteur de routage mesh multi-saut. Gère la déduplication des paquets, la validation du TTL, le relais automatique vers les nœuds voisins et les statistiques réseau.

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| `radio` (via `state_machine`) | Tampon radio brut | `const uint8_t*`, `uint16_t len` |
| `state_machine` | Paquet à envoyer | `Packet&` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `state_machine` | Paquet décodé destiné à cet appareil | `Packet&` (retour `true`) |
| `radio` | Paquet relayé (ré-encodé) | Via `radio::send()` |
| `ui` | Compteurs relayés / perdus | `uint32_t` |

#### Dépendances

- `packet` — encodage/décodage binaire
- `radio` — émission des relais
- `identity` — obtention de l'ID local (`get_device_id()`)
- `crypto` — génération de délai aléatoire pour le relais
- `config.h` — `MESH_DEFAULT_TTL` (3), `MESH_MAX_TTL` (7), `MESH_DEDUP_SIZE` (64), `MESH_DEDUP_TTL_MS` (60 000 ms), `MESH_RELAY_DELAY` (100 ms max)

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| Cache de déduplication saturé | Trafic dense (>64 paquets/min) | Les entrées les plus anciennes sont écrasées (tampon circulaire). Risque de re-traitement de paquets récents. |
| TTL > `MESH_MAX_TTL` | Paquet forgé ou corrompu | Paquet ignoré, compteur `dropped` incrémenté |
| Boucle de relais | Paquets relayés indéfiniment | Impossible : la déduplication par `(sender_id, msg_id)` bloque les copies. Le TTL décrémenté atteint zéro. |
| Relais bloquant | `delay()` dans `relay_packet()` | Délai aléatoire 0–100 ms. Acceptable pour une boucle coopérative à 5 ms. |

#### Stratégie de test

- **Unitaire** : Tester `is_duplicate()` avec des entrées connues. Vérifier le comportement du tampon circulaire au remplissage complet.
- **Intégration** : Réseau de 3+ appareils. Vérifier que les messages transitent sur 2–3 sauts. Vérifier qu'un paquet n'est relayé qu'une seule fois par nœud.

#### Stratégie de remplacement

Le namespace `mesh::` expose une interface de haut niveau. Pour implémenter un algorithme de routage plus sophistiqué (AODV, DSR), remplacer `mesh.cpp` en conservant `process_incoming()`, `send_packet()` et `tick()`.

---

### 3. crypto

**Fichiers** : `crypto_engine.cpp` / `crypto_engine.h`

#### Objectif

Moteur cryptographique fournissant le chiffrement AES-256-GCM, la dérivation de clé par SHA-256, la génération de nombres aléatoires matériels (STM32 RNG) et l'effacement sécurisé de la mémoire.

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| `state_machine` | Texte en clair à chiffrer | `const uint8_t*`, `uint16_t` |
| `state_machine` | Texte chiffré à déchiffrer | `const uint8_t*`, `uint16_t` |
| `identity` | Code PIN mesh (4 chiffres) | `const char*` |
| `packet` | AAD (14 octets) | `const uint8_t*` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `state_machine` | Texte chiffré + tag d'authentification | `uint8_t*` (ct), `uint8_t*` (tag 16 octets) |
| `state_machine` | Texte déchiffré (si tag valide) | `uint8_t*`, retour `bool` |
| `identity` | Clé réseau dérivée (32 octets) | `uint8_t*` |
| Tout module | Octets aléatoires | `uint8_t*` |

#### Dépendances

- **Arduino Crypto** (rweather) — `AES.h`, `GCM.h`, `SHA256.h`
- **STM32 HAL** — `HAL_RNG_MODULE_ENABLED` pour le RNG matériel
- `config.h` — `KEY_SIZE` (32), `NONCE_SIZE` (12), `TAG_SIZE` (16), `PACKET_MAX_PAYLOAD` (200)

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| RNG matériel non disponible | HAL non initialisé, périphérique défectueux | Bascule vers un RNG logiciel (micros + ADC). Message d'avertissement série. **Non sécurisé.** |
| `encrypt()` retourne `false` | Charge utile > 200 octets, erreur interne GCM | Message non envoyé |
| `decrypt()` retourne `false` | Tag GCM invalide (altération, mauvaise clé, mauvais nonce) | Paquet silencieusement ignoré |
| Dérivation de clé faible | Code PIN à seulement 4 chiffres (10 000 combinaisons) | Limitation connue. Voir la section sécurité. |

#### Stratégie de test

- **Unitaire (Unity)** :
  - `test_crypto_derive_key_deterministic` — Même PIN → même clé
  - `test_crypto_derive_key_different_pins` — PIN différent → clé différente
  - `test_crypto_encrypt_decrypt_roundtrip` — Chiffrement/déchiffrement aller-retour
  - `test_crypto_decrypt_rejects_tampered` — Rejet d'un texte chiffré altéré
  - `test_crypto_decrypt_rejects_wrong_key` — Rejet avec mauvaise clé
  - `test_crypto_secure_zero` — Vérification de la mise à zéro sécurisée

#### Stratégie de remplacement

L'interface `crypto::` est indépendante de l'implémentation. Pour migrer vers une bibliothèque matérielle AES (cryptoprocesseur STM32), remplacer `crypto_engine.cpp` en conservant les signatures. Ajouter `PBKDF2` ou `Argon2` à `derive_key()` sans modifier l'interface appelante.

---

### 4. message

**Fichiers** : `message_store.cpp` / `message_store.h`

#### Objectif

Stockage en RAM des messages entrants et sortants. Gère un tampon circulaire de 32 emplacements, la file d'attente d'envoi avec logique de re-tentative exponentielle, l'expiration des messages, le suivi des conversations par pair et la purge automatique.

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| `state_machine` | Message entrant déchiffré | `sender_id`, `msg_id`, `flags`, `text`, `text_len` |
| `state_machine` / `ui` | Message sortant à mettre en file | `dest_id`, `text`, `text_len`, `flags` |
| `state_machine` | Signal de changement d'état | `MsgState` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `state_machine` | Prochain message en attente d'envoi | Index (ou -1) |
| `ui` | Liste de pairs, conversations, compteur non-lu | Tableaux d'indices, `uint32_t*` |
| `state_machine` | Référence à un message | `const Message*` |

#### Dépendances

- `config.h` — `MAX_MESSAGES` (32), `MAX_TEXT_LEN` (160), `MAX_PEERS` (8), `MSG_RETRY_MAX` (3), `MSG_RETRY_BASE_MS` (2 000 ms), `MSG_EXPIRE_MS` (3 600 000 ms = 1 h)
- `packet.h` — types de paquets et drapeaux

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| Tampon plein (32 messages) | Trafic intense | Éviction du message expiré le plus ancien, puis du plus ancien global |
| Re-tentatives épuisées | Destinataire hors de portée | État → `MSTATE_FAILED` |
| Expiration de message | TTL de 1 heure dépassé | État → `MSTATE_EXPIRED`, texte effacé si `FLAG_BURN` |
| Duplication de `msg_id` entrant | Relais multiple | Rejet silencieux dans `add_incoming()` |

#### Stratégie de test

- **Unitaire** : Tester l'éviction du tampon circulaire, la logique de re-tentative, l'expiration, le filtrage par pair, la purge.
- **Intégration** : Vérifier le cycle complet : composition → file → envoi → ACK → `MSTATE_DELIVERED`.

#### Stratégie de remplacement

Pour migrer vers un stockage persistant (Flash, SPIFFS), implémenter un nouveau `message_store.cpp` respectant les mêmes signatures du namespace `msg_store::`. L'interface actuelle est entièrement en RAM ; aucune sérialisation n'est requise par les appelants.

---

### 5. ui

**Fichiers** : `ui.cpp` / `ui.h`

#### Objectif

Moteur d'interface utilisateur piloté par un écran OLED SSD1306 128×64 via I2C. Gère 14 écrans distincts, la barre d'en-tête (titre, batterie), la barre de pied de page (libellés boutons), la saisie de texte par jeu de caractères rotatif, le système de notifications toast, et la gestion d'économie d'énergie (atténuation/extinction).

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| `button` (via `main.cpp`) | Événement bouton | `BtnEvent` |
| `state_machine` | Écran à afficher | `Screen` |
| `message_store` | Données de messages, pairs | Via API `msg_store::` |
| `battery` | Pourcentage batterie | `uint8_t` |
| `identity` | ID de l'appareil, code PIN mesh | `uint32_t`, `char*` |
| `radio` | RSSI | `int16_t` |
| `mesh` | Compteurs réseau | `uint32_t` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| Écran OLED | Trame d'affichage (I2C) | Via `U8g2::sendBuffer()` |
| `state_machine` | Écran courant, texte composé, destinataire | `Screen`, `const char*`, `uint32_t` |
| `identity` | Code PIN saisi | Via `identity::provision()` |

#### Dépendances

- **U8g2** (bibliothèque externe) — pilote SSD1306, polices, primitives graphiques
- `pins.h` — `PIN_I2C_SDA` (PA11), `PIN_I2C_SCL` (PA12)
- `config.h` — dimensions écran, temporisations, jeu de caractères
- `message_store`, `battery`, `identity`, `mesh`, `radio`, `packet` — données à afficher

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| Écran non détecté | I2C déconnecté, adresse incorrecte | Affichage vide. Le système continue de fonctionner en aveugle. |
| Tampon de composition plein | Texte ≥ 160 caractères | Caractères supplémentaires ignorés |
| Toast non visible | Écran éteint | `wake()` appelé automatiquement pour les notifications critiques |

#### Stratégie de test

- **Unitaire** : Non applicable (dépendance U8g2 matérielle).
- **Visuel** : Parcourir tous les écrans manuellement. Vérifier les transitions, les libellés, l'alignement.
- **Mode test** : Écran `SCR_TEST` valide l'affichage en temps réel.

#### Stratégie de remplacement

Pour migrer vers un écran de résolution supérieure ou un pilote différent, remplacer l'instance `s_disp` et adapter les constantes d'affichage. L'interface publique `ui::` reste stable.

---

### 6. input

**Fichiers** : `button.cpp` / `button.h`

#### Objectif

Gestion des 3 boutons physiques (UP, OK, DOWN) avec anti-rebond logiciel, détection de pression courte, détection de pression longue (800 ms) et détection de panique (3 boutons maintenus pendant 3 secondes).

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| Matériel | État GPIO (actif LOW, pull-up interne) | `digitalRead()` |
| Timer système | `millis()` pour le chronométrage | `uint32_t` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `main.cpp` → `ui::handle_input()` | Événement bouton | `BtnEvent` |
| `main.cpp` → `fsm::panic_wipe()` | Signal de panique | `BTN_PANIC` |

#### Dépendances

- `config.h` — `DEBOUNCE_MS` (30), `LONG_PRESS_MS` (800), `PANIC_HOLD_MS` (3 000)
- `pins.h` — `PIN_BTN_UP` (PA15), `PIN_BTN_OK` (PB6), `PIN_BTN_DOWN` (PB7)

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| Bouton bloqué en position enfoncée | Défaut mécanique | Génération continue de `BTN_*_LONG`. Si les 3 sont bloqués → déclenchement du wipe après 3 s. |
| Rebond non filtré | `DEBOUNCE_MS` trop court | Événements parasites. Ajuster la constante. |
| Pression longue non détectée | `LONG_PRESS_MS` trop long | Augmenter la sensibilité dans `config.h`. |

#### Stratégie de test

- **Unitaire** : Simuler des séquences temporisées de `digitalRead()`. Vérifier la logique de détection.
- **Intégration** : Tester manuellement chaque combinaison (court, long, panique) sur le matériel.

#### Stratégie de remplacement

Interface minimale : `init()`, `poll()`, `is_held_*()`, `reset()`. Pour migrer vers un clavier matriciel ou un encodeur rotatif, adapter `button.cpp` et étendre l'énumération `BtnEvent`.

---

### 7. storage

**Fichiers** : `storage.cpp` / `storage.h`

#### Objectif

Couche d'abstraction pour l'EEPROM émulée en Flash (256 octets) du STM32. Fournit des primitives de lecture/écriture typées (u8, u32, bloc) ainsi que les fonctions de détection du nombre magique et d'effacement complet.

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| `identity` | Données d'identité à persister | `uint32_t`, `uint8_t[]` |
| `ui` / `identity` | Luminosité, compteur de messages | `uint8_t`, `uint32_t` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `identity` | ID appareil, clé réseau, PIN mesh | `uint32_t`, `uint8_t[32]`, `uint8_t[4]` |
| `identity` | Détection de provisionnement | `bool` (`has_magic()`) |

#### Dépendances

- **Arduino EEPROM** — émulation Flash STM32duino
- `config.h` — carte mémoire EEPROM :

| Adresse | Taille | Champ |
|---------|--------|-------|
| 0 | 4 | Nombre magique (`0x504D4348` = "PMCH") |
| 4 | 4 | ID appareil |
| 8 | 32 | Clé réseau (AES-256) |
| 40 | 1 | Verrouillage PIN activé |
| 41 | 4 | Hash du PIN |
| 45 | 1 | Luminosité |
| 46 | 4 | Compteur de messages |
| 50 | 4 | Code PIN mesh |
| 54–255 | 202 | Réservé |

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| Nombre magique absent | Premier démarrage ou wipe | Le système entre en `STATE_SETUP` |
| Flash usée | Cycles d'écriture excessifs (~10 000 cycles) | Corruption silencieuse des données. Prévoir un mécanisme de wear-leveling à terme. |
| Lecture incohérente | Écriture interrompue (coupure d'alimentation) | Données potentiellement corrompues. Le nombre magique sert de garde minimale. |

#### Stratégie de test

- **Unitaire** : Simuler EEPROM en RAM. Vérifier lectures/écritures, effacement, détection magique.
- **Intégration** : Écrire des valeurs connues, redémarrer, relire et comparer.

#### Stratégie de remplacement

Pour migrer vers une Flash externe SPI ou un stockage structuré (LittleFS), remplacer `storage.cpp` en conservant les signatures du namespace `storage::`.

---

### 8. identity

**Fichiers** : `device_identity.cpp` / `device_identity.h`

#### Objectif

Gestion de l'identité de l'appareil : provisionnement initial (génération d'ID aléatoire, dérivation de la clé réseau depuis le code PIN mesh), chargement paresseux depuis l'EEPROM, et effacement sécurisé (factory wipe).

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| `ui` (écran setup) | Code PIN mesh (4 chiffres) | `const char*` |
| `state_machine` | Demande de wipe | Via `identity::wipe()` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `state_machine` | ID de l'appareil | `uint32_t` |
| `state_machine` | Clé réseau (32 octets) | `uint8_t[KEY_SIZE]` |
| `state_machine` | État de provisionnement | `bool` |

#### Dépendances

- `storage` — lecture/écriture EEPROM
- `crypto` — `random_u32()` pour la génération d'ID, `derive_key()` pour la clé réseau, `secure_zero()` pour l'effacement
- `config.h` — `BROADCAST_ID` (0xFFFFFFFF), adresses EEPROM

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| ID généré = 0 ou `BROADCAST_ID` | Collision rare du RNG | Remplacement automatique par `0x00010001` |
| Clé réseau non chargée | `get_net_key()` appelé avant provisionnement | Clé vide (zéros). Les chiffrements/déchiffrements échoueront. |
| Wipe incomplet | Coupure d'alimentation pendant `erase_all()` | Nombre magique potentiellement encore présent. Recommencer le wipe. |

#### Stratégie de test

- **Unitaire** : Mocker `storage` et `crypto`. Vérifier le flux de provisionnement, le chargement paresseux, le wipe.
- **Intégration** : Provisionnement complet → redémarrage → vérification de l'ID et de la clé.

#### Stratégie de remplacement

Pour un mécanisme d'identité plus robuste (certificats, clés ECDH par pair), étendre l'interface `identity::` sans modifier les appelants existants.

---

### 9. packet

**Fichiers** : `packet.cpp` / `packet.h`

#### Objectif

Implémentation du protocole binaire PM-Chat. Encode et décode les paquets entre la structure `Packet` en mémoire et le format fil (wire format) en petit-boutiste (little-endian). Construit les données additionnelles authentifiées (AAD) pour le chiffrement GCM.

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| `mesh` / `state_machine` | Structure `Packet` à encoder | `const Packet&` |
| `mesh` | Tampon brut radio à décoder | `const uint8_t*`, `uint16_t` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `radio` (via `mesh`) | Tampon encodé | `uint8_t*`, retour `uint16_t` (taille) |
| `mesh` / `state_machine` | Structure `Packet` décodée | `Packet&`, retour `bool` |
| `crypto` | AAD (14 octets) | `uint8_t[AAD_SIZE]` |

#### Dépendances

- `config.h` — constantes de taille (`PACKET_HEADER_SIZE` = 30, `PACKET_TAG_SIZE` = 16, `PACKET_MAX_PAYLOAD` = 200, `NONCE_SIZE` = 12, `AAD_SIZE` = 14)
- `crypto` — `random_u32()` pour `new_msg_id()`

#### Format fil

```
Offset  Taille  Champ           Description
──────  ──────  ──────────────  ──────────────────────────────
0       1       version         Version du protocole (0x01)
1       1       type            Type de paquet (PacketType)
2       4       sender_id       ID de l'émetteur (little-endian)
6       4       dest_id         ID du destinataire (BROADCAST_ID = 0xFFFFFFFF)
10      4       msg_id          Identifiant unique du message
14      1       ttl             Nombre de sauts restants
15      1       flags           Masque de drapeaux (PacketFlag)
16      12      nonce           Nonce AES-GCM
28      2       payload_len     Longueur du chiffré (little-endian)
30      N       payload         Charge utile chiffrée (max 200 octets)
30+N    16      tag             Tag d'authentification GCM
```

**Taille totale** : 30 + N + 16, maximum 246 octets (compatible limite LoRa 255).

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| Version incorrecte | Protocole incompatible | `decode()` retourne `false` |
| Tampon trop court | Paquet tronqué | `decode()` retourne `false` |
| `payload_len > 200` | Paquet corrompu ou forgé | `decode()` retourne `false` |
| Tampon de sortie trop petit | Erreur de l'appelant | `encode()` retourne 0 |

#### Stratégie de test

- **Unitaire (Unity)** :
  - `test_packet_encode_decode` — Aller-retour complet
  - `test_packet_reject_bad_version` — Rejet de version invalide
  - `test_packet_reject_truncated` — Rejet de paquet tronqué
  - `test_packet_reject_oversized_payload` — Rejet de charge surdimensionnée
  - `test_packet_id_to_hex` — Conversion ID → hexadécimal
  - `test_packet_aad_build` — Construction et vérification de l'AAD

#### Stratégie de remplacement

Pour étendre le protocole (nouveaux types de paquets, champs supplémentaires), incrémenter `PROTOCOL_VERSION` et adapter `encode()`/`decode()`. L'AAD doit rester synchronisé entre encodeur et décodeur.

---

### 10. battery

**Fichiers** : `battery.cpp` / `battery.h`

#### Objectif

Surveillance de la tension batterie LiPo via l'ADC 12 bits du STM32. Moyenne glissante sur 8 échantillons, conversion en millivolts (diviseur résistif 2:1), calcul du pourcentage et détection des seuils critique et bas.

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| Matériel | Tension analogique (broche PB3) | ADC 12 bits (0–4095) |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `ui` (barre d'en-tête) | Pourcentage batterie | `uint8_t` (0–100) |
| `ui` (écran test) | Tension en millivolts | `uint16_t` |
| `main.cpp` | État critique / bas | `bool` |

#### Dépendances

- `pins.h` — `PIN_BATT_ADC` (PB3)
- `config.h` — seuils : `BATT_FULL_MV` (4 200), `BATT_LOW_MV` (3 300), `BATT_CRIT_MV` (3 100), `BATT_EMPTY_MV` (3 000), `BATT_DIVIDER` (2), `BATT_INTERVAL_MS` (10 000)

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| ADC retourne 0 | Broche déconnectée, batterie absente | `voltage_mv()` = 0, `percent()` = 0. `is_critical()` et `is_low()` retournent `false` (garde `> 0`). |
| Lecture instable | Bruit ADC, alimentation instable | La moyenne sur 8 échantillons lisse les variations. |
| Pourcentage non linéaire | Courbe de décharge réelle de la LiPo | Approximation linéaire 3000–4200 mV. Acceptable pour un indicateur. |

#### Stratégie de test

- **Unitaire** : Injecter des valeurs ADC simulées. Vérifier la conversion et les seuils.
- **Intégration** : Comparer la lecture avec un multimètre sur la batterie réelle.

#### Stratégie de remplacement

Pour un moniteur de jauge (MAX17048, BQ27441), remplacer `battery.cpp` en conservant l'interface `battery::`. Ajouter une courbe de décharge non linéaire si nécessaire.

---

### 11. state_machine

**Fichiers** : `state_machine.cpp` / `state_machine.h`

#### Objectif

Machine à états finis (FSM) du système. Orchestre les transitions entre les phases de démarrage, configuration, fonctionnement normal, envoi, réception, erreur et panique. Coordonne les interactions entre les modules radio, mesh, crypto, messages et UI.

#### Entrées

| Source | Donnée | Type |
|--------|--------|------|
| `main.cpp` | Appel cyclique | `fsm::tick()` |
| `ui` | Écran courant (détection de transitions) | `ui::current_screen()` |
| `radio` (via `process_radio()`) | Paquets reçus | Via `radio::receive()` |
| `msg_store` | Messages en attente d'envoi | Via `msg_store::next_pending()` |
| Externe | Signaux d'événements | `on_message_received()`, `on_send_complete()`, `on_error()`, `on_setup_complete()`, `on_pin_accepted()`, `panic_wipe()` |

#### Sorties

| Destination | Donnée | Type |
|-------------|--------|------|
| `ui` | Écran à afficher | Via `ui::set_screen()` |
| `msg_store` | Messages ajoutés, états modifiés | Via API `msg_store::` |
| `mesh` | Paquets à envoyer (texte, ACK) | Via `mesh::send_packet()` |
| `crypto` | Opérations de chiffrement/déchiffrement | Via `crypto::encrypt()` / `decrypt()` |
| `identity` | Chargement de la clé réseau, wipe | Via `identity::get_net_key()`, `identity::wipe()` |

#### Dépendances

- Tous les modules (le FSM est le coordinateur central)
- `config.h` — `PROTOCOL_VERSION`, constantes de taille

#### États

| État | Description |
|------|-------------|
| `STATE_BOOT` | Écran splash pendant 1,5 s. Vérifie le provisionnement. |
| `STATE_SETUP` | Configuration initiale (saisie du code PIN mesh). |
| `STATE_PIN_ENTRY` | Saisie du code PIN de verrouillage (réservé). |
| `STATE_IDLE` | Boucle opérationnelle principale : radio, messages, mesh. |
| `STATE_SENDING` | État transitoire pendant un envoi actif (timeout 5 s). |
| `STATE_RECEIVING` | État transitoire lors d'une réception (retour immédiat à IDLE). |
| `STATE_TEST` | Mode test (radio et boutons actifs, écran de diagnostic). |
| `STATE_ERROR` | Affichage d'erreur, attente de l'acquittement utilisateur. |

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| Blocage dans un état | Boucle infinie, module non réactif | Watchdog matériel (8 s) redémarre le système |
| Erreur radio | Échec d'initialisation | Transition vers `STATE_ERROR`, affichage du message |
| Panique | 3 boutons maintenus 3 s | Effacement EEPROM, mise à zéro de la clé réseau, retour à `STATE_SETUP` |

#### Stratégie de test

- **Unitaire** : Mocker tous les modules. Vérifier les transitions d'état pour chaque signal.
- **Intégration** : Parcourir le flux complet : boot → setup → idle → envoi → réception → erreur → recovery.

#### Stratégie de remplacement

Le FSM est étroitement couplé à la logique applicative. Tout remplacement implique une réécriture de la coordination. L'interface publique `fsm::` reste le point d'entrée.

---

### 12. system

**Fichier** : `main.cpp`

#### Objectif

Point d'entrée du firmware. Exécute la séquence d'initialisation de tous les modules, implémente la boucle principale coopérative et gère le watchdog matériel.

#### Séquence d'initialisation (`setup()`)

```
1. Serial (debug UART, 115200 bauds)
2. LED d'état
3. storage::init()
4. crypto::init()
5. button::init()
6. battery::init()
7. msg_store::init()
8. mesh::init()
9. ui::init()
10. fsm::init()
11. radio::init() — si échec → fsm::on_error()
12. LED clignotement de confirmation
13. IWatchdog.begin(8 000 000 µs)
```

#### Boucle principale (`loop()`)

```
1. button::poll()          → Détection d'événements
2. BTN_PANIC ?             → fsm::panic_wipe()
3. ui::handle_input(evt)   → Traitement IHM
4. fsm::tick()             → Logique d'état (radio, mesh, messages)
5. ui::draw() + ui::tick() → Rafraîchissement écran (10 Hz)
6. battery::update()       → Surveillance batterie (toutes les 10 s)
7. IWatchdog.reload()      → Alimentation du watchdog
8. delay(5 ms)             → Économie d'énergie minimale
```

#### Dépendances

- Tous les modules firmware
- **IWatchdog** (STM32duino) — watchdog matériel

#### Modes de défaillance

| Défaillance | Cause probable | Comportement |
|-------------|---------------|--------------|
| Boucle bloquée > 8 s | Deadlock, boucle infinie dans un module | Watchdog déclenche un redémarrage matériel |
| `setup()` échoue partiellement | Module non initialisé | Le système démarre en mode dégradé. La radio absente est signalée par `fsm::on_error()`. |

#### Stratégie de test

- **Intégration** : Vérifier le temps de démarrage (< 3 s). Vérifier que le watchdog ne se déclenche pas en fonctionnement normal. Simuler un blocage et vérifier le redémarrage.

#### Stratégie de remplacement

Le fichier `main.cpp` est le point de couplage du système. Toute modification de l'architecture (RTOS, interruptions) nécessite une réécriture de ce fichier.

---

## Contrats partagés

### `config.h`

Fichier central de configuration. Toutes les constantes compile-time, les énumérations et les types partagés y sont définis. Aucun code exécutable.

**Sections** :
- Firmware (version 1.0.0)
- Protocole (version 0x01, tailles de paquets)
- LoRa (EU868, BW 125 kHz, SF9, CR 4/7, 14 dBm)
- Mesh (TTL 3, dédup 64/60 s, délai relais 100 ms)
- Messages (32 slots, 160 caractères, 3 re-tentatives, expiration 1 h)
- Display (128×64, cadences, timeouts)
- Boutons (anti-rebond 30 ms, pression longue 800 ms, panique 3 s)
- Batterie (seuils, intervalle 10 s)
- EEPROM (carte mémoire 256 octets)
- Watchdog (8 s)
- Jeu de caractères (majuscules, chiffres, ponctuation)

### `pins.h`

Cartographie des broches matérielles pour la carte RAK3172-E :
- I2C (PA11/PA12) → OLED
- Boutons (PA15, PB6, PB7) → actifs LOW, pull-up interne
- ADC (PB3) → diviseur résistif batterie
- LED (PB5) → active HIGH
- UART debug (PA9/PA10)
- Radio SubGHz → SPI interne, aucune broche explicite

---

## Environnement de test

**Framework** : PlatformIO Unity (tests embarqués sur cible)

**Commande** : `pio test -e test`

**Couverture actuelle** (12 tests) :

| Module | Tests | Description |
|--------|-------|-------------|
| `packet` | 6 | Encode/decode, version invalide, troncature, surdimensionnement, conversion hex, construction AAD |
| `crypto` | 6 | Dérivation déterministe, PIN différents, aller-retour chiffrement, altération, mauvaise clé, mise à zéro sécurisée |

**Extension recommandée** :
- Tests `msg_store` : éviction, re-tentatives, expiration, purge
- Tests `mesh` : déduplication, relais, TTL
- Tests `storage` : lectures/écritures, effacement, nombre magique
- Mocks pour `radio`, `ui`, `battery` (dépendances matérielles)
