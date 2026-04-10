# Firmware Mesh PM-Chat

Firmware de messagerie mesh LoRa chiffrée hors ligne pour **RAK3172-E Evaluation Board EU868**.

Pas de WiFi. Pas d'Internet. Pas de GPS. Pas de cloud. Messagerie chiffrée pure d'appareil à appareil via LoRa.

---

## Fonctionnalités

| Fonctionnalité | Détails |
|----------------|---------|
| **LoRa Mesh** | Relais multi-sauts avec TTL et déduplication |
| **Chiffrement** | AES-256-GCM avec nonce par message |
| **Interface OLED** | 128×64 SSD1306, 12+ écrans, navigation à 3 boutons |
| **Sécurité** | RNG matériel, stockage chiffré, effacement d'urgence |
| **Batterie** | Surveillance LiPo avec alertes basse/critique |
| **Watchdog** | Watchdog indépendant de 8 secondes pour récupération après plantage |
| **Hors ligne** | Zéro dépendance réseau, entièrement autonome |

---

## Matériel requis

- **RAK3172-E** Evaluation Board (STM32WLE5CC, EU868)
- **SSD1306** écran OLED 128×64 (I2C)
- **3 boutons tactiles** (normalement ouverts, actifs à l'état bas)
- **Batterie LiPo** (3.7V, 1000-2000mAh recommandé)
- **TP4056** ou module chargeur LiPo USB-C similaire
- **Diviseur de tension** (2× résistances 100kΩ pour ADC batterie)
- **Antenne LoRa** (868 MHz, SMA ou U.FL)

Voir [WIRING.md](WIRING.md) pour le schéma de connexion complet.

---

## Structure du projet

```
firmware/
├── platformio.ini          # Configuration de compilation
├── include/
│   ├── config.h            # Toutes les constantes, types, énumérations
│   ├── pins.h              # Définitions des broches matérielles
│   ├── packet.h            # Format binaire des paquets
│   ├── crypto_engine.h     # Interface AES-256-GCM
│   ├── device_identity.h   # Gestion de l'identifiant appareil
│   ├── radio.h             # Abstraction radio LoRa
│   ├── mesh.h              # Moteur de routage mesh
│   ├── message_store.h     # Stockage et files de messages
│   ├── storage.h           # Persistance EEPROM
│   ├── button.h            # Gestionnaire de 3 boutons
│   ├── battery.h           # Moniteur de batterie
│   ├── ui.h                # Affichage OLED et tous les écrans
│   └── state_machine.h     # Machine à états du système
├── src/
│   ├── main.cpp            # Point d'entrée et boucle principale
│   ├── packet.cpp          # Encodage/décodage des paquets
│   ├── crypto_engine.cpp   # AES-GCM + RNG matériel
│   ├── device_identity.cpp # Provisionnement de l'identité
│   ├── radio.cpp           # Pilote RadioLib STM32WLx
│   ├── mesh.cpp            # TTL, dédup, logique de relais
│   ├── message_store.cpp   # Gestion des messages en RAM
│   ├── storage.cpp         # Lecture/écriture EEPROM
│   ├── button.cpp          # Anti-rebond et détection d'événements
│   ├── battery.cpp         # Lecture de tension ADC
│   ├── ui.cpp              # Rendu OLED U8g2
│   └── state_machine.cpp   # Transitions et logique FSM
├── test/
│   └── test_main.cpp       # Harnais de test Unity
├── WIRING.md               # Carte des broches et connexions
└── BOITIER.md              # Spécification de conception du boîtier
```

---

## Compilation et flashage

### Prérequis

1. Installer [PlatformIO](https://platformio.org/install)
2. Installer les pilotes [ST-LINK](https://www.st.com/en/development-tools/stsw-link009.html)
3. Connecter ST-LINK V2 au connecteur SWD du RAK3172-E

### Compilation

```bash
cd firmware
pio run -e rak3172
```

### Flashage

```bash
pio run -e rak3172 --target upload
```

### Moniteur série

```bash
pio device monitor --baud 115200
```

### Exécuter les tests

```bash
pio test -e test
```

---

## Flux du premier démarrage

```
┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌───────┐
│  SPLASH  │────▶│SETUP WELCOME│────▶│ MESH PIN │────▶│DEV ID │────▶ INBOX
│  1.5 sec │     │ Press OK    │     │ 4 digits │     │display │
└─────────┘     └─────────────┘     └──────────┘     └───────┘
```

1. L'appareil démarre et affiche l'écran de démarrage pendant 1,5 seconde
2. Premier démarrage détecté → Écran d'accueil de configuration
3. L'utilisateur saisit un **Mesh PIN** à 4 chiffres (partagé avec tous les membres du groupe)
4. L'appareil génère un identifiant aléatoire et dérive la clé de chiffrement
5. L'identifiant de l'appareil est affiché — à partager avec les pairs
6. Appuyer sur OK → Boîte de réception (prêt à envoyer/recevoir)

### Rejoindre un mesh existant

Saisir le **même Mesh PIN** sur tous les appareils. Tous les appareils avec le même PIN partagent la même clé de chiffrement et peuvent communiquer.

---

## Commandes des boutons

| Contexte | ▲ HAUT | ● OK | ▼ BAS |
|----------|--------|------|-------|
| **Général** | Naviguer vers le haut | Sélectionner/confirmer | Naviguer vers le bas |
| **Maintenir ▲** | Retour | — | — |
| **Maintenir ●** | — | Action contextuelle (envoyer, confirmer) | — |
| **Maintenir ▼** | — | — | Supprimer un caractère |
| **3 boutons maintenus (3s)** | — | **EFFACEMENT D'URGENCE** | — |

---

## Protocole de messagerie

### Format des paquets (binaire, Little-Endian)

```
Offset  Size   Field          Description
──────  ────   ─────          ───────────
0       1      version        Version du protocole (0x01)
1       1      type           PKT_TEXT/ACK/PING/PAIR_REQ/PAIR_ACK
2       4      sender_id      Identifiant de l'appareil source
6       4      dest_id        Destination (0xFFFFFFFF = diffusion)
10      4      msg_id         Identifiant unique du message
14      1      ttl            Sauts restants (défaut : 3, max : 7)
15      1      flags          Masque de bits : burn|ack_req|relayed|priority|encrypted
16      12     nonce          Nonce AES-GCM (aléatoire par message)
28      2      payload_len    Longueur du contenu chiffré
30      N      payload        Contenu chiffré (max 200 octets)
30+N    16     tag            Tag d'authentification AES-GCM
```

**Taille maximale du paquet :** 246 octets (compatible avec la limite de 255 octets de LoRa)

### Chiffrement

- **Algorithme :** AES-256-GCM
- **Dérivation de clé :** SHA-256(mesh_pin + salt)
- **Nonce :** 12 octets, RNG matériel, unique par message
- **AAD :** version + type + sender_id + dest_id + msg_id (14 octets)
- **Tag :** tag d'authentification de 16 octets

### Routage mesh

1. Réception du paquet
2. Vérification du cache de déduplication → rejet si déjà vu dans les 60 secondes
3. Si destiné à nous → déchiffrer et stocker
4. Si diffusion → traiter ET relayer (si TTL > 0)
5. Si destiné à un autre nœud → relayer (décrémenter TTL, activer le flag RELAYED)
6. Délai aléatoire (0-100ms) avant relais pour éviter les collisions

---

## Machine à états

```
      ┌──────────────────────────────────────┐
      │                                      │
      ▼                                      │
   ┌──────┐   provisioned?   ┌──────┐       │
   │ BOOT │──── yes ────────▶│ IDLE │       │
   │      │                  │      │◀──┐   │
   └──┬───┘                  └──┬───┘   │   │
      │ no                      │       │   │
      ▼                      ┌──┴───┐   │   │
   ┌──────┐                  │SEND- │   │   │
   │SETUP │                  │ ING  │───┘   │
   │      │──── done ────────│      │       │
   └──────┘                  └──────┘       │
      │                                      │
      └──── panic ───────────────────────────┘
```

**États :** BOOT → SETUP → IDLE → SENDING → RECEIVING → ERROR

---

## Modèle de sécurité

| Propriété | Implémentation |
|-----------|----------------|
| **Chiffrement** | AES-256-GCM par message |
| **Source de clé** | SHA-256(mesh_pin + salt) |
| **Aléatoire** | STM32 hardware TRNG |
| **Nonce** | 12 octets, unique par message |
| **Protection anti-rejeu** | Cache de déduplication (msg_id, fenêtre de 60s) |
| **Détection de falsification** | Tag d'authentification GCM sur le contenu chiffré + en-tête |
| **Confidentialité du relais** | Les nœuds relais ne peuvent pas déchiffrer le contenu |
| **Effacement d'urgence** | Maintenir les 3 boutons → effacer la Flash |
| **Pas de fuite de débogage** | La sortie série peut être désactivée |
| **Stockage des clés** | EEPROM (Flash intégrée, pas de composant externe) |

---

## Réinitialisation usine / Effacement

**Paramètres → Réinitialisation usine :** Confirmer via l'invite à l'écran. Efface l'identifiant de l'appareil, les clés, les messages et tous les paramètres. L'appareil redémarre en mode Configuration.

**Effacement d'urgence :** Maintenir les 3 boutons pendant 3 secondes. Effacement immédiat de toutes les données. Aucune confirmation requise.

---

## Paramètres LoRa (EU868)

| Paramètre | Valeur |
|-----------|--------|
| Fréquence | 868.0 MHz |
| Bande passante | 125 kHz |
| Facteur d'étalement | 9 |
| Taux de codage | 4/7 |
| Mot de synchronisation | 0x12 (privé) |
| Puissance TX | 14 dBm |
| Préambule | 8 symboles |
| CRC | Activé |

**Portée estimée :** 2-5 km en ligne de vue, 500m-1km en milieu urbain.

---

## Budget mémoire (STM32WLE5CC : 256KB Flash, 64KB RAM)

| Composant | Utilisation RAM |
|-----------|-----------------|
| Tampon d'affichage U8g2 | 1 KB |
| Stockage de messages (32 msgs) | ~8 KB |
| Cache de déduplication (64 entrées) | 768 B |
| Tampons de paquets | 512 B |
| État de l'interface | ~512 B |
| Pile | ~4 KB |
| **Total** | **~15 KB / 64 KB** |

---

## Dépendances

| Bibliothèque | Version | Utilisation |
|--------------|---------|-------------|
| [RadioLib](https://github.com/jgromes/RadioLib) | ^6.6.0 | LoRa via STM32WLx |
| [U8g2](https://github.com/olikraus/U8g2) | ^2.35.19 | Pilote OLED SSD1306 |
| [Crypto](https://github.com/rweather/arduinolibs) | ^0.4.0 | AES-256-GCM |

Toutes gérées automatiquement par PlatformIO. Aucune dépendance externe ou cloud.

---

## Licence

MIT — Voir [LICENSE](../LICENSE)
