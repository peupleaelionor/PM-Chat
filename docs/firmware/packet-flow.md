# PM-Chat — Flux de paquets

> Spécification complète du cycle de vie des paquets — Firmware LoRa Mesh v1.0  
> Cible matérielle : RAK3172-E (STM32WLE5CC)

---

## Table des matières

1. [Structure du paquet](#structure-du-paquet)
2. [Flux d'encodage (émission)](#flux-dencodage-émission)
3. [Flux de décodage (réception)](#flux-de-décodage-réception)
4. [Flux de relais](#flux-de-relais)
5. [Flux d'acquittement (ACK)](#flux-dacquittement-ack)
6. [Cas d'erreur](#cas-derreur)
7. [Exemple de vidage hexadécimal](#exemple-de-vidage-hexadécimal)

---

## Structure du paquet

### Format binaire (little-endian)

```
┌──────────────────── En-tête (30 octets) ────────────────────┐
│                                                              │
│  Offset  Taille  Champ         Description                   │
│  ──────  ──────  ───────────── ────────────────────────────  │
│  0       1       version       Version du protocole (0x01)   │
│  1       1       type          Type de paquet                │
│  2       4       sender_id     ID émetteur (LE)              │
│  6       4       dest_id       ID destinataire (LE)          │
│  10      4       msg_id        Identifiant message (LE)      │
│  14      1       ttl           Sauts restants                │
│  15      1       flags         Drapeaux (bitmask)            │
│  16      12      nonce         Nonce AES-GCM                 │
│  28      2       payload_len   Longueur payload (LE)         │
│                                                              │
├──────────────────── Charge utile (N octets) ────────────────┤
│  30      N       payload       Texte chiffré (max 200)       │
│                                                              │
├──────────────────── Tag (16 octets) ────────────────────────┤
│  30+N    16      tag           Tag d'authentification GCM    │
└──────────────────────────────────────────────────────────────┘

Taille totale : 30 + N + 16 = 46 à 246 octets
Limite LoRa : 255 octets → marge de 9 octets
```

### Types de paquets (`PacketType`)

| Valeur | Nom | Description |
|--------|-----|-------------|
| `0x01` | `PKT_TEXT` | Message texte chiffré |
| `0x02` | `PKT_ACK` | Acquittement de réception |
| `0x03` | `PKT_PING` | Ping de découverte |
| `0x04` | `PKT_PAIR_REQ` | Demande d'appairage |
| `0x05` | `PKT_PAIR_ACK` | Confirmation d'appairage |

### Drapeaux (`PacketFlag`)

| Bit | Valeur | Nom | Description |
|-----|--------|-----|-------------|
| 0 | `0x01` | `FLAG_BURN` | Message à détruire après lecture |
| 1 | `0x02` | `FLAG_ACK_REQ` | Acquittement demandé |
| 2 | `0x04` | `FLAG_RELAYED` | Paquet relayé (ajouté par un nœud intermédiaire) |
| 3 | `0x08` | `FLAG_PRIORITY` | Priorité haute |
| 4 | `0x10` | `FLAG_ENCRYPTED` | Charge utile chiffrée |

### Données additionnelles authentifiées (AAD)

L'AAD est construit à partir des champs immuables de l'en-tête. Ces champs ne sont **jamais modifiés** lors du relais mesh, ce qui garantit l'intégrité de bout en bout.

```
AAD (14 octets) :
  Offset  Taille  Champ
  0       1       version
  1       1       type
  2       4       sender_id (LE)
  6       4       dest_id   (LE)
  10      4       msg_id    (LE)
```

Les champs `ttl` et `flags` sont exclus de l'AAD car ils sont modifiés par les nœuds relais (décrémentation du TTL, ajout de `FLAG_RELAYED`).

---

## Flux d'encodage (émission)

```
Utilisateur                UI              State Machine         Crypto           Packet          Mesh            Radio
    │                       │                    │                  │                │               │               │
    │  Compose texte        │                    │                  │                │               │               │
    │  + OK long            │                    │                  │                │               │               │
    │─────────────────────>│                    │                  │                │               │               │
    │                       │  SCR_SENDING       │                  │                │               │               │
    │                       │──────────────────>│                  │                │               │               │
    │                       │                    │                  │                │               │               │
    │                       │                    │ 1. Créer Packet  │                │               │               │
    │                       │                    │    version=0x01  │                │               │               │
    │                       │                    │    type=PKT_TEXT │                │               │               │
    │                       │                    │    dest_id       │                │               │               │
    │                       │                    │    msg_id=random │                │               │               │
    │                       │                    │    flags=ACK|ENC │                │               │               │
    │                       │                    │                  │                │               │               │
    │                       │                    │ 2. Générer nonce │                │               │               │
    │                       │                    │────────────────>│                │               │               │
    │                       │                    │  12 octets RNG  │                │               │               │
    │                       │                    │<────────────────│                │               │               │
    │                       │                    │                  │                │               │               │
    │                       │                    │ 3. Construire AAD│               │               │               │
    │                       │                    │────────────────────────────────>│               │               │
    │                       │                    │  14 octets (ver+type+ids+msg)  │               │               │
    │                       │                    │<────────────────────────────────│               │               │
    │                       │                    │                  │                │               │               │
    │                       │                    │ 4. Chiffrer      │                │               │               │
    │                       │                    │────────────────>│                │               │               │
    │                       │                    │  encrypt(key,    │                │               │               │
    │                       │                    │   nonce, aad,    │                │               │               │
    │                       │                    │   plaintext)     │                │               │               │
    │                       │                    │  → ct + tag      │                │               │               │
    │                       │                    │<────────────────│                │               │               │
    │                       │                    │                  │                │               │               │
    │                       │                    │ 5. Envoyer via mesh              │               │               │
    │                       │                    │──────────────────────────────────────────────>│               │
    │                       │                    │  mesh::send_packet(p)            │               │               │
    │                       │                    │  → set sender_id, ttl=3          │               │               │
    │                       │                    │  → dedup_add(self)               │               │               │
    │                       │                    │  → pkt::encode(p, buf)           │               │               │
    │                       │                    │                  │                │               │               │
    │                       │                    │                  │                │  6. Encoder   │               │
    │                       │                    │                  │                │<──────────────│               │
    │                       │                    │                  │                │  wire format  │               │
    │                       │                    │                  │                │──────────────>│               │
    │                       │                    │                  │                │               │               │
    │                       │                    │                  │                │               │ 7. Émettre    │
    │                       │                    │                  │                │               │──────────────>│
    │                       │                    │                  │                │               │ radio::send() │
    │                       │                    │                  │                │               │  → LoRa TX    │
    │                       │                    │                  │                │               │  → startRx()  │
    │                       │                    │                  │                │               │               │
```

### Étapes détaillées

1. **Composition** : L'utilisateur rédige un message via l'écran `SCR_COMPOSE` (jeu de caractères rotatif). La pression longue sur OK déclenche l'envoi.

2. **Construction du paquet** :
   - `version` ← `PROTOCOL_VERSION` (0x01)
   - `type` ← `PKT_TEXT` (0x01)
   - `dest_id` ← ID du pair ou `BROADCAST_ID`
   - `msg_id` ← `crypto::random_u32()`
   - `flags` ← `FLAG_ACK_REQ | FLAG_ENCRYPTED`

3. **Génération du nonce** : 12 octets via le RNG matériel STM32 (`crypto::random_bytes()`).

4. **Construction de l'AAD** : `pkt::build_aad()` assemble 14 octets depuis les champs immuables.

5. **Chiffrement** : `crypto::encrypt()` effectue AES-256-GCM avec la clé réseau, le nonce, l'AAD et le texte en clair. Produit le texte chiffré et un tag d'authentification de 16 octets.

6. **Envoi mesh** : `mesh::send_packet()` positionne `sender_id`, `ttl = 3`, ajoute l'entrée dans le cache de déduplication local, et encode le paquet au format fil.

7. **Émission radio** : `radio::send()` transmet le tampon via LoRa (bloquant), puis repasse en mode réception.

---

## Flux de décodage (réception)

```
Radio           Mesh                Packet          Crypto          State Machine         Msg Store       UI
  │               │                    │               │                  │                   │            │
  │ DIO1 IRQ      │                    │               │                  │                   │            │
  │ s_rx_flag=true │                   │               │                  │                   │            │
  │               │                    │               │                  │                   │            │
  │               │                    │               │  process_radio() │                   │            │
  │               │                    │               │<─────────────────│                   │            │
  │               │                    │               │                  │                   │            │
  │ 1. Lire buf   │                    │               │                  │                   │            │
  │<──────────────────────────────────────────────────│                  │                   │            │
  │ radio::receive │                   │               │                  │                   │            │
  │──────────────>│                    │               │                  │                   │            │
  │  buf, len      │                   │               │                  │                   │            │
  │               │                    │               │                  │                   │            │
  │               │ 2. Décoder         │               │                  │                   │            │
  │               │───────────────────>│               │                  │                   │            │
  │               │ pkt::decode()      │               │                  │                   │            │
  │               │<───────────────────│               │                  │                   │            │
  │               │                    │               │                  │                   │            │
  │               │ 3. Rejeter si self │               │                  │                   │            │
  │               │ 4. Déduplication   │               │                  │                   │            │
  │               │ 5. Vérifier TTL    │               │                  │                   │            │
  │               │ 6. Relayer si néc. │               │                  │                   │            │
  │               │                    │               │                  │                   │            │
  │               │ 7. Si pour nous    │               │                  │                   │            │
  │               │──────────────────────────────────>│                  │                   │            │
  │               │  Packet out_pkt    │               │                  │                   │            │
  │               │                    │               │                  │                   │            │
  │               │                    │               │  8. Build AAD    │                   │            │
  │               │                    │               │<─────────────────│                   │            │
  │               │                    │               │                  │                   │            │
  │               │                    │               │  9. Déchiffrer   │                   │            │
  │               │                    │               │<─────────────────│                   │            │
  │               │                    │               │  decrypt(key,    │                   │            │
  │               │                    │               │   nonce, aad,    │                   │            │
  │               │                    │               │   ct, tag)       │                   │            │
  │               │                    │               │  → plaintext     │                   │            │
  │               │                    │               │──────────────────>                   │            │
  │               │                    │               │                  │                   │            │
  │               │                    │               │                  │ 10. Stocker       │            │
  │               │                    │               │                  │──────────────────>│            │
  │               │                    │               │                  │ add_incoming()    │            │
  │               │                    │               │                  │                   │            │
  │               │                    │               │                  │ 11. Notifier      │            │
  │               │                    │               │                  │─────────────────────────────>│
  │               │                    │               │                  │ toast + wake      │            │
  │               │                    │               │                  │                   │            │
  │               │                    │               │                  │ 12. Envoyer ACK   │            │
  │               │                    │               │                  │ (si FLAG_ACK_REQ) │            │
  │               │                    │               │                  │──────────────────>│            │
```

### Étapes détaillées

1. **Réception radio** : L'interruption DIO1 positionne `s_rx_flag`. `radio::receive()` lit le tampon et mesure RSSI/SNR.

2. **Décodage** : `pkt::decode()` valide la version du protocole, vérifie les tailles, et reconstruit la structure `Packet`.

3. **Filtrage de l'émetteur** : Les paquets émis par nous-mêmes (même `sender_id`) sont ignorés.

4. **Déduplication** : Vérification dans le cache circulaire de 64 entrées. Un paquet déjà vu dans les 60 dernières secondes est rejeté.

5. **Validation du TTL** : Les paquets avec `ttl > MESH_MAX_TTL` (7) sont rejetés comme suspects.

6. **Relais** : Si le paquet n'est pas exclusivement destiné à cet appareil et que `ttl > 0`, il est relayé (voir [flux de relais](#flux-de-relais)).

7. **Livraison** : Si `dest_id` correspond à notre ID ou à `BROADCAST_ID`, le paquet est transmis au state machine.

8. **Construction de l'AAD** : Identique à l'émission (14 octets depuis les champs immuables).

9. **Déchiffrement** : `crypto::decrypt()` vérifie le tag GCM. Si l'authentification échoue, le paquet est silencieusement ignoré.

10. **Stockage** : `msg_store::add_incoming()` crée une entrée dans le tampon de messages. Les doublons par `(sender_id, msg_id)` sont rejetés.

11. **Notification** : `ui::wake()` réveille l'écran. `ui::toast("New message!")` affiche une notification temporaire.

12. **Acquittement** : Si `FLAG_ACK_REQ` est positionné, un paquet `PKT_ACK` est envoyé au `sender_id` avec le même `msg_id`.

---

## Flux de relais

```
Nœud A                Nœud B (relais)              Nœud C
  │                       │                           │
  │  Paquet (TTL=3)       │                           │
  │──────────────────────>│                           │
  │                       │                           │
  │                       │ 1. decode()               │
  │                       │ 2. is_duplicate? → non    │
  │                       │ 3. dedup_add()            │
  │                       │ 4. ttl > MESH_MAX_TTL? non│
  │                       │ 5. for_us? → non          │
  │                       │    (dest_id ≠ B et ≠ BC)  │
  │                       │                           │
  │                       │ 6. ttl > 0 → relais:      │
  │                       │    ttl = 3 - 1 = 2        │
  │                       │    flags |= FLAG_RELAYED  │
  │                       │    encode → nouveau buf   │
  │                       │    delay(random 0-100ms)  │
  │                       │    radio::send()          │
  │                       │                           │
  │                       │  Paquet (TTL=2, RELAYED)  │
  │                       │──────────────────────────>│
  │                       │                           │
  │                       │                           │ decode()
  │                       │                           │ is_duplicate? → non
  │                       │                           │ for_us? → oui
  │                       │                           │ → déchiffrement
  │                       │                           │ → affichage
```

### Règles de relais

| Condition | Action |
|-----------|--------|
| `sender_id == my_id` | Ignorer (paquet de nous-mêmes) |
| Doublon détecté | Ignorer (incrémenter `dropped`) |
| `ttl > MESH_MAX_TTL` | Ignorer (paquet suspect) |
| `ttl == 0` | Ne pas relayer |
| `dest_id == my_id` | Ne pas relayer (destiné uniquement à nous) |
| `dest_id == BROADCAST_ID` et `ttl > 0` | Relayer + traiter localement |
| `dest_id != my_id` et `ttl > 0` | Relayer uniquement |

### Anti-collision

Le relais intègre un délai aléatoire de 0 à 100 ms (`crypto::random_u32() % MESH_RELAY_DELAY`) pour éviter que plusieurs nœuds ne retransmettent simultanément et ne provoquent des collisions radio.

---

## Flux d'acquittement (ACK)

```
Nœud A (émetteur)              Nœud B (destinataire)
    │                               │
    │  PKT_TEXT (FLAG_ACK_REQ)      │
    │  msg_id = 0x1234              │
    │──────────────────────────────>│
    │                               │
    │                               │ Déchiffrement OK
    │                               │ Stocker message
    │                               │
    │                               │ Construire ACK :
    │                               │   type = PKT_ACK
    │                               │   dest_id = A
    │                               │   msg_id = 0x1234
    │                               │   flags = 0
    │                               │   payload_len = 0
    │                               │
    │  PKT_ACK                      │
    │  msg_id = 0x1234              │
    │<──────────────────────────────│
    │                               │
    │ Rechercher msg_id 0x1234      │
    │ dans msg_store                │
    │ → MSTATE_DELIVERED            │
    │                               │
```

### Caractéristiques de l'ACK

- Le paquet ACK est **non chiffré** (`payload_len = 0`, aucune charge utile).
- Le `msg_id` de l'ACK reprend celui du message original pour le rapprochement.
- L'ACK transite par le mesh comme tout autre paquet (multi-saut, déduplication).
- L'émetteur identifie l'ACK en parcourant son `msg_store` à la recherche d'un message sortant avec le même `msg_id`.
- Si l'ACK n'est pas reçu, le message est re-tenté jusqu'à 3 fois (`MSG_RETRY_MAX`) avec un backoff exponentiel basé sur `MSG_RETRY_BASE_MS` (2 s).

---

## Cas d'erreur

### Version de protocole incorrecte

```
Réception d'un paquet avec version ≠ 0x01
    │
    ▼
pkt::decode() retourne false
    │
    ▼
mesh::process_incoming() → s_dropped++, retourne false
    │
    ▼
Paquet ignoré silencieusement
```

### Paquet tronqué

```
Réception d'un tampon de taille < 46 octets (en-tête + tag)
    │
    ▼
pkt::decode() : len < PACKET_HEADER_SIZE + PACKET_TAG_SIZE
    │
    ▼
Retourne false → paquet ignoré
```

### Charge utile surdimensionnée

```
payload_len > 200 dans l'en-tête
    │
    ▼
pkt::decode() rejette le paquet
    │
    ▼
Paquet ignoré, compteur dropped incrémenté
```

### Paquet altéré (tag GCM invalide)

```
Paquet avec texte chiffré ou tag modifiés en transit
    │
    ▼
pkt::decode() réussit (format valide)
mesh::process_incoming() réussit (pour nous)
    │
    ▼
crypto::decrypt() : gcm.checkTag() échoue
    │
    ▼
handle_text_packet() → retourne immédiatement
Paquet ignoré, aucune notification utilisateur
```

### Rejeu (paquet en double)

```
Même paquet reçu une seconde fois (via relais ou écho)
    │
    ▼
mesh::process_incoming()
    │
    ▼
is_duplicate(sender_id, msg_id) == true
    │
    ▼
s_dropped++, retourne false
```

### Tampon d'encodage insuffisant

```
pkt::encode() : total > buf_size
    │
    ▼
Retourne 0
    │
    ▼
mesh::send_packet() retourne false
    │
    ▼
Message reste en file, re-tentative au prochain tick
```

---

## Exemple de vidage hexadécimal

### Paquet texte chiffré « HELLO » (5 octets de charge utile)

```
Paquet original en mémoire :
  version     = 0x01
  type        = 0x01 (PKT_TEXT)
  sender_id   = 0x12345678
  dest_id     = 0xAABBCCDD
  msg_id      = 0x00001234
  ttl         = 0x03
  flags       = 0x12 (FLAG_ACK_REQ | FLAG_ENCRYPTED)
  nonce       = AB AB AB AB AB AB AB AB AB AB AB AB
  payload_len = 0x0005
  payload     = [5 octets chiffrés]
  tag         = [16 octets authentification]
```

### Format fil (51 octets total = 30 + 5 + 16)

```
Offset  Hex                                           ASCII
──────  ────────────────────────────────────────────  ─────
0x00    01 01 78 56 34 12 DD CC BB AA 34 12 00 00     ..xV4...4...
0x0E    03 12 AB AB AB AB AB AB AB AB AB AB AB AB     ................
0x1C    05 00                                         ..
        ── En-tête (30 octets) ──────────────────────────

0x1E    E7 A3 9F 2B C1                                ...+.
        ── Charge utile chiffrée (5 octets) ──────────

0x23    CD CD CD CD CD CD CD CD CD CD CD CD CD CD     ..............
0x31    CD CD                                         ..
        ── Tag GCM (16 octets) ──────────────────────

Total : 51 octets (0x33)
```

### Décomposition champ par champ

```
01              → version = 1
01              → type = PKT_TEXT
78 56 34 12     → sender_id = 0x12345678 (LE)
DD CC BB AA     → dest_id   = 0xAABBCCDD (LE)
34 12 00 00     → msg_id    = 0x00001234 (LE)
03              → ttl = 3
12              → flags = 0x12 (ACK_REQ | ENCRYPTED)
AB AB AB AB AB AB AB AB AB AB AB AB
                → nonce (12 octets)
05 00           → payload_len = 5 (LE)
E7 A3 9F 2B C1 → payload chiffré (5 octets)
CD CD CD CD CD CD CD CD CD CD CD CD CD CD CD CD
                → tag GCM (16 octets)
```

### AAD correspondant (14 octets)

```
01 01 78 56 34 12 DD CC BB AA 34 12 00 00
│  │  └──────────┘ └──────────┘ └──────────┘
│  │   sender_id    dest_id      msg_id
│  └── type
└───── version
```

### Paquet ACK correspondant (46 octets = 30 + 0 + 16)

```
01              → version = 1
02              → type = PKT_ACK
[sender_id B]   → ID du nœud B (LE)
78 56 34 12     → dest_id = 0x12345678 (nœud A, LE)
34 12 00 00     → msg_id = 0x00001234 (même que l'original, LE)
03              → ttl = 3
00              → flags = 0x00
00 00 00 00 00 00 00 00 00 00 00 00
                → nonce (12 octets, non utilisé)
00 00           → payload_len = 0
[aucune charge utile]
00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
                → tag (16 octets, non utilisé)
```
