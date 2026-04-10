# Politique de sécurité

## Versions supportées

| Version | Supportée |
|---------|-----------|
| 1.x     | ✅         |

## Signaler une vulnérabilité

Si vous découvrez une vulnérabilité de sécurité dans PM-Chat, veuillez la signaler de manière responsable.

### Comment signaler

1. **N'ouvrez PAS** une issue publique sur GitHub pour les vulnérabilités de sécurité
2. E-mail : [Créer un avis de sécurité privé](../../security/advisories/new) sur GitHub
3. Incluez :
   - Description de la vulnérabilité
   - Étapes pour reproduire
   - Impact potentiel
   - Correctif suggéré (le cas échéant)

### À quoi s'attendre

- **Accusé de réception** sous 48 heures
- **Évaluation** sous 7 jours
- **Correctif** sous 30 jours pour les vulnérabilités confirmées
- **Mention** dans les notes de version (sauf si vous préférez l'anonymat)

## Conception de la sécurité

PM-Chat est conçu avec la sécurité comme principe fondamental :

### Chiffrement

- **ECDH P-256** pour l'échange de clés
- **AES-GCM 256 bits** pour le chiffrement des messages
- **IV aléatoire de 12 octets** par message
- **Nonce de 16 octets** pour la protection anti-rejeu
- Les clés privées **ne quittent jamais l'appareil**
- Les clés dérivées sont **non extractibles**

### Sécurité du serveur

- Architecture Zero-Knowledge — le serveur ne peut pas lire les messages
- Authentification JWT avec tokens d'accès à durée de vie courte
- Rotation des tokens de rafraîchissement
- Limitation de débit par IP (REST + Socket.IO)
- Validation des entrées via les schémas Zod
- Suppression des octets NUL
- Application stricte du Content-Type
- En-têtes de sécurité Helmet
- Blocage automatique des IP en cas de violations répétées
- Surveillance de la sécurité avec détection d'anomalies

### Limitations connues

Il s'agit de compromis connus, pas de vulnérabilités :

1. **Pas de confidentialité persistante** — une clé privée compromise expose les messages passés (prévu : Double Ratchet)
2. **Métadonnées visibles par le serveur** — qui communique avec qui, horodatage et taille des messages
3. **Clés liées à la session** — fermer l'onglet détruit la clé privée (c'est intentionnel)
4. **Pas de vérification d'empreinte de clé** — confiance au premier usage pour les clés publiques (prévu : vérification hors bande)
5. **Appareil unique** — pas encore de synchronisation des clés multi-appareils

## Périmètre

Les éléments suivants sont **inclus dans le périmètre** des rapports de sécurité :
- Contournement ou faiblesses du chiffrement
- Contournement de l'authentification
- Failles d'autorisation
- Vulnérabilités d'injection
- Divulgation d'informations
- Contournement de la limitation de débit
- Vecteurs d'attaque par rejeu

Les éléments suivants sont **hors périmètre** :
- Déni de service (sauf si trivialement exploitable)
- Ingénierie sociale
- Attaques par accès physique à l'appareil
- Interférence d'extensions de navigateur
- Problèmes nécessitant une action de l'utilisateur (hameçonnage, etc.)
