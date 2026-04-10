# Hiérarchie des services PM-Chat

> Définition précise de ce que chaque couche fait et ne fait pas.

---

## Principe directeur

Chaque couche de l'écosystème PM-Chat possède un périmètre strictement défini. Ce document formalise les responsabilités, les non-responsabilités, les dépendances et les interfaces de chaque couche pour éviter toute ambiguïté.

**Règle absolue :** PM-Chat Device n'a aucune dépendance sur PM-Chat Online pour le transport des messages.

---

## PM-Chat Device

> Système matériel de communication chiffrée hors ligne.

### Responsabilités

| # | Responsabilité |
|---|----------------|
| D1 | Envoyer et recevoir des messages chiffrés via radio LoRa |
| D2 | Chiffrer chaque message avec AES-256-GCM avant transmission |
| D3 | Générer des nonces aléatoires via le RNG matériel (12 octets par message) |
| D4 | Router les messages en maillage (TTL, déduplication, relais) |
| D5 | Afficher l'interface utilisateur sur écran OLED (14 écrans) |
| D6 | Gérer la saisie utilisateur via 3 boutons (navigation, sélection, saisie) |
| D7 | Stocker les messages localement en RAM (32 messages) |
| D8 | Persister la configuration en EEPROM (identité, clé, paramètres) |
| D9 | Provisionner l'appareil au premier démarrage (Mesh PIN, identité) |
| D10 | Effectuer l'effacement d'urgence sur commande (3 boutons maintenus) |
| D11 | Surveiller la batterie et alerter en cas de niveau bas/critique |
| D12 | Rejeter les paquets malformés, expirés ou dupliqués |
| D13 | Relayer les messages destinés à d'autres nœuds sans les déchiffrer |

### Non-responsabilités

| # | Ce que Device ne fait PAS |
|---|---------------------------|
| D-N1 | Ne se connecte à aucun serveur, cloud ou service en ligne |
| D-N2 | Ne transmet aucune donnée via Internet, Wi-Fi ou réseau cellulaire |
| D-N3 | N'envoie aucune télémétrie, analytique ou rapport d'utilisation |
| D-N4 | Ne nécessite aucune mise à jour en ligne pour fonctionner |
| D-N5 | Ne stocke aucune donnée utilisateur identifiable (pas d'e-mail, pas de nom) |
| D-N6 | Ne gère pas la présentation produit ni la documentation en ligne |
| D-N7 | Ne fournit pas de service de messagerie basé sur Internet |

### Dépendances

| Dépendance | Type | Description |
|------------|------|-------------|
| Matériel RAK3172-E | Physique | Module radio LoRa (STM32WLE5CC, EU868) |
| Écran SSD1306 | Physique | Affichage OLED 128×64 (I2C) |
| Batterie LiPo | Physique | Alimentation (3.7V) |
| Boutons tactiles | Physique | 3 boutons pour l'interface |
| RadioLib | Logicielle | Pilote radio LoRa |
| U8g2 | Logicielle | Pilote d'affichage OLED |
| Arduino Crypto | Logicielle | Implémentation AES-256-GCM |
| **PM-Chat Online** | **Aucune** | **Zéro dépendance sur la plateforme en ligne** |

### Interfaces avec les autres couches

| Interface | Direction | Description |
|-----------|-----------|-------------|
| Setup → Device | Documentation | Setup fournit les guides pour configurer et flasher Device |
| Device → Online | Aucune | Aucune communication directe entre Device et Online |

---

## PM-Chat Setup

> Couche de déploiement, configuration et support.

### Responsabilités

| # | Responsabilité |
|---|----------------|
| S1 | Fournir un guide de démarrage rapide pour le premier démarrage |
| S2 | Documenter la procédure de flashage du firmware via ST-LINK |
| S3 | Guider l'utilisateur dans l'appairage (saisie du Mesh PIN) |
| S4 | Documenter la procédure de mise à jour du firmware |
| S5 | Fournir un guide de réinitialisation usine et d'effacement d'urgence |
| S6 | Proposer une matrice de dépannage pour les problèmes courants |
| S7 | Décrire la checklist de déploiement terrain |
| S8 | Documenter la validation de relais entre appareils |
| S9 | Fournir les procédures de diagnostics |
| S10 | Gérer la FAQ et les procédures de support |

### Non-responsabilités

| # | Ce que Setup ne fait PAS |
|---|--------------------------|
| S-N1 | N'ajoute aucune dépendance de transport entre Device et Online |
| S-N2 | Ne modifie pas le comportement du firmware |
| S-N3 | Ne crée pas de compte utilisateur ni d'authentification |
| S-N4 | Ne transmet aucune donnée vers un serveur |
| S-N5 | Ne gère pas le développement ou le déploiement de la plateforme en ligne |
| S-N6 | Ne définit pas le protocole de communication LoRa |
| S-N7 | Ne prend pas de décisions d'architecture firmware |

### Dépendances

| Dépendance | Type | Description |
|------------|------|-------------|
| Firmware PM-Chat | Contenu | Setup documente le firmware existant |
| Documentation technique | Contenu | Référence les spécifications du protocole et de la sécurité |
| PlatformIO / ST-LINK | Outil | Outils nécessaires pour les procédures de flashage documentées |

### Interfaces avec les autres couches

| Interface | Direction | Description |
|-----------|-----------|-------------|
| Setup → Device | Documentation | Guides de configuration, flashage, appairage, maintenance |
| Setup → Online | Documentation | Guides accessibles depuis la plateforme en ligne |
| Online → Setup | Distribution | Online héberge et distribue les guides Setup |

---

## PM-Chat Online

> Plateforme numérique compagnon de l'écosystème.

### Responsabilités

| # | Responsabilité |
|---|----------------|
| O1 | Présenter le produit PM-Chat (positionnement, fonctionnalités, différenciation) |
| O2 | Fournir un accès centralisé à la documentation technique |
| O3 | Héberger un formulaire de contact et un programme pilote |
| O4 | Publier la feuille de route produit |
| O5 | Distribuer les versions du firmware en téléchargement |
| O6 | Proposer un service de messagerie chiffrée en ligne (E2EE, ECDH + AES-GCM) |
| O7 | Gérer l'authentification anonyme pour le service en ligne (pseudonyme uniquement) |
| O8 | Fournir la messagerie temps réel via Socket.IO |
| O9 | Assurer la sécurité en profondeur du service en ligne (gardes, limitation de débit) |
| O10 | Héberger les guides Setup pour consultation en ligne |

### Non-responsabilités

| # | Ce que Online ne fait PAS |
|---|---------------------------|
| O-N1 | **Ne transporte jamais de messages hors ligne** (aucun message LoRa ne transite par les serveurs) |
| O-N2 | Ne contrôle pas le fonctionnement de PM-Chat Device |
| O-N3 | Ne conditionne pas la capacité de Device à envoyer ou recevoir |
| O-N4 | N'accède pas aux clés de chiffrement des appareils |
| O-N5 | Ne stocke pas les messages en clair (architecture zero-knowledge) |
| O-N6 | Ne collecte pas de données personnelles identifiables |
| O-N7 | Ne modifie pas le firmware à distance (pas d'OTA) |

### Dépendances

| Dépendance | Type | Description |
|------------|------|-------------|
| Node.js ≥ 18 | Runtime | Environnement d'exécution serveur |
| MongoDB | Infrastructure | Base de données pour utilisateurs, conversations, messages chiffrés |
| Redis | Infrastructure | Cache, sessions, protection anti-rejeu |
| Next.js 15 | Framework | Frontend web |
| Express + Socket.IO | Framework | Backend API et temps réel |
| **PM-Chat Device** | **Aucune** | **Le fonctionnement d'Online ne dépend pas de Device** |

### Interfaces avec les autres couches

| Interface | Direction | Description |
|-----------|-----------|-------------|
| Online → Setup | Distribution | Héberge et distribue les guides de déploiement |
| Online → Device | Présentation | Présente le produit matériel, distribue le firmware |
| Device → Online | **Aucune** | Aucune communication technique entre les deux |

---

## Matrice de séparation des responsabilités

| Fonction | Device | Setup | Online |
|----------|--------|-------|--------|
| Transport de messages LoRa | ✅ | — | — |
| Chiffrement des messages hors ligne | ✅ | — | — |
| Routage mesh | ✅ | — | — |
| Interface OLED | ✅ | — | — |
| Guides de configuration | — | ✅ | — |
| Documentation de flashage | — | ✅ | — |
| Matrice de dépannage | — | ✅ | — |
| Checklist de déploiement | — | ✅ | — |
| Présentation produit web | — | — | ✅ |
| Messagerie en ligne E2EE | — | — | ✅ |
| Distribution du firmware | — | — | ✅ |
| Formulaire de contact | — | — | ✅ |

---

## Règles d'intégrité

Ces règles garantissent la cohérence de l'écosystème :

1. **Aucun chemin de transport** ne relie Device à Online. Les messages LoRa restent sur le réseau radio.
2. **Setup est un pont documentaire**, pas un pont technique. Il ne crée aucune dépendance d'exécution.
3. **Online est complémentaire**. Si la plateforme en ligne est indisponible, Device continue de fonctionner normalement.
4. **Chaque couche est testable indépendamment.** Device se teste sur le matériel, Setup se valide par relecture, Online se teste via son pipeline CI.
5. **Les modifications dans une couche ne cassent pas les autres.** Le protocole LoRa est défini indépendamment du backend web.
