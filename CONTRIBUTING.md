# Contribuer à PM-Chat

Merci de votre intérêt pour contribuer à PM-Chat ! Ce document fournit les directives et bonnes pratiques pour contribuer.

---

## Pour commencer

1. **Forkez** le dépôt
2. **Clonez** votre fork localement
3. **Installez** les dépendances : `npm install`
4. **Créez une branche** : `git checkout -b feature/your-feature-name`
5. **Effectuez vos modifications** et committez
6. **Poussez** vers votre fork et ouvrez une Pull Request

---

## Configuration du développement

```bash
# Installation
npm install

# Copier les fichiers d'environnement
cp .env.example .env
cp apps/server/.env.example apps/server/.env

# Démarrer les bases de données
docker compose up mongodb redis -d

# Démarrer les serveurs de développement
npm run dev
```

---

## Conventions de code

### Général

- Écrivez en TypeScript — pas de types `any` sauf en cas de nécessité absolue
- Suivez le style et les patterns de code existants
- Gardez les fonctions courtes et ciblées
- Ajoutez des commentaires uniquement pour la logique complexe

### Code cryptographique

- **Ne jamais** journaliser les messages en clair, les clés privées ou les secrets partagés
- **Ne jamais** stocker les clés privées dans `localStorage`
- **Toujours** utiliser `crypto.getRandomValues()` pour les données aléatoires
- **Toujours** utiliser des clés non extractibles lorsque c'est possible
- Garder le code crypto isolé du code UI dans `apps/web/src/lib/crypto/`

### Sécurité

- Valider toutes les entrées avec les schémas Zod
- Ne jamais faire confiance aux données fournies par le client côté serveur
- Utiliser des requêtes paramétrées (Mongoose gère cela)
- Suivre les patterns de gardes de sécurité existants
- Tester les cas limites et les modes d'échec

### Tests

- Ajouter des tests pour toute nouvelle fonction cryptographique
- Ajouter des tests pour les nouveaux schémas de validation
- Tester les chemins de succès et d'échec
- Lancer la suite de tests complète avant de soumettre : `npm run test`

---

## Processus de Pull Request

1. Assurez-vous que vos modifications passent tous les tests existants : `npm run test`
2. Assurez-vous que vos modifications passent le lint sans erreur : `npm run lint`
3. Assurez-vous que vos modifications compilent : `npm run build`
4. Mettez à jour la documentation si vos modifications affectent l'API ou l'architecture
5. Rédigez une description de PR claire expliquant le quoi et le pourquoi
6. Liez les issues associées

---

## Messages de commit

Utilisez des messages de commit clairs et descriptifs :

```
feat: add group conversation support
fix: prevent replay attack on message nonce
docs: update security model documentation
test: add encryption edge case tests
refactor: simplify key derivation flow
```

---

## Signaler des problèmes

- Utilisez les GitHub Issues
- Incluez les étapes pour reproduire le problème
- Incluez le comportement attendu vs le comportement réel
- Incluez les détails de l'environnement (version de Node.js, navigateur, OS)
- **Ne jamais** inclure de clés privées, de tokens ou de contenu de messages dans les rapports de bugs

---

## Code de conduite

Soyez respectueux, constructif et professionnel. Nous construisons des outils de protection de la vie privée — notre communauté doit refléter les valeurs de confiance et d'intégrité.
