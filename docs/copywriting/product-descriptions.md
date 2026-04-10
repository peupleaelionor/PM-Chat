# PM-Chat — Descriptions produit

---

## PM-Chat Device

### Description longue

PM-Chat Device est le cœur matériel du système PM-Chat. C'est un appareil de messagerie compact et autonome, conçu pour établir une communication longue portée sans aucune infrastructure réseau externe.

Chaque appareil intègre un module radio LoRa opérant sur la bande EU868, un microcontrôleur STM32WLE5CC avec générateur de nombres aléatoires matériel, un écran OLED et trois boutons physiques pour la navigation. L'alimentation est assurée par une batterie LiPo rechargeable.

Les messages sont chiffrés localement avec AES-256-GCM avant toute transmission. Chaque message utilise un nonce unique, généré par le RNG matériel. Les clés de chiffrement ne quittent jamais l'appareil. Le protocole binaire compact limite chaque message à 246 octets, optimisant l'utilisation de la bande passante LoRa.

Le réseau maillé intégré permet aux appareils intermédiaires de relayer automatiquement les messages, étendant la portée de communication au-delà de la ligne directe entre deux appareils. La déduplication par identifiant de message empêche les boucles de relais.

PM-Chat Device fonctionne sans Internet, sans Wi-Fi, sans carte SIM et sans serveur distant. Il est conçu pour les environnements où l'autonomie de communication est une nécessité.

### Description courte

Appareil de messagerie autonome et chiffré. Communication longue portée via LoRa, réseau maillé intégré, sans aucune dépendance à une infrastructure externe.

---

## PM-Chat Setup

### Description longue

PM-Chat Setup est la couche de déploiement du système PM-Chat. Elle regroupe l'ensemble des guides, procédures et outils nécessaires pour rendre un réseau PM-Chat opérationnel.

Setup couvre chaque étape du processus : flashage du firmware sur les appareils, provisionnement du code réseau partagé, appairage des appareils, vérification du bon fonctionnement et procédures de maintenance. La documentation est conçue pour être suivie pas à pas, sans expertise radio ou cryptographique préalable.

L'objectif de Setup est de réduire au maximum la friction entre la réception d'un appareil et sa mise en service. Un réseau PM-Chat peut être opérationnel en quelques minutes en suivant les guides fournis.

### Description courte

Couche de déploiement PM-Chat. Guides de flashage, provisionnement, appairage et maintenance pour une mise en service rapide et sans friction.

---

## PM-Chat Online

### Description longue

PM-Chat Online est la plateforme numérique compagnon du système PM-Chat. Elle sert de vitrine publique, de centre de documentation technique et de point de téléchargement pour le firmware.

Online héberge la présentation du produit, la documentation complète (firmware, déploiement, sécurité), les binaires firmware téléchargeables et le formulaire de demande de pilote. C'est le point d'entrée pour toute personne ou organisation souhaitant découvrir, évaluer ou déployer PM-Chat.

Il est essentiel de comprendre que PM-Chat Online n'est pas nécessaire au fonctionnement du système. Les appareils PM-Chat communiquent directement entre eux, sans aucune connexion Internet. Online est un compagnon utile, jamais une dépendance.

### Description courte

Plateforme numérique compagnon. Documentation technique, téléchargements firmware, présentation produit et demande de pilote. Utile, jamais indispensable.
