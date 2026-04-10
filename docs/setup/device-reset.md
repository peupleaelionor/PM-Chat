# Réinitialisation d'un appareil

Ce guide décrit les différentes méthodes de réinitialisation disponibles sur un appareil PM-Chat, ce qu'elles effacent et quand les utiliser.

---

## Types de réinitialisation

PM-Chat propose deux niveaux de réinitialisation :

| Type | Méthode | Données effacées | Cas d'usage |
|------|---------|-----------------|-------------|
| **Réinitialisation logicielle** | Menu Paramètres → Réinitialiser | Paramètres utilisateur (luminosité, etc.) | Corriger un comportement inattendu |
| **Réinitialisation usine / Effacement d'urgence** | 3 boutons simultanés pendant 3 secondes | Tout : identité, clés, PIN, messages, paramètres | PIN compromis, réassignation, urgence |

---

## Réinitialisation logicielle (Soft Reset)

### Accès

1. Depuis la boîte de réception, **appui long sur HAUT** → menu Paramètres
2. Naviguez jusqu'à l'option **Réinitialiser**
3. Confirmez l'action

### Ce qui est modifié

| Donnée | Effet |
|--------|-------|
| Luminosité | Restaurée à la valeur par défaut |
| Autres paramètres utilisateur | Restaurés aux valeurs par défaut |
| Identifiant de l'appareil | ✅ Conservé |
| Clé réseau (AES-256) | ✅ Conservée |
| PIN réseau maillé | ✅ Conservé |
| Messages en mémoire | ✅ Conservés (jusqu'au redémarrage) |

💡 La réinitialisation logicielle ne modifie pas l'identité de l'appareil. Il reste membre du réseau maillé sans re-provisionnement.

---

## Réinitialisation usine / Effacement d'urgence (Panic Wipe)

### Méthode 1 — Via le menu

1. Depuis la boîte de réception, **appui long sur HAUT** → menu Paramètres
2. Naviguez jusqu'à **Réinitialisation usine**
3. L'écran de confirmation (`SCR_WIPE_CONFIRM`) s'affiche :

```
╔══════════════════════════╗
║   RÉINITIALISATION        ║
║   USINE                   ║
║                            ║
║   Toutes les données       ║
║   seront effacées.         ║
║                            ║
║   OK: Confirmer            ║
║   HAUT: Annuler            ║
╚══════════════════════════╝
```

4. Appuyez sur **OK** pour confirmer ou **HAUT** pour annuler

### Méthode 2 — Effacement d'urgence (Panic Wipe)

**Maintenez les 3 boutons (HAUT + OK + BAS) simultanément pendant 3 secondes.**

Cette méthode est conçue pour les situations d'urgence :
- Aucune confirmation n'est demandée
- L'effacement est immédiat
- Fonctionne depuis n'importe quel écran
- Fonctionne même si l'interface est bloquée

Le firmware détecte l'événement `BTN_PANIC` et exécute la procédure d'effacement d'urgence.

---

## Ce qui est effacé

Lors d'une réinitialisation usine ou d'un effacement d'urgence, **toutes les données sensibles sont détruites** :

| Donnée | Adresse EEPROM | Action |
|--------|----------------|--------|
| Valeur magique (`0x504D4348`) | 0 | Effacée — l'appareil est marqué comme non provisionné |
| Identifiant de l'appareil | 4 | Effacé — un nouvel ID sera généré |
| Clé réseau (AES-256) | 8 | **Mise à zéro** (32 octets de `0x00`) |
| PIN réseau maillé | 50 | Effacé |
| Compteur de messages | 46 | Remis à zéro |
| Paramètres (luminosité) | 45 | Effacés |
| Messages en RAM | — | Effacés (`msg_store::clear()`) |
| Clé en mémoire vive | — | **Mise à zéro** (`crypto::secure_zero()`) |

### Séquence d'effacement

```
1. msg_store::clear()           → Efface tous les messages en RAM
2. crypto::secure_zero(key, 32) → Met à zéro la clé de chiffrement en mémoire
3. identity::wipe()             → Efface l'EEPROM (identité, clé, PIN, paramètres)
4. → STATE_SETUP                → Retour à l'assistant de configuration
```

---

## Après la réinitialisation

Après une réinitialisation usine, l'appareil redémarre et entre automatiquement dans l'assistant de configuration :

1. L'écran splash s'affiche (1,5 s)
2. Le firmware détecte l'absence de la valeur magique en EEPROM
3. L'assistant de configuration se lance (`SCR_SETUP_WELCOME`)
4. L'utilisateur doit saisir un nouveau PIN réseau
5. Un nouvel identifiant est généré et attribué

⚠️ **L'ancien identifiant est définitivement perdu.** Les autres appareils du réseau verront le nouvel identifiant comme un appareil inconnu.

---

## Quand réinitialiser ?

| Situation | Type recommandé |
|-----------|-----------------|
| Paramètres corrompus ou incohérents | Réinitialisation logicielle |
| PIN réseau compromis | Réinitialisation usine sur **tous** les appareils du réseau |
| Réassignation de l'appareil à un autre utilisateur | Réinitialisation usine |
| Appareil perdu ou confisqué | Réinitialisation usine (effacement d'urgence) |
| Dépannage après un dysfonctionnement persistant | Réinitialisation usine |
| Avant la mise au rebut de l'appareil | Réinitialisation usine |
| Changement de réseau maillé | Réinitialisation usine |

---

## Précautions importantes

⚠️ **La réinitialisation usine est irréversible.**

- L'identifiant de l'appareil ne peut pas être récupéré
- La clé réseau est définitivement détruite
- L'appareil devra être re-provisionné avec un PIN réseau
- Si l'appareil est le seul à posséder un identifiant connu de ses pairs, ceux-ci devront être informés du nouvel identifiant

⚠️ **Effacement d'urgence accidentel.**

Si les 3 boutons sont maintenus accidentellement pendant 3 secondes (par exemple, dans une poche), l'effacement se déclenche sans confirmation. Pour atténuer ce risque :

- Rangez l'appareil dans un étui protecteur
- Désactivez l'appareil lorsqu'il n'est pas utilisé
- En cas d'effacement accidentel, re-provisionnez l'appareil avec le même PIN réseau

---

## Résumé visuel

```
Réinitialisation logicielle          Réinitialisation usine
(Paramètres → Réinitialiser)        (3 boutons × 3 s)
         │                                   │
         ▼                                   ▼
  Paramètres → défaut              Effacement complet EEPROM
  Identité → conservée             Clé → mise à zéro
  Réseau → inchangé               Messages → effacés
         │                                   │
         ▼                                   ▼
  Retour à la boîte de réception   Retour à STATE_SETUP
  (fonctionnement normal)          (re-provisionnement requis)
```

---

> 📖 Après une réinitialisation usine, consultez le [guide de premier démarrage](first-boot.md) pour re-provisionner l'appareil et le [guide d'appairage](pairing-guide.md) pour le réintégrer au réseau.
