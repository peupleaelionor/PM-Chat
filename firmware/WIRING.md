# PM-Chat Mesh — Wiring Guide

Complete pin mapping and connection diagram for the RAK3172-E Evaluation Board.

---

## RAK3172-E Module Pinout (Used Pins)

```
RAK3172-E Module
┌───────────────────────────────┐
│                               │
│  Pin 12 (PA12) ──── I2C SCL  │──── OLED SCL
│  Pin 13 (PA11) ──── I2C SDA  │──── OLED SDA
│                               │
│  Pin 5  (PA15) ──── GPIO     │──── Button UP
│  Pin 6  (PB6)  ──── GPIO     │──── Button OK
│  Pin 7  (PB7)  ──── GPIO     │──── Button DOWN
│                               │
│  Pin 14 (PB3)  ──── ADC      │──── Battery voltage divider
│  Pin 16 (PB5)  ──── GPIO     │──── Status LED
│                               │
│  Pin 4  (PA9)  ──── UART TX  │──── Debug serial TX
│  Pin 3  (PA10) ──── UART RX  │──── Debug serial RX
│                               │
│  Pin 19         ──── VDD     │──── 3.3V power
│  Pin 20         ──── GND     │──── Ground
│  Pin 22         ──── RST     │──── Reset button (optional)
│                               │
│  LoRa Radio: Internal SubGHz  │──── LoRa antenna (SMA/U.FL)
│                               │
└───────────────────────────────┘
```

---

## Connection Diagram

### OLED Display (SSD1306, I2C, 128×64)

```
OLED          RAK3172-E
────          ─────────
VCC  ──────── 3.3V (Pin 19)
GND  ──────── GND  (Pin 20)
SCL  ──────── PA12 (Pin 12)
SDA  ──────── PA11 (Pin 13)
```

**I2C Address:** 0x3C (default for most SSD1306 modules)

### Buttons (Active LOW, Internal Pull-Up)

```
                  RAK3172-E
                  ─────────
BTN_UP ────┤├──── PA15 (Pin 5) ───┐
                                   ├── Internal pull-up enabled
BTN_OK ────┤├──── PB6  (Pin 6) ───┤   (no external resistors needed)
                                   │
BTN_DN ────┤├──── PB7  (Pin 7) ───┘
           │
           └──── GND (Pin 20)
```

Each button connects between the GPIO pin and GND. The firmware enables internal pull-up resistors, so **no external resistors are needed**.

### Battery Monitor (Voltage Divider)

```
  LiPo+  ────┬──── 100kΩ ──── PB3 (Pin 14) ──── ADC input
              │                  │
              │                100kΩ
              │                  │
  LiPo-  ────┴──── GND ────────┘
```

The voltage divider halves the battery voltage to keep it within the 0-3.3V ADC range:
- **4.2V battery** → 2.1V at ADC
- **3.0V battery** → 1.5V at ADC

### Status LED

```
  PB5 (Pin 16) ──── 330Ω ──── LED(+) ──── LED(-) ──── GND
```

### Debug Serial (Optional)

```
USB-UART          RAK3172-E
────────          ─────────
TX  ────────────── PA10 (Pin 3, UART RX)
RX  ────────────── PA9  (Pin 4, UART TX)
GND ────────────── GND  (Pin 20)
```

**Baud rate:** 115200

### Power Supply

```
  USB-C ──── TP4056 ──┬── LiPo Battery (3.7V)
                       │
                       └── RAK3172-E VDD (3.3V regulator needed)
                              OR
                       └── Direct to VDD if battery is 3.0-3.6V
```

**Note:** The RAK3172 operates at 3.3V. If using a LiPo (3.7-4.2V), use a 3.3V LDO regulator (e.g., AMS1117-3.3) between the battery and VDD.

### ST-LINK Programming Header

```
ST-LINK V2        RAK3172-E
──────────        ─────────
SWDIO  ────────── PA13 (Pin 17, SWDIO)
SWCLK  ────────── PA14 (Pin 18, SWCLK)
GND    ────────── GND  (Pin 20)
3.3V   ────────── VDD  (Pin 19) [optional, for powering during flash]
RST    ────────── RST  (Pin 22) [optional]
```

### LoRa Antenna

Connect an **868 MHz antenna** to the RAK3172-E antenna port (SMA or U.FL depending on module variant).

⚠️ **Never transmit without an antenna connected.** This can damage the radio module.

---

## Complete Wiring Summary

| Component | RAK3172 Pin | GPIO | Function |
|-----------|-------------|------|----------|
| OLED SDA | Pin 13 | PA11 | I2C Data |
| OLED SCL | Pin 12 | PA12 | I2C Clock |
| OLED VCC | Pin 19 | VDD | 3.3V Power |
| OLED GND | Pin 20 | GND | Ground |
| BTN UP | Pin 5 | PA15 | Button (to GND) |
| BTN OK | Pin 6 | PB6 | Button (to GND) |
| BTN DOWN | Pin 7 | PB7 | Button (to GND) |
| Battery ADC | Pin 14 | PB3 | Voltage divider mid-point |
| Status LED | Pin 16 | PB5 | Via 330Ω to GND |
| Debug TX | Pin 4 | PA9 | UART transmit |
| Debug RX | Pin 3 | PA10 | UART receive |
| ST-LINK SWDIO | Pin 17 | PA13 | Programming |
| ST-LINK SWCLK | Pin 18 | PA14 | Programming |
| Antenna | SMA/U.FL | — | 868 MHz |

---

## Bill of Materials

| Component | Quantity | Notes |
|-----------|----------|-------|
| RAK3172-E EVB | 1 | EU868 variant |
| SSD1306 OLED 128×64 | 1 | I2C, 0.96" or 1.3" |
| Tactile buttons | 3 | 6×6mm through-hole |
| 100kΩ resistors | 2 | For battery voltage divider |
| 330Ω resistor | 1 | For status LED |
| LED (any color) | 1 | 3mm or SMD |
| LiPo battery | 1 | 3.7V, 1000-2000mAh |
| TP4056 module | 1 | USB-C LiPo charger |
| AMS1117-3.3 | 1 | 3.3V LDO regulator |
| 868 MHz antenna | 1 | SMA or U.FL |
| ST-LINK V2 | 1 | For programming (can be shared) |
| Wires/PCB | — | For connections |

**Estimated BOM cost:** ~€15-25 per device (excluding ST-LINK)
