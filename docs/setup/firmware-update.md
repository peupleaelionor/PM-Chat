# Mise à jour du firmware

Ce guide explique comment mettre à jour le firmware PM-Chat sur un appareil déjà en service, tout en préservant sa configuration.

---

## Avant de commencer

### Vérifier la version actuelle

La version du firmware est affichée à deux endroits :

1. **Écran de démarrage (splash)** — visible pendant 1,5 seconde à chaque mise sous tension
2. **Menu Paramètres** — accessible depuis la boîte de réception

Notez la version actuelle (par exemple : `v1.0.0`) pour confirmer la mise à jour après le flashage.

### Vérifier la version disponible

Consultez le dépôt PM-Chat pour vérifier si une version plus récente est disponible :

```bash
cd PM-Chat
git pull origin main
```

La version du firmware est définie dans le fichier `firmware/platformio.ini` via le drapeau de compilation :

```ini
build_flags = -DFIRMWARE_VERSION=\"1.0.0\"
```

---

## Procédure de mise à jour

### Étape 1 — Préparer l'appareil

1. Assurez-vous que l'appareil est **chargé** (batterie > 50 % recommandé)
2. **Éteignez** l'appareil ou laissez-le alimenté — le flashage fonctionne dans les deux cas
3. Connectez le **ST-LINK** au module RAK3172-E :

| Signal ST-LINK | Broche RAK3172-E |
|----------------|------------------|
| SWDIO | Pin 17 (PA13) |
| SWCLK | Pin 18 (PA14) |
| GND | Pin 20 |
| 3V3 | Pin 19 |

### Étape 2 — Récupérer le firmware le plus récent

```bash
cd PM-Chat
git pull origin main
```

### Étape 3 — Compiler et flasher

```bash
cd firmware
pio run -e rak3172 -t upload
```

✅ Attendez le message `[SUCCESS]` dans le terminal.

### Étape 4 — Vérifier la mise à jour

1. Débranchez le ST-LINK
2. Effectuez un cycle d'alimentation (éteindre puis rallumer)
3. Vérifiez que l'écran splash affiche la **nouvelle version**
4. Vérifiez que la boîte de réception s'affiche normalement (pas de retour à l'assistant de configuration)

---

## Ce qui est préservé lors d'une mise à jour

La mise à jour du firmware **n'efface pas les données EEPROM**. Les éléments suivants sont conservés :

| Donnée | Préservée ? | Détails |
|--------|-------------|---------|
| Identifiant de l'appareil | ✅ Oui | Stocké en EEPROM (adresse 4) |
| Clé réseau (AES-256) | ✅ Oui | Stockée en EEPROM (adresse 8) |
| PIN réseau maillé | ✅ Oui | Stocké en EEPROM (adresse 50) |
| Compteur de messages | ✅ Oui | Stocké en EEPROM (adresse 46) |
| Paramètres (luminosité) | ✅ Oui | Stockés en EEPROM (adresse 45) |
| Messages en mémoire | ❌ Non | Stockés en RAM — perdus à la mise hors tension |

💡 **L'appareil conserve son identité et peut communiquer avec les mêmes pairs sans re-provisionnement.**

---

## Cas particuliers

### Mise à jour avec changement de format EEPROM

Si une mise à jour modifie le format de stockage EEPROM (changement de la disposition des adresses), le firmware peut nécessiter une migration automatique ou une réinitialisation.

Dans ce cas, les notes de version (changelog) le préciseront explicitement. Suivez les instructions spécifiques fournies avec la version concernée.

### Mise à jour depuis une version très ancienne

Si l'écart entre les versions est important, il est recommandé de :

1. Sauvegarder les identifiants des appareils
2. Effectuer une réinitialisation usine après le flashage
3. Re-provisionner les appareils avec le même PIN

### Retour à une version antérieure (downgrade)

Pour revenir à une version précédente du firmware :

```bash
cd PM-Chat
git checkout v1.0.0    # Remplacer par le tag de la version souhaitée
cd firmware
pio run -e rak3172 -t upload
```

⚠️ Un retour à une version antérieure peut nécessiter une réinitialisation usine si le format EEPROM a changé entre les versions.

---

## Mise à jour par voie hertzienne (OTA)

⚠️ **PM-Chat ne prend pas en charge la mise à jour OTA (Over-The-Air).**

Chaque mise à jour nécessite un **accès physique** à l'appareil et une connexion ST-LINK. Cette contrainte est volontaire :

- **Sécurité** — empêche l'injection de firmware malveillant à distance
- **Fiabilité** — garantit un flashage complet et vérifié
- **Simplicité** — pas de bootloader complexe nécessaire

---

## Mise à jour en lot

Pour mettre à jour plusieurs appareils efficacement :

```bash
# Compiler une seule fois
cd firmware
pio run -e rak3172

# Pour chaque appareil :
# 1. Connecter le ST-LINK
# 2. Flasher
pio run -e rak3172 -t upload
# 3. Vérifier le splash screen
# 4. Déconnecter et passer au suivant
```

### Liste de vérification par appareil

- [ ] ST-LINK connecté
- [ ] Flashage réussi (`[SUCCESS]`)
- [ ] Nouvelle version affichée sur le splash screen
- [ ] Boîte de réception accessible (pas de retour au setup)
- [ ] Communication testée avec un autre appareil

---

> 📖 Consultez la [liste de vérification pour le déploiement](deployment-checklist.md) pour un processus de mise à jour structuré sur un lot complet d'appareils.
