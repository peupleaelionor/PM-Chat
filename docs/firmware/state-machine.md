# PM-Chat — Machine à états du firmware

> Spécification complète de la FSM système — Firmware LoRa Mesh v1.0  
> Cible matérielle : RAK3172-E (STM32WLE5CC)

---

## Table des matières

1. [Diagramme d'ensemble](#diagramme-densemble)
2. [États](#états)
3. [Transitions](#transitions)
4. [Correspondance boutons par état](#correspondance-boutons-par-état)
5. [Correspondance écrans par état](#correspondance-écrans-par-état)
6. [Récupération d'erreur](#récupération-derreur)

---

## Diagramme d'ensemble

```
                          ┌──────────┐
                   RESET  │          │
               ─────────> │   BOOT   │
                          │ (splash) │
                          └────┬─────┘
                               │
                    1,5 s      │
                   écoulées    │
                               │
               ┌───────────────┼───────────────┐
               │               │               │
               ▼               │               │
  ┌────────────────┐           │    ┌──────────▼─────────┐
  │                │           │    │                    │
  │  STATE_SETUP   │           │    │    STATE_IDLE      │◄────────────┐
  │ (1er démarrage)│           │    │  (boucle active)   │             │
  │                │           │    │                    │             │
  └───────┬────────┘           │    └──┬───┬───┬───┬────┘             │
          │                    │       │   │   │   │                  │
          │ provisionnement    │       │   │   │   │                  │
          │ terminé            │       │   │   │   │                  │
          │                    │       │   │   │   │    OK sur        │
          └────────────────────┘       │   │   │   │    SCR_ERROR     │
                                       │   │   │   │                  │
                  ┌────────────────────┘   │   │   └──────────┐      │
                  │                        │   │              │      │
                  ▼                        │   ▼              ▼      │
       ┌──────────────┐                   │ ┌────────┐ ┌──────────┐ │
       │              │                   │ │        │ │          │ │
       │ STATE_SENDING│                   │ │ STATE_ │ │  STATE_  │ │
       │  (max 5 s)   │───── timeout ────>│ │RECEIV. │ │  ERROR   │─┘
       │              │                   │ │        │ │          │
       └──────────────┘                   │ └───┬────┘ └──────────┘
                                          │     │
                                          │     │ immédiat
                                          │     └──────────────────>┐
                                          │                         │
                                          ▼                         │
                                   ┌──────────┐                    │
                                   │          │                    │
                                   │ STATE_   │                    │
                                   │  TEST    │────── hold ^ ─────>│
                                   │          │                    │
                                   └──────────┘                    │
                                                                   │
                                          ┌────────────────────────┘
                                          │
                                          ▼
                                    STATE_IDLE


                    ═══════════════════════════════════
                     BTN_PANIC (depuis n'importe quel
                     état) → fsm::panic_wipe()
                     → effacement → STATE_SETUP
                    ═══════════════════════════════════
```

---

## États

### STATE_BOOT

| Propriété | Valeur |
|-----------|--------|
| **Écran** | `SCR_SPLASH` |
| **Durée** | 1 500 ms fixe |
| **Entrée dans l'état** | Initialisation de `s_state_ts`, affichage du splash. |
| **Pendant l'état** | Attente passive. Aucun traitement radio ou utilisateur. |
| **Sortie de l'état** | Vérification de `identity::is_provisioned()`. Si provisionné → chargement de la clé réseau, transition vers `STATE_IDLE`, écran `SCR_INBOX`. Sinon → `STATE_SETUP`, écran `SCR_SETUP_WELCOME`. |
| **Boutons** | Aucun traitement (écran splash sans interaction). |

### STATE_SETUP

| Propriété | Valeur |
|-----------|--------|
| **Écrans** | `SCR_SETUP_WELCOME` → `SCR_SETUP_PIN` → `SCR_DEVICE_INFO` → `SCR_INBOX` |
| **Entrée dans l'état** | Affichage de l'écran de bienvenue. Réinitialisation du buffer PIN. |
| **Pendant l'état** | L'utilisateur saisit un code PIN mesh à 4 chiffres. L'UI gère le flux d'écrans. Le FSM surveille `identity::is_provisioned()` et `ui::current_screen() == SCR_INBOX`. |
| **Sortie de l'état** | Provisionnement détecté et écran inbox atteint → chargement de la clé réseau → `STATE_IDLE`. |
| **Boutons** | Délégués à l'UI. Voir la section [correspondance boutons](#correspondance-boutons-par-état). |

### STATE_PIN_ENTRY

| Propriété | Valeur |
|-----------|--------|
| **Écran** | `SCR_PIN_ENTRY` |
| **Entrée dans l'état** | Affichage de l'écran de saisie de PIN de verrouillage. |
| **Pendant l'état** | L'utilisateur saisit son PIN. Le FSM attend le signal `on_pin_accepted()`. |
| **Sortie de l'état** | PIN validé → chargement de la clé réseau → `STATE_IDLE`, écran `SCR_INBOX`. |
| **Boutons** | UP/DOWN : changer le chiffre. OK court : passer au chiffre suivant. OK long : soumettre. |

### STATE_IDLE

| Propriété | Valeur |
|-----------|--------|
| **Écrans** | `SCR_INBOX`, `SCR_CONVERSATION`, `SCR_COMPOSE`, `SCR_SETTINGS`, `SCR_NETWORK`, `SCR_WIPE_CONFIRM`, `SCR_TEST` |
| **Entrée dans l'état** | Clé réseau chargée. Radio en mode réception. |
| **Pendant l'état** | Boucle opérationnelle principale : |
|                   | 1. `process_radio()` — Réception et traitement des paquets entrants |
|                   | 2. `process_outgoing()` — Envoi des messages en file d'attente |
|                   | 3. `msg_store::tick()` — Gestion des expirations et re-tentatives |
|                   | 4. `mesh::tick()` — Purge du cache de déduplication |
|                   | 5. Détection de `SCR_SENDING` → envoi immédiat du message composé |
|                   | 6. Détection de `SCR_WIPE_CONFIRM` → attente de confirmation utilisateur |
| **Sortie de l'état** | `on_error()` → `STATE_ERROR`. `panic_wipe()` → `STATE_SETUP`. Transitions vers `STATE_SENDING` ou `STATE_TEST` possibles. |
| **Boutons** | Dépendent de l'écran actif. Voir la section [correspondance boutons](#correspondance-boutons-par-état). |

### STATE_SENDING

| Propriété | Valeur |
|-----------|--------|
| **Écran** | `SCR_SENDING` |
| **Entrée dans l'état** | Un envoi actif est en cours. |
| **Pendant l'état** | `process_radio()` continue (réception possible pendant l'attente). Timeout de 5 secondes. |
| **Sortie de l'état** | Timeout écoulé → `STATE_IDLE`. `on_send_complete()` → `STATE_IDLE`. |
| **Boutons** | Aucun traitement (écran d'animation). |

### STATE_RECEIVING

| Propriété | Valeur |
|-----------|--------|
| **Écran** | Aucun écran dédié (reste sur l'écran actif). |
| **Entrée dans l'état** | Signal de réception de message. |
| **Pendant l'état** | `process_radio()` exécuté. |
| **Sortie de l'état** | Retour immédiat à `STATE_IDLE`. |
| **Boutons** | Non applicable (transition instantanée). |

### STATE_TEST

| Propriété | Valeur |
|-----------|--------|
| **Écran** | `SCR_TEST` |
| **Entrée dans l'état** | Sélectionné depuis le menu paramètres. |
| **Pendant l'état** | `process_radio()` actif. Affichage de l'état radio, de la batterie et des boutons en temps réel. |
| **Sortie de l'état** | Pression longue UP → `STATE_IDLE` (via retour à `SCR_SETTINGS`). |
| **Boutons** | UP long : retour aux paramètres. |

### STATE_ERROR

| Propriété | Valeur |
|-----------|--------|
| **Écran** | `SCR_ERROR` |
| **Entrée dans l'état** | `fsm::on_error(msg)` appelé. Le message d'erreur est copié dans un tampon statique de 48 caractères et affiché. |
| **Pendant l'état** | Attente de l'acquittement utilisateur. Aucun traitement radio. |
| **Sortie de l'état** | Pression OK → `STATE_IDLE` (l'écran passe hors de `SCR_ERROR`, le FSM détecte la transition). |
| **Boutons** | OK court : acquitter l'erreur et revenir à l'inbox. |

---

## Transitions

| De | Vers | Déclencheur | Condition |
|----|------|-------------|-----------|
| `BOOT` | `IDLE` | Timeout 1,5 s | `identity::is_provisioned() == true` |
| `BOOT` | `SETUP` | Timeout 1,5 s | `identity::is_provisioned() == false` |
| `SETUP` | `IDLE` | Provisionnement terminé | `identity::is_provisioned() && current_screen() == SCR_INBOX` |
| `PIN_ENTRY` | `IDLE` | PIN validé | `fsm::on_pin_accepted()` |
| `IDLE` | `SENDING` | Envoi déclenché | `ui::current_screen() == SCR_SENDING` et message non vide |
| `IDLE` | `ERROR` | Erreur signalée | `fsm::on_error(msg)` |
| `IDLE` | `SETUP` | Panique | `fsm::panic_wipe()` |
| `SENDING` | `IDLE` | Timeout 5 s | `millis() - s_state_ts > 5000` |
| `SENDING` | `IDLE` | Envoi terminé | `fsm::on_send_complete()` |
| `RECEIVING` | `IDLE` | Immédiat | Retour systématique après traitement |
| `TEST` | `IDLE` | Retour utilisateur | Via UI → `SCR_SETTINGS` → `SCR_INBOX` |
| `ERROR` | `IDLE` | Acquittement | `ui::current_screen() != SCR_ERROR` |
| *Tout état* | `SETUP` | Panique | `BTN_PANIC` → `fsm::panic_wipe()` |
| *Tout état* | `BOOT` | Watchdog | Timeout matériel 8 s sans `IWatchdog.reload()` |

---

## Correspondance boutons par état

### Légende

| Symbole | Signification |
|---------|---------------|
| ▲ | BTN_UP_SHORT |
| ▲̄ | BTN_UP_LONG |
| ● | BTN_OK_SHORT |
| ●̄ | BTN_OK_LONG |
| ▼ | BTN_DOWN_SHORT |
| ▼̄ | BTN_DOWN_LONG |
| ⚠ | BTN_PANIC (3 boutons × 3 s) |

### SCR_SPLASH

| Bouton | Action |
|--------|--------|
| Tous | Aucune action |

### SCR_SETUP_WELCOME

| Bouton | Action |
|--------|--------|
| ● | Démarrer la saisie du PIN → `SCR_SETUP_PIN` |

### SCR_SETUP_PIN

| Bouton | Action |
|--------|--------|
| ▲ | Incrémenter le chiffre courant (0→9→0) |
| ▼ | Décrémenter le chiffre courant (9→0→9) |
| ● | Passer au chiffre suivant |
| ●̄ | Confirmer le PIN → provisionnement → `SCR_DEVICE_INFO` |
| ▲̄ | Revenir au chiffre précédent |

### SCR_DEVICE_INFO

| Bouton | Action |
|--------|--------|
| ● / ●̄ | Continuer → `SCR_INBOX` |

### SCR_INBOX

| Bouton | Action |
|--------|--------|
| ▲ | Sélection précédente dans la liste |
| ▼ | Sélection suivante dans la liste |
| ● | Ouvrir la conversation sélectionnée → `SCR_CONVERSATION` |
| ●̄ | Nouveau message (broadcast) → `SCR_COMPOSE` |
| ▲̄ | Ouvrir les paramètres → `SCR_SETTINGS` |
| ▼̄ | Ouvrir les informations réseau → `SCR_NETWORK` |

### SCR_CONVERSATION

| Bouton | Action |
|--------|--------|
| ▲ | Défiler vers le haut |
| ▼ | Défiler vers le bas |
| ● | Répondre à ce pair → `SCR_COMPOSE` |
| ▲̄ | Retour à l'inbox → `SCR_INBOX` |

### SCR_COMPOSE

| Bouton | Action |
|--------|--------|
| ▲ | Caractère suivant dans le jeu de caractères |
| ▼ | Caractère précédent dans le jeu de caractères |
| ● | Ajouter le caractère sélectionné au message |
| ●̄ | Envoyer le message → `SCR_SENDING` |
| ▼̄ | Supprimer le dernier caractère |
| ▲̄ | Annuler → retour `SCR_INBOX` |

### SCR_SENDING

| Bouton | Action |
|--------|--------|
| Tous | Aucune action (animation en cours) |

### SCR_SETTINGS

| Bouton | Action |
|--------|--------|
| ▲ | Sélection précédente |
| ▼ | Sélection suivante |
| ● | Activer l'option sélectionnée : |
|   | — *Code PIN Mesh* → `SCR_NETWORK` |
|   | — *Verrouillage PIN* → basculer ON/OFF |
|   | — *Luminosité* → cycle (+50, retour à 50 à 250) |
|   | — *Mode test* → `SCR_TEST` |
|   | — *Réinitialisation usine* → `SCR_WIPE_CONFIRM` |
| ▲̄ | Retour à l'inbox → `SCR_INBOX` |

### SCR_NETWORK

| Bouton | Action |
|--------|--------|
| ▲̄ | Retour à l'inbox → `SCR_INBOX` |

### SCR_WIPE_CONFIRM

| Bouton | Action |
|--------|--------|
| ▲ / ▼ | Basculer entre « Annuler » et « EFFACER » |
| ● | Confirmer la sélection : |
|   | — *Annuler* → retour `SCR_SETTINGS` |
|   | — *EFFACER* → déclenchement du wipe (le FSM prend le relais) |
| ▲̄ | Retour aux paramètres → `SCR_SETTINGS` |

### SCR_PIN_ENTRY

| Bouton | Action |
|--------|--------|
| ▲ | Incrémenter le chiffre courant |
| ▼ | Décrémenter le chiffre courant |
| ● | Passer au chiffre suivant |
| ●̄ | Soumettre le PIN |

### SCR_TEST

| Bouton | Action |
|--------|--------|
| ▲̄ | Retour aux paramètres → `SCR_SETTINGS` |

### SCR_ERROR

| Bouton | Action |
|--------|--------|
| ● | Acquitter → retour `SCR_INBOX` |

---

## Correspondance écrans par état

| État système | Écrans possibles |
|-------------|------------------|
| `STATE_BOOT` | `SCR_SPLASH` |
| `STATE_SETUP` | `SCR_SETUP_WELCOME`, `SCR_SETUP_PIN`, `SCR_DEVICE_INFO`, `SCR_INBOX` |
| `STATE_PIN_ENTRY` | `SCR_PIN_ENTRY` |
| `STATE_IDLE` | `SCR_INBOX`, `SCR_CONVERSATION`, `SCR_COMPOSE`, `SCR_SENDING`, `SCR_SETTINGS`, `SCR_NETWORK`, `SCR_WIPE_CONFIRM`, `SCR_TEST` |
| `STATE_SENDING` | `SCR_SENDING` |
| `STATE_RECEIVING` | (Écran courant inchangé) |
| `STATE_TEST` | `SCR_TEST` |
| `STATE_ERROR` | `SCR_ERROR` |

---

## Récupération d'erreur

### Erreur radio

```
radio::init() retourne false
       │
       ▼
fsm::on_error("Radio init failed")
       │
       ▼
STATE_ERROR + SCR_ERROR
       │
       │ utilisateur appuie OK
       ▼
STATE_IDLE + SCR_INBOX
(système en mode dégradé — aucune communication radio)
```

### Erreur d'envoi

```
send_text_message() retourne false
       │
       ▼
msg_store::set_state(idx, MSTATE_QUEUED)
       │
       ▼
Re-tentative automatique (max 3 fois, backoff exponentiel)
       │
       ├── succès → MSTATE_SENT → attente ACK → MSTATE_DELIVERED
       │
       └── échec × 3 → MSTATE_FAILED
                │
                ▼
            ui::toast("Queued (retry)")
```

### Panique (wipe d'urgence)

```
BTN_PANIC (3 boutons × 3 secondes)
       │
       ▼
fsm::panic_wipe()
       │
       ├── msg_store::clear()         ← effacement messages
       ├── crypto::secure_zero(clé)   ← mise à zéro de la clé
       ├── identity::wipe()           ← effacement EEPROM complet
       │       ├── secure_zero(clé réseau)
       │       ├── secure_zero(PIN mesh)
       │       └── storage::erase_all()
       ├── ui::toast("WIPED!")
       │
       ▼
STATE_SETUP + SCR_SETUP_WELCOME
(l'appareil redémarre dans l'état d'usine)
```

### Watchdog

```
Boucle principale bloquée > 8 secondes
       │
       ▼
IWatchdog déclenche un reset matériel
       │
       ▼
STATE_BOOT (redémarrage complet)
       │
       ▼
(si provisionné → STATE_IDLE, sinon → STATE_SETUP)
```

### Batterie critique

```
battery::is_critical() == true
       │
       ▼
ui::toast("BATT CRITIQUE !")
ui::wake() ← réveil de l'écran
       │
       ▼
(Le système continue de fonctionner.
 Aucune extinction automatique n'est implémentée.
 L'alimentation LiPo se coupera naturellement
 en dessous de la tension de coupure du régulateur.)
```
