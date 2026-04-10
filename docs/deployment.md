# Guide de déploiement et de configuration

> Comment exécuter PM-Chat en modes développement, production et démonstration.

---

## Prérequis

| Prérequis         | Version   | Objectif                              |
|-------------------|-----------|---------------------------------------|
| Node.js           | ≥ 18      | Environnement d'exécution             |
| npm               | ≥ 9       | Gestion de paquets (workspaces)       |
| MongoDB           | 7.x       | Stockage des messages et utilisateurs |
| Redis             | 7.x       | Sessions, nonces, limitation de débit |
| Docker (optionnel)| ≥ 24      | Déploiement conteneurisé              |

---

## Démarrage rapide (Développement)

```bash
# Cloner
git clone https://github.com/your-org/pm-chat.git
cd pm-chat

# Installer toutes les dépendances (monorepo)
npm install

# Copier les fichiers d'environnement
cp .env.example .env
cp apps/server/.env.example apps/server/.env

# Démarrer MongoDB et Redis (si pas déjà en cours d'exécution)
# Option A : Docker
docker compose up mongodb redis -d

# Option B : Installations locales
mongod --dbpath /data/db &
redis-server &

# Démarrer les serveurs de développement
npm run dev
```

Cela démarre :
- Le **serveur** sur `http://localhost:4000`
- L'**application web** sur `http://localhost:3000`

### Mode développement sécurisé

En développement (`NODE_ENV !== 'production'`), le serveur :
- Génère automatiquement un secret JWT temporaire si aucun n'est défini
- Utilise les valeurs par défaut `localhost` pour MongoDB et Redis
- Affiche un indicateur de sécurité « MODE DEV » dans l'interface
- Expose des métriques de santé détaillées sur `/health/detailed`

---

## Déploiement Docker (pile complète)

```bash
# Générer les secrets
export JWT_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Compiler et démarrer tous les services
docker compose up --build -d

# Vérifier la santé
curl http://localhost:4000/health
```

### Services

| Service  | Port  | Description                       |
|----------|-------|-----------------------------------|
| `web`    | 3000  | Frontend Next.js                  |
| `server` | 4000  | Backend Express + Socket.IO       |
| `mongodb`| 27017 | Base de données MongoDB           |
| `redis`  | 6379  | Cache Redis                       |

Tous les services incluent des vérifications de santé avec un ordonnancement des dépendances :
- `mongodb` et `redis` démarrent en premier
- `server` attend que `mongodb` et `redis` soient opérationnels
- `web` attend que `server` soit opérationnel

---

## Déploiement en production

### Variables d'environnement

**Serveur** (`apps/server/.env`) :

| Variable              | Requis | Par défaut  | Description                                 |
|-----------------------|--------|-------------|---------------------------------------------|
| `NODE_ENV`            | Oui    | —           | Doit être `production`                       |
| `PORT`                | Non    | `4000`      | Port d'écoute du serveur                     |
| `JWT_SECRET`          | Oui    | —           | ≥ 32 octets aléatoires, encodés en hex       |
| `JWT_REFRESH_SECRET`  | Oui    | —           | ≥ 32 octets aléatoires, encodés en hex       |
| `MONGODB_URI`         | Oui    | —           | Chaîne de connexion complète MongoDB         |
| `REDIS_URL`           | Oui    | —           | URL de connexion complète Redis              |
| `CORS_ORIGINS`        | Oui    | —           | Origines autorisées séparées par des virgules|
| `UPLOAD_DIR`          | Non    | `./uploads` | Chemin de stockage des pièces jointes        |
| `MAX_FILE_SIZE_MB`    | Non    | `10`        | Taille maximale des pièces jointes           |

**Web** (`apps/web/.env`) :

| Variable               | Requis | Par défaut             | Description              |
|------------------------|--------|------------------------|--------------------------|
| `NEXT_PUBLIC_API_URL`  | Oui    | `http://localhost:4000` | URL de l'API backend     |
| `NEXT_PUBLIC_WS_URL`   | Oui    | `http://localhost:4000` | URL WebSocket            |

### Liste de vérification pour la production

- [ ] Définir `NODE_ENV=production`
- [ ] Générer des secrets JWT robustes (`openssl rand -hex 32`)
- [ ] Utiliser un MongoDB géré (ex. : MongoDB Atlas) avec authentification
- [ ] Utiliser un Redis géré (ex. : Redis Cloud) avec AUTH
- [ ] Restreindre les origines CORS à votre domaine uniquement
- [ ] Utiliser HTTPS/WSS (terminer TLS au niveau du proxy inverse)
- [ ] Mettre en place la surveillance et les alertes
- [ ] Configurer les sauvegardes pour MongoDB
- [ ] Vérifier les seuils de limitation de débit

### Recommandations d'hébergement

| Composant      | Plateforme recommandée        |
|----------------|-------------------------------|
| Web            | Vercel, Netlify, Cloudflare   |
| Serveur        | Render, Railway, Fly.io, AWS  |
| MongoDB        | MongoDB Atlas                  |
| Redis          | Redis Cloud, Upstash           |

---

## Déploiement Vercel (Web)

1. Connectez votre dépôt GitHub à Vercel
2. Définissez le répertoire racine sur `apps/web`
3. Configurez les variables d'environnement :
   - `NEXT_PUBLIC_API_URL` = l'URL de votre serveur
   - `NEXT_PUBLIC_WS_URL` = l'URL de votre serveur
4. Déployez

---

## Commandes de compilation

```bash
# Tout compiler (shared → server → web)
npm run build

# Compiler des paquets individuels
npm run build --workspace=packages/shared
npm run build --workspace=apps/server
npm run build --workspace=apps/web

# Exécuter les tests
npm run test

# Linter
npm run lint

# Vérification de types
npm run type-check --workspace=apps/web
npm run type-check --workspace=packages/shared

# Nettoyer
npm run clean
```

---

## Mode démonstration

Pour des démonstrations sans dépendances de bases de données externes :

1. Démarrez MongoDB et Redis via Docker :
   ```bash
   docker compose up mongodb redis -d
   ```

2. Démarrez le serveur en mode dev (génération automatique des secrets) :
   ```bash
   cd apps/server && npm run dev
   ```

3. Démarrez l'application web :
   ```bash
   cd apps/web && npm run dev
   ```

4. Ouvrez deux onglets de navigateur sur `http://localhost:3000`
5. Inscrivez deux utilisateurs différents
6. Partagez les identifiants d'invitation entre les onglets
7. Démarrez une conversation chiffrée

L'interface affichera les indicateurs « MODE DEV », et le serveur utilisera des secrets temporaires générés automatiquement.

---

## Exigences matérielles

### Minimum (Développement)

| Ressource | Exigence   |
|-----------|------------|
| CPU       | 2 cœurs    |
| RAM       | 4 Go       |
| Disque    | 10 Go      |

### Recommandé (Production)

| Ressource | Exigence     |
|-----------|-------------|
| CPU       | 4+ cœurs    |
| RAM       | 8+ Go       |
| Disque    | 50+ Go SSD  |
| Réseau    | 100+ Mbps   |

### Considérations de mise à l'échelle

- **Mise à l'échelle horizontale** : Le serveur est sans état (sessions dans Redis) — exécutez plusieurs instances derrière un répartiteur de charge
- **MongoDB** : Utilisez des jeux de réplicas pour la haute disponibilité
- **Redis** : Utilisez Redis Cluster pour les déploiements à grande échelle
- **Socket.IO** : Utilisez l'adaptateur Redis pour Socket.IO multi-instances
