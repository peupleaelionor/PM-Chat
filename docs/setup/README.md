# PM-Chat Setup — Documentation de déploiement et de configuration

Bienvenue dans la documentation **Setup** de PM-Chat, la couche de déploiement et de configuration du système de messagerie chiffrée sur réseau maillé LoRa.

Cette section rassemble tous les guides nécessaires pour passer d'un composant non assemblé à un réseau opérationnel. Chaque document est conçu pour être suivi de manière autonome, même sans expérience préalable en systèmes embarqués.

---

## Guides disponibles

| Guide | Description |
|-------|-------------|
| [Démarrage rapide](quick-start.md) | De l'ouverture de la boîte au premier message — en quelques minutes |
| [Premier démarrage](first-boot.md) | Ce qui se passe à la première mise sous tension et comment fonctionne l'assistant de configuration |
| [Appairage des appareils](pairing-guide.md) | Former un réseau maillé entre plusieurs appareils |
| [Guide de flashage](flashing-guide.md) | Installer ou réinstaller le firmware via ST-LINK et PlatformIO |
| [Mise à jour du firmware](firmware-update.md) | Mettre à jour un appareil déjà en service |
| [Réinitialisation d'un appareil](device-reset.md) | Réinitialisation logicielle, réinitialisation usine et effacement d'urgence |
| [Validation du mode relais](relay-validation.md) | Tester et valider le relais maillé multi-sauts |
| [Dépannage](troubleshooting.md) | Matrice de résolution des problèmes courants |
| [Liste de vérification pour le déploiement](deployment-checklist.md) | Checklist complète pour un déploiement en lot |
| [Maintenance](maintenance.md) | Entretien, stockage et fin de vie des appareils |

---

## À qui s'adresse cette documentation ?

- **Intégrateurs** qui assemblent et flashent les appareils pour la première fois.
- **Opérateurs** qui déploient un lot d'appareils sur le terrain.
- **Utilisateurs finaux** qui souhaitent comprendre le fonctionnement de leur appareil.
- **Contributeurs** qui souhaitent reproduire ou améliorer le système.

## Prérequis généraux

- Un ou plusieurs modules **RAK3172-E** (carte d'évaluation)
- Un écran **OLED SSD1306** 128×64 pixels (I2C)
- 3 boutons-poussoirs tactiles
- Une batterie **LiPo 3,7 V** (1000–2000 mAh recommandé)
- Un programmeur **ST-LINK V2** ou **V3**
- **PlatformIO** (CLI ou IDE) installé sur votre poste de travail
- Le dépôt PM-Chat cloné localement

## Conventions utilisées

| Symbole | Signification |
|---------|---------------|
| ⚠️ | Avertissement important |
| 💡 | Conseil ou astuce |
| 🔧 | Action technique requise |
| ✅ | Étape de vérification |

## Liens complémentaires

- [Câblage matériel (WIRING.md)](../../firmware/WIRING.md) — Schéma de connexion détaillé
- [Architecture firmware](../firmware/architecture.md) — Conception du firmware
- [Modèle de sécurité](../security-model.md) — Chiffrement et protection des données
- [Format des paquets](../packet-format.md) — Spécification du protocole réseau

---

> PM-Chat est un projet open source sous licence MIT. Toute contribution est la bienvenue.
