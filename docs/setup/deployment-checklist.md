# Liste de vérification pour le déploiement

Cette checklist couvre l'ensemble des étapes nécessaires pour préparer, valider et déployer un lot d'appareils PM-Chat sur le terrain.

---

## Pré-déploiement

### Firmware

- [ ] Le firmware compile sans erreur : `cd firmware && pio run -e rak3172`
- [ ] La version du firmware est identifiée (vérifier `FIRMWARE_VERSION` dans `platformio.ini`)
- [ ] Tous les appareils sont flashés avec la **même version** du firmware
- [ ] Le flashage de chaque appareil a retourné `[SUCCESS]`
- [ ] L'écran splash affiche la bonne version sur chaque appareil

### Provisionnement

- [ ] Un PIN réseau à 4 chiffres a été défini pour le lot
- [ ] Tous les appareils sont provisionnés avec le **même PIN réseau**
- [ ] Les identifiants de chaque appareil ont été notés et enregistrés
- [ ] Un tableau de correspondance utilisateur ↔ identifiant est établi

| N° | Utilisateur | Identifiant | Version firmware | Date flashage |
|----|-------------|-------------|-----------------|---------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

### Tests de communication

- [ ] Test de portée effectué entre toutes les paires d'appareils adjacents
- [ ] Chaque appareil a envoyé au moins un message de test avec succès
- [ ] Chaque appareil a reçu au moins un message de test avec succès
- [ ] Test de relais effectué (si le déploiement nécessite du multi-sauts)
- [ ] Résultats des tests de portée documentés (distances, obstacles, taux de succès)

### Matériel

- [ ] Batterie **complètement chargée** sur tous les appareils (4,2 V / 100 %)
- [ ] Pourcentage de batterie affiché correctement sur chaque appareil
- [ ] Antenne 868 MHz correctement fixée sur chaque appareil
- [ ] Boîtier assemblé et fermé sur chaque appareil
- [ ] Boutons accessibles et fonctionnels à travers le boîtier
- [ ] Écran lisible à travers la fenêtre du boîtier
- [ ] LED d'état visible (si applicable)

### Documentation utilisateur

- [ ] Guide de démarrage rapide imprimé pour chaque utilisateur
- [ ] Tableau de correspondance des identifiants distribué
- [ ] Instructions pour l'effacement d'urgence (3 boutons × 3 s) communiquées

---

## Validation

### Communication

- [ ] Chaque appareil envoie un message de test avec succès
- [ ] Chaque appareil reçoit un message de test avec succès
- [ ] Les messages en diffusion (broadcast) sont reçus par tous les appareils
- [ ] Les messages dirigés sont reçus uniquement par le destinataire
- [ ] Le relais fonctionne correctement (si multi-sauts nécessaire)

### Interface utilisateur

- [ ] L'indicateur de batterie affiche un pourcentage cohérent
- [ ] L'indicateur de signal montre une activité pendant TX/RX
- [ ] La navigation dans les menus fonctionne (HAUT/BAS/OK)
- [ ] La composition de message fonctionne (saisie, envoi)
- [ ] Les messages reçus s'affichent correctement dans la boîte de réception
- [ ] Les conversations sont regroupées par pair (identifiant)

### Résilience

- [ ] Un appareil de test a été réinitialisé en usine et re-provisionné avec succès
- [ ] Le watchdog fonctionne (l'appareil redémarre après un blocage simulé, si testable)
- [ ] L'appareil se comporte correctement après un cycle d'alimentation (éteindre/rallumer)
- [ ] Les messages sont préservés tant que l'appareil reste alimenté
- [ ] L'effacement d'urgence (3 boutons × 3 s) a été testé sur un appareil de test

### Autonomie

- [ ] Estimation de l'autonomie validée (objectif : 8–12 heures en utilisation normale)
- [ ] Alerte « Batterie faible » confirmée à ~3,3 V
- [ ] Alerte « Batterie critique » confirmée à ~3,1 V

---

## Post-déploiement

### Briefing utilisateurs

- [ ] Chaque utilisateur a été formé aux opérations de base :
  - [ ] Allumer / éteindre l'appareil
  - [ ] Consulter la boîte de réception
  - [ ] Composer et envoyer un message
  - [ ] Recevoir et lire un message
  - [ ] Comprendre les indicateurs (batterie, signal)
- [ ] Chaque utilisateur connaît la procédure d'effacement d'urgence (panic wipe)
- [ ] Chaque utilisateur sait comment recharger la batterie (USB-C via TP4056)

### Support

- [ ] Un contact de support technique est identifié et communiqué
- [ ] Une procédure d'escalade est définie en cas de dysfonctionnement
- [ ] Des appareils de rechange sont disponibles (si applicable)
- [ ] Les pièces de rechange sont disponibles (antennes, batteries, câbles)

### Documentation opérationnelle

- [ ] Le PIN réseau est conservé en lieu sûr (accès restreint)
- [ ] Le tableau de correspondance des identifiants est archivé
- [ ] Les résultats des tests de portée sont archivés
- [ ] La version du firmware déployé est documentée
- [ ] La date de déploiement est enregistrée

---

## Modèle de rapport de déploiement

```
═══════════════════════════════════════════
       RAPPORT DE DÉPLOIEMENT PM-CHAT
═══════════════════════════════════════════

Date           : ____________________
Responsable    : ____________________
Version FW     : ____________________
Nombre d'unités: ____________________
PIN réseau     : ____________________

APPAREILS DÉPLOYÉS
──────────────────
N°  Identifiant   Utilisateur    Batterie   Test OK
1.  ____________  ____________   _____%     [ ]
2.  ____________  ____________   _____%     [ ]
3.  ____________  ____________   _____%     [ ]
4.  ____________  ____________   _____%     [ ]
5.  ____________  ____________   _____%     [ ]

TESTS DE PORTÉE
───────────────
Paire        Distance    Résultat    Obstacles
A ↔ B        _____ m     [ ] OK      ____________
B ↔ C        _____ m     [ ] OK      ____________
A ↔ C        _____ m     [ ] OK      ____________

TEST RELAIS
───────────
Route          TTL envoyé   TTL reçu   Résultat
A → B → C      3            2          [ ] OK
C → B → A      3            2          [ ] OK

REMARQUES
─────────
______________________________________________
______________________________________________

Signature : ____________________
```

---

> 📖 Consultez le [guide de maintenance](maintenance.md) pour les opérations de suivi après le déploiement.
