# Heleana — Application de gestion de cotisations de groupe

Application mobile de tontine / caisse commune pour petits groupes (famille, amis, collègues).  
Stack : **React Native (Expo)** · **Node.js / Express (Vercel)** · **PostgreSQL (Supabase)** · **FCM (Firebase)**

---

## Sommaire

1. [Architecture](#1-architecture)
2. [Déploiement du backend sur Vercel](#2-déploiement-du-backend-sur-vercel)
3. [Base de données Supabase](#3-base-de-données-supabase)
4. [Firebase — Notifications push](#4-firebase--notifications-push)
5. [Variables d'environnement](#5-variables-denvironnement)
6. [Lancement en développement local](#6-lancement-en-développement-local)
7. [Construction de l'APK Android](#7-construction-de-lapk-android)
8. [Structure du projet](#8-structure-du-projet)
9. [API Reference rapide](#9-api-reference-rapide)
10. [Fonctionnalités Phase 1 (MVP)](#10-fonctionnalités-phase-1-mvp)

---

## 1. Architecture

```
[App Android (APK Expo)]
         │  HTTPS
         ▼
[Vercel Serverless — Node.js / Express]
         │
         ▼
[Supabase / Neon — PostgreSQL]
         │
[Firebase Cloud Messaging — Push Android/iOS]
```

| Couche       | Technologie                        | Hébergement              |
|--------------|------------------------------------|--------------------------|
| Mobile       | React Native 0.86, Expo SDK 57     | APK local / EAS Build    |
| Backend      | Node.js 18+, Express 4, TypeScript | Vercel (Hobby — gratuit) |
| Base données | PostgreSQL 15                      | Supabase Free            |
| Notifications| Firebase Admin SDK                 | Firebase (gratuit)       |

---

## 2. Déploiement du backend sur Vercel

### Prérequis

```bash
node -v   # >= 18
npm i -g vercel
```

### Étapes

```bash
# 1. Aller dans le dossier backend
cd backend

# 2. Installer les dépendances
npm install

# 3. Se connecter à Vercel (navigateur s'ouvre)
vercel login

# 4. Premier déploiement (crée le projet)
vercel

#    Répondre aux questions :
#    - Set up and deploy? → Y
#    - Which scope? → votre compte
#    - Link to existing project? → N
#    - Project name? → heleana-backend
#    - Directory? → ./  (laisser par défaut)
#    - Override settings? → N

# 5. Configurer les variables d'environnement (voir section 5)
#    Via le dashboard Vercel OU en ligne de commande :
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add FIREBASE_SERVICE_ACCOUNT

# 6. Déploiement en production
vercel --prod
```

L'URL finale sera du type : `https://heleana-backend.vercel.app`

### Redéploiement après modifications

```bash
# Dans le dossier backend/
vercel --prod
```

### Vérification

```bash
curl https://heleana-backend.vercel.app/
# Réponse attendue : {"status":"ok","app":"Heleana API","version":"1.0.0"}
```

---

## 3. Base de données Supabase

### Création du projet

1. Aller sur [supabase.com](https://supabase.com) → **New project**
2. Choisir un nom (ex: `heleana`), un mot de passe fort, région la plus proche
3. Attendre ~2 minutes

### Appliquer le schéma

1. Dans Supabase → **SQL Editor** → **New query**
2. Copier-coller le contenu de `backend/database/schema.sql`
3. Cliquer **Run**

### Récupérer la chaîne de connexion

1. Supabase → **Settings** → **Database** → **Connection string** → **URI**
2. Copier la chaîne (remplacer `[YOUR-PASSWORD]` par le vrai mot de passe)
3. L'utiliser comme valeur de `DATABASE_URL`

```
postgresql://postgres:[MOT_DE_PASSE]@db.[PROJECT_REF].supabase.co:5432/postgres
```

> **Important :** Utiliser le **Direct connection** (port 5432) pour les fonctions
> Serverless, pas le pooler (port 6543) — le mode transaction du pooler ne supporte
> pas les requêtes préparées de pg.

### Alternative : Neon (via Vercel Marketplace)

1. Vercel Dashboard → votre projet → **Storage** → **Connect Store** → **Neon**
2. La variable `DATABASE_URL` est automatiquement injectée dans le projet Vercel

---

## 4. Firebase — Notifications push

### Créer le projet Firebase

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → nom : `heleana` → (désactiver Google Analytics si souhaité)
3. **Continue**

### Générer la clé de service (backend)

1. Firebase Console → ⚙️ **Project settings** → **Service accounts**
2. **Generate new private key** → télécharger le fichier JSON
3. Ouvrir le fichier, **copier tout son contenu sur une seule ligne** (ou minifier)
4. Utiliser cette valeur comme `FIREBASE_SERVICE_ACCOUNT` dans Vercel

### Configurer l'app Android (mobile)

1. Firebase Console → **Add app** → icône Android
2. Package name : `com.heleana.app` (doit correspondre à `app.json`)
3. Télécharger `google-services.json`
4. Placer le fichier dans `mobile/` (à la racine du dossier mobile)

> Le fichier `google-services.json` est référencé dans `app.json` :
> `"googleServicesFile": "./google-services.json"`

---

## 5. Variables d'environnement

### Backend — Vercel

Configurer via le Dashboard Vercel → votre projet → **Settings** → **Environment Variables**,
ou via CLI : `vercel env add NOM_VARIABLE`

| Variable                   | Valeur exemple                              | Obligatoire |
|----------------------------|---------------------------------------------|-------------|
| `DATABASE_URL`             | `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres` | ✅ |
| `JWT_SECRET`               | Chaîne aléatoire ≥ 32 caractères            | ✅ |
| `JWT_EXPIRES_IN`           | `7d`                                        | ✅ |
| `FIREBASE_SERVICE_ACCOUNT` | JSON minifié du fichier serviceAccountKey   | ✅ (push) |
| `NODE_ENV`                 | `production`                                | Recommandé |

Générer un JWT_SECRET fort :
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Backend — développement local

Copier et remplir :
```bash
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos vraies valeurs
```

### Mobile

Copier et remplir :
```bash
cp mobile/.env.example mobile/.env
```

| Variable               | Valeur                                      |
|------------------------|---------------------------------------------|
| `EXPO_PUBLIC_API_URL`  | `http://192.168.X.X:3000` (local) ou `https://heleana-backend.vercel.app` (prod) |

> Les variables `EXPO_PUBLIC_*` sont intégrées dans le bundle au moment du build.
> Pour l'APK de production, utiliser l'URL Vercel avant de lancer `eas build`.

---

## 6. Lancement en développement local

### Backend

```bash
cd backend
npm install
cp .env.example .env   # puis remplir .env

# Lancer en mode développement (hot reload)
npm run dev

# Tester
curl http://localhost:3000/
```

### Mobile

```bash
cd mobile
npm install

# Copier et configurer le .env
cp .env.example .env
# Modifier EXPO_PUBLIC_API_URL avec l'IP locale de votre machine
# Ex: EXPO_PUBLIC_API_URL=http://192.168.1.42:3000

# Lancer Expo
npm start

# Sur Android (téléphone physique via câble USB ou même réseau Wi-Fi)
npm run android

# Sur émulateur Android
npm run android
```

> **Trouver votre IP locale :**
> - Windows : `ipconfig` → IPv4 sous votre carte Wi-Fi
> - Mac/Linux : `ifconfig | grep inet`

---

## 7. Construction de l'APK Android

### Option A — EAS Build (recommandé, cloud)

```bash
# 1. Installer EAS CLI
npm i -g eas-cli

# 2. Se connecter (créer un compte Expo si besoin — gratuit)
eas login

# 3. Dans le dossier mobile
cd mobile

# 4. Configurer EAS (première fois seulement)
eas build:configure
# Choisir : Android

# 5. S'assurer que EXPO_PUBLIC_API_URL pointe sur l'URL Vercel en production
# dans mobile/.env

# 6. Lancer le build APK (ne nécessite pas Java/Android SDK en local)
eas build --platform android --profile preview

# 7. Télécharger l'APK depuis le lien affiché ou depuis expo.dev
```

#### Fichier `eas.json` (créé automatiquement, à vérifier) :

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Option B — Build local (nécessite Android Studio)

```bash
# Prérequis : Java 17, Android SDK, ANDROID_HOME configuré

cd mobile

# Générer les fichiers natifs Android
npx expo prebuild --platform android

# Construire l'APK
cd android
./gradlew assembleRelease

# L'APK se trouve ici :
# android/app/build/outputs/apk/release/app-release.apk
```

### Distribution de l'APK

1. Transférer l'APK par WhatsApp, Google Drive, ou câble USB
2. Sur le téléphone Android → **Paramètres** → **Sécurité** → activer **Sources inconnues**
   (ou **Installer les applications inconnues** selon la version Android)
3. Ouvrir le fichier APK → **Installer**

> Pour les appareils Android 8+ : activer l'installation depuis le gestionnaire de fichiers
> utilisé pour ouvrir l'APK (ex: **Fichiers** → autoriser l'installation)

---

## 8. Structure du projet

```
Heleana/
├── backend/                          # API REST — Vercel Serverless
│   ├── api/
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts    # Vérification JWT
│   │   │   └── audit.middleware.ts   # Journal d'audit
│   │   ├── routes/
│   │   │   ├── auth.ts               # POST /register /login GET/PATCH /me
│   │   │   ├── groups.ts             # CRUD groupes + join
│   │   │   ├── members.ts            # Gestion membres
│   │   │   ├── contributions.ts      # Cotisations
│   │   │   ├── withdrawals.ts        # Demandes de retrait
│   │   │   ├── approvals.ts          # Votes sur retraits
│   │   │   ├── notifications.ts      # Log in-app
│   │   │   └── devices.ts            # Tokens FCM
│   │   └── services/
│   │       ├── db.ts                 # Pool PostgreSQL
│   │       ├── auth.service.ts
│   │       ├── groups.service.ts
│   │       ├── members.service.ts
│   │       ├── contributions.service.ts
│   │       ├── withdrawals.service.ts
│   │       └── notifications.service.ts
│   ├── database/
│   │   └── schema.sql               # Schéma complet PostgreSQL
│   ├── index.ts                     # Entrée Express + routes
│   ├── vercel.json                  # Config déploiement Vercel
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
└── mobile/                          # App React Native (Expo)
    ├── src/
    │   ├── app/                     # Routes expo-router
    │   │   ├── _layout.tsx          # Root + navigation guard
    │   │   ├── (auth)/              # Écrans connexion/inscription
    │   │   │   ├── login.tsx
    │   │   │   └── register.tsx
    │   │   └── (tabs)/              # Navigation principale
    │   │       ├── dashboard.tsx
    │   │       ├── groups.tsx
    │   │       ├── notifications.tsx
    │   │       ├── profile.tsx
    │   │       └── groups/[groupId]/
    │   │           ├── index.tsx        # Détail groupe
    │   │           ├── contributions.tsx
    │   │           └── withdrawals.tsx
    │   ├── screens/                 # Implémentations des écrans
    │   │   ├── DashboardScreen.tsx
    │   │   ├── GroupsScreen.tsx
    │   │   ├── GroupDetailScreen.tsx
    │   │   ├── ContributionsScreen.tsx
    │   │   ├── WithdrawalsScreen.tsx
    │   │   ├── NotificationsScreen.tsx
    │   │   └── ProfileScreen.tsx
    │   ├── components/
    │   │   ├── ScreenHeader.tsx     # En-tête réutilisable
    │   │   └── ui/                  # Atomes UI
    │   │       ├── Button.tsx
    │   │       ├── Input.tsx
    │   │       ├── Card.tsx
    │   │       ├── Badge.tsx
    │   │       ├── AmountText.tsx
    │   │       ├── LoadingScreen.tsx
    │   │       ├── EmptyState.tsx
    │   │       └── index.ts
    │   ├── constants/
    │   │   └── theme.ts             # Palette, Spacing, Radius…
    │   ├── hooks/
    │   │   ├── use-api.ts           # Hook fetch générique
    │   │   └── use-theme.ts
    │   ├── lib/
    │   │   ├── api.ts               # Client axios + tous les endpoints
    │   │   └── config.ts
    │   └── stores/
    │       └── auth.store.ts        # Zustand auth store
    ├── assets/
    ├── app.json                     # Config Expo (nom, icône, splash…)
    ├── package.json
    ├── google-services.json         # À placer ici (télécharger depuis Firebase)
    └── .env.example
```

---

## 9. API Reference rapide

Base URL : `https://heleana-backend.vercel.app/api`

Toutes les routes sauf `/auth/register` et `/auth/login` nécessitent :
```
Authorization: Bearer <jwt_token>
```

### Authentification
| Méthode | Route              | Description                    |
|---------|--------------------|--------------------------------|
| POST    | `/auth/register`   | Inscription                    |
| POST    | `/auth/login`      | Connexion                      |
| GET     | `/auth/me`         | Profil de l'utilisateur        |
| PATCH   | `/auth/me`         | Modifier le profil             |

### Groupes
| Méthode | Route                              | Description                    |
|---------|------------------------------------|--------------------------------|
| GET     | `/groups`                          | Mes groupes                    |
| POST    | `/groups`                          | Créer un groupe                |
| POST    | `/groups/join`                     | Rejoindre via code             |
| GET     | `/groups/:id`                      | Détail d'un groupe             |
| GET     | `/groups/:id/dashboard`            | Solde / totaux                 |
| PATCH   | `/groups/:id`                      | Modifier (admin)               |
| DELETE  | `/groups/:id`                      | Supprimer (admin)              |

### Membres
| Méthode | Route                                    | Description             |
|---------|------------------------------------------|-------------------------|
| GET     | `/groups/:id/members`                    | Liste des membres       |
| POST    | `/groups/:id/members`                    | Ajouter (admin)         |
| DELETE  | `/groups/:id/members/:userId`            | Retirer                 |
| PATCH   | `/groups/:id/members/:userId/role`       | Changer le rôle (admin) |

### Cotisations
| Méthode | Route                                    | Description             |
|---------|------------------------------------------|-------------------------|
| GET     | `/groups/:id/contributions`              | Liste                   |
| GET     | `/groups/:id/contributions/summary`      | Récap par membre        |
| POST    | `/groups/:id/contributions`              | Enregistrer             |

### Retraits & votes
| Méthode | Route                                          | Description           |
|---------|------------------------------------------------|-----------------------|
| GET     | `/groups/:id/withdrawals`                      | Liste                 |
| POST    | `/groups/:id/withdrawals`                      | Demander              |
| PATCH   | `/groups/:id/withdrawals/:wId/pay`             | Marquer payé (admin)  |
| GET     | `/withdrawals/:wId/approvals`                  | Votes                 |
| POST    | `/withdrawals/:wId/approvals`                  | Voter                 |

### Notifications & Devices
| Méthode | Route                      | Description                    |
|---------|----------------------------|--------------------------------|
| GET     | `/notifications`           | Historique in-app              |
| PATCH   | `/notifications/read`      | Marquer lu                     |
| POST    | `/devices`                 | Enregistrer token FCM          |
| DELETE  | `/devices/:token`          | Supprimer token FCM            |

---

## 10. Fonctionnalités Phase 1 (MVP)

- [x] Inscription / connexion (email ou téléphone)
- [x] Création et gestion de groupes (montant fixe ou libre, fréquence configurable)
- [x] Invitation par code (10 caractères, unique)
- [x] Rôles admin / membre
- [x] Enregistrement manuel des cotisations (Cash / T-Money / Flooz / Banque)
- [x] Historique des cotisations avec récapitulatif par membre
- [x] Demande de retrait avec motif et date souhaitée
- [x] Validation collective des retraits (majorité / unanimité / pourcentage configurable)
- [x] Marquage "payé" par l'admin
- [x] Notifications push (FCM) : nouvelle cotisation, demande / approbation / rejet de retrait
- [x] Historique in-app des notifications
- [x] Dashboard : solde total, cotisations récentes, retraits en attente
- [x] Journal d'audit des actions sensibles
- [x] Profil utilisateur modifiable
- [x] APK Android distribuable

### Phase 2 (à venir)

- [ ] Intégration paiement CinetPay / KKiaPay
- [ ] Export CSV / PDF des cotisations
- [ ] Rappels automatiques de cotisation
- [ ] Chat de groupe
- [ ] Tableau de bord avec graphiques

---

## Dépannage

### L'APK ne peut pas se connecter au backend

- Vérifier que `EXPO_PUBLIC_API_URL` pointe sur l'URL Vercel de production
- En développement, l'IP doit être celle de la machine (pas `localhost`)
- Vérifier que le backend est bien déployé : `curl https://votre-url.vercel.app/`

### Erreur `JWT_SECRET manquant`

- Vérifier que la variable est bien définie dans Vercel → Settings → Environment Variables
- Redéployer après ajout de variables : `vercel --prod`

### Notifications push non reçues

1. Vérifier que `google-services.json` est dans `mobile/` et référencé dans `app.json`
2. Vérifier que `FIREBASE_SERVICE_ACCOUNT` est le JSON **minifié** sur une seule ligne
3. Sur l'app : aller dans Profil → **Activer les notifications**
4. Vérifier les logs Firebase Console → Cloud Messaging

### Erreur de connexion à la base de données

- Supabase : utiliser le port **5432** (direct), pas le port 6543 (pooler)
- Vérifier que le mot de passe ne contient pas de caractères spéciaux non encodés dans l'URL
- En cas de doute, tester avec `psql "$DATABASE_URL"` en local

---

*Heleana v1.0.0 — Développé avec ❤️ pour les communautés togolaises*
