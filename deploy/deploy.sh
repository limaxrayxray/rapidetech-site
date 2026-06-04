#!/usr/bin/env bash
# Tourne SUR TA BOÎTE MAISON (LXC). Build local + push du statique vers le VPS.
set -euo pipefail

REPO_DIR="/home/alex/rapidetech-site"      # le clone git du site
VPS_SSH="cluser@vps.rapidetech.ca"          # user SSH du site CloudPanel
VPS_WEBROOT="/home/cluser/htdocs/rapidetech.ca"  # root du site statique CloudPanel

cd "$REPO_DIR"

echo "→ pull"
git pull --ff-only

echo "→ build (lit Directus via .env : DIRECTUS_URL + DIRECTUS_TOKEN)"
npm ci
npm run build

echo "→ push du dist/ vers le VPS"
rsync -az --delete -e ssh dist/ "${VPS_SSH}:${VPS_WEBROOT}/"

echo "✓ déployé"
