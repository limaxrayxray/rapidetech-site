# Phase 0 — Prérequis (👤 toi, avant d'impliquer Claude)

Tout ce qui suit demande des comptes, des paiements ou des accès admin que
Claude n'a pas. Rassemble AVANT de commencer : les délais (vérification de
domaine expéditeur, ouverture d'API Google) sont les seuls vrais goulots.

## Infos client à collecter

- [ ] Nom légal + nom d'affichage de l'entreprise
- [ ] Ville / territoire desservi (liste des villes pour l'ancrage local)
- [ ] Liste des services offerts (titre + 2-3 phrases chacun, même brouillon)
- [ ] Téléphone, courriel public, heures d'ouverture
- [ ] Fiche Google Business : **l'URL Google Maps de la fiche** (suffit pour
  retrouver le Place ID — voir fiche 03)
- [ ] Domaine final (ex. `client.ca`) + accès au DNS
- [ ] Logo / photos existantes, couleurs imposées s'il y en a
- [ ] Personne responsable des renseignements personnels (Loi 25 — souvent le
  propriétaire) + courriel de contact

## Comptes & accès techniques

- [ ] **Repo GitHub** `<client>-site` (privé), avec ce playbook + le CLAUDE.md gabarit
- [ ] **VPS CloudPanel** (ou réutilise le tien) : créer le site
  `dev.<tondomaine>` (sous-domaine de DEV, jamais indexé), noter :
  - user SSH du site (ex. `xxx-ssh`), webroot (ex. `/home/xxx/htdocs/dev...`)
  - ⚠️ as-tu **root** ? Sinon le playbook a un mode « sans root » complet (fiche 03)
- [ ] **Clé SSH de déploiement** dédiée (ex. `~/.ssh/<client>_deploy`) installée
  sur le VPS
- [ ] **Machine Directus** : LXC/VM qui hébergera Directus en Docker
  (postgres + redis + directus). C'est AUSSI la machine de build (elle voit
  Directus en localhost). Prévois sa **sauvegarde** (PBS/Synology) dès le jour 1.
- [ ] **SMTP2GO** (ou équivalent) : compte + **domaine expéditeur du client
  vérifié** (SPF/DKIM — délai DNS) + une clé API « Emails »
- [ ] **Google Cloud** : projet + **Places API (New)** activée + clé API
  restreinte à cette API. ⚠️ Si tu restreins par IP : c'est l'IP publique de la
  **machine Directus** (celle qui exécute la sync), PAS celle du VPS web.

## Déploiement Directus (docker compose)

Réutilise le compose du projet de référence. Points NON négociables (pièges vécus) :

- [ ] `CACHE_AUTO_PURGE: "true"` dans l'environnement Directus — sans ça,
  l'admin sert des listes vides après chaque écriture API et tu perds des heures
- [ ] Volume uploads appartenant à l'uid **1000** (sinon upload = erreur 500)
- [ ] Un **token admin** (pour les scripts de setup) et plus tard un **token de
  build lecture seule** (créé en phase 2)
- [ ] Directus reste **privé** (Tailscale/LAN) — il n'est jamais exposé au
  public ; le site est statique, le public ne parle qu'à Nginx

## Sortie de phase

Tu peux passer à la phase 1 quand : le repo existe, Directus répond sur
`http://localhost:8055` depuis la machine de build, le site dev.* répond sur
le VPS, et tu as les infos client en vrac dans un fichier/notes.
