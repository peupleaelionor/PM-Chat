# PM-Chat Mesh — Spécification de conception du boîtier

Boîtier compact de type bipeur pour l'appareil mesh LoRa PM-Chat.

---

## Philosophie de conception

- **Aspect industriel épuré** — aucun élément décoratif
- **Finition mate haut de gamme** — gris foncé ou noir
- **Utilisation à une main** — prise en main confortable
- **Imprimable en 3D** — FDM ou SLA, aucune structure de support nécessaire
- **Assemblage sans outil** — fermeture par clips ou 2 vis

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

| Dimension | Valeur |
|-----------|--------|
| Longueur | 85 mm |
| Largeur | 50 mm |
| Hauteur | 18 mm |
| Épaisseur de paroi | 1.6 mm |
| Rayon d'angle | 3 mm |
| Poids (à vide) | ~30g (PLA/PETG) |

---

## Disposition de la face avant

```
  ┌──────────────────────────────────────────┐
  │                                          │
  │   ┌────────────────────────────────┐     │
  │   │                                │     │
  │   │       FENÊTRE OLED             │     │
  │   │       (découpe 30 × 14 mm)     │     │
  │   │                                │     │
  │   └────────────────────────────────┘     │
  │                                          │
  │                                          │
  │                                          │
  │      [  ▲  ]    [  ●  ]    [  ▼  ]      │
  │       HAUT        OK         BAS         │
  │                                          │
  │   ○ LED                                  │
  └──────────────────────────────────────────┘
```

### Fenêtre OLED
- **Découpe :** 30 × 14 mm (centrée horizontalement)
- **Position :** 8 mm du bord supérieur
- **Bordure :** rebord de 0,5 mm autour de l'écran
- **Protection :** fenêtre optionnelle en acrylique/polycarbonate transparent (1mm d'épaisseur)

### Boutons
- **Disposition :** 3 boutons en ligne, centrés horizontalement
- **Espacement :** 14 mm de centre à centre
- **Position :** 12 mm du bord inférieur
- **Découpe :** trous carrés de 7 × 7 mm pour interrupteurs tactiles 6×6mm
- **Capuchon :** capuchons de bouton optionnels imprimés en 3D (8 × 8 × 3 mm)

### LED
- **Position :** coin inférieur gauche, 4 mm des bords
- **Découpe :** trou de 3 mm de diamètre

---

## Vues latérales

### Côté droit (antenne)

```
  ┌──────────────────┐
  │                  │
  │    Trou SMA      │  ← 6,5 mm de diamètre pour connecteur SMA
  │    (centré)      │
  │                  │
  └──────────────────┘
```

### Côté inférieur (USB-C)

```
  ┌──────────────────┐
  │                  │
  │   Fente USB-C    │  ← découpe 12 × 7 mm
  │   (centré)       │
  │                  │
  └──────────────────┘
```

### Côté gauche (lisse)

Aucune découpe. Surface lisse.

### Côté supérieur (optionnel)

Trou d'accès optionnel pour réinitialisation (1,5 mm de diamètre) pour accès à la réinitialisation usine.

---

## Disposition interne (coupe transversale)

```
  ┌──────────────────────────────────────────┐
  │  COQUE AVANT (haut)                      │
  │  ┌────────────────────────────────────┐  │
  │  │  Écran OLED (fixé avec de la       │  │
  │  │  mousse)                           │  │
  │  └────────────────────────────────────┘  │
  │  ┌────────────────────────────────────┐  │
  │  │  PCB RAK3172-E                     │  │
  │  │  (monté sur entretoises, 3mm)      │  │
  │  └────────────────────────────────────┘  │
  │  ┌────────────────────────────────────┐  │
  │  │  Batterie LiPo                     │  │
  │  │  (fixée avec du ruban adhésif      │  │
  │  │  double face)                      │  │
  │  └────────────────────────────────────┘  │
  │  ┌────────────────────────────────────┐  │
  │  │  Module chargeur TP4056            │  │
  │  └────────────────────────────────────┘  │
  │  COQUE ARRIÈRE (bas)                     │
  └──────────────────────────────────────────┘
```

### Empilement des composants (de haut en bas)
1. **Écran OLED** — affleurant avec la fenêtre avant
2. **PCB des boutons ou boutons directs** — alignés avec les découpes avant
3. **RAK3172-E EVB** — monté sur des entretoises de 3mm
4. **Batterie LiPo** — format plat, fixée avec du ruban mousse
5. **Module TP4056** — USB-C aligné avec la découpe inférieure

---

## Assemblage

### Coque en deux parties

Le boîtier se compose de deux parties :

1. **Coque avant** — contient la fenêtre OLED, les trous des boutons, le trou de la LED
2. **Coque arrière** — contient le compartiment batterie, la fente USB-C, le trou d'antenne

### Options de fermeture

**Option A : Clips (préférée)**
- 4 clips sur la coque arrière
- Ouverture/fermeture sans outil
- Ajouter une tolérance de 0,2mm pour l'impression FDM

**Option B : Fermeture à vis**
- 2× vis M2 aux coins
- Inserts filetés en laiton dans la coque avant
- Plus sécurisée, légèrement plus difficile à ouvrir

---

## Recommandations d'impression 3D

### Matériau
| Matériau | Avantages | Inconvénients |
|----------|-----------|---------------|
| **PETG** (recommandé) | Solide, légèrement flexible, résistant à la chaleur | Légèrement plus difficile à imprimer |
| **PLA** | Facile à imprimer, bon niveau de détail | Fragile, faible résistance à la chaleur |
| **ABS** | Solide, résistant à la chaleur | Gauchissement, ventilation nécessaire |

### Paramètres d'impression
| Paramètre | Valeur |
|-----------|--------|
| Hauteur de couche | 0.2 mm |
| Remplissage | 20% |
| Parois | 3 périmètres |
| Couches dessus/dessous | 4 |
| Supports | Aucun nécessaire (conception sans support) |
| Orientation | Imprimer les coques face vers le bas |

### Post-traitement
1. **Ponçage léger** (grain 220-400) pour une finition lisse
2. **Peinture en spray mate** (optionnel) — gris foncé ou noir
3. **Vernis de protection** (optionnel) — pour la durabilité

---

## Intégration de l'antenne

### Option A : SMA externe
- Connecteur SMA traversant à travers la paroi latérale droite
- Le plus flexible, antenne standard 868 MHz
- **Découpe :** trou de 6,5 mm + 2 méplats pour clé

### Option B : Antenne PCB interne
- Coller une petite antenne PCB 868 MHz à l'intérieur du boîtier
- Aspect plus propre, portée légèrement réduite
- **Note :** s'assurer qu'aucun métal ne se trouve près de l'antenne

### Option C : Antenne filaire
- Simple fil de 86,3 mm (quart d'onde à 868 MHz)
- Passer par un petit trou dans le haut
- Option la moins chère, bonnes performances

---

## Ergonomie

```
  Prise à une main :
  
  ┌────────────┐
  │  ┌──────┐  │  ← OLED visible d'un coup d'œil
  │  │ OLED │  │
  │  └──────┘  │
  │            │
  │  [▲][●][▼] │  ← Le pouce atteint les 3 boutons
  │            │
  └─────┬──────┘
        │
     ───┘  (tenu comme un bipeur)
```

- L'appareil se tient à une main (orientation portrait)
- Le pouce repose naturellement sur la rangée de boutons
- L'écran OLED est lisible à bout de bras
- L'antenne pointe à l'opposé de la main (côté supérieur ou droit)

---

## Variantes

### Minimale (basique)
- Pas de LED
- Antenne filaire (à travers un trou)
- Batterie maintenue par friction
- Construction la plus simple possible

### Standard (recommandée)
- Indicateur LED
- Connecteur d'antenne SMA
- Batterie fixée avec du ruban mousse
- Fermeture par clips
- Capuchons de bouton

### Premium
- Fenêtre OLED transparente (acrylique découpée au laser)
- PCB personnalisé intégrant tous les composants
- Logo gravé
- Inserts en laiton pour les vis
- Finition mate peinte au spray

---

## Référence des dessins techniques

Pour la modélisation 3D, utiliser ces dimensions clés :

| Élément | X (mm) | Y (mm) | Z (mm) |
|---------|--------|--------|--------|
| Découpe OLED | 10 | 8 | — |
| Taille OLED | 30 × 14 | — | 1 mm de profondeur |
| Centre du bouton 1 | 18 | 65 | — |
| Centre du bouton 2 | 32 | 65 | — |
| Centre du bouton 3 | 46 | 65 | — |
| Taille du trou de bouton | 7 × 7 | — | traversant |
| Trou LED | 6 | 73 | — |
| Diamètre LED | 3 | — | traversant |
| Trou SMA (droite) | — | 35 | centré |
| Diamètre SMA | 6.5 | — | traversant |
| Fente USB-C (bas) | centré | — | 12 × 7 |
| Positions des entretoises | 8,8 / 42,8 / 8,60 / 42,60 | — | hauteur 3mm |

Toutes les coordonnées partent du coin inférieur gauche de la face avant.

---

## Liste de vérification finale

- [ ] La fenêtre OLED est alignée avec l'écran
- [ ] Les 3 boutons sont accessibles et cliquent fermement
- [ ] Le port USB-C est accessible pour la recharge
- [ ] Le connecteur d'antenne (ou le fil) est correctement positionné
- [ ] La batterie tient sans exercer de pression sur le PCB
- [ ] La coque se ferme proprement (pas d'espace > 0,5mm)
- [ ] La LED est visible de l'extérieur
- [ ] Pas de cliquetis quand on secoue l'appareil
- [ ] Prise en main confortable à une main
