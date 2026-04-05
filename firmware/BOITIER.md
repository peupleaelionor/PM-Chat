# PM-Chat Mesh — Boîtier Design Specification

Compact pager-like enclosure for the PM-Chat LoRa mesh device.

---

## Design Philosophy

- **Clean industrial look** — no decorative elements
- **Premium matte finish** — dark grey or black
- **One-hand operation** — comfortable grip
- **3D-printable** — FDM or SLA, no support structures needed
- **Tool-free assembly** — snap-fit or 2-screw closure

---

## Dimensions

```
┌──────────────────────────────────────┐
│                                      │
│   Overall: 85 × 50 × 18 mm          │
│   (roughly credit-card width,        │
│    double credit-card thickness)     │
│                                      │
└──────────────────────────────────────┘
```

| Dimension | Value |
|-----------|-------|
| Length | 85 mm |
| Width | 50 mm |
| Height | 18 mm |
| Wall thickness | 1.6 mm |
| Corner radius | 3 mm |
| Weight (empty) | ~30g (PLA/PETG) |

---

## Front Face Layout

```
  ┌──────────────────────────────────────────┐
  │                                          │
  │   ┌────────────────────────────────┐     │
  │   │                                │     │
  │   │       OLED WINDOW              │     │
  │   │       (30 × 14 mm cutout)      │     │
  │   │                                │     │
  │   └────────────────────────────────┘     │
  │                                          │
  │                                          │
  │                                          │
  │      [  ▲  ]    [  ●  ]    [  ▼  ]      │
  │       UP          OK         DOWN        │
  │                                          │
  │   ○ LED                                  │
  └──────────────────────────────────────────┘
```

### OLED Window
- **Cutout:** 30 × 14 mm (centered horizontally)
- **Position:** 8 mm from top edge
- **Bezel:** 0.5 mm lip around display
- **Protection:** Optional clear acrylic/polycarbonate window (1mm thick)

### Buttons
- **Layout:** 3 buttons in a row, centered horizontally
- **Spacing:** 14 mm center-to-center
- **Position:** 12 mm from bottom edge
- **Cutout:** 7 × 7 mm square holes for 6×6mm tactile switches
- **Cap:** Optional 3D-printed button caps (8 × 8 × 3 mm)

### LED
- **Position:** Bottom-left corner, 4 mm from edges
- **Cutout:** 3 mm diameter hole

---

## Side Views

### Right Side (Antenna)

```
  ┌──────────────────┐
  │                  │
  │    SMA Hole      │  ← 6.5 mm diameter for SMA connector
  │    (centered)    │
  │                  │
  └──────────────────┘
```

### Bottom Side (USB-C)

```
  ┌──────────────────┐
  │                  │
  │   USB-C Slot     │  ← 12 × 7 mm cutout
  │   (centered)     │
  │                  │
  └──────────────────┘
```

### Left Side (Clean)

No cutouts. Clean surface.

### Top Side (Optional)

Optional reset pinhole (1.5 mm diameter) for factory reset access.

---

## Internal Layout (Cross-Section)

```
  ┌──────────────────────────────────────────┐
  │  FRONT SHELL (top)                       │
  │  ┌────────────────────────────────────┐  │
  │  │  OLED Display (secured with foam)  │  │
  │  └────────────────────────────────────┘  │
  │  ┌────────────────────────────────────┐  │
  │  │  RAK3172-E PCB                     │  │
  │  │  (mounted on standoffs, 3mm)       │  │
  │  └────────────────────────────────────┘  │
  │  ┌────────────────────────────────────┐  │
  │  │  LiPo Battery                      │  │
  │  │  (secured with double-sided tape)  │  │
  │  └────────────────────────────────────┘  │
  │  ┌────────────────────────────────────┐  │
  │  │  TP4056 Charger Module             │  │
  │  └────────────────────────────────────┘  │
  │  BACK SHELL (bottom)                     │
  └──────────────────────────────────────────┘
```

### Component Stacking (top to bottom)
1. **OLED display** — flush with front window
2. **Button PCB or direct buttons** — aligned with front cutouts
3. **RAK3172-E EVB** — mounted on 3mm standoffs
4. **LiPo battery** — flat pack, secured with foam tape
5. **TP4056 module** — USB-C aligned with bottom cutout

---

## Assembly

### Two-Part Shell

The enclosure consists of two parts:

1. **Front shell** — Contains OLED window, button holes, LED hole
2. **Back shell** — Contains battery compartment, USB-C slot, antenna hole

### Closure Options

**Option A: Snap-fit (preferred)**
- 4 snap-fit clips on back shell
- Tool-free open/close
- Add 0.2mm tolerance for FDM printing

**Option B: Screw closure**
- 2× M2 screws at corners
- Brass heat-set inserts in front shell
- More secure, slightly harder to open

---

## 3D Printing Guidelines

### Material
| Material | Pros | Cons |
|----------|------|------|
| **PETG** (recommended) | Strong, slight flex, heat resistant | Slightly harder to print |
| **PLA** | Easy to print, good detail | Brittle, low heat resistance |
| **ABS** | Strong, heat resistant | Warping, ventilation needed |

### Print Settings
| Setting | Value |
|---------|-------|
| Layer height | 0.2 mm |
| Infill | 20% |
| Walls | 3 perimeters |
| Top/bottom layers | 4 |
| Supports | None needed (design is support-free) |
| Orientation | Print shells face-down |

### Post-Processing
1. **Light sanding** (220-400 grit) for smooth finish
2. **Matte spray paint** (optional) — dark grey or black
3. **Clear coat** (optional) — for durability

---

## Antenna Integration

### Option A: External SMA
- SMA bulkhead connector through right side wall
- Most flexible, standard 868 MHz antenna
- **Cutout:** 6.5 mm hole + 2 flat edges for wrench

### Option B: Internal PCB Antenna
- Glue a small 868 MHz PCB antenna inside the case
- Cleaner look, slightly reduced range
- **Note:** Ensure no metal near the antenna

### Option C: Wire Antenna
- Simple 86.3 mm wire (quarter-wave at 868 MHz)
- Route through a small hole in the top
- Cheapest option, good performance

---

## Ergonomics

```
  One-hand grip:
  
  ┌────────────┐
  │  ┌──────┐  │  ← OLED visible at glance
  │  │ OLED │  │
  │  └──────┘  │
  │            │
  │  [▲][●][▼] │  ← Thumb reaches all 3 buttons
  │            │
  └─────┬──────┘
        │
     ───┘  (held like a pager)
```

- Device is held in one hand (portrait orientation)
- Thumb naturally rests on the button row
- OLED is readable at arm's length
- Antenna points away from hand (top or right side)

---

## Variants

### Minimal (Basic)
- No LED
- Wire antenna (through hole)
- Friction-fit battery
- Simplest possible build

### Standard (Recommended)
- LED indicator
- SMA antenna connector
- Foam-taped battery
- Snap-fit closure
- Button caps

### Premium
- Clear OLED window (laser-cut acrylic)
- Custom PCB integrating all components
- Engraved logo
- Brass inserts for screws
- Spray-painted matte finish

---

## Technical Drawings Reference

For 3D modeling, use these key dimensions:

| Feature | X (mm) | Y (mm) | Z (mm) |
|---------|--------|--------|--------|
| OLED cutout | 10 | 8 | — |
| OLED size | 30 × 14 | — | 1 mm depth |
| Button 1 center | 18 | 65 | — |
| Button 2 center | 32 | 65 | — |
| Button 3 center | 46 | 65 | — |
| Button hole size | 7 × 7 | — | through |
| LED hole | 6 | 73 | — |
| LED diameter | 3 | — | through |
| SMA hole (right) | — | 35 | centered |
| SMA diameter | 6.5 | — | through |
| USB-C slot (bottom) | centered | — | 12 × 7 |
| Standoff positions | 8,8 / 42,8 / 8,60 / 42,60 | — | 3mm height |

All coordinates from bottom-left of front face.

---

## Final Checklist

- [ ] OLED window aligns with display
- [ ] All 3 buttons are accessible and click firmly
- [ ] USB-C port is reachable for charging
- [ ] Antenna connector (or wire) properly positioned
- [ ] Battery fits without pressure on PCB
- [ ] Shell closes cleanly (no gaps > 0.5mm)
- [ ] LED is visible from outside
- [ ] No rattling when shaken
- [ ] Comfortable one-hand hold
