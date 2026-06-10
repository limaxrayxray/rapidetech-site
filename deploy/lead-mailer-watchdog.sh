#!/usr/bin/env bash
# Démarre et surveille le relais leads SANS root (utilisateur CloudPanel).
# À utiliser quand on ne peut PAS installer le service systemd (pas d'accès
# /etc ni root sur le VPS). Le cron de l'utilisateur fait office de superviseur.
#
# Installation (une fois, connecté en galx-dev-ssh sur le VPS) :
#   1. deploy.sh pousse automatiquement lead-mailer.mjs + ce script vers
#      ~/apps/rapidetech-leads/ (voir deploy.sh).
#   2. Créer la config :  cp ~/apps/rapidetech-leads/leads.env.example ~/rapidetech-leads.env
#      chmod 600 ~/rapidetech-leads.env   # puis éditer : clé SMTP2GO +
#      LEAD_LOG=/home/galx-dev-ssh/rapidetech-leads.jsonl   (PAS /var/log — pas accessible)
#   3. crontab -e :
#        @reboot       $HOME/apps/rapidetech-leads/lead-mailer-watchdog.sh
#        */5 * * * *   $HOME/apps/rapidetech-leads/lead-mailer-watchdog.sh
#      (la ligne */5 relance le relais en ≤ 5 min s'il meurt — supervision du pauvre,
#       mais fiable ; le journal JSONL fait le reste.)
#   4. Nginx : PAS besoin de /etc — dans l'admin web CloudPanel :
#      Sites → dev.galx.ca → Vhost Editor → ajouter dans le bloc server {} :
#        location /api/lead { proxy_pass http://127.0.0.1:8788/lead; }
#
# Logs applicatifs : ~/lead-mailer.log  ·  test : curl http://127.0.0.1:8788/healthz
set -euo pipefail

ENV_FILE="${LEAD_ENV_FILE:-$HOME/rapidetech-leads.env}"
APP_LOG="$HOME/lead-mailer.log"
SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lead-mailer.mjs"

# Déjà en marche → rien à faire.
if pgrep -f "node .*lead-mailer\.mjs" >/dev/null 2>&1; then
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "$(date -Is) ERREUR: $ENV_FILE introuvable — copier leads.env.example" >>"$APP_LOG"
  exit 1
fi

# node n'est pas toujours dans le PATH minimal de cron.
if ! command -v node >/dev/null 2>&1; then
  for p in /usr/local/bin /usr/bin /opt/node/bin; do
    [[ -x "$p/node" ]] && PATH="$p:$PATH" && break
  done
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

nohup node "$SCRIPT" >>"$APP_LOG" 2>&1 &
echo "$(date -Is) lead-mailer (re)démarré (pid $!)" >>"$APP_LOG"
