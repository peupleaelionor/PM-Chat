# PM-Chat Online — Descriptions des sections

> Contenu détaillé de chaque page du site PM-Chat Online.

---

## Page d'accueil (`/`)

### Hero

Proposition de valeur principale, immédiatement visible.

> **Communication directe entre appareils. Sans infrastructure externe.**

Le hero présente PM-Chat comme un système de messagerie autonome, chiffré et privé. La promesse est simple : communiquer sans Internet, sans Wi-Fi, sans carte SIM. L'utilisateur comprend en quelques secondes ce que fait le produit et pourquoi il existe.

### Cartes des 3 piliers

Trois cartes disposées horizontalement présentent les couches du système :

1. **PM-Chat Device** — Le cœur matériel. Communication longue portée, chiffrement local, relais maillé.
2. **PM-Chat Setup** — La couche de déploiement. Guides, provisionnement, mise en service.
3. **PM-Chat Online** — La vitrine numérique. Documentation, téléchargements, demande de pilote.

Chaque carte comporte un titre, une description courte et un lien vers la page dédiée.

### Preuve sociale

Zone réservée aux témoignages, retours d'expérience ou indicateurs de confiance. Sobre et factuel : nombre d'appareils déployés, environnements couverts, retours terrain.

### Appel à l'action

- **CTA principal** : « Découvrir le système » → `/device`
- **CTA secondaire** : « Demander un pilote » → `/contact`

---

## PM-Chat Device (`/device`)

### Hero produit

Visuel de l'appareil avec titre et accroche :

> **PM-Chat Device — Messagerie longue portée, autonome et chiffrée.**

### Fonctionnalités clés

| Fonctionnalité | Description |
|---|---|
| Communication LoRa | Portée longue distance via modulation LoRa EU868 |
| Réseau maillé | Relais multi-sauts entre appareils, extension automatique de la portée |
| Chiffrement AES-256-GCM | Chiffrement local de bout en bout, nonce par message |
| Autonomie batterie | Batterie LiPo rechargeable, conçue pour un usage prolongé |
| Format compact | Appareil portatif, discret, conçu pour le terrain |

### Spécifications techniques

| Paramètre | Valeur |
|---|---|
| Microcontrôleur | STM32WLE5CC (RAK3172-E) |
| Radio | LoRa EU868, SF9, BW 125 kHz, 14 dBm |
| Chiffrement | AES-256-GCM, RNG matériel, nonce par message |
| Affichage | OLED |
| Interface | 3 boutons physiques |
| Alimentation | LiPo rechargeable |
| Taille de message | 246 octets maximum (protocole binaire compact) |

### Fonctionnement

Description visuelle du flux de communication :

1. L'utilisateur compose un message sur l'appareil.
2. Le message est chiffré localement avec AES-256-GCM.
3. Le message est transmis via LoRa à l'appareil destinataire.
4. Si le destinataire est hors de portée directe, les appareils intermédiaires relaient le message.
5. Le destinataire déchiffre et affiche le message.

### Cas d'usage

- Opérations en zone isolée sans couverture réseau
- Événements nécessitant un réseau de communication indépendant
- Environnements où la confidentialité des échanges est prioritaire
- Sites industriels ou logistiques hors couverture cellulaire
- Coordination d'équipes sur le terrain

---

## PM-Chat Setup (`/setup`)

### Présentation

PM-Chat Setup est la couche de déploiement du système. Elle regroupe tous les outils, guides et procédures nécessaires pour rendre un réseau PM-Chat opérationnel.

### Réduction des frictions

Setup est conçu pour simplifier chaque étape : du flashage initial du firmware à l'appairage des appareils, en passant par le provisionnement du réseau. L'objectif est qu'un utilisateur non-expert puisse déployer un réseau fonctionnel en suivant la documentation.

### Guides disponibles

- Flashage du firmware sur l'appareil
- Provisionnement du code réseau partagé
- Appairage des appareils entre eux
- Vérification du bon fonctionnement
- Mise à jour du firmware
- Procédures de maintenance

### Flux de déploiement

```
Flashage → Provisionnement → Appairage → Vérification → Opérationnel
```

### Lien

Accès à la documentation complète : `/documentation/setup`

---

## PM-Chat Online (`/online`)

### Présentation

PM-Chat Online est la plateforme numérique compagnon du système PM-Chat. Elle sert de vitrine, de centre de documentation et de point de téléchargement.

### Ce que fournit PM-Chat Online

- **Site web** — Présentation du produit, positionnement, cas d'usage
- **Documentation technique** — Référence firmware, guides de déploiement, modèle de sécurité
- **Téléchargements** — Binaires firmware, code source
- **Demande de pilote** — Formulaire de contact pour les organisations intéressées

### Clarification importante

> **PM-Chat Online n'est PAS nécessaire pour la messagerie.**
>
> Le système PM-Chat fonctionne de manière entièrement autonome. Les appareils communiquent directement entre eux, sans aucune connexion Internet. PM-Chat Online est un compagnon utile, jamais une dépendance.

---

## Vue d'ensemble technique (`/technical`)

### Architecture

Présentation de l'architecture à trois couches :

- **Device** — Couche matérielle et firmware, responsable de la communication radio et du chiffrement
- **Setup** — Couche de déploiement, responsable du provisionnement et de la configuration
- **Online** — Couche numérique, responsable de la documentation et de la distribution

### Protocole

Résumé du protocole de communication :

- Format binaire compact (246 octets maximum par message)
- Modulation LoRa sur bande EU868
- Adressage par identifiant réseau partagé
- Pas de négociation de session, pas de handshake

### Sécurité

Résumé du modèle de sécurité :

- Chiffrement AES-256-GCM pour chaque message
- Nonce unique par message, généré par RNG matériel
- Clés stockées uniquement sur l'appareil
- Fonction d'effacement d'urgence (panic wipe)
- Aucun serveur tiers impliqué dans le transport ou le stockage

### Topologie maillée

- Relais automatique par TTL (Time-To-Live)
- Déduplication des messages relayés
- Communication multi-sauts pour étendre la portée
- Pas de nœud central, pas de coordinateur

### Chiffrement

- Algorithme : AES-256-GCM
- Source d'entropie : RNG matériel (STM32WLE5CC)
- Nonce : unique par message, jamais réutilisé
- Clés : provisionnées localement, jamais transmises

---

## Documentation (`/documentation`)

### Hub d'accès

Page centrale redirigeant vers toutes les catégories de documentation :

| Catégorie | Route | Description |
|---|---|---|
| Firmware | `/documentation/firmware` | Référence firmware, structure du code, API interne |
| Déploiement | `/documentation/setup` | Guides de flashage, provisionnement, appairage |
| Sécurité | `/documentation/security` | Modèle de sécurité, gestion des clés, modèle de menace |

### Format

Documentation technique, sobre, structurée. Pas de tutoriels vidéo, pas de contenu marketing. Chaque page de documentation est autonome et directement exploitable.

---

## Feuille de route (`/roadmap`)

### État actuel

Description de l'état du projet : prototype fonctionnel, firmware en développement actif, documentation en cours de rédaction.

### Priorités à court terme

- Stabilisation du firmware
- Finalisation de la documentation de déploiement
- Tests de portée et de fiabilité en conditions réelles
- Publication des binaires firmware

### Vision long terme

- Extension du réseau maillé à plus grande échelle
- Optimisation de la consommation énergétique
- Amélioration de l'interface utilisateur sur l'appareil
- Ouverture progressive du code source

---

## Contact (`/contact`)

### Formulaire de demande pilote

Pour les organisations souhaitant évaluer PM-Chat dans leur environnement :

- Nom de l'organisation
- Contexte d'utilisation
- Nombre d'appareils envisagé
- Environnement de déploiement
- Coordonnées

### Formulaire de contact général

Pour toute autre demande :

- Nom
- Adresse e-mail
- Objet
- Message

---

## Téléchargements (`/downloads`)

### Binaires firmware

Téléchargement direct des fichiers binaires firmware pour flashage sur l'appareil. Chaque version est accompagnée de notes de version.

### Code source

Lien vers le dépôt de code source (si applicable).

### Historique des versions

Tableau chronologique des versions publiées avec :

- Numéro de version
- Date de publication
- Résumé des changements
- Lien de téléchargement
