#!/usr/bin/env bash
# ============================================================
# Direction CIRCUIT — création des nouveaux champs Directus
# (singletons `home` et `site_settings`).
#
# À exécuter sur la machine qui voit Directus (Tailscale/local) :
#   DIRECTUS_ADMIN_TOKEN=xxxx ./deploy/directus-circuit-setup.sh
#
# - Idempotent : un champ déjà existant est sauté.
# - Vide le cache après écriture (CACHE_AUTO_PURGE absent → obligatoire,
#   voir CLAUDE.md) puis VÉRIFIE chaque champ par un GET.
# - Le site a un fallback complet pour chacun de ces champs : tant que
#   l'éditeur ne les remplit pas, le contenu par défaut s'affiche.
# ============================================================
set -euo pipefail

DIRECTUS_URL="${DIRECTUS_URL:-http://localhost:8055}"
TOKEN="${DIRECTUS_ADMIN_TOKEN:?DIRECTUS_ADMIN_TOKEN requis (token admin, pas le token de build)}"

auth=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

# Interface "list" à une seule valeur (→ JSON [{ "value": "..." }])
LIST_VALUE_OPTIONS='{"fields":[{"field":"value","name":"Valeur","type":"string","meta":{"field":"value","type":"string","interface":"input","width":"full"}}]}'
# Interface "list" label+href (→ JSON [{ "label": "...", "href": "..." }])
LIST_LINK_OPTIONS='{"fields":[{"field":"label","name":"Libellé","type":"string","meta":{"field":"label","type":"string","interface":"input","width":"half"}},{"field":"href","name":"Lien","type":"string","meta":{"field":"href","type":"string","interface":"input","width":"half"}}]}'

field_exists() { # collection field
  curl -sf "${auth[@]}" "${DIRECTUS_URL}/fields/$1/$2" > /dev/null 2>&1
}

create_field() { # collection field type interface options_json note
  local collection="$1" field="$2" type="$3" interface="$4" options="$5" note="$6"
  if field_exists "$collection" "$field"; then
    echo "  = ${collection}.${field} existe déjà — sauté"
    return 0
  fi
  local payload
  payload=$(cat <<EOF
{
  "field": "${field}",
  "type": "${type}",
  "meta": {
    "interface": "${interface}",
    "options": ${options},
    "note": "${note}"
  },
  "schema": {}
}
EOF
)
  curl -sf "${auth[@]}" -X POST "${DIRECTUS_URL}/fields/${collection}" \
    -d "${payload}" > /dev/null
  echo "  + ${collection}.${field} créé"
}

echo "── Champs CIRCUIT sur \`home\` ──"
create_field home hero_title_line1 string input 'null' \
  "Hero CIRCUIT — ligne 1 du titre display (ex. « Votre TI, »)"
create_field home hero_title_ghost string input 'null' \
  "Hero — mot fantôme (contour) de la ligne 2 (ex. « sans »)"
create_field home hero_scramble_words json list "${LIST_VALUE_OPTIONS}" \
  "Hero — mots du scramble après le mot fantôme. Le 1er = état de repos (ex. surprise, jargon, stress, détour)"
create_field home hero_title_line3 string input 'null' \
  "Hero — ligne 3 du titre (ex. « Point final. »)"
create_field home marquee_items json list "${LIST_VALUE_OPTIONS}" \
  "Bandeau défilant ✺ sous le hero (ex. Gestion TI, Cybersécurité…)"
create_field home testimonials_title string input 'null' \
  "Titre de la section témoignages"
create_field home local_title string input 'null' \
  "Titre du bandeau « ancrage local » (villes desservies)"
create_field home about_title string input 'null' \
  "Eyebrow de la section À propos (ex. « Qui je suis »)"

echo "── Champs CIRCUIT sur \`site_settings\` ──"
create_field site_settings cities json list "${LIST_VALUE_OPTIONS}" \
  "Villes desservies (bandeau ancrage local). La 1re est mise en gras"
create_field site_settings google_rating string input 'null' \
  "Note Google affichée telle quelle (ex. « 5,0 »)"
create_field site_settings google_reviews_count integer input 'null' \
  "Nombre d'avis Google vérifiés (vide = masqué)"
create_field site_settings coordinates string input 'null' \
  "Coordonnées de la barre de statut (ex. « 45.6°N — 73.8°O »)"
create_field site_settings status_message string input 'null' \
  "Message de la barre de statut live (ex. « Tous systèmes opérationnels »)"
create_field site_settings nav_links json list "${LIST_LINK_OPTIONS}" \
  "Liens de navigation de l'en-tête (label + ancre/lien)"
create_field site_settings nav_cta_label string input 'null' \
  "Libellé du bouton CTA de l'en-tête (ex. « Parler à Alexandre »)"
create_field site_settings nav_cta_href string input 'null' \
  "Lien du bouton CTA de l'en-tête (ex. #contact)"

echo "── Flush du cache Directus (CACHE_AUTO_PURGE absent) ──"
curl -sf "${auth[@]}" -X POST "${DIRECTUS_URL}/utils/cache/clear" > /dev/null \
  && echo "  cache vidé" \
  || echo "  ⚠ échec du flush — faire: docker restart directus-directus-1"

echo "── Vérification (un POST 200 ne garantit rien — voir CLAUDE.md) ──"
fail=0
for spec in \
  home:hero_title_line1 home:hero_title_ghost home:hero_scramble_words \
  home:hero_title_line3 home:marquee_items home:testimonials_title \
  home:local_title home:about_title \
  site_settings:cities site_settings:google_rating \
  site_settings:google_reviews_count site_settings:coordinates \
  site_settings:status_message site_settings:nav_links \
  site_settings:nav_cta_label site_settings:nav_cta_href; do
  collection="${spec%%:*}"; field="${spec##*:}"
  if field_exists "$collection" "$field"; then
    echo "  ✓ ${collection}.${field}"
  else
    echo "  ✗ ${collection}.${field} ABSENT"
    fail=1
  fi
done

if [ "$fail" -eq 1 ]; then
  echo "Des champs manquent. Réessayer, puis si l'admin ne les montre toujours pas :"
  echo "  docker restart directus-directus-1"
  exit 1
fi

echo "Terminé. Si les champs n'apparaissent pas dans l'admin après un hard"
echo "refresh : docker restart directus-directus-1 (cache de schéma en mémoire)."
