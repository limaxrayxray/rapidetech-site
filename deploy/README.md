# Déploiement B1 — Directus à la maison, statique sur le VPS

## Topologie
```
   MAISON (LXC Proxmox)                        VPS PUBLIC (CloudPanel)
 ┌─────────────────────────┐                 ┌────────────────────────┐
 │ Directus + Postgres      │                 │ Nginx → dist/ statique │ ──▶ visiteurs
 │ (Docker, privé/Tailscale)│                 │ (site « bête »)        │
 │         ▲                │                 └────────────────────────┘
 │         │ build lit l'API│                          ▲
 │   npm run build          │ ── rsync dist/ (SSH) ─────┘
 └─────────────────────────┘
```
Le VPS n'appelle JAMAIS la maison. Directus n'est jamais public.

## 1. Directus (sur le LXC maison)
```bash
cp deploy/.env.example deploy/.env   # remplis les secrets (openssl rand -hex 32)
cd deploy && docker compose up -d
```
- Accède à l'admin via Tailscale uniquement (l'URL de `DIRECTUS_PUBLIC_URL`).
- Ne fais AUCUN port-forward du 8055 vers Internet.
- Crée les collections `home` (singleton) et `services` (voir CLAUDE.md).
- Crée un **token statique en lecture seule** (Settings → Access Tokens) pour le build.

## 2. .env du SITE (à la racine du repo, sur la boîte qui build)
```
DIRECTUS_URL=http://localhost:8055      # ou l'IP Tailscale si build ≠ LXC Directus
DIRECTUS_TOKEN=le-token-lecture-seule
```
> Pas de souci CORS : le build lit l'API côté serveur (Node), pas dans un navigateur.

## 3. VPS CloudPanel
- Crée un site **Static** (domaine `rapidetech.ca`). C'est tout — pas de Node, pas de DB.
- Le root du vhost = `VPS_WEBROOT` dans `deploy.sh`.
- Génère une clé SSH sur la boîte maison, ajoute la clé publique au user du site VPS
  (pour que `rsync` passe sans mot de passe).

## 4. Publier
Manuel :
```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```
Automatique (optionnel) : un **Flow Directus** (déclencheur sur create/update de `home`/`services`)
→ webhook vers un petit listener local qui lance `deploy.sh`. Tout reste dans ton réseau.

## Sauvegardes
- Postgres : `docker compose exec database pg_dump -U $DB_USER $DB_DATABASE > backup.sql`
  (intègre-le à tes backups Proxmox du LXC).
- Uploads : `deploy/data/uploads/` (inclus dans le backup du LXC).
