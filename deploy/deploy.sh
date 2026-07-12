#!/usr/bin/env bash
# Tourne SUR TA BOÎTE MAISON (LXC). Build local + push du statique vers le VPS.
set -euo pipefail

REPO_DIR="/opt/rapidetech-site"      # le clone git du site
VPS_WEB_SSH="rapidetech-ssh@138.197.137.205"    # user SSH du site CloudPanel (site user: rapidetech)
VPS_WEBROOT="/home/rapidetech/htdocs/rapidetech.ca"  # root du site statique CloudPanel
VPS_LEAD_SSH="galx-dev-ssh@138.197.137.205"     # le relais historique tourne sous ce user (port 8791)
SSH_KEY="$HOME/.ssh/galx_deploy"     # clé de déploiement dédiée (nom non standard → à préciser explicitement)

cd "$REPO_DIR"

# Le pull peut remplacer CE script pendant que bash le lit (bash lit au fil de
# l'eau → on exécuterait un mélange ancien/nouveau code). Donc : pull, puis
# ré-exécution de la version fraîchement tirée, qui saute le pull (garde env).
if [[ "${DEPLOY_PULLED:-}" != "1" ]]; then
  echo "→ pull"
  git pull --ff-only
  DEPLOY_PULLED=1 exec bash "$REPO_DIR/deploy/deploy.sh"
fi

echo "→ build (lit Directus via .env : DIRECTUS_URL + DIRECTUS_TOKEN)"
npm ci
npm run build

echo "→ push du dist/ vers le VPS"
# --no-perms/owner/group + --omit-dir-times : on ne touche pas aux attributs
# du dossier racine CloudPanel ; les fichiers restent lisibles par le serveur web.
rsync -rlz --delete --omit-dir-times --no-perms --no-owner --no-group \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes" dist/ "${VPS_WEB_SSH}:${VPS_WEBROOT}/"

echo "→ push du relais leads (hors webroot, ~/apps/rapidetech-leads/)"
# Pas de root sur le VPS : le relais historique vit dans le HOME de galx-dev-ssh
# et tourne via son crontab (voir lead-mailer-watchdog.sh). Le code est mis à
# jour à chaque déploiement ; on relance le process pour qu'il le recharge
# (le watchdog cron le redémarre en ≤ 5 min — ou immédiatement ci-dessous).
# rsync ne crée pas les dossiers parents → mkdir -p d'abord.
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes "$VPS_LEAD_SSH" 'mkdir -p apps/rapidetech-leads'
rsync -rlz --no-perms --no-owner --no-group \
  -e "ssh -i $SSH_KEY -o IdentitiesOnly=yes" \
  deploy/lead-mailer.mjs deploy/lead-mailer-watchdog.sh deploy/leads.env.example \
  "${VPS_LEAD_SSH}:apps/rapidetech-leads/"
ssh -i "$SSH_KEY" -o IdentitiesOnly=yes "$VPS_LEAD_SSH" \
  'chmod +x apps/rapidetech-leads/lead-mailer-watchdog.sh; pkill -f "node .*lead-mailer\.mjs" 2>/dev/null; apps/rapidetech-leads/lead-mailer-watchdog.sh || true'

echo "✓ déployé"
