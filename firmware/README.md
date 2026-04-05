# PM-Chat Mesh Firmware

Offline encrypted LoRa mesh messaging firmware for **RAK3172-E Evaluation Board EU868**.

No WiFi. No Internet. No GPS. No cloud. Pure device-to-device encrypted messaging over LoRa.

---

## Features

| Feature | Details |
|---------|---------|
| **LoRa Mesh** | Multi-hop relay with TTL and deduplication |
| **Encryption** | AES-256-GCM with per-message nonce |
| **OLED UI** | 128×64 SSD1306, 12+ screens, 3-button navigation |
| **Security** | Hardware RNG, encrypted storage, panic wipe |
| **Battery** | LiPo monitoring with low/critical alerts |
| **Watchdog** | 8-second independent watchdog for crash recovery |
| **Offline** | Zero network dependencies, fully autonomous |

---

## Hardware Requirements

- **RAK3172-E** Evaluation Board (STM32WLE5CC, EU868)
- **SSD1306** 128×64 OLED display (I2C)
- **3 tactile buttons** (normally open, active low)
- **LiPo battery** (3.7V, 1000-2000mAh recommended)
- **TP4056** or similar USB-C LiPo charger module
- **Voltage divider** (2× 100kΩ resistors for battery ADC)
- **LoRa antenna** (868 MHz, SMA or U.FL)

See [WIRING.md](WIRING.md) for complete connection diagram.

---

## Project Structure

```
firmware/
├── platformio.ini          # Build configuration
├── include/
│   ├── config.h            # All constants, types, enums
│   ├── pins.h              # Hardware pin definitions
│   ├── packet.h            # Binary packet format
│   ├── crypto_engine.h     # AES-256-GCM interface
│   ├── device_identity.h   # Device ID management
│   ├── radio.h             # LoRa radio abstraction
│   ├── mesh.h              # Mesh routing engine
│   ├── message_store.h     # Message storage & queues
│   ├── storage.h           # EEPROM persistence
│   ├── button.h            # 3-button handler
│   ├── battery.h           # Battery monitor
│   ├── ui.h                # OLED display & all screens
│   └── state_machine.h     # System state machine
├── src/
│   ├── main.cpp            # Entry point & main loop
│   ├── packet.cpp          # Packet encode/decode
│   ├── crypto_engine.cpp   # AES-GCM + hardware RNG
│   ├── device_identity.cpp # Identity provisioning
│   ├── radio.cpp           # RadioLib STM32WLx driver
│   ├── mesh.cpp            # TTL, dedup, relay logic
│   ├── message_store.cpp   # In-RAM message management
│   ├── storage.cpp         # EEPROM read/write
│   ├── button.cpp          # Debounce & event detection
│   ├── battery.cpp         # ADC voltage reading
│   ├── ui.cpp              # U8g2 OLED rendering
│   └── state_machine.cpp   # FSM transitions & logic
├── test/
│   └── test_main.cpp       # Unity test harness
├── WIRING.md               # Pin map & connections
└── BOITIER.md              # Enclosure design spec
```

---

## Build & Flash

### Prerequisites

1. Install [PlatformIO](https://platformio.org/install)
2. Install [ST-LINK](https://www.st.com/en/development-tools/stsw-link009.html) drivers
3. Connect ST-LINK V2 to RAK3172-E SWD header

### Build

```bash
cd firmware
pio run -e rak3172
```

### Flash

```bash
pio run -e rak3172 --target upload
```

### Serial Monitor

```bash
pio device monitor --baud 115200
```

### Run Tests

```bash
pio test -e test
```

---

## First Boot Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────┐     ┌───────┐
│  SPLASH  │────▶│SETUP WELCOME│────▶│ MESH PIN │────▶│DEV ID │────▶ INBOX
│  1.5 sec │     │ Press OK    │     │ 4 digits │     │display │
└─────────┘     └─────────────┘     └──────────┘     └───────┘
```

1. Device boots, shows splash screen for 1.5 seconds
2. First boot detected → Setup Welcome screen
3. User enters a 4-digit **Mesh PIN** (shared with all group members)
4. Device generates a random Device ID and derives encryption key
5. Device ID displayed — share with peers
6. Press OK → Inbox (ready to send/receive)

### Joining an Existing Mesh

Enter the **same Mesh PIN** on all devices. All devices with the same PIN share the same encryption key and can communicate.

---

## Button Controls

| Context | ▲ UP | ● OK | ▼ DOWN |
|---------|------|------|--------|
| **General** | Navigate up | Select/confirm | Navigate down |
| **Hold ▲** | Go back | — | — |
| **Hold ●** | — | Context action (send, confirm) | — |
| **Hold ▼** | — | — | Delete character |
| **All 3 held (3s)** | — | **PANIC WIPE** | — |

---

## Message Protocol

### Packet Format (Binary, Little-Endian)

```
Offset  Size   Field          Description
──────  ────   ─────          ───────────
0       1      version        Protocol version (0x01)
1       1      type           PKT_TEXT/ACK/PING/PAIR_REQ/PAIR_ACK
2       4      sender_id      Source device ID
6       4      dest_id        Destination (0xFFFFFFFF = broadcast)
10      4      msg_id         Unique message identifier
14      1      ttl            Hops remaining (default: 3, max: 7)
15      1      flags          Bitmask: burn|ack_req|relayed|priority|encrypted
16      12     nonce          AES-GCM nonce (random per message)
28      2      payload_len    Encrypted payload length
30      N      payload        Encrypted payload (max 200 bytes)
30+N    16     tag            AES-GCM authentication tag
```

**Max packet size:** 246 bytes (fits LoRa 255-byte limit)

### Encryption

- **Algorithm:** AES-256-GCM
- **Key derivation:** SHA-256(mesh_pin + salt)
- **Nonce:** 12 bytes, hardware RNG, unique per message
- **AAD:** version + type + sender_id + dest_id + msg_id (14 bytes)
- **Tag:** 16-byte authentication tag

### Mesh Routing

1. Receive packet
2. Check dedup cache → drop if seen within 60 seconds
3. If for us → decrypt and store
4. If broadcast → process AND relay (if TTL > 0)
5. If for another node → relay (decrement TTL, set RELAYED flag)
6. Random delay (0-100ms) before relay to avoid collisions

---

## State Machine

```
      ┌──────────────────────────────────────┐
      │                                      │
      ▼                                      │
   ┌──────┐   provisioned?   ┌──────┐       │
   │ BOOT │──── yes ────────▶│ IDLE │       │
   │      │                  │      │◀──┐   │
   └──┬───┘                  └──┬───┘   │   │
      │ no                      │       │   │
      ▼                      ┌──┴───┐   │   │
   ┌──────┐                  │SEND- │   │   │
   │SETUP │                  │ ING  │───┘   │
   │      │──── done ────────│      │       │
   └──────┘                  └──────┘       │
      │                                      │
      └──── panic ───────────────────────────┘
```

**States:** BOOT → SETUP → IDLE → SENDING → RECEIVING → ERROR

---

## Security Model

| Property | Implementation |
|----------|---------------|
| **Encryption** | AES-256-GCM per message |
| **Key source** | SHA-256(mesh_pin + salt) |
| **Random** | STM32 hardware TRNG |
| **Nonce** | 12 bytes, unique per message |
| **Replay protection** | Dedup cache (msg_id, 60s window) |
| **Tamper detection** | GCM auth tag on encrypted + header |
| **Relay privacy** | Relay nodes cannot decrypt payload |
| **Panic wipe** | Hold all 3 buttons → erase Flash |
| **No debug leaks** | Serial output can be disabled |
| **Key storage** | EEPROM (on-chip Flash, no external) |

---

## Factory Reset / Wipe

**Settings → Factory Reset:** Confirm via on-screen prompt. Erases device ID, keys, messages, and all settings. Device reboots into Setup.

**Panic Wipe:** Hold all 3 buttons for 3 seconds. Immediate erase of all data. No confirmation required.

---

## LoRa Parameters (EU868)

| Parameter | Value |
|-----------|-------|
| Frequency | 868.0 MHz |
| Bandwidth | 125 kHz |
| Spreading Factor | 9 |
| Coding Rate | 4/7 |
| Sync Word | 0x12 (private) |
| TX Power | 14 dBm |
| Preamble | 8 symbols |
| CRC | Enabled |

**Estimated range:** 2-5 km line of sight, 500m-1km urban.

---

## Memory Budget (STM32WLE5CC: 256KB Flash, 64KB RAM)

| Component | RAM Usage |
|-----------|-----------|
| U8g2 framebuffer | 1 KB |
| Message store (32 msgs) | ~8 KB |
| Dedup cache (64 entries) | 768 B |
| Packet buffers | 512 B |
| UI state | ~512 B |
| Stack | ~4 KB |
| **Total** | **~15 KB / 64 KB** |

---

## Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| [RadioLib](https://github.com/jgromes/RadioLib) | ^6.6.0 | LoRa via STM32WLx |
| [U8g2](https://github.com/olikraus/U8g2) | ^2.35.19 | SSD1306 OLED driver |
| [Crypto](https://github.com/rweather/arduinolibs) | ^0.4.0 | AES-256-GCM |

All managed automatically by PlatformIO. No external/cloud dependencies.

---

## License

MIT — See [LICENSE](../LICENSE)
