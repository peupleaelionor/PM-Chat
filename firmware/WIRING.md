# PM-Chat Mesh — Guide de câblage

Carte complète des broches et schéma de connexion pour le RAK3172-E Evaluation Board.

---

## Brochage du module RAK3172-E (broches utilisées)

```
RAK3172-E Module
┌───────────────────────────────┐
│                               │
│  Pin 12 (PA12) ──── I2C SCL  │──── OLED SCL
│  Pin 13 (PA11) ──── I2C SDA  │──── OLED SDA
│                               │
│  Pin 5  (PA15) ──── GPIO     │──── Bouton HAUT
│  Pin 6  (PB6)  ──── GPIO     │──── Bouton OK
│  Pin 7  (PB7)  ──── GPIO     │──── Bouton BAS
│                               │
│  Pin 14 (PB3)  ──── ADC      │──── Diviseur de tension batterie
│  Pin 16 (PB5)  ──── GPIO     │──── LED d'état
│                               │
│  Pin 4  (PA9)  ──── UART TX  │──── TX série de débogage
│  Pin 3  (PA10) ──── UART RX  │──── RX série de débogage
│                               │
│  Pin 19         ──── VDD     │──── Alimentation 3.3V
│  Pin 20         ──── GND     │──── Masse
│  Pin 22         ──── RST     │──── Bouton reset (optionnel)
│                               │
│  Radio LoRa : SubGHz interne  │──── Antenne LoRa (SMA/U.FL)
│                               │
└───────────────────────────────┘
```

---

## Schéma de connexion

### Écran OLED (SSD1306, I2C, 128×64)

```
OLED          RAK3172-E
────          ─────────
VCC  ──────── 3.3V (Pin 19)
GND  ──────── GND  (Pin 20)
SCL  ──────── PA12 (Pin 12)
SDA  ──────── PA11 (Pin 13)
```

**Adresse I2C :** 0x3C (par défaut pour la plupart des modules SSD1306)

### Boutons (actifs à l'état BAS, Pull-Up interne)

```
                  RAK3172-E
                  ─────────
BTN_UP ────┤├──── PA15 (Pin 5) ───┐
                                   ├── Pull-up interne activé
BTN_OK ────┤├──── PB6  (Pin 6) ───┤   (aucune résistance externe nécessaire)
                                   │
BTN_DN ────┤├──── PB7  (Pin 7) ───┘
           │
           └──── GND (Pin 20)
```

Chaque bouton se connecte entre la broche GPIO et GND. Le firmware active les résistances de pull-up internes, donc **aucune résistance externe n'est nécessaire**.

### Moniteur de batterie (diviseur de tension)

```
  LiPo+  ────┬──── 100kΩ ──── PB3 (Pin 14) ──── Entrée ADC
              │                  │
              │                100kΩ
              │                  │
  LiPo-  ────┴──── GND ────────┘
```

Le diviseur de tension divise par deux la tension de la batterie pour la maintenir dans la plage ADC de 0-3,3V :
- **Batterie à 4,2V** → 2,1V à l'ADC
- **Batterie à 3,0V** → 1,5V à l'ADC

### LED d'état

```
  PB5 (Pin 16) ──── 330Ω ──── LED(+) ──── LED(-) ──── GND
```

### Série de débogage (optionnel)

```
USB-UART          RAK3172-E
────────          ─────────
TX  ────────────── PA10 (Pin 3, UART RX)
RX  ────────────── PA9  (Pin 4, UART TX)
GND ────────────── GND  (Pin 20)
```

**Débit :** 115200

### Alimentation

```
  USB-C ──── TP4056 ──┬── Batterie LiPo (3.7V)
                       │
                       └── RAK3172-E VDD (régulateur 3.3V nécessaire)
                              OU
                       └── Directement sur VDD si la batterie est à 3,0-3,6V
```

**Note :** Le RAK3172 fonctionne en 3,3V. Si vous utilisez une batterie LiPo (3,7-4,2V), utilisez un régulateur LDO 3,3V (par ex. AMS1117-3.3) entre la batterie et VDD.

### Connecteur de programmation ST-LINK

```
ST-LINK V2        RAK3172-E
──────────        ─────────
SWDIO  ────────── PA13 (Pin 17, SWDIO)
SWCLK  ────────── PA14 (Pin 18, SWCLK)
GND    ────────── GND  (Pin 20)
3.3V   ────────── VDD  (Pin 19) [optionnel, pour alimenter pendant le flashage]
RST    ────────── RST  (Pin 22) [optionnel]
```

### Antenne LoRa

Connecter une **antenne 868 MHz** au port antenne du RAK3172-E (SMA ou U.FL selon la variante du module).

⚠️ **Ne jamais émettre sans antenne connectée.** Cela peut endommager le module radio.

---

## Résumé complet du câblage

| Composant | Broche RAK3172 | GPIO | Fonction |
|-----------|----------------|------|----------|
| OLED SDA | Pin 13 | PA11 | Données I2C |
| OLED SCL | Pin 12 | PA12 | Horloge I2C |
| OLED VCC | Pin 19 | VDD | Alimentation 3.3V |
| OLED GND | Pin 20 | GND | Masse |
| BTN HAUT | Pin 5 | PA15 | Bouton (vers GND) |
| BTN OK | Pin 6 | PB6 | Bouton (vers GND) |
| BTN BAS | Pin 7 | PB7 | Bouton (vers GND) |
| ADC batterie | Pin 14 | PB3 | Point milieu du diviseur de tension |
| LED d'état | Pin 16 | PB5 | Via 330Ω vers GND |
| Debug TX | Pin 4 | PA9 | Émission UART |
| Debug RX | Pin 3 | PA10 | Réception UART |
| ST-LINK SWDIO | Pin 17 | PA13 | Programmation |
| ST-LINK SWCLK | Pin 18 | PA14 | Programmation |
| Antenne | SMA/U.FL | — | 868 MHz |

---

## Liste des composants

| Composant | Quantité | Notes |
|-----------|----------|-------|
| RAK3172-E EVB | 1 | Variante EU868 |
| SSD1306 OLED 128×64 | 1 | I2C, 0.96" ou 1.3" |
| Boutons tactiles | 3 | 6×6mm traversants |
| Résistances 100kΩ | 2 | Pour le diviseur de tension batterie |
| Résistance 330Ω | 1 | Pour la LED d'état |
| LED (toute couleur) | 1 | 3mm ou SMD |
| Batterie LiPo | 1 | 3.7V, 1000-2000mAh |
| Module TP4056 | 1 | Chargeur LiPo USB-C |
| AMS1117-3.3 | 1 | Régulateur LDO 3.3V |
| Antenne 868 MHz | 1 | SMA ou U.FL |
| ST-LINK V2 | 1 | Pour la programmation (peut être partagé) |
| Fils/PCB | — | Pour les connexions |

**Coût estimé des composants :** ~15-25 € par appareil (hors ST-LINK)
