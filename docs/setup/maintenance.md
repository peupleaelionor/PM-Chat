# Maintenance

Ce guide couvre les opérations de maintenance courantes pour les appareils PM-Chat en service, de la gestion de la batterie à la mise hors service.

---

## Gestion de la batterie

### Recharge

Les appareils PM-Chat sont alimentés par une batterie LiPo 3,7 V rechargeable via le module TP4056 intégré.

| Paramètre | Détails |
|-----------|---------|
| Connecteur de charge | USB-C (via module TP4056) |
| Tension de charge | 4,2 V (régulée par le TP4056) |
| Courant de charge | ~500 mA (dépend du module TP4056) |
| Temps de charge complet | ~2–4 heures (pour 1000–2000 mAh) |
| Indicateur de charge | LED sur le module TP4056 (rouge = en charge, vert/bleu = terminé) |

### Surveillance

L'indicateur de batterie est affiché en permanence dans l'en-tête de l'écran.

| Niveau | Tension | Comportement |
|--------|---------|-------------|
| 100 % | 4,2 V | Fonctionnement normal |
| ~50 % | ~3,7 V | Fonctionnement normal |
| Faible | 3,3 V | Message « Batterie faible » affiché (toast 2 s) |
| Critique | 3,1 V | Message « BATT CRITIQUE ! » affiché (toast 3 s) |
| Vide | 3,0 V | Le circuit de protection coupe l'alimentation |

### Bonnes pratiques

- **Rechargez régulièrement** — ne laissez pas la batterie se décharger complètement
- **Utilisez un chargeur USB de qualité** — 5 V / 1 A minimum
- **Ne chargez pas sans surveillance** dans un environnement non contrôlé
- **Autonomie estimée** : 8–12 heures en utilisation normale (~250 mA en émission, ~5 mA au repos)

---

## Mises à jour du firmware

### Quand mettre à jour

- Lorsqu'une nouvelle version corrige un bug identifié
- Lorsqu'une nouvelle fonctionnalité est nécessaire
- Lorsqu'une vulnérabilité de sécurité est corrigée (mise à jour prioritaire)

### Comment mettre à jour

Consultez le [guide de mise à jour du firmware](firmware-update.md) pour la procédure complète.

**Résumé :**

```bash
cd PM-Chat && git pull origin main
cd firmware && pio run -e rak3172 -t upload
```

⚠️ **Aucune mise à jour OTA n'est disponible.** Chaque mise à jour nécessite un accès physique à l'appareil et un programmeur ST-LINK.

### Calendrier suggéré

| Fréquence | Action |
|-----------|--------|
| À chaque version | Vérifier les notes de version (changelog) |
| Mensuelle | Vérifier si une nouvelle version est disponible |
| Immédiate | Appliquer les correctifs de sécurité dès publication |

---

## Gestion des messages

### Stockage

Les messages sont conservés en **mémoire vive (RAM)** — ils ne survivent pas à un redémarrage.

| Paramètre | Valeur |
|-----------|--------|
| Capacité maximale | 32 messages |
| Politique d'éviction | FIFO (le plus ancien est écrasé en premier) |
| Taille maximale d'un message | 160 caractères |
| Expiration automatique | 1 heure (3 600 000 ms) |
| Nombre de pairs suivis | 8 maximum |

### Bonnes pratiques

- Les messages importants doivent être **notés manuellement** — ils ne sont pas persistants
- Les messages anciens sont automatiquement remplacés lorsque la mémoire est pleine
- Un redémarrage (volontaire ou involontaire) efface tous les messages

---

## Quand réinitialiser un appareil

| Situation | Action recommandée |
|-----------|-------------------|
| Comportement erratique | Réinitialisation logicielle (Paramètres → Réinitialiser) |
| PIN réseau compromis | Réinitialisation usine sur **tous les appareils** du réseau |
| Réassignation à un autre utilisateur | Réinitialisation usine |
| Dysfonctionnement persistant après soft reset | Réinitialisation usine + reflashage |
| Avant mise au rebut | Réinitialisation usine obligatoire |

Consultez le [guide de réinitialisation](device-reset.md) pour les procédures détaillées.

---

## Entretien de l'antenne

L'antenne LoRa 868 MHz est un composant critique pour la performance radio.

### Vérifications régulières

- [ ] L'antenne est **fermement connectée** (SMA ou U.FL)
- [ ] L'antenne n'est pas **pliée, tordue ou endommagée**
- [ ] Le connecteur n'est pas **corrodé** (surtout en environnement humide)
- [ ] L'antenne n'est pas **obstruée** par des objets métalliques

### Précautions

⚠️ **N'émettez jamais sans antenne connectée.** L'énergie réfléchie peut endommager le module radio intégré du STM32WLE5.

- En cas de doute sur l'état de l'antenne, remplacez-la par une antenne de rechange
- Utilisez uniquement des antennes accordées pour la bande **868 MHz**

---

## Conditions environnementales

### Plage de fonctionnement

| Paramètre | Plage recommandée | Notes |
|-----------|-------------------|-------|
| Température de fonctionnement | 0 °C à +45 °C | Limites du module et de la batterie LiPo |
| Température de charge | +5 °C à +40 °C | Ne jamais charger une LiPo en dessous de 0 °C |
| Humidité relative | 20 % – 80 % | Sans condensation |
| Altitude | Jusqu'à 3000 m | Pas de restriction connue |

### Précautions

- **Évitez l'exposition directe au soleil** — la température interne du boîtier peut dépasser les limites
- **Évitez l'immersion** — les appareils ne sont pas étanches (sauf boîtier IP67)
- **Évitez les chocs violents** — les soudures et le connecteur d'antenne sont sensibles
- **Évitez les environnements poussiéreux** — la poussière peut affecter les boutons et le connecteur USB

---

## Stockage longue durée

Si un appareil ne sera pas utilisé pendant une période prolongée (> 1 mois) :

1. **Chargez la batterie à ~50 %** (environ 3,7 V) — c'est la tension optimale de stockage pour les LiPo
2. **Éteignez l'appareil** — ne le laissez pas en veille
3. **Déconnectez l'antenne** (si possible) — réduit le risque de dommage au connecteur
4. **Stockez dans un endroit sec** — température ambiante (15–25 °C), à l'abri de l'humidité
5. **Rechargez à ~50 % tous les 3 mois** — les batteries LiPo se déchargent lentement (~5 % par mois)

⚠️ **Ne stockez jamais une batterie LiPo complètement déchargée.** Une tension inférieure à 3,0 V peut endommager irréversiblement les cellules.

---

## Fin de vie et mise hors service

Lorsqu'un appareil doit être mis au rebut ou retiré définitivement du service :

### Procédure de mise hors service

1. **Effectuez une réinitialisation usine** — efface l'identité, les clés et tous les paramètres
   - Via le menu : Paramètres → Réinitialisation usine
   - Ou via le panic wipe : 3 boutons × 3 secondes
2. **Vérifiez l'effacement** — l'appareil doit redémarrer sur l'assistant de configuration
3. **Retirez la batterie** (si possible) — stockez-la séparément ou recyclez-la
4. **Recyclez les composants électroniques** conformément à la réglementation locale (DEEE/WEEE)

### Pourquoi réinitialiser avant la mise au rebut ?

Même si l'appareil semble hors service :
- La clé de chiffrement réseau reste en EEPROM et pourrait être extraite
- L'identifiant de l'appareil pourrait être usurpé
- Le PIN réseau pourrait compromettre les autres appareils du réseau

⚠️ **La réinitialisation usine avant mise au rebut est obligatoire** pour préserver la sécurité du réseau.

---

## Calendrier de maintenance récapitulatif

| Fréquence | Action |
|-----------|--------|
| Quotidienne | Vérifier le niveau de batterie |
| Hebdomadaire | Recharger la batterie si nécessaire |
| Mensuelle | Vérifier l'état de l'antenne et du boîtier |
| Mensuelle | Vérifier si une mise à jour du firmware est disponible |
| Trimestrielle | Tester la communication avec les autres appareils du réseau |
| Trimestrielle | Recharger les appareils en stockage longue durée |
| Sur événement | Réinitialiser en cas de compromission du PIN réseau |
| Sur événement | Mettre à jour en cas de correctif de sécurité |
| Fin de vie | Réinitialisation usine obligatoire avant mise au rebut |

---

> 📖 Pour les opérations de diagnostic, consultez le [guide de dépannage](troubleshooting.md). Pour les mises à jour, consultez le [guide de mise à jour du firmware](firmware-update.md).
