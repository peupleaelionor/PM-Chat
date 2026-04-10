# PM-Chat — Flux d'interface utilisateur

> Spécification complète de l'IHM — Firmware LoRa Mesh v1.0  
> Cible matérielle : RAK3172-E (STM32WLE5CC)  
> Écran : SSD1306 128×64, I2C, bibliothèque U8g2

---

## Table des matières

1. [Spécifications de l'affichage](#spécifications-de-laffichage)
2. [Architecture de l'écran](#architecture-de-lécran)
3. [Carte des 14 écrans](#carte-des-14-écrans)
4. [Carte de navigation](#carte-de-navigation)
5. [Description détaillée des écrans](#description-détaillée-des-écrans)
6. [Système de saisie (écran Compose)](#système-de-saisie-écran-compose)
7. [Barre d'en-tête (Header)](#barre-den-tête-header)
8. [Barre de pied de page (Footer)](#barre-de-pied-de-page-footer)
9. [Système de notifications toast](#système-de-notifications-toast)
10. [Gestion de l'économie d'énergie](#gestion-de-léconomie-dénergie)
11. [Correspondance boutons par écran](#correspondance-boutons-par-écran)

---

## Spécifications de l'affichage

| Paramètre | Valeur |
|-----------|--------|
| Contrôleur | SSD1306 |
| Résolution | 128 × 64 pixels |
| Interface | I2C (SDA: PA11, SCL: PA12) |
| Couleur | Monochrome (blanc sur noir) |
| Bibliothèque | U8g2 (`U8G2_SSD1306_128X64_NONAME_F_HW_I2C`) |
| Mode de dessin | Full frame buffer (`_F_`) |
| Taux de rafraîchissement | 10 Hz (`UI_FPS_MS` = 100 ms) |
| Luminosité par défaut | 200 / 255 |
| Luminosité atténuée | 20 / 255 |

---

## Architecture de l'écran

```
┌────────────────────────────────────────┐
│  Barre d'en-tête (Header)    0 → 12   │  13 px
│  Titre + icône batterie + pourcentage  │
├────────────────────────────────────────┤
│  Séparateur                   13       │  1 px
├────────────────────────────────────────┤
│                                        │
│  Zone de contenu              14 → 52  │  39 px
│  (variable selon l'écran)              │
│                                        │
├────────────────────────────────────────┤
│  Séparateur                   53       │  1 px
├────────────────────────────────────────┤
│  Barre de pied de page        54 → 63  │  10 px
│  Libellés des boutons (gauche, centre, │
│  droite)                               │
└────────────────────────────────────────┘
```

### Polices utilisées

| Police | Usage |
|--------|-------|
| `u8g2_font_helvB12_tr` | Titres proéminents (splash, PIN, ID) |
| `u8g2_font_helvB08_tr` | En-tête, boutons confirmation wipe |
| `u8g2_font_helvR08_tr` | Texte standard, messages d'erreur |
| `u8g2_font_5x7_tr` | Listes, contenu dense, pied de page |

---

## Carte des 14 écrans

| # | Identifiant | Nom d'affichage | Rôle |
|---|-------------|-----------------|------|
| 0 | `SCR_SPLASH` | PM-Chat + version | Écran de démarrage (1,5 s) |
| 1 | `SCR_SETUP_WELCOME` | Configuration | Accueil du premier démarrage |
| 2 | `SCR_SETUP_PIN` | Code PIN Mesh | Saisie du code PIN mesh (4 chiffres) |
| 3 | `SCR_DEVICE_INFO` | Infos appareil | Affichage de l'ID généré |
| 4 | `SCR_INBOX` | Réception (N) | Liste des conversations par pair |
| 5 | `SCR_CONVERSATION` | [ID pair] | Messages d'une conversation |
| 6 | `SCR_COMPOSE` | To:[ID pair] | Composition de message |
| 7 | `SCR_SENDING` | Envoi | Animation de transmission |
| 8 | `SCR_SETTINGS` | Paramètres | Menu de configuration |
| 9 | `SCR_NETWORK` | Réseau | Informations réseau et mesh |
| 10 | `SCR_WIPE_CONFIRM` | ! EFFACER ! | Confirmation d'effacement |
| 11 | `SCR_PIN_ENTRY` | Verrouillage PIN | Saisie du PIN de verrouillage |
| 12 | `SCR_TEST` | Mode test | Diagnostic matériel |
| 13 | `SCR_ERROR` | ERREUR | Affichage d'erreur système |

---

## Carte de navigation

```
                    ┌──────────────────┐
                    │   SCR_SPLASH     │
                    │  (auto, 1,5 s)   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │ non provisionné             │ provisionné
              ▼                             ▼
    ┌─────────────────┐           ┌──────────────────┐
    │ SCR_SETUP_       │           │                  │
    │ WELCOME          │           │   SCR_INBOX      │◄──────────────────┐
    │                  │           │                  │                   │
    └────────┬─────────┘           └──┬──┬──┬──┬─────┘                   │
             │ OK                     │  │  │  │                         │
             ▼                        │  │  │  │                         │
    ┌─────────────────┐               │  │  │  │                         │
    │ SCR_SETUP_PIN   │               │  │  │  │                         │
    │                  │              │  │  │  │                         │
    └────────┬─────────┘              │  │  │  │                         │
             │ OK long                │  │  │  │                         │
             ▼                        │  │  │  │                         │
    ┌─────────────────┐               │  │  │  │                         │
    │ SCR_DEVICE_INFO │               │  │  │  │                         │
    │                  │              │  │  │  │                         │
    └────────┬─────────┘              │  │  │  │                         │
             │ OK                     │  │  │  │                         │
             └───────────────────────>│  │  │  │                         │
                                      │  │  │  │                         │
              ┌───────────────────────┘  │  │  │                         │
              │ OK (pair sélectionné)    │  │  │                         │
              ▼                          │  │  │                         │
    ┌──────────────────┐                 │  │  │                         │
    │ SCR_CONVERSATION │                 │  │  │                         │
    │                  │─── hold ^ ──────┼──┼──┼─────────────────────────┤
    │                  │─── OK ──┐       │  │  │                         │
    └──────────────────┘         │       │  │  │                         │
                                 │       │  │  │                         │
              ┌──────────────────┘       │  │  │                         │
              │ (répondre)               │  │  │                         │
              ▼                          │  │  │                         │
    ┌──────────────────┐                 │  │  │                         │
    │ SCR_COMPOSE      │                 │  │  │                         │
    │                  │─── hold ^ ──────┼──┼──┼─────────────────────────┤
    │                  │─── hold OK ─┐   │  │  │                         │
    └──────────────────┘             │   │  │  │                         │
                                     │   │  │  │                         │
              ┌──────────────────────┘   │  │  │                         │
              ▼                          │  │  │                         │
    ┌──────────────────┐                 │  │  │                         │
    │ SCR_SENDING      │                 │  │  │                         │
    │ (auto → inbox)   │─────────────────┼──┼──┼─────────────────────────┘
    └──────────────────┘                 │  │  │
                                         │  │  │
              ┌──────────────────────────┘  │  │
              │ hold ^                      │  │
              ▼                             │  │
    ┌──────────────────┐                    │  │
    │ SCR_SETTINGS     │                    │  │
    │                  │─── hold ^ ─────────┼──┼──────────────────────────┐
    │                  │                    │  │                          │
    └──┬──┬──┬──┬──────┘                    │  │                          │
       │  │  │  │                           │  │                          │
       │  │  │  └── "Réinitialisation"      │  │                          │
       │  │  │      ▼                       │  │                          │
       │  │  │  ┌──────────────────┐        │  │                          │
       │  │  │  │ SCR_WIPE_CONFIRM │        │  │                          │
       │  │  │  │                  │─ annul ─┘  │                          │
       │  │  │  └──────────────────┘            │                          │
       │  │  │                                  │                          │
       │  │  └── "Mode test"                    │                          │
       │  │      ▼                              │                          │
       │  │  ┌──────────────────┐               │                          │
       │  │  │ SCR_TEST         │               │                          │
       │  │  │                  │─── hold ^ ────┤                          │
       │  │  └──────────────────┘               │                          │
       │  │                                     │                          │
       │  └── "Code PIN Mesh"                   │                          │
       │      ▼                                 │                          │
       │  ┌──────────────────┐                  │                          │
       │  │ SCR_NETWORK      │                  │                          │
       │  │                  │─── hold ^ ───────┼──────────────────────────┤
       │  └──────────────────┘                  │                          │
       │                                        │                          │
       └── (hold ▼ depuis inbox)────────────────┘                          │
                                                                           │
    ┌──────────────────┐                                                   │
    │ SCR_PIN_ENTRY    │─── PIN validé ────────────────────────────────────┤
    └──────────────────┘                                                   │
                                                                           │
    ┌──────────────────┐                                                   │
    │ SCR_ERROR        │─── OK ────────────────────────────────────────────┘
    └──────────────────┘
```

---

## Description détaillée des écrans

### SCR_SPLASH — Écran de démarrage

```
┌────────────────────────────────┐
│                                │
│                                │
│          PM-Chat               │  ← font helvB12
│       LoRa Mesh v1.0          │  ← font helvR08
│                                │
│      Initialisation...         │  ← font 5x7
│                                │
└────────────────────────────────┘
```

- **Durée** : 1 500 ms fixe, aucune interaction utilisateur.
- **Transition** : Automatique vers `SCR_SETUP_WELCOME` (non provisionné) ou `SCR_INBOX` (provisionné).

### SCR_SETUP_WELCOME — Accueil de configuration

```
┌────────────────────────────────┐
│ Configuration           100%█ │
├────────────────────────────────┤
│                                │
│    Bienvenue sur PM-Chat       │
│                                │
│   Entrez un code PIN Mesh      │
│  Partagez avec votre groupe    │
│                                │
├────────────────────────────────┤
│            OK:start            │
└────────────────────────────────┘
```

### SCR_SETUP_PIN — Saisie du code PIN mesh

```
┌────────────────────────────────┐
│ Code PIN Mesh           100%█ │
├────────────────────────────────┤
│                                │
│          1 2 3 _               │  ← curseur clignotant
│                                │
│                                │
│                                │
├────────────────────────────────┤
│ ^v:digit    OK:next  Hold OK:go│
└────────────────────────────────┘
```

- Le curseur alterne entre `_` et le chiffre courant (cycle de 400 ms).
- UP/DOWN incrémentent/décrémentent le chiffre (0–9 cyclique).
- OK avance au chiffre suivant. OK long confirme et provisionne.

### SCR_DEVICE_INFO — Identité de l'appareil

```
┌────────────────────────────────┐
│ Infos appareil          100%█ │
├────────────────────────────────┤
│                                │
│    Votre ID d'appareil :       │
│                                │
│        A1B2C3D4                │  ← font helvB12
│                                │
│  Partagez ceci avec vos pairs  │
├────────────────────────────────┤
│          OK:continue           │
└────────────────────────────────┘
```

### SCR_INBOX — Boîte de réception

```
┌────────────────────────────────┐
│ Réception (2)           85%█  │
├────────────────────────────────┤
│ ▌A1B2C3D4   Salut comm..     │  ← sélectionné (inversé)
│  E5F6G7H8   Ok on se re..     │
│  12345678   Rendez-vous..     │
│                                │
├────────────────────────────────┤
│ ^v:nav    OK:open    Hold:new  │
└────────────────────────────────┘
```

- **4 lignes visibles** maximum avec défilement vertical.
- Chaque ligne affiche l'ID du pair (8 caractères hex) et un aperçu du dernier message (11 caractères + `..`).
- La ligne sélectionnée est dessinée en vidéo inversée (`drawBox` + `setDrawColor(0)`).
- Le titre inclut le nombre de messages non lus.

### SCR_CONVERSATION — Vue de conversation

```
┌────────────────────────────────┐
│ A1B2C3D4                85%█  │
├────────────────────────────────┤
│ > Salut, tu es dispo ?         │  ← message reçu (préfixe >)
│               Oui, j'arrive !  │  ← message envoyé (aligné droite)
│ > Cool, à tout de suite        │
│                                │
├────────────────────────────────┤
│ ^v:scroll  OK:reply  Back:hold^│
└────────────────────────────────┘
```

- Messages reçus : préfixe `>`, alignés à gauche.
- Messages envoyés : alignés à droite.
- Défilement vertical avec UP/DOWN.
- Les messages sont marqués comme lus à l'ouverture de la conversation.

### SCR_COMPOSE — Composition de message

```
┌────────────────────────────────┐
│ To:A1B2C3D4             85%█  │
├────────────────────────────────┤
│ HELLO WORLD                    │  ← texte composé
│                                │
│            [A]                  │  ← caractère sélectionné
│                                │
├────────────────────────────────┤
│ ^v:char   OK:add   HldOK:send │
└────────────────────────────────┘
```

- Voir la section [système de saisie](#système-de-saisie-écran-compose) pour les détails.

### SCR_SENDING — Animation d'envoi

```
┌────────────────────────────────┐
│ Envoi                   85%█  │
├────────────────────────────────┤
│                                │
│       Transmission...          │
│                                │
│           ...                  │  ← points animés (300 ms/cycle)
│                                │
├────────────────────────────────┤
│                                │
└────────────────────────────────┘
```

- Aucune interaction utilisateur. Le FSM gère la transition automatique vers `SCR_INBOX`.

### SCR_SETTINGS — Menu paramètres

```
┌────────────────────────────────┐
│ Paramètres              85%█  │
├────────────────────────────────┤
│ ▌Code PIN Mesh        1234    │  ← sélectionné
│  Verrouillage PIN      OFF    │
│  Luminosité            78%    │
│  Mode test                    │
│  Réinitialisation usine       │
├────────────────────────────────┤
│ ^v:nav  OK:select  Back:hold^ │
└────────────────────────────────┘
```

- 5 éléments de menu avec valeurs actuelles à droite.
- Luminosité : cycle par pas de 50 (50 → 100 → 150 → 200 → 250 → 50).

### SCR_NETWORK — Informations réseau

```
┌────────────────────────────────┐
│ Réseau                  85%█  │
├────────────────────────────────┤
│  ID: A1B2C3D4                  │
│  RSSI: -67 dBm                 │
│  Relayés: 42                   │
│  Perdus: 3                     │
├────────────────────────────────┤
│                     Back:hold^ │
└────────────────────────────────┘
```

### SCR_WIPE_CONFIRM — Confirmation d'effacement

```
┌────────────────────────────────┐
│ ! EFFACER !             85%█  │
├────────────────────────────────┤
│                                │
│  Effacer toutes les données ?  │
│   Action irréversible !        │
│                                │
│   [Annuler]     EFFACER        │  ← sélection par UP/DOWN
│                                │
├────────────────────────────────┤
│ <:annuler  OK:choisir >:effacer│
└────────────────────────────────┘
```

- Deux boutons visuels : « Annuler » et « EFFACER ».
- La sélection alterne entre les deux via UP/DOWN.
- Le bouton sélectionné est affiché en vidéo inversée.

### SCR_PIN_ENTRY — Verrouillage PIN

```
┌────────────────────────────────┐
│ Verrouillage PIN        85%█  │
├────────────────────────────────┤
│                                │
│          * * 3 *               │  ← chiffres masqués sauf courant
│                                │
├────────────────────────────────┤
│ ^v:digit       OK:next        │
└────────────────────────────────┘
```

### SCR_TEST — Diagnostic matériel

```
┌────────────────────────────────┐
│ Mode test               85%█  │
├────────────────────────────────┤
│  Radio : OK                    │
│  Batt : 3850mV 71%            │
│  Boutons : appuyez             │
│  OLED : affichage OK           │
├────────────────────────────────┤
│                     Back:hold^ │
└────────────────────────────────┘
```

### SCR_ERROR — Erreur système

```
┌────────────────────────────────┐
│ ERREUR                  85%█  │
├────────────────────────────────┤
│                                │
│  Radio init failed             │  ← message d'erreur (retour à la
│                                │     ligne automatique, max 3 lignes)
│                                │
├────────────────────────────────┤
│          OK:dismiss            │
└────────────────────────────────┘
```

---

## Système de saisie (écran Compose)

### Jeu de caractères

```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
0 1 2 3 4 5 6 7 8 9   . , ! ? - : ; ' @ # & + =
```

**Total** : 50 caractères définis par `INPUT_CHARSET`.

### Fonctionnement

```
┌─────────────────────────────────────────────────┐
│                                                  │
│   UP    → caractère suivant dans le jeu          │
│           (A → B → C → ... → = → A)             │
│                                                  │
│   DOWN  → caractère précédent dans le jeu        │
│           (A → = → + → ... → B → A)             │
│                                                  │
│   OK    → ajouter le caractère sélectionné       │
│           au tampon de composition                │
│           (max 160 caractères)                   │
│                                                  │
│   OK    → envoyer le message (si non vide)       │
│   long     → transition vers SCR_SENDING         │
│                                                  │
│   DOWN  → supprimer le dernier caractère         │
│   long     du tampon                             │
│                                                  │
│   UP    → annuler et revenir à SCR_INBOX         │
│   long                                           │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Affichage du curseur

```
        [A]          ← caractère courant entre crochets
                       centré horizontalement
                       police helvB08 pour la visibilité
```

### Retour à la ligne du texte composé

Le texte composé est affiché avec retour à la ligne automatique :
- 21 caractères par ligne (police 5×7)
- Maximum 3 lignes visibles dans la zone de contenu

---

## Barre d'en-tête (Header)

```
┌─ Titre (gauche) ──────────── Icône + % (droite) ─┐
│ Réception (2)                          █▌ 85%    │
└──────────────────────────────────────────────────┘
  13 pixels de hauteur
```

### Éléments

| Élément | Position | Police | Source |
|---------|----------|--------|--------|
| Titre de l'écran | Gauche (x=2, y=10) | `helvB08` | Varie selon l'écran |
| Icône batterie | Droite - 15 px | Dessin primitif | `battery::percent()` |
| Pourcentage batterie | Extrême droite | `helvB08` | `battery::percent()` |

### Icône batterie

```
Dessin :
  drawFrame(bx, 2, 10, 7)     ← contour
  drawBox(bx+10, 4, 2, 3)     ← borne positive
  drawBox(bx+1, 3, fill, 5)   ← remplissage proportionnel
```

---

## Barre de pied de page (Footer)

```
┌─ Gauche ──────── Centre ──────── Droite ─┐
│ ^v:nav          OK:open          Hold:new │
└──────────────────────────────────────────┘
  10 pixels de hauteur, police 5×7
```

| Position | Alignement | Contenu typique |
|----------|-----------|-----------------|
| Gauche | `x=1` | Action UP/DOWN (`^v:nav`, `^v:char`, `^v:digit`) |
| Centre | Centré | Action OK (`OK:open`, `OK:add`, `OK:select`) |
| Droite | Aligné droite | Action secondaire (`Hold:new`, `HldOK:send`, `Back:hold^`) |

Les libellés sont spécifiques à chaque écran et documentés dans le tableau de la section [correspondance boutons](#correspondance-boutons-par-écran).

---

## Système de notifications toast

### Comportement

```
Événement déclencheur
       │
       ▼
ui::toast("Texte", durée_ms)
       │
       ├── Copie du texte dans s_toast[32]
       └── s_toast_until = millis() + durée_ms
       
Lors du rendu (ui::draw()) :
       │
       ├── Si s_toast[0] ≠ '\0' et millis() < s_toast_until :
       │      ├── Calculer la largeur du texte
       │      ├── Dessiner un cadre centré :
       │      │     drawBox (fond noir) : (tx-4, 22, tw+8, 16)
       │      │     drawFrame (bordure) : (tx-4, 22, tw+8, 16)
       │      └── Dessiner le texte centré (police helvR08)
       │
       └── Sinon : effacer s_toast
```

### Notifications utilisées

| Texte | Durée | Déclencheur |
|-------|-------|-------------|
| `"New message!"` | 2 000 ms | Réception d'un message texte déchiffré avec succès |
| `"Sent!"` | 1 500 ms | Message envoyé avec succès |
| `"Queued (retry)"` | 1 500 ms | Envoi échoué, message mis en file de re-tentative |
| `"Send failed"` | 2 000 ms | `on_send_complete(false)` |
| `"Ping received"` | 1 500 ms | Réception d'un paquet `PKT_PING` |
| `"WIPED!"` | 3 000 ms | Effacement d'urgence terminé |
| `"BATT CRITIQUE !"` | 3 000 ms | `battery::is_critical() == true` |
| `"Batterie faible"` | 2 000 ms | `battery::is_low() == true` |

### Position à l'écran

```
┌────────────────────────────────┐
│ Header                         │
├────────────────────────────────┤
│                                │
│     ┌──────────────────┐       │
│     │   New message!   │       │  y = 22 → 38 (16 px de haut)
│     └──────────────────┘       │
│                                │
├────────────────────────────────┤
│ Footer                         │
└────────────────────────────────┘
```

Le toast est dessiné **par-dessus** le contenu de l'écran actif. Il est automatiquement effacé après expiration de la durée.

---

## Gestion de l'économie d'énergie

### Temporisations

| Événement | Délai | Action |
|-----------|-------|--------|
| Dernière interaction | 30 s (`DIM_TIMEOUT_MS`) | Atténuation de la luminosité à 20/255 |
| Dernière interaction | 120 s (`OFF_TIMEOUT_MS`) | Extinction complète (`setPowerSave(1)`) |
| Tout bouton pressé | Immédiat | Réveil (`wake()`) |
| Notification critique | Immédiat | Réveil forcé (`ui::wake()`) |

### Flux d'atténuation et d'extinction

```
Dernière interaction utilisateur (s_last_input)
       │
       ├── +30 s sans interaction
       │      ├── s_dimmed = true
       │      └── s_disp.setContrast(20)
       │
       ├── +120 s sans interaction
       │      ├── s_off = true
       │      └── s_disp.setPowerSave(1)   ← OLED éteint
       │
       └── Bouton pressé (n'importe lequel)
              │
              ├── Si écran éteint (s_off) :
              │      ├── s_off = false
              │      ├── s_dimmed = false
              │      ├── s_disp.setPowerSave(0)
              │      ├── s_disp.setContrast(s_brightness)
              │      └── L'événement bouton est CONSOMMÉ
              │           (pas de navigation, seulement le réveil)
              │
              └── Si écran atténué (s_dimmed) :
                     ├── s_dimmed = false
                     └── s_disp.setContrast(s_brightness)
                          L'événement bouton est TRAITÉ normalement
```

### Réveil programmatique

Certains événements système forcent le réveil sans interaction utilisateur :

```cpp
ui::wake();  // Appelé par :
             // - handle_text_packet() → message reçu
             // - main.cpp → batterie critique
```

---

## Correspondance boutons par écran

| Écran | ▲ court | ▲ long | ● court | ● long | ▼ court | ▼ long |
|-------|---------|--------|---------|--------|---------|--------|
| `SPLASH` | — | — | — | — | — | — |
| `SETUP_WELCOME` | — | — | Démarrer | — | — | — |
| `SETUP_PIN` | Chiffre + | Retour chiffre | Chiffre suivant | Confirmer PIN | Chiffre − | — |
| `DEVICE_INFO` | — | — | Continuer | Continuer | — | — |
| `INBOX` | Sélection ↑ | Paramètres | Ouvrir conv. | Nouveau msg | Sélection ↓ | Réseau |
| `CONVERSATION` | Défiler ↑ | Retour inbox | Répondre | — | Défiler ↓ | — |
| `COMPOSE` | Char suivant | Annuler | Ajouter char | Envoyer | Char précédent | Supprimer |
| `SENDING` | — | — | — | — | — | — |
| `SETTINGS` | Sélection ↑ | Retour inbox | Activer option | — | Sélection ↓ | — |
| `NETWORK` | — | Retour inbox | — | — | — | — |
| `WIPE_CONFIRM` | Basculer sel. | Retour param. | Confirmer | — | Basculer sel. | — |
| `PIN_ENTRY` | Chiffre + | — | Chiffre suivant | Soumettre | Chiffre − | — |
| `TEST` | — | Retour param. | — | — | — | — |
| `ERROR` | — | — | Acquitter | — | — | — |
