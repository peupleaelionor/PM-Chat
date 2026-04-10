# PM-Chat — Flux de sécurité

> Modèle cryptographique et mécanismes de protection — Firmware LoRa Mesh v1.0  
> Cible matérielle : RAK3172-E (STM32WLE5CC)

---

## Table des matières

1. [Génération de clé](#génération-de-clé)
2. [Flux de chiffrement](#flux-de-chiffrement)
3. [Flux de déchiffrement](#flux-de-déchiffrement)
4. [Stratégie de nonce](#stratégie-de-nonce)
5. [Protection contre le rejeu](#protection-contre-le-rejeu)
6. [Effacement d'urgence (panic wipe)](#effacement-durgence-panic-wipe)
7. [Mise à zéro sécurisée de la mémoire](#mise-à-zéro-sécurisée-de-la-mémoire)
8. [Stockage local des secrets](#stockage-local-des-secrets)
9. [Limitations connues](#limitations-connues)
10. [Améliorations futures](#améliorations-futures)

---

## Génération de clé

### Dérivation de la clé réseau

La clé de chiffrement AES-256 est dérivée du code PIN mesh saisi par l'utilisateur lors du provisionnement initial.

```
Entrée :
  pin  = "1234"                          (4 chiffres ASCII)
  salt = "PM-CHAT-MESH-KEY-V1"          (19 octets, constante codée en dur)

Processus :
  SHA-256( pin || salt )

Sortie :
  key[32] = SHA-256("1234PM-CHAT-MESH-KEY-V1")
          = clé AES-256 de 256 bits
```

### Implémentation

```cpp
void crypto::derive_key(const char *pin, uint8_t *key) {
    SHA256 sha;
    sha.reset();
    sha.update(pin, strlen(pin));          // "1234" → 4 octets
    sha.update(KEY_SALT, strlen(KEY_SALT)); // "PM-CHAT-MESH-KEY-V1" → 19 octets
    sha.finalize(key, KEY_SIZE);           // → 32 octets SHA-256
}
```

### Propriétés

| Propriété | Valeur |
|-----------|--------|
| Algorithme | SHA-256 (une seule passe) |
| Sel | `PM-CHAT-MESH-KEY-V1` (fixe, public) |
| Taille de la clé | 256 bits (32 octets) |
| Déterministe | Oui — même PIN → même clé sur tous les appareils |
| Sensibilité | Un même code PIN génère la même clé réseau, ce qui permet la communication au sein du groupe mesh |

### Flux complet de provisionnement

```
Premier démarrage
       │
       ▼
Saisie du code PIN mesh (4 chiffres, écran SCR_SETUP_PIN)
       │
       ▼
identity::provision(pin)
       │
       ├── 1. Générer device_id = crypto::random_u32()
       │      (éviter 0x00000000 et 0xFFFFFFFF)
       │
       ├── 2. Dériver la clé réseau :
       │      crypto::derive_key(pin, net_key)
       │
       ├── 3. Persister en EEPROM :
       │      ├── ADDR_DEVICE_ID  ← device_id  (4 octets)
       │      ├── ADDR_NET_KEY    ← net_key     (32 octets)
       │      ├── ADDR_MESH_PIN   ← pin digits  (4 octets)
       │      ├── ADDR_MSG_COUNTER ← 0          (4 octets)
       │      ├── ADDR_PIN_ENABLED ← 0          (1 octet)
       │      ├── ADDR_BRIGHTNESS  ← 200        (1 octet)
       │      └── ADDR_MAGIC       ← 0x504D4348 (4 octets, "PMCH")
       │
       └── 4. storage::commit()
```

---

## Flux de chiffrement

### Vue d'ensemble

```
Texte en clair ──┐
                 │
Clé réseau ──────┤
                 ├──▶ AES-256-GCM ──▶ Texte chiffré (N octets)
Nonce (12 B) ────┤                    Tag GCM (16 octets)
                 │
AAD (14 B) ──────┘
```

### Étapes détaillées

```
1. VALIDATION
   │
   └── payload_len ≤ PACKET_MAX_PAYLOAD (200) ?
       ├── non → retourne false
       └── oui → continuer

2. INITIALISATION GCM
   │
   ├── GCM<AES256> gcm
   ├── gcm.clear()
   ├── gcm.setKey(key, 32)        ← clé AES-256
   └── gcm.setIV(nonce, 12)       ← nonce unique par message

3. DONNÉES AUTHENTIFIÉES
   │
   └── gcm.addAuthData(aad, 14)
       │
       └── AAD = version (1) + type (1) + sender_id (4)
                 + dest_id (4) + msg_id (4) = 14 octets
           Ces champs sont authentifiés mais non chiffrés.
           Toute modification invalide le tag.

4. CHIFFREMENT
   │
   └── gcm.encrypt(ct, pt, pt_len)
       │
       └── Le texte en clair est transformé en texte chiffré
           de même longueur (chiffrement par flux CTR).

5. CALCUL DU TAG
   │
   └── gcm.computeTag(tag, 16)
       │
       └── Tag d'authentification de 128 bits couvrant
           l'AAD et le texte chiffré.

6. NETTOYAGE
   │
   └── gcm.clear()
       │
       └── Mise à zéro interne de l'état GCM.
```

### Garanties

| Garantie | Mécanisme |
|----------|-----------|
| **Confidentialité** | AES-256 en mode CTR (via GCM) |
| **Intégrité** | Tag GCM de 128 bits sur le texte chiffré |
| **Authenticité de l'en-tête** | AAD couvre les 14 octets immuables de l'en-tête |
| **Protection contre la modification** | Toute altération du texte chiffré, de l'AAD ou du tag invalide le déchiffrement |

---

## Flux de déchiffrement

### Étapes détaillées

```
1. VALIDATION
   │
   └── ct_len ≤ PACKET_MAX_PAYLOAD (200) ?
       ├── non → retourne false
       └── oui → continuer

2. INITIALISATION GCM
   │
   ├── GCM<AES256> gcm
   ├── gcm.clear()
   ├── gcm.setKey(key, 32)
   └── gcm.setIV(nonce, 12)

3. DONNÉES AUTHENTIFIÉES
   │
   └── gcm.addAuthData(aad, 14)
       │
       └── L'AAD doit être identique à celui utilisé
           lors du chiffrement.

4. DÉCHIFFREMENT
   │
   └── gcm.decrypt(pt, ct, ct_len)
       │
       └── Le texte chiffré est transformé en texte
           en clair de même longueur.

5. VÉRIFICATION DU TAG
   │
   └── gcm.checkTag(tag, 16)
       │
       ├── true  → Authentification réussie, texte valide
       └── false → Altération détectée, paquet rejeté

6. NETTOYAGE
   │
   └── gcm.clear()
```

### Comportement en cas d'échec

```
crypto::decrypt() retourne false
       │
       ▼
handle_text_packet() → return (sortie immédiate)
       │
       ▼
Aucune notification utilisateur
Aucune entrée dans msg_store
Le paquet est silencieusement ignoré
```

**Justification** : ne pas informer l'utilisateur d'un échec de déchiffrement évite la fuite d'information sur les tentatives d'injection.

---

## Stratégie de nonce

### Génération

Le nonce est un bloc de **12 octets** (96 bits) généré par le RNG matériel du STM32WLE5.

```cpp
crypto::random_bytes(p.nonce, NONCE_SIZE);  // NONCE_SIZE = 12
```

### Source matérielle

```
STM32 RNG (périphérique matériel)
       │
       ▼
HAL_RNG_GenerateRandomNumber(&s_hrng, &val)
       │
       └── Produit 4 octets par appel
           3 appels nécessaires pour 12 octets de nonce
```

### Propriétés

| Propriété | Valeur |
|-----------|--------|
| Taille | 96 bits (12 octets) |
| Source | RNG matériel STM32 (TRNG conforme NIST SP 800-90B) |
| Unicité | Probabilité de collision : ~2^(-48) après 2^24 messages |
| Par message | Chaque message possède son propre nonce unique |
| Transmis en clair | Le nonce est inclus dans l'en-tête du paquet (octets 16–27) |

### Fallback logiciel

Si le RNG matériel n'est pas disponible (`HAL_RNG_Init` échoue) :

```cpp
buf[i] = (uint8_t)(micros() ^ (analogRead(PB3) & 0xFF) ^ (i * 37));
```

Ce fallback n'est **pas cryptographiquement sécurisé**. Un message d'avertissement est émis sur le port série. Ce chemin ne devrait jamais être emprunté sur le STM32WLE5, qui possède un RNG matériel intégré.

---

## Protection contre le rejeu

### Mécanisme

La protection contre le rejeu repose sur un **cache de déduplication** au niveau de la couche mesh.

```
Réception d'un paquet
       │
       ▼
is_duplicate(sender_id, msg_id)
       │
       ├── Parcours linéaire des 64 entrées du cache
       │   Recherche d'une entrée où :
       │     entry.sender_id == paquet.sender_id
       │     entry.msg_id    == paquet.msg_id
       │     (now - entry.timestamp) < 60 000 ms
       │
       ├── Trouvé → REJET (doublon)
       │   s_dropped++
       │   retourne false
       │
       └── Non trouvé → ACCEPTER
           dedup_add(sender_id, msg_id)
           │
           └── Écriture dans le cache circulaire
               s_dedup[s_dedup_head] = { sender_id, msg_id, now }
               s_dedup_head = (s_dedup_head + 1) % 64
```

### Paramètres

| Paramètre | Valeur | Justification |
|-----------|--------|---------------|
| `MESH_DEDUP_SIZE` | 64 entrées | Suffisant pour un trafic mesh modéré (~1 msg/s) |
| `MESH_DEDUP_TTL_MS` | 60 000 ms (1 min) | Couvre le temps de propagation multi-saut (max ~3 sauts × ~1 s) |
| Clé de déduplication | `(sender_id, msg_id)` | Identifie de manière unique chaque message émis |

### Purge périodique

```
mesh::tick() — appelé chaque itération de la boucle principale
       │
       ▼
Pour chaque entrée du cache :
  si timestamp ≠ 0 et (now - timestamp) > 60 000 ms :
    → mise à zéro de l'entrée (timestamp, sender_id, msg_id = 0)
```

### Couche supplémentaire (msg_store)

Le `msg_store` effectue une vérification de doublon additionnelle à l'ajout :

```cpp
for (int i = 0; i < s_count; i++) {
    if (s_msgs[i].msg_id == msg_id && s_msgs[i].sender_id == sender_id) {
        return -1;  // doublon → rejet
    }
}
```

Cette double vérification protège contre les cas où le cache mesh a expiré mais le message est encore en mémoire.

---

## Effacement d'urgence (panic wipe)

### Déclenchement

```
Les 3 boutons (UP + OK + DOWN) maintenus simultanément
       │
       ▼
button::poll() — détection de panique :
  si s_btns[0].pressed && s_btns[1].pressed && s_btns[2].pressed :
    si s_panic_start == 0 :
      s_panic_start = now           ← début du chrono
    sinon si (now - s_panic_start) ≥ 3 000 ms :
      retourne BTN_PANIC            ← confirmation après 3 secondes
```

### Séquence d'effacement

```
BTN_PANIC détecté dans main.cpp::loop()
       │
       ▼
fsm::panic_wipe()
       │
       ├── 1. msg_store::clear()
       │       ├── Pour chaque message : memset(text, 0)
       │       └── memset(s_msgs, 0, sizeof(s_msgs))
       │       └── s_count = 0
       │
       ├── 2. crypto::secure_zero(s_net_key, KEY_SIZE)
       │       └── Mise à zéro sécurisée de la clé réseau en RAM
       │           (technique du pointeur volatile, voir section suivante)
       │
       ├── 3. identity::wipe()
       │       ├── crypto::secure_zero(s_net_key, KEY_SIZE)  ← copie locale
       │       ├── crypto::secure_zero(s_mesh_pin, 5)        ← PIN en RAM
       │       ├── s_device_id = 0
       │       ├── s_key_loaded = false
       │       ├── storage::erase_all()
       │       │       └── Pour i = 0..255 : EEPROM.write(i, 0xFF)
       │       └── storage::commit()
       │
       ├── 4. ui::toast("WIPED!", 3000)
       │
       └── 5. Transition :
              s_state → STATE_SETUP
              s_screen → SCR_SETUP_WELCOME
```

### Données effacées

| Donnée | Localisation | Méthode d'effacement |
|--------|-------------|---------------------|
| Clé réseau | RAM (`s_net_key` dans `state_machine.cpp`) | `crypto::secure_zero()` |
| Clé réseau | RAM (`s_net_key` dans `device_identity.cpp`) | `crypto::secure_zero()` |
| Code PIN mesh | RAM (`s_mesh_pin`) | `crypto::secure_zero()` |
| ID appareil | RAM (`s_device_id`) | Assignation à 0 |
| Messages (texte) | RAM (`s_msgs[]`) | `memset(text, 0)` puis `memset` global |
| Identité complète | EEPROM (256 octets) | `storage::erase_all()` → 0xFF sur toutes les adresses |
| Nombre magique | EEPROM (adresse 0) | Écrasé par 0xFF → appareil non provisionné |

---

## Mise à zéro sécurisée de la mémoire

### Problème

Les compilateurs optimiseurs peuvent supprimer les appels `memset()` sur des tampons qui ne sont plus lus par la suite. Un `memset(key, 0, 32)` suivi d'aucune lecture peut être optimisé et éliminé du code compilé, laissant la clé en mémoire.

### Solution : pointeur volatile

```cpp
void crypto::secure_zero(void *buf, uint16_t len) {
    volatile uint8_t *p = (volatile uint8_t *)buf;
    while (len--) {
        *p++ = 0;
    }
}
```

Le mot-clé `volatile` indique au compilateur que chaque écriture a un effet observable et ne peut être éliminée. Cette technique est conforme aux recommandations de sécurité pour l'effacement de mémoire sensible.

### Utilisation dans le firmware

| Contexte | Appel |
|----------|-------|
| Panic wipe — clé réseau FSM | `crypto::secure_zero(s_net_key, KEY_SIZE)` |
| Identity wipe — clé réseau locale | `crypto::secure_zero(s_net_key, KEY_SIZE)` |
| Identity wipe — PIN mesh | `crypto::secure_zero(s_mesh_pin, sizeof(s_mesh_pin))` |

---

## Stockage local des secrets

### Carte EEPROM (256 octets)

```
Adresse  Taille  Champ               Sensibilité
───────  ──────  ──────────────────  ───────────────────
0x00     4       Nombre magique       Non sensible
0x04     4       ID appareil          Faible (public)
0x08     32      Clé réseau AES-256   ★ CRITIQUE ★
0x28     1       PIN lock activé      Non sensible
0x29     4       Hash du PIN lock     Moyenne
0x2D     1       Luminosité           Non sensible
0x2E     4       Compteur messages    Non sensible
0x32     4       Code PIN mesh        ★ SENSIBLE ★
0x36     202     Réservé (0xFF)       —
```

### Protection physique

| Menace | Protection | Niveau |
|--------|-----------|--------|
| Lecture EEPROM via SWD/JTAG | Aucune (debug non désactivé) | ⚠ Insuffisant en production |
| Lecture physique de la Flash | Aucune (pas de Read-Out Protection) | ⚠ Insuffisant en production |
| Extraction de la clé réseau | La clé est stockée en clair en EEPROM | ⚠ Vulnérable à l'accès physique |
| Extraction du PIN mesh | Le PIN est stocké en clair en EEPROM | ⚠ Vulnérable à l'accès physique |

### Recommandations pour la production

1. Activer le **Read-Out Protection (RDP)** niveau 1 ou 2 du STM32
2. Désactiver le **SWD** en production
3. Chiffrer la clé réseau avec une clé dérivée d'un secret matériel (OTP fuses)

---

## Limitations connues

### 1. Code PIN à 4 chiffres

```
Espace de recherche : 10^4 = 10 000 combinaisons
Temps de force brute (hors ligne) : < 1 seconde
```

Le code PIN mesh est la seule entrée de la dérivation de clé. Avec un SHA-256 unique (pas de KDF itérative), un attaquant disposant d'un seul message chiffré peut tester les 10 000 combinaisons en quelques millisecondes.

### 2. Clé réseau partagée

Tous les appareils d'un même groupe mesh partagent la même clé réseau. Un appareil compromis compromet l'ensemble du réseau.

```
Appareil A ─┐
Appareil B ─┤── même PIN → même clé SHA-256 → même AES-256
Appareil C ─┘
```

### 3. Pas de clés par pair

Il n'existe pas de canal sécurisé entre deux appareils spécifiques. Tout membre du groupe peut déchiffrer tout message, y compris ceux adressés à un pair spécifique via `dest_id`.

### 4. Sel fixe et public

Le sel `PM-CHAT-MESH-KEY-V1` est codé en dur dans le firmware et identique pour tous les appareils. Il ne contribue pas à la sécurité contre la force brute.

### 5. SHA-256 unique (pas de KDF itérative)

L'absence de fonction de dérivation de clé itérative (PBKDF2, bcrypt, Argon2) rend la force brute triviale.

### 6. Pas de forward secrecy

Si la clé réseau est compromise, tous les messages passés (capturés) peuvent être déchiffrés.

### 7. Nonce non lié à un compteur

Le nonce est aléatoire (12 octets RNG matériel), ce qui est acceptable pour GCM. Cependant, après ~2^24 messages avec la même clé, la probabilité de collision de nonce dépasse les marges de sécurité recommandées par le NIST pour GCM.

### 8. Stockage EEPROM en clair

La clé réseau et le code PIN mesh sont stockés en clair dans l'EEPROM émulée. L'accès physique à l'appareil permet leur extraction.

---

## Améliorations futures

### 1. Clés par pair (ECDH)

```
Futur : échange de clés Diffie-Hellman sur courbe elliptique

Appareil A                           Appareil B
    │                                     │
    │  1. Générer (sk_A, pk_A)            │  Générer (sk_B, pk_B)
    │                                     │
    │  2. PKT_PAIR_REQ { pk_A }           │
    │────────────────────────────────────>│
    │                                     │
    │  3. PKT_PAIR_ACK { pk_B }           │
    │<────────────────────────────────────│
    │                                     │
    │  4. shared = ECDH(sk_A, pk_B)       │  shared = ECDH(sk_B, pk_A)
    │     → clé AES-256 unique A↔B        │  → même clé AES-256
    │                                     │
```

**Avantage** : compromission d'un pair ne compromet pas les autres canaux.

### 2. Durcissement de la dérivation (PBKDF2)

```
Actuel :  SHA-256(pin || salt)                    → < 1 ms / tentative
Futur  :  PBKDF2-SHA256(pin, salt, 100 000 iter) → ~500 ms / tentative
```

**Avantage** : Force brute de 10 000 PIN passe de < 1 s à ~83 minutes sur un PC standard.

**Contrainte** : Le STM32WLE5 à 48 MHz nécessitera un nombre d'itérations réduit (~10 000) pour un temps de dérivation acceptable (~5 s au provisionnement).

### 3. Protection Read-Out (RDP)

```
RDP Level 0 : Pas de protection (actuel)
RDP Level 1 : Debug protégé (JTAG/SWD bloqué sauf unprotect → efface Flash)
RDP Level 2 : Debug permanent désactivé (irréversible)
```

**Recommandation** : RDP Level 1 pour le développement, Level 2 pour la production.

### 4. Compteur de nonce monotone

Remplacer le nonce aléatoire par un compteur monotone persisté en EEPROM, éliminant tout risque de collision :

```
nonce = device_id (4 octets) || msg_counter (8 octets)
```

**Avantage** : Garantie d'unicité absolue du nonce.
**Contrainte** : Nécessite un compteur persistant incrémenté atomiquement.

### 5. Forward secrecy (Double Ratchet)

Implémenter un protocole de type Signal (Double Ratchet) pour fournir la forward secrecy :

```
Chaque message utilise une clé éphémère dérivée.
La compromission de la clé courante ne permet pas
de déchiffrer les messages passés.
```

**Contrainte** : Complexité significative pour un système embarqué à ressources limitées. Nécessite un stockage de session par pair.

### 6. Authentification de l'identité

Actuellement, l'identité d'un appareil repose uniquement sur son `device_id` (aléatoire). Un appareil malveillant peut usurper un `device_id`.

**Solution future** : Signature ECDSA des messages avec une clé d'identité persistante, vérifiable par les pairs.
