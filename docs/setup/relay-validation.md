# Validation du mode relais

Ce guide explique comment tester et valider le fonctionnement du relais maillé (mesh relay) de PM-Chat, qui permet d'étendre la portée du réseau en faisant transiter les messages par des appareils intermédiaires.

---

## Concept : le relais maillé

Dans un réseau PM-Chat, chaque appareil peut servir de relais pour les messages destinés à d'autres appareils. Si l'appareil A ne peut pas atteindre l'appareil C directement, mais que l'appareil B est à portée des deux, B relaiera automatiquement les messages entre A et C.

```
Appareil A ──── LoRa ────► Appareil B ──── LoRa ────► Appareil C
(émetteur)                 (relais)                    (destinataire)

     ◄──── hors de portée directe ────►
```

### Fonctionnement du relais

1. L'appareil A envoie un message avec un **TTL (Time To Live)** par défaut de **3 sauts**
2. L'appareil B reçoit le message, vérifie qu'il ne l'a pas déjà vu (déduplication)
3. Si le message n'est pas destiné à B et que le TTL > 0, B **décrémente le TTL** et retransmet le message
4. Le drapeau `FLAG_RELAYED` (0x04) est activé dans l'en-tête du paquet
5. L'appareil C reçoit le message relayé et le déchiffre

### Paramètres du relais

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| TTL par défaut | 3 sauts | Nombre maximal de relais avant abandon |
| TTL maximum | 7 sauts | Valeur maximale acceptée |
| Délai de relais | 0–100 ms (aléatoire) | Évite les collisions entre relais |
| Cache de déduplication | 64 entrées | Empêche le relais en boucle |
| Fenêtre de déduplication | 60 secondes | Durée de mémorisation des paquets vus |

---

## Préparation du test

### Matériel nécessaire

- **3 appareils PM-Chat** provisionnés avec le **même PIN réseau**
- Un espace permettant de séparer les appareils au-delà de la portée directe entre A et C

### Disposition physique

```
    Appareil A                 Appareil B                 Appareil C
    (émetteur)                 (relais)                   (destinataire)
        │                          │                          │
        │◄──── portée radio ──────►│◄──── portée radio ──────►│
        │                          │                          │
        │◄──────────── hors de portée directe ───────────────►│
```

**En pratique :**
- En milieu urbain : A et C séparés de ~1,5 km, B au milieu (~750 m de chaque)
- En intérieur (test rapide) : placez A et C dans des pièces éloignées avec des obstacles (murs, étages), B au milieu

💡 **Test simplifié en intérieur :** Réduisez la puissance TX ou utilisez des atténuateurs si la portée est trop grande pour tester en intérieur.

---

## Procédure de test

### Étape 1 — Vérifier le provisionnement

Confirmez que les trois appareils sont provisionnés avec le **même PIN réseau** :

| Appareil | Rôle | PIN | Identifiant |
|----------|------|-----|-------------|
| A | Émetteur | `4782` | `A3F7B21C` |
| B | Relais | `4782` | `7E01D5A9` |
| C | Destinataire | `4782` | `1B8C44F2` |

### Étape 2 — Vérifier la communication directe A↔B et B↔C

Avant de tester le relais, confirmez que les paires directes fonctionnent :

1. Placez A et B côte à côte → envoyez un message de A à B → ✅ reçu
2. Placez B et C côte à côte → envoyez un message de B à C → ✅ reçu

### Étape 3 — Positionner les appareils

Disposez les appareils selon le schéma :
- A et C sont **hors de portée directe**
- B est à **portée des deux**

### Étape 4 — Envoyer un message de A à C

Sur l'appareil A :

1. Composez un message de test (par exemple : `"Test relais"`)
2. Envoyez en **diffusion** (broadcast) ou en **message dirigé** vers l'identifiant de C

### Étape 5 — Vérifier la réception sur C

✅ **Succès** si l'appareil C affiche le message dans sa boîte de réception.

Le message a été relayé par B, même si A et C ne sont pas à portée directe l'un de l'autre.

### Étape 6 — Vérifier les statistiques mesh

Sur l'appareil B (le relais), consultez les diagnostics réseau pour vérifier :

- **Paquets relayés** (`relayed_count`) : doit avoir augmenté d'au moins 1
- **Paquets rejetés** (`dropped_count`) : doit rester stable (pas de doublons inattendus)

### Étape 7 — Vérifier le TTL

Le message reçu par C doit avoir un TTL inférieur à celui envoyé par A :

| Étape | TTL | Appareil |
|-------|-----|----------|
| Envoi par A | 3 | A (émetteur) |
| Réception et relais par B | 2 | B (relais) — décrémente de 1 |
| Réception par C | 2 | C (destinataire) — reçoit avec TTL=2 |

---

## Test multi-sauts (4+ appareils)

Pour tester un relais sur plusieurs sauts :

```
A ──► B ──► C ──► D
```

1. Provisionnez 4 appareils avec le même PIN
2. Placez-les en chaîne : chaque appareil à portée de ses voisins uniquement
3. Envoyez un message de A → le TTL diminue à chaque saut
4. Vérifiez la réception sur D (TTL attendu : TTL_initial − 3)

⚠️ Avec un TTL par défaut de 3, un message peut traverser au maximum 3 relais. Au-delà, le message est abandonné (TTL = 0).

---

## Test de déduplication

Vérifiez que les appareils ne relaient pas le même message deux fois :

1. Placez 3 appareils à portée mutuelle (triangle)
2. Envoyez un message en broadcast depuis A
3. B et C reçoivent le message
4. B tente de relayer → C l'a déjà reçu → le cache de déduplication bloque le doublon
5. Vérifiez que C n'affiche qu'**un seul** exemplaire du message

---

## Dépannage

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| C ne reçoit pas le message | B n'est pas à portée de A ou de C | Rapprocher B des deux extrémités |
| C ne reçoit pas le message | PIN différent sur l'un des appareils | Vérifier que les 3 appareils ont le même PIN |
| C ne reçoit pas le message | B est éteint ou en veille profonde | S'assurer que B est alimenté et actif |
| C ne reçoit pas le message | TTL insuffisant | Le TTL par défaut (3) est suffisant pour 3 sauts |
| Message reçu en double | Cache de déduplication saturé | Rare — redémarrer les appareils |
| Relais très lent | Délai aléatoire de relais (0–100 ms) | Normal — le délai évite les collisions |
| Statistiques de relais à zéro | L'appareil n'a pas relayé | Vérifier le positionnement — B doit recevoir des paquets non destinés à lui |

---

## Indicateurs de succès

✅ Le test de relais est validé lorsque :

- [ ] A envoie un message et C le reçoit (sans portée directe)
- [ ] Le compteur de paquets relayés sur B a augmenté
- [ ] Le TTL du message reçu par C est inférieur au TTL d'origine
- [ ] Aucun doublon n'apparaît dans la boîte de réception de C
- [ ] Le test fonctionne dans les deux sens (C → A via B)

---

> 💡 **Conseil :** Documentez la disposition physique et les résultats de chaque test de relais. Ces données seront utiles pour planifier le déploiement et positionner les relais de manière optimale sur le terrain.
