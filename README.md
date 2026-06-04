# Rapidetech — site web

Astro + îlots React + Directus, build statique, hébergé sur CloudPanel.

## Démarrage local
```bash
cp .env.example .env      # laisse DIRECTUS_TOKEN vide pour bâtir sur les fallbacks
npm install
npm run dev               # http://localhost:4321
```

## Architecture
```
Directus (Node + Postgres)  ──API──▶  build Astro  ──▶  dist/ (HTML statique)  ──▶  Nginx (CloudPanel)
        ▲                                  ▲
   édition contenu                    webhook "content changed" → deploy.sh
```
Aucun runtime Node ne sert le site : Nginx sert du HTML statique. Le Node ne tourne que pour Directus et pour le build.

## Déploiement sur CloudPanel

### 1. Site statique (le front)
- Crée un site **Static** dans CloudPanel (domaine `rapidetech.ca`).
- Le `root` du vhost pointe vers le `dist/` du projet (ou copie `dist/` dans le root web à chaque deploy).

### 2. Directus (le CMS)
- Crée un site **Node.js** (ou un conteneur) pour Directus, sur un sous-domaine, ex. `cms.rapidetech.ca`.
- Base Postgres dédiée. Persiste les uploads sur disque ou S3-compatible.
- Crée un **rôle lecture seule** + un **token statique**, mets-le dans `.env` (`DIRECTUS_TOKEN`).

### 3. Rebuild automatique au changement de contenu
Script `deploy.sh` à la racine du projet :
```bash
#!/usr/bin/env bash
set -euo pipefail
cd /home/<user>/htdocs/rapidetech-build   # le dépôt git du projet
git pull --ff-only
npm ci
npm run build
rsync -a --delete dist/ /home/<user>/htdocs/rapidetech.ca/   # root du site statique
```
Rends-le exécutable (`chmod +x deploy.sh`).

Déclencheurs possibles :
- **Webhook Directus** (Settings → Webhooks) sur create/update/delete des collections `home`/`services`, pointant vers un petit endpoint qui lance `deploy.sh` (protège-le par un secret).
- ou un **Flow Directus** vers le même endpoint.
- ou simplement un **push git** (hook de déploiement CloudPanel / GitHub Actions qui SSH et lance `deploy.sh`).

## Notes perf
- Garde les images en AVIF/WebP, sers-les via Directus avec transformations, ou pré-optimise au build.
- Active la compression + le cache long sur les assets `_astro/` dans la config Nginx CloudPanel.
- N'hydrate un îlot React que si nécessaire (voir CLAUDE.md).
