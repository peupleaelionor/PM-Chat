# Dépannage

Ce guide fournit une matrice de résolution pour les problèmes les plus fréquemment rencontrés lors du déploiement et de l'utilisation de PM-Chat.

---

## Matrice de dépannage rapide

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Écran noir au démarrage | Câblage I2C incorrect | Vérifier SDA (PA11, Pin 13) et SCL (PA12, Pin 12) |
| Écran noir au démarrage | OLED non alimenté | Vérifier l'alimentation 3,3 V de l'écran |
| Écran noir au démarrage | Adresse I2C incorrecte | Confirmer que l'écran utilise l'adresse `0x3C` |
| « Radio init failed » | Module LoRa non initialisé | Vérifier l'antenne 868 MHz et les soudures du module |
| « Radio init failed » | Antenne absente | Connecter une antenne LoRa 868 MHz (SMA ou U.FL) |
| Messages non reçus | PIN différent entre appareils | S'assurer que tous les appareils utilisent le même PIN réseau |
| Messages non reçus | Appareils hors de portée | Rapprocher les appareils ou ajouter un relais intermédiaire |
| Messages non reçus | Antenne déconnectée ou défectueuse | Vérifier la connexion de l'antenne sur chaque appareil |
| Messages non reçus | Fréquence LoRa différente | Confirmer la fréquence EU868 (868,0 MHz) sur tous les appareils |
| Appareil ne répond pas | Watchdog timeout (8 s) | Effectuer un cycle d'alimentation (éteindre/rallumer) |
| Appareil ne répond pas | Firmware corrompu | Reflasher le firmware via ST-LINK |
| Appareil ne répond pas | Batterie déchargée | Recharger via USB-C (module TP4056) |
| Batterie affiche 0 % | ADC non connecté | Vérifier la connexion du pont diviseur sur PB3 (Pin 14) |
| Batterie affiche 0 % | Pont diviseur absent | Installer 2× résistances 100 kΩ entre Vbatt et GND |
| Flashage échoue | ST-LINK mal connecté | Vérifier SWDIO (Pin 17), SWCLK (Pin 18), GND (Pin 20), 3V3 (Pin 19) |
| Flashage échoue | ST-LINK non détecté par le PC | Installer les pilotes ST-LINK, essayer un autre câble USB |
| Flashage échoue | Module en veille profonde | Maintenir RESET pendant la tentative de connexion |
| Texte illisible sur l'écran | Contraste mal réglé | Ajuster la luminosité dans le menu Paramètres |
| Texte illisible sur l'écran | Écran défectueux | Tester avec un autre module SSD1306 |
| Messages perdus | Mémoire pleine (32 messages max) | Les anciens messages sont automatiquement écrasés (FIFO) |
| Messages perdus | Redémarrage de l'appareil | Les messages sont stockés en RAM — perdus au redémarrage |
| Wipe accidentel | 3 boutons maintenus > 3 s | Re-provisionner l'appareil avec le même PIN réseau |
| LED ne s'allume pas | Résistance manquante | Vérifier la résistance de 330 Ω sur PB5 (Pin 16) |
| LED ne s'allume pas | LED inversée | Vérifier la polarité de la LED (anode vers PB5) |
| Écran se fige | Boucle infinie dans le firmware | Le watchdog (8 s) redémarre automatiquement l'appareil |
| Envoi bloqué sur « Envoi… » | Timeout radio (5 s) | Vérifier l'antenne ; redémarrer si persistant |
| Caractères manquants à la saisie | Anti-rebond trop court | Comportement normal si les boutons sont usés — remplacer |
| Appareil redémarre en boucle | Firmware incompatible | Reflasher avec la version stable du firmware |
| Console série muette | TX/RX non connectés | Vérifier PA9 (TX, Pin 4) et PA10 (RX, Pin 3) — 115200 baud |

---

## Diagnostics avancés

### Vérifier la communication I2C

Si l'écran ne s'affiche pas, vérifiez les connexions I2C :

1. **Continuité** — Mesurez avec un multimètre entre PA11 et la broche SDA de l'écran
2. **Tension** — Mesurez 3,3 V sur la broche VCC de l'écran (par rapport à GND)
3. **Adresse** — Les écrans SSD1306 utilisent typiquement `0x3C` (certains modèles : `0x3D`)
4. **Pull-ups** — Si le bus I2C ne fonctionne pas, ajoutez des résistances de rappel de 4,7 kΩ sur SDA et SCL vers 3,3 V

### Vérifier la radio LoRa

Si les messages ne sont ni envoyés ni reçus :

1. **Antenne** — Une antenne 868 MHz doit être connectée. Émettre sans antenne peut endommager le module radio.
2. **Paramètres** — Vérifiez que tous les appareils utilisent les mêmes paramètres LoRa :

| Paramètre | Valeur attendue |
|-----------|----------------|
| Fréquence | 868,0 MHz |
| Bande passante | 125 kHz |
| Facteur d'étalement (SF) | 9 |
| Taux de codage | 4/7 |
| Mot de synchronisation | 0x12 |
| Puissance TX | 14 dBm |

3. **Console série** — Connectez un moniteur série (`pio device monitor --baud 115200`) pour observer les messages de diagnostic radio

### Vérifier l'alimentation

| Mesure | Valeur attendue | Point de mesure |
|--------|----------------|-----------------|
| Tension batterie | 3,0–4,2 V | Bornes de la batterie LiPo |
| Tension régulée | 3,3 V ± 0,1 V | Pin 19 (VDD) du RAK3172-E |
| Courant en émission | ~250 mA | En série sur l'alimentation |
| Courant au repos | ~5 mA | Écran éteint, radio en écoute |

### Vérifier le watchdog

Le watchdog matériel (IWDG) est configuré avec un timeout de **8 secondes**. Si le firmware ne recharge pas le watchdog dans ce délai (à chaque itération de la boucle principale, ~5 ms), l'appareil redémarre automatiquement.

**Symptômes d'un déclenchement watchdog :**
- L'appareil revient à l'écran splash sans intervention
- Les messages en cours de rédaction sont perdus
- Le compteur de redémarrages augmente (visible en console série)

---

## Problèmes spécifiques au flashage

### PlatformIO ne trouve pas le ST-LINK

```bash
# Linux : ajouter les règles udev
sudo cp 99-stlink.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger

# Vérifier la détection
lsusb | grep -i stlink
```

### Le flashage réussit mais l'appareil ne démarre pas

1. Vérifiez que l'écran et les boutons sont correctement câblés
2. Connectez un moniteur série pour observer les messages de démarrage
3. Si la console affiche des erreurs, notez-les et consultez ce guide
4. En dernier recours, effectuez un effacement complet :

```bash
cd firmware
pio run -e rak3172 -t erase
pio run -e rak3172 -t upload
```

---

## Problèmes réseau et maillage

### Un seul appareil du réseau ne communique pas

1. Vérifiez que l'appareil problématique utilise le **même PIN** que les autres
2. Vérifiez que son **antenne** est connectée
3. Placez-le à côté d'un appareil fonctionnel et testez
4. Si le test échoue à courte distance, le problème est matériel (radio ou antenne)
5. Reflashez le firmware et re-provisionnez si nécessaire

### Le relais ne fonctionne pas

1. Confirmez que le relais (appareil intermédiaire) est **alimenté et actif**
2. Vérifiez que les trois appareils utilisent le **même PIN**
3. Testez les paires directes : A↔B et B↔C doivent fonctionner individuellement
4. Consultez le [guide de validation du relais](relay-validation.md)

### Messages reçus en retard

| Cause | Explication | Solution |
|-------|-------------|----------|
| Délai de relais | Chaque relais ajoute 0–100 ms | Normal — latence cumulée sur multi-sauts |
| Réessais automatiques | Le message est retransmis après échec | Attendre la fin des 3 tentatives (backoff exponentiel) |
| File d'attente radio | Plusieurs messages en attente d'émission | Normal — les messages sont envoyés séquentiellement |

---

## Contacts et ressources

Si le problème persiste après avoir consulté ce guide :

1. **Console série** — Capturez les logs de démarrage et d'erreur (`pio device monitor --baud 115200`)
2. **Dépôt GitHub** — Ouvrez une issue avec les détails du problème, les logs et la version du firmware
3. **Documentation** — Consultez les guides complémentaires :
   - [Guide de flashage](flashing-guide.md)
   - [Premier démarrage](first-boot.md)
   - [Réinitialisation](device-reset.md)
   - [Câblage (WIRING.md)](../../firmware/WIRING.md)

---

> 💡 **Conseil :** En cas de doute, la solution la plus rapide est souvent : reflasher le firmware → réinitialisation usine → re-provisionnement. Cette procédure résout la grande majorité des problèmes logiciels.
