# Guide de flashage

Ce document explique comment installer le firmware PM-Chat sur un module RAK3172-E à l'aide d'un programmeur ST-LINK et de PlatformIO.

---

## Prérequis

### Logiciel

| Outil | Version minimale | Installation |
|-------|------------------|-------------|
| PlatformIO CLI | 6.x | `pip install platformio` |
| ou PlatformIO IDE | Extension VS Code | Marketplace VS Code |
| Pilotes ST-LINK | Dernière version | [st.com/stlink](https://www.st.com/en/development-tools/stsw-link009.html) |

### Matériel

| Composant | Description |
|-----------|-------------|
| RAK3172-E | Module cible (carte d'évaluation) |
| ST-LINK V2 ou V3 | Programmeur / débogueur SWD |
| Câble USB | Pour alimenter le ST-LINK |
| 4 fils Dupont | Connexion ST-LINK ↔ RAK3172-E |

---

## Connexions physiques

Raccordez le ST-LINK au module RAK3172-E selon le tableau suivant :

| Signal ST-LINK | Broche RAK3172-E | GPIO | Couleur suggérée |
|----------------|------------------|------|-----------------|
| SWDIO | Pin 17 | PA13 | Bleu |
| SWCLK | Pin 18 | PA14 | Vert |
| GND | Pin 20 | GND | Noir |
| 3V3 | Pin 19 | VDD | Rouge |

```
  ST-LINK V2                RAK3172-E
  ┌──────────┐              ┌──────────┐
  │ SWDIO  ──┼── Bleu ────►│ Pin 17   │
  │ SWCLK  ──┼── Vert ────►│ Pin 18   │
  │ GND    ──┼── Noir ────►│ Pin 20   │
  │ 3V3    ──┼── Rouge ───►│ Pin 19   │
  └──────────┘              └──────────┘
```

⚠️ **Vérifiez les connexions avant de mettre sous tension.** Une inversion SWDIO/SWCLK empêchera la communication. Une inversion 3V3/GND peut endommager le module.

Référez-vous au [schéma de câblage complet](../../firmware/WIRING.md) pour plus de détails.

---

## Flashage avec PlatformIO

### Étape 1 — Cloner le dépôt

```bash
git clone https://github.com/votre-organisation/PM-Chat.git
cd PM-Chat
```

### Étape 2 — Compiler et flasher

```bash
cd firmware
pio run -e rak3172 -t upload
```

Cette commande effectue automatiquement :
1. Téléchargement des dépendances (RadioLib, U8g2, Crypto)
2. Compilation du firmware avec les options d'optimisation (`-Os`)
3. Transfert du binaire vers le module via ST-LINK (protocole SWD)

### Sortie attendue en cas de succès

```
Processing rak3172 (platform: ststm32; board: genericSTM32WLE5CC)
...
Linking .pio/build/rak3172/firmware.elf
Building .pio/build/rak3172/firmware.bin
Checking size .pio/build/rak3172/firmware.elf
Uploading .pio/build/rak3172/firmware.bin
** Programming Started **
** Programming Finished **
** Verify Started **
** Verified OK **
** Resetting Target **
========================= [SUCCESS] =========================
```

✅ **Indicateurs de succès :**
- Le terminal affiche `[SUCCESS]`
- La LED d'état (PB5) clignote brièvement
- L'écran OLED affiche l'écran de démarrage (splash) avec la version du firmware

---

## Erreurs courantes et solutions

### Erreur : ST-LINK non détecté

```
Error: libusb_open() failed with LIBUSB_ERROR_ACCESS
```

| Cause | Solution |
|-------|----------|
| Pilotes manquants | Installer les pilotes ST-LINK depuis [st.com](https://www.st.com/en/development-tools/stsw-link009.html) |
| Permissions insuffisantes (Linux) | Ajouter les règles udev : `sudo cp 99-stlink.rules /etc/udev/rules.d/` puis redémarrer udev |
| Câble USB défectueux | Essayer un autre câble USB |
| ST-LINK non alimenté | Vérifier la connexion USB du ST-LINK |

### Erreur : cible non trouvée

```
Error: init mode failed (unable to connect to the target)
```

| Cause | Solution |
|-------|----------|
| SWDIO / SWCLK mal connectés | Vérifier les fils sur Pin 17 et Pin 18 |
| Module non alimenté | Vérifier 3V3 sur Pin 19 et GND sur Pin 20 |
| Module en mode deep sleep | Maintenir le bouton RESET pendant la tentative de connexion |
| Soudures froides | Vérifier la continuité des connexions avec un multimètre |

### Erreur : vérification échouée

```
** Verify Failed **
```

| Cause | Solution |
|-------|----------|
| Flash interne endommagé | Tenter un effacement complet : `pio run -e rak3172 -t erase` puis reflasher |
| Alimentation instable | Utiliser une alimentation USB stable (pas de hub passif) |
| Interférences sur les lignes SWD | Raccourcir les fils Dupont (< 20 cm) |

### Erreur : compilation échouée

```
Error: Could not find the package ...
```

| Cause | Solution |
|-------|----------|
| Dépendances manquantes | `pio pkg install` dans le dossier firmware |
| PlatformIO obsolète | `pip install --upgrade platformio` |
| Environnement incorrect | Vérifier que `-e rak3172` est bien spécifié |

---

## Vérifier que le firmware fonctionne

Après le flashage, vérifiez le bon fonctionnement :

1. **LED** — La LED d'état (PB5) clignote brièvement au démarrage
2. **Écran** — L'écran OLED affiche le splash PM-Chat v1.0.0 pendant 1,5 seconde
3. **Assistant** — Si l'appareil est neuf, l'assistant de configuration se lance automatiquement
4. **Console série** — Connectez un moniteur série pour vérifier les messages de diagnostic :

```bash
pio device monitor --baud 115200
```

---

## Méthode alternative : STM32CubeProgrammer

Si PlatformIO n'est pas disponible, vous pouvez utiliser **STM32CubeProgrammer** pour flasher le binaire manuellement.

### Étape 1 — Compiler le firmware

```bash
cd firmware
pio run -e rak3172
```

Le binaire compilé se trouve dans :
```
firmware/.pio/build/rak3172/firmware.bin
```

### Étape 2 — Ouvrir STM32CubeProgrammer

1. Téléchargez et installez [STM32CubeProgrammer](https://www.st.com/en/development-tools/stm32cubeprog.html)
2. Lancez l'application
3. Sélectionnez **ST-LINK** comme interface de connexion
4. Cliquez sur **Connect**

### Étape 3 — Flasher le binaire

1. Onglet **Erasing & Programming**
2. **File path** : sélectionnez `firmware/.pio/build/rak3172/firmware.bin`
3. **Start address** : `0x08000000`
4. Cochez **Verify programming**
5. Cliquez sur **Start Programming**

### Étape 4 — Vérifier

1. Cliquez sur **Disconnect**
2. Effectuez un cycle d'alimentation sur le module
3. Vérifiez l'écran splash et le fonctionnement normal

---

## Flashage en lot

Pour flasher plusieurs appareils efficacement :

```bash
# Compiler une seule fois
cd firmware
pio run -e rak3172

# Flasher chaque appareil (changer de module entre chaque commande)
pio run -e rak3172 -t upload
```

💡 **Conseil :** Compilez le firmware une seule fois, puis utilisez `-t upload` pour chaque appareil successif. Cela évite de recompiler à chaque fois.

---

> 📖 Après le flashage, consultez le [guide de premier démarrage](first-boot.md) pour la configuration initiale.
