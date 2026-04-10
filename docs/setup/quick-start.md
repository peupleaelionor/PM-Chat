# Démarrage rapide

Ce guide vous accompagne de l'ouverture de la boîte jusqu'à l'envoi de votre premier message chiffré sur le réseau maillé PM-Chat.

---

## 1. Matériel requis

| Composant | Spécification | Quantité |
|-----------|---------------|----------|
| Module RAK3172-E | Carte d'évaluation STM32WLE5CC | 2 minimum |
| Écran OLED | SSD1306, 128×64 pixels, I2C | 2 |
| Boutons-poussoirs | Tactiles 6×6 mm, normalement ouverts | 6 (3 par appareil) |
| Batterie LiPo | 3,7 V, 1000–2000 mAh | 2 |
| Chargeur TP4056 | Module USB-C | 2 |
| Antenne LoRa | 868 MHz (SMA ou U.FL) | 2 |
| Programmeur ST-LINK | V2 ou V3 | 1 |
| Câble USB | Pour alimentation et programmation | 1 |

---

## 2. Câblage

Raccordez chaque appareil selon le schéma de connexion détaillé dans [WIRING.md](../../firmware/WIRING.md).

**Résumé des connexions essentielles :**

| Signal | Broche RAK3172-E | GPIO |
|--------|------------------|------|
| I2C SDA (écran) | Pin 13 | PA11 |
| I2C SCL (écran) | Pin 12 | PA12 |
| Bouton HAUT | Pin 5 | PA15 |
| Bouton OK | Pin 6 | PB6 |
| Bouton BAS | Pin 7 | PB7 |
| Batterie ADC | Pin 14 | PB3 |
| LED état | Pin 16 | PB5 |

Pour le programmeur ST-LINK :

| Signal | Broche RAK3172-E |
|--------|------------------|
| SWDIO | Pin 17 (PA13) |
| SWCLK | Pin 18 (PA14) |
| GND | Pin 20 |
| 3V3 | Pin 19 |

---

## 3. Installer PlatformIO

🔧 Si PlatformIO n'est pas déjà installé :

```bash
# Installation via pip
pip install platformio

# Vérification
pio --version
```

Alternativement, installez l'extension **PlatformIO IDE** dans Visual Studio Code.

---

## 4. Cloner le dépôt et flasher le firmware

```bash
git clone https://github.com/votre-organisation/PM-Chat.git
cd PM-Chat/firmware
pio run -e rak3172 -t upload
```

✅ Le terminal affiche `SUCCESS` à la fin de l'opération. La LED d'état clignote brièvement et l'écran de démarrage (splash) apparaît.

---

## 5. Premier démarrage

À la mise sous tension, l'appareil détecte automatiquement qu'il n'est pas encore provisionné et lance l'assistant de configuration.

L'écran affiche :

```
╔══════════════════════╗
║   PM-Chat v1.0.0     ║
║   Bienvenue !         ║
║                       ║
║   Appuyez sur OK      ║
╚══════════════════════╝
```

---

## 6. Entrer le PIN réseau maillé

🔧 Saisissez un **code PIN à 4 chiffres**. Tous les appareils du même réseau maillé doivent utiliser le même PIN.

- **HAUT / BAS** : incrémenter / décrémenter le chiffre
- **OK** : passer au chiffre suivant
- **OK (appui long)** : confirmer le PIN complet

⚠️ **Choisissez un PIN que vous pourrez communiquer à tous les membres du réseau.** Ce PIN sert à dériver la clé de chiffrement AES-256 du réseau.

---

## 7. Noter l'identifiant de l'appareil

Après la saisie du PIN, l'écran affiche l'identifiant unique de l'appareil sous forme hexadécimale (8 caractères) :

```
╔══════════════════════╗
║   Appareil prêt       ║
║                       ║
║   ID: A3F7 B21C       ║
║                       ║
║   OK pour continuer   ║
╚══════════════════════╝
```

📝 **Notez cet identifiant.** Il sera nécessaire pour envoyer des messages dirigés.

---

## 8. Répéter pour le second appareil

Flashez et configurez le deuxième appareil en suivant les mêmes étapes (4 à 7).

⚠️ **Utilisez exactement le même PIN réseau** que le premier appareil.

---

## 9. Envoyer le premier message

Sur le premier appareil :

1. Depuis la boîte de réception, effectuez un **appui long sur OK** pour accéder à l'écran de composition.
2. Composez votre message :
   - **HAUT / BAS** : parcourir le jeu de caractères (A–Z, 0–9, espace, ponctuation)
   - **OK** : ajouter le caractère sélectionné
   - **BAS (appui long)** : supprimer le dernier caractère
3. **OK (appui long)** : envoyer le message.

L'écran de transmission s'affiche pendant l'envoi.

---

## 10. Vérifier la réception

✅ Sur le second appareil, le message reçu apparaît dans la boîte de réception. Un indicateur confirme la réception.

Si le message n'apparaît pas :

- Vérifiez que les deux appareils utilisent le **même PIN**.
- Assurez-vous que les appareils sont à **portée radio** (2–5 km en vue directe, 0,5–1 km en milieu urbain).
- Consultez le [guide de dépannage](troubleshooting.md).

---

## Et ensuite ?

- 📖 [Premier démarrage](first-boot.md) — comprendre en détail ce qui se passe à l'initialisation
- 🔗 [Appairage des appareils](pairing-guide.md) — connecter plus de deux appareils
- 🔄 [Validation du mode relais](relay-validation.md) — tester le relais multi-sauts
- 📋 [Liste de vérification](deployment-checklist.md) — préparer un déploiement complet

---

> 💡 **Conseil :** Pour un premier test, placez les deux appareils à quelques mètres l'un de l'autre. Vous pourrez tester la portée maximale une fois la communication confirmée.
