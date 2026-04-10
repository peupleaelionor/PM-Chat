# PM-Chat — Résumé technique

> Vue d'ensemble technique du système PM-Chat, destinée à la page `/technical`.

---

## Architecture

PM-Chat repose sur une architecture à trois couches, chacune ayant un rôle distinct et clairement délimité.

### PM-Chat Device — Couche matérielle

Responsable de la communication radio, du chiffrement des messages, du stockage local et de l'interface utilisateur. C'est le seul composant nécessaire au fonctionnement du système. Chaque appareil est autonome et opérationnel indépendamment des autres couches.

### PM-Chat Setup — Couche de déploiement

Responsable du provisionnement, du flashage, de l'appairage et de la maintenance des appareils. Cette couche facilite la mise en service mais n'intervient pas dans le fonctionnement quotidien du réseau.

### PM-Chat Online — Couche numérique

Responsable de la documentation, de la distribution du firmware et de la présentation publique du produit. Cette couche est un compagnon du système, pas une dépendance.

---

## Protocole

### Format

Le protocole PM-Chat utilise un format binaire compact, optimisé pour les contraintes de la modulation LoRa.

| Paramètre | Valeur |
|---|---|
| Taille maximale de message | 246 octets |
| Format | Binaire compact |
| En-tête | Identifiant réseau, identifiant message, TTL, type |
| Charge utile | Message chiffré (AES-256-GCM) |

### Radio

| Paramètre | Valeur |
|---|---|
| Modulation | LoRa |
| Bande de fréquence | EU868 |
| Spreading Factor | SF9 |
| Bande passante | 125 kHz |
| Puissance d'émission | 14 dBm |

### Caractéristiques

- Pas de négociation de session ni de handshake
- Pas de connexion persistante entre appareils
- Transmission asynchrone : envoyer et oublier, avec relais
- Adressage par code réseau partagé

---

## Sécurité

### Chiffrement

| Paramètre | Valeur |
|---|---|
| Algorithme | AES-256-GCM |
| Mode | Authenticated Encryption with Associated Data (AEAD) |
| Nonce | Unique par message, généré par RNG matériel |
| Clés | Provisionnées localement, stockées sur l'appareil uniquement |
| Transmission des clés | Jamais transmises par radio |

### Générateur d'entropie

Le STM32WLE5CC intègre un générateur de nombres aléatoires matériel (True Random Number Generator). Chaque nonce est généré à partir de cette source d'entropie matérielle, garantissant l'unicité et l'imprévisibilité.

### Effacement d'urgence (Panic Wipe)

L'appareil intègre une fonction d'effacement d'urgence permettant de supprimer rapidement les clés et les messages stockés. Cette fonction est accessible par une combinaison de boutons définie lors du provisionnement.

### Principes de sécurité

- Chiffrement systématique de chaque message avant transmission
- Aucun serveur tiers impliqué dans le transport ou le stockage
- Aucun compte utilisateur, aucune authentification centralisée
- Surface d'attaque réduite par conception : protocole simple, pas de pile réseau complexe
- Conçu pour limiter l'exposition, pas pour promettre l'invulnérabilité

---

## Réseau maillé (Mesh)

### Fonctionnement

Chaque appareil PM-Chat peut agir comme relais pour les messages destinés à d'autres appareils du même réseau. Le relais est automatique et transparent.

### Mécanisme

| Paramètre | Description |
|---|---|
| TTL (Time-To-Live) | Chaque message porte un compteur TTL décrémenté à chaque saut. Le message est abandonné lorsque le TTL atteint zéro. |
| Déduplication | Chaque message porte un identifiant unique. Un appareil ayant déjà relayé un message l'ignore lors des réceptions suivantes. |
| Multi-sauts | Un message peut traverser plusieurs appareils intermédiaires avant d'atteindre sa destination. |

### Topologie

- Pas de nœud central, pas de coordinateur
- Chaque appareil est un pair égal dans le réseau
- La topologie s'adapte dynamiquement à la position des appareils
- Aucune configuration de routage nécessaire

---

## Matériel

### Composants principaux

| Composant | Référence | Rôle |
|---|---|---|
| Module radio + MCU | RAK3172-E | Communication LoRa et traitement |
| Microcontrôleur | STM32WLE5CC | Exécution du firmware, RNG matériel |
| Affichage | OLED | Interface utilisateur |
| Interface | 3 boutons physiques | Navigation et saisie |
| Alimentation | Batterie LiPo | Autonomie portable |

### Caractéristiques du STM32WLE5CC

- Architecture ARM Cortex-M4
- Radio LoRa intégrée (Sub-GHz)
- True Random Number Generator (TRNG)
- Mémoire flash pour stockage firmware et données
- Modes basse consommation pour optimiser l'autonomie

---

## Performances

### Paramètres radio

| Paramètre | Valeur |
|---|---|
| Spreading Factor | SF9 |
| Bande passante | 125 kHz |
| Puissance d'émission | 14 dBm |
| Bande de fréquence | EU868 |

### Portée

La portée de communication dépend de l'environnement :

| Environnement | Portée estimée |
|---|---|
| Ligne de vue dégagée | Plusieurs kilomètres |
| Zone urbaine dense | Réduite (obstacles, réflexions) |
| Zone forestière | Variable selon la densité |
| Avec relais maillé | Étendue par chaque saut intermédiaire |

La portée effective est influencée par le terrain, les obstacles, l'altitude, les conditions météorologiques et la position des appareils. Le réseau maillé permet de compenser partiellement les limitations de portée directe.

### Débit

Le débit est volontairement limité par la modulation LoRa (SF9, BW 125 kHz). PM-Chat est conçu pour la messagerie texte courte, pas pour le transfert de fichiers ou la voix.
