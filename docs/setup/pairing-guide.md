# Appairage des appareils

Ce guide explique comment former un réseau maillé PM-Chat entre plusieurs appareils et vérifier que la communication fonctionne correctement.

---

## Concept : le réseau maillé par PIN partagé

PM-Chat utilise un modèle d'appairage simple : **tous les appareils partageant le même PIN réseau forment automatiquement un réseau maillé.** Il n'y a pas de serveur central, pas d'échange de certificats, pas de connexion Internet.

Le PIN à 4 chiffres sert à dériver une clé de chiffrement AES-256 commune. Seuls les appareils possédant la même clé peuvent déchiffrer les messages du réseau.

```
Appareil A ──┐
              │  Même PIN → Même clé AES-256 → Réseau maillé
Appareil B ──┤
              │
Appareil C ──┘
```

---

## Étape 1 — Provisionner chaque appareil avec le même PIN

Lors du [premier démarrage](first-boot.md), chaque appareil demande un PIN réseau à 4 chiffres.

🔧 **Saisissez exactement le même PIN sur tous les appareils destinés au même réseau.**

| Appareil | PIN | Identifiant attribué |
|----------|-----|---------------------|
| Appareil A | `4782` | `A3F7B21C` |
| Appareil B | `4782` | `7E01D5A9` |
| Appareil C | `4782` | `1B8C44F2` |

⚠️ Un appareil provisionné avec un PIN différent ne pourra ni déchiffrer ni être déchiffré par les autres. Les messages seront ignorés silencieusement.

---

## Étape 2 — Échanger les identifiants

Après le provisionnement, chaque appareil affiche son identifiant unique (8 caractères hexadécimaux). Cet identifiant est également accessible via :

- **Paramètres → Infos appareil** (écran `SCR_DEVICE_INFO`)

📝 **Distribuez les identifiants entre les utilisateurs du réseau.** L'identifiant permet d'envoyer des messages dirigés à un appareil spécifique.

### Tableau de correspondance suggéré

| Utilisateur | Appareil | Identifiant |
|-------------|----------|-------------|
| Alice | Appareil A | `A3F7B21C` |
| Bob | Appareil B | `7E01D5A9` |
| Charlie | Appareil C | `1B8C44F2` |

---

## Étape 3 — Envoyer un message dirigé ou en diffusion

### Message en diffusion (broadcast)

Par défaut, un message est envoyé en diffusion à tous les appareils du réseau (identifiant de destination : `0xFFFFFFFF`).

1. Depuis la boîte de réception, **appui long sur OK** → écran de composition
2. Rédigez votre message
3. **OK (appui long)** → envoyer

Tous les appareils du réseau recevront le message.

### Message dirigé

Pour envoyer un message à un appareil spécifique :

1. Depuis la boîte de réception, sélectionnez une conversation existante avec le destinataire
2. Ou composez un nouveau message et sélectionnez le pair cible
3. Envoyez le message — seul l'appareil destinataire pourra le lire

---

## Étape 4 — Vérifier l'appairage

✅ **Test de vérification :**

1. Sur l'appareil A, envoyez un message en diffusion : `"Test réseau"`
2. Vérifiez que l'appareil B reçoit le message dans sa boîte de réception
3. Sur l'appareil B, répondez avec un message dirigé vers A
4. Vérifiez que l'appareil A reçoit la réponse

Si les deux appareils échangent des messages avec succès, l'appairage est confirmé.

---

## Dépannage de l'appairage

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Messages non reçus | PIN différent entre les appareils | Re-provisionner avec le même PIN (réinitialisation usine nécessaire) |
| Messages non reçus | Appareils hors de portée | Rapprocher les appareils (portée : 2–5 km en vue directe, 0,5–1 km en urbain) |
| Messages non reçus | Fréquence LoRa différente | Vérifier que tous les appareils utilisent EU868 (868,0 MHz) — c'est la valeur par défaut |
| Messages non reçus | Antenne absente ou déconnectée | Vérifier la connexion de l'antenne 868 MHz |
| Réception intermittente | Interférences ou obstacles | Repositionner les appareils, dégager la ligne de vue |
| Un seul appareil reçoit | L'autre appareil est en mode veille | Appuyer sur un bouton pour réveiller l'écran |
| Identifiant inconnu dans la boîte de réception | Appareil non référencé | Comparer avec le tableau de correspondance des identifiants |

---

## Ajouter un appareil au réseau

Pour ajouter un nouvel appareil à un réseau existant :

1. Flashez le firmware sur le nouvel appareil ([guide de flashage](flashing-guide.md))
2. Au premier démarrage, saisissez le **même PIN réseau** que les appareils existants
3. Notez et distribuez le nouvel identifiant
4. Effectuez un test d'envoi/réception avec au moins un appareil du réseau

💡 Il n'y a pas de limite théorique au nombre d'appareils dans un réseau. Cependant, le nombre de pairs suivis dans l'interface de conversation est limité à **8 appareils**.

---

## Retirer un appareil du réseau

Pour retirer un appareil du réseau :

1. Effectuez une **réinitialisation usine** sur l'appareil à retirer ([guide de réinitialisation](device-reset.md))
2. L'appareil perd sa clé réseau et ne peut plus déchiffrer les messages
3. Les autres appareils du réseau continueront à fonctionner normalement

⚠️ Si le PIN du réseau est compromis, **tous les appareils doivent être re-provisionnés** avec un nouveau PIN. Consultez le [guide de réinitialisation](device-reset.md).

---

## Schéma d'appairage

```
    ┌─────────────┐     PIN: 4782     ┌─────────────┐
    │ Appareil A  │◄──── LoRa 868 ───►│ Appareil B  │
    │ A3F7B21C    │     MHz (chiffré)  │ 7E01D5A9    │
    └──────┬──────┘                    └──────┬──────┘
           │                                  │
           │         ┌─────────────┐          │
           └────────►│ Appareil C  │◄─────────┘
                     │ 1B8C44F2    │
                     └─────────────┘
                      (relais possible)
```

---

> 💡 **Conseil :** Pour un premier test, placez tous les appareils dans la même pièce. Une fois la communication confirmée, vous pourrez tester progressivement la portée et le [relais multi-sauts](relay-validation.md).
