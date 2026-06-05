#!/usr/bin/env bash
# Tourne SUR TA BOÎTE MAISON (LXC). Build local + push du statique vers le VPS.
set -euo pipefail

REPO_DIR="/opt/rapidetech-site"      # le clone git du site
VPS_SSH="galx-dev-ssh@138.197.137.205"          # user SSH du site CloudPanel
VPS_WEBROOT="/home/galx-dev/htdocs/dev.galx.ca"  # root du site statique CloudPanel (via le symlink htdocs/)
SSH_KEY="$HOME/.ssh/galx_deploy"     # clé de déploiement dédiée (nom non standard → à préciser explicitement)

cd "$REPO_DIR"

echo "→ pull"
git pull --ff-only

echo "→ build (lit Directus via .env : DIRECTUS_URL + DIRECTUS_TOKEN)"
npm ci
npm run build

echo "→ push du dist/ vers le VPS"
# --no-perms/owner/group + --omit-dir-times : on déploie DANS un dossier qu'on
# ne possède pas (dev.galx.ca appartient à galx-dev). On ne touche pas aux
# attributs du dossier racine ; les fichiers sont créés galx-dev-ssh:galx-dev
# en 644/755 (lisibles par le serveur web).
rsync -rlz --delete --omit-dir-times --no-perms --no-owner --no-group \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes" dist/ "${VPS_SSH}:${VPS_WEBROOT}/"

echo "✓ déployé"
