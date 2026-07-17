#!/usr/bin/env bash
# Tourne SUR TA BOÎTE MAISON (LXC). Build local + push du statique vers le VPS.
set -euo pipefail

REPO_DIR="/opt/rapidetech-site"      # le clone git du site
VPS_WEB_SSH="rapidetech-ssh@138.197.137.205"    # user SSH du site CloudPanel (site user: rapidetech)
VPS_WEBROOT="/home/rapidetech/htdocs/rapidetech.ca"  # root du site statique CloudPanel
VPS_LEAD_SSH="galx-dev-ssh@138.197.137.205"     # le relais historique tourne sous ce user (port 8791)
SSH_KEY="$HOME/.ssh/galx_deploy"     # clé de déploiement dédiée (nom non standard → à préciser explicitement)

# IndexNow (Bing/ChatGPT search — Google l'ignore) : la clé PUBLIQUE prouve
# qu'on contrôle le domaine. Elle doit correspondre au fichier
# public/<clé>.txt servi à la racine du site. Pas un secret.
INDEXNOW_KEY="df2b02d5d2c5471cc229a10970e667f6"
SITE_HOST="rapidetech.ca"

cd "$REPO_DIR"

# ── IndexNow ─────────────────────────────────────────────────────────────────
# Extrait toutes les URLs du sitemap (index + sitemaps enfants, fichiers LOCAUX
# de dist/) et les soumet en UN SEUL POST JSON à api.indexnow.org. Bing indexe
# vite et ChatGPT search lit l'index Bing → vrai chemin vers les réponses IA.
# Jamais bloquant : un ping raté ne doit pas faire échouer le déploiement.
indexnow_urls() {
  # Les <loc> de l'index pointent vers les sitemaps enfants ; on lit leur
  # équivalent local dans dist/ (même basename) pour en extraire les URLs de pages.
  local index="dist/sitemap-index.xml" child
  [[ -f "$index" ]] || return 0
  # `|| true` : sous set -euo pipefail, un grep sans correspondance (exit 1)
  # ferait avorter tout le script — un sitemap vide n'est pas une erreur.
  { grep -o "<loc>[^<]*</loc>" "$index" || true; } | sed -e "s/<[^>]*>//g" |
    while read -r loc; do
      child="dist/$(basename "$loc")"
      [[ -f "$child" ]] || continue
      { grep -o "<loc>[^<]*</loc>" "$child" || true; } | sed -e "s/<[^>]*>//g"
    done
}

indexnow_ping() {
  local urls json code
  urls="$(indexnow_urls)"
  if [[ -z "$urls" ]]; then
    echo "  (IndexNow : aucun sitemap dans dist/, rien à soumettre)"
    return 0
  fi
  # urlList JSON : une entrée par URL (pas d'échappement nécessaire : les URLs
  # du sitemap ne contiennent ni quote ni backslash).
  json=$(printf '{"host":"%s","key":"%s","keyLocation":"https://%s/%s.txt","urlList":[%s]}' \
    "$SITE_HOST" "$INDEXNOW_KEY" "$SITE_HOST" "$INDEXNOW_KEY" \
    "$(echo "$urls" | sed 's/.*/"&"/' | paste -sd, -)")
  if [[ "${INDEXNOW_DRY_RUN:-}" == "1" ]]; then
    echo "  (IndexNow DRY RUN — $(echo "$urls" | wc -l) URL(s), pas de POST)"
    echo "$urls" | sed 's/^/    /'
    return 0
  fi
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "$json" "https://api.indexnow.org/indexnow" --max-time 20) || code="échec réseau"
  echo "  IndexNow → HTTP $code ($(echo "$urls" | wc -l) URL(s) soumises)"
}
# ─────────────────────────────────────────────────────────────────────────────

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

echo "→ ping IndexNow (Bing → ChatGPT search ; non bloquant)"
indexnow_ping || true

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
