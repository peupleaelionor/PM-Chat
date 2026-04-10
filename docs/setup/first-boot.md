# Premier démarrage

Ce document décrit en détail ce qui se passe lorsqu'un appareil PM-Chat est mis sous tension pour la première fois, ainsi que le fonctionnement complet de l'assistant de configuration.

---

## Séquence de démarrage

### Phase 1 — Initialisation (STATE_BOOT)

À la mise sous tension, le firmware exécute la séquence suivante :

1. **Initialisation matérielle** — horloge système, GPIO, I2C, UART, watchdog (8 s)
2. **Affichage du splash** — écran `SCR_SPLASH` : logo PM-Chat et version firmware (1,5 seconde)
3. **Lecture EEPROM** — recherche de la valeur magique `0x504D4348` ("PMCH") à l'adresse 0

### Phase 2 — Détection de l'état de provisionnement

Le firmware vérifie la présence du marqueur magique en EEPROM :

| Résultat | Action |
|----------|--------|
| Magic trouvé (`0x504D4348`) | Appareil déjà provisionné → chargement de la clé réseau → `STATE_IDLE` (boîte de réception) |
| Magic absent | Appareil neuf ou réinitialisé → `STATE_SETUP` (assistant de configuration) |

---

## Assistant de configuration (Setup Wizard)

L'assistant guide l'utilisateur à travers trois écrans successifs :

### Écran 1 — Bienvenue (`SCR_SETUP_WELCOME`)

```
╔══════════════════════════╗
║      PM-Chat v1.0.0       ║
║                            ║
║      Bienvenue !           ║
║                            ║
║   Appuyez sur OK           ║
║   pour commencer           ║
╚══════════════════════════╝
```

**Action :** Appuyez sur **OK** pour passer à l'écran suivant.

---

### Écran 2 — Saisie du PIN réseau (`SCR_SETUP_PIN`)

```
╔══════════════════════════╗
║   PIN réseau maillé       ║
║                            ║
║       [ 0 ] 0   0   0     ║
║         ▲                  ║
║   ▲▼: chiffre  OK: suite  ║
║   OK long: confirmer       ║
╚══════════════════════════╝
```

**Contrôles :**

| Bouton | Action |
|--------|--------|
| HAUT | Incrémenter le chiffre actif (0→1→2→…→9→0) |
| BAS | Décrémenter le chiffre actif (0→9→8→…→1→0) |
| OK | Valider le chiffre et passer au suivant |
| OK (appui long) | Confirmer le PIN complet (4 chiffres) |

Le PIN à 4 chiffres est utilisé pour dériver la clé de chiffrement AES-256 du réseau via SHA-256 avec un sel constant (`PM-CHAT-MESH-KEY-V1`).

⚠️ **Tous les appareils d'un même réseau maillé doivent utiliser le même PIN.** Un PIN différent empêche toute communication.

---

### Écran 3 — Provisionnement et identifiant (`SCR_DEVICE_INFO`)

Après la confirmation du PIN, le firmware procède au provisionnement :

1. **Génération de l'identifiant** — un identifiant unique sur 32 bits est généré par le générateur de nombres aléatoires matériel (TRNG) du STM32WLE5. Les valeurs `0x00000000` et `0xFFFFFFFF` sont exclues.
2. **Dérivation de la clé réseau** — `SHA-256(PIN + "PM-CHAT-MESH-KEY-V1")` → clé AES-256 (32 octets)
3. **Écriture en EEPROM** — les données suivantes sont écrites :

| Adresse | Taille | Donnée |
|---------|--------|--------|
| 0 | 4 octets | Valeur magique `0x504D4348` |
| 4 | 4 octets | Identifiant de l'appareil |
| 8 | 32 octets | Clé réseau (AES-256) |
| 50 | 4 octets | PIN réseau maillé |
| 46 | 4 octets | Compteur de messages (initialisé à 0) |
| 45 | 1 octet | Luminosité par défaut |

L'écran affiche ensuite l'identifiant :

```
╔══════════════════════════╗
║   Appareil provisionné    ║
║                            ║
║   Votre identifiant :     ║
║       A3F7 B21C            ║
║                            ║
║   OK pour continuer       ║
╚══════════════════════════╝
```

📝 **Notez cet identifiant.** Il identifie votre appareil sur le réseau maillé et sera nécessaire pour que d'autres utilisateurs vous envoient des messages dirigés.

---

### Écran 4 — Prêt (`SCR_INBOX`)

Après un appui sur **OK**, l'appareil passe en mode opérationnel (`STATE_IDLE`) et affiche la boîte de réception. L'appareil est désormais prêt à envoyer et recevoir des messages.

---

## Vérifier le provisionnement

✅ **Indicateurs de succès :**

- L'écran de la boîte de réception s'affiche normalement
- L'en-tête affiche l'indicateur de batterie et le signal
- L'appareil redémarre correctement après un cycle d'alimentation (pas de retour à l'assistant)
- L'identifiant est accessible via le menu **Paramètres → Infos appareil**

---

## En cas d'échec du provisionnement

Si l'assistant ne se termine pas correctement ou si l'appareil reste bloqué :

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Écran figé sur le splash | Initialisation matérielle échouée | Vérifier le câblage I2C (SDA/SCL), l'alimentation 3,3 V |
| Écran noir | OLED non alimenté ou mal connecté | Vérifier les soudures et l'adresse I2C (0x3C) |
| Retour au splash en boucle | Watchdog timeout (8 s) | Le firmware ne termine pas l'initialisation — reflasher |
| PIN accepté mais pas de Device ID | Échec d'écriture EEPROM | Flash interne défectueux — essayer un autre module |

---

## Re-provisionner un appareil

Pour relancer l'assistant de configuration sur un appareil déjà provisionné, il faut d'abord effectuer une **réinitialisation usine** :

1. **Via le menu** : Paramètres → Réinitialisation usine → Confirmer
2. **Via le bouton panique** : maintenir les 3 boutons simultanément pendant 3 secondes

Après la réinitialisation, l'appareil redémarre et entre automatiquement dans l'assistant de configuration.

⚠️ **La réinitialisation usine est irréversible.** L'identifiant, la clé réseau, le PIN et tous les paramètres sont effacés. Un nouvel identifiant sera généré lors du re-provisionnement.

Consultez le [guide de réinitialisation](device-reset.md) pour plus de détails.

---

## Résumé du flux de démarrage

```
Mise sous tension
      │
      ▼
STATE_BOOT (SCR_SPLASH, 1,5 s)
      │
      ├── EEPROM magic trouvé ?
      │       │
      │       ├── OUI → Charger clé réseau → STATE_IDLE (SCR_INBOX)
      │       │
      │       └── NON → STATE_SETUP
      │                    │
      │                    ▼
      │              SCR_SETUP_WELCOME
      │                    │ (OK)
      │                    ▼
      │              SCR_SETUP_PIN
      │                    │ (OK long)
      │                    ▼
      │              Provisionnement EEPROM
      │                    │
      │                    ▼
      │              SCR_DEVICE_INFO
      │                    │ (OK)
      │                    ▼
      │              STATE_IDLE (SCR_INBOX)
      │
      ▼
   Opérationnel
```

---

> 💡 **Conseil :** Lors du provisionnement de plusieurs appareils, préparez le PIN réseau à l'avance et notez systématiquement chaque identifiant attribué. Cela facilitera l'[appairage](pairing-guide.md) et le [déploiement](deployment-checklist.md).
