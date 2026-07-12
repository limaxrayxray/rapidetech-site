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
# Interface "list" question+réponse pour les FAQ des services.
LIST_FAQ_OPTIONS='{"fields":[{"field":"question","name":"Question","type":"string","meta":{"field":"question","type":"string","interface":"input","width":"full"}},{"field":"answer","name":"Réponse","type":"text","meta":{"field":"answer","type":"text","interface":"input-multiline","width":"full"}}]}'

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
create_field home contact_name_label string input 'null' \
  "Formulaire — libellé du champ nom"
create_field home contact_email_label string input 'null' \
  "Formulaire — libellé du champ courriel"
create_field home contact_phone_label string input 'null' \
  "Formulaire — libellé du champ téléphone"
create_field home contact_message_label string input 'null' \
  "Formulaire — libellé du champ message"
create_field home contact_submit_label string input 'null' \
  "Formulaire — libellé du bouton d'envoi"
create_field home contact_success_message string input 'null' \
  "Formulaire — message de confirmation après envoi"
create_field home contact_error_message string input 'null' \
  "Formulaire — message en cas d'échec d'envoi"
create_field home contact_direct_title string input 'null' \
  "Contact — intertitre de la colonne tel/courriel (ex. « Vous préférez parler à quelqu'un ? »)"

echo "── Champs CIRCUIT sur \`services\` (pages dédiées /services/<slug>/) ──"
create_field services slug string input 'null' \
  "Slug d'URL de la page service (ex. gestion-ti) — minuscules, sans accents"
create_field services body text input-multiline 'null' \
  "Corps long de la page service — paragraphes séparés par une ligne vide"
create_field services benefits json list "${LIST_VALUE_OPTIONS}" \
  "Bénéfices concrets affichés en liste (page service + overlay)"
create_field services seo_title string input 'null' \
  "Titre Google distinct du titre visible dans la carte"
create_field services seo_description text input-multiline 'null' \
  "Description Google — idéalement 140 à 160 caractères"
create_field services faq json list "${LIST_FAQ_OPTIONS}" \
  "Questions fréquentes affichées sur la page service et dans l'overlay"
create_field services show_on_home boolean boolean 'null' \
  "Afficher cette page dans la liste de services de l'accueil"

echo "── Collection singleton \`privacy\` (politique de confidentialité — Loi 25) ──"
# PK integer auto-increment : évite le piège UUID (meta.special obligatoire).
if curl -sf "${auth[@]}" "${DIRECTUS_URL}/collections/privacy" > /dev/null 2>&1; then
  echo "  = collection privacy existe déjà — sautée"
else
  curl -sf "${auth[@]}" -X POST "${DIRECTUS_URL}/collections" -d '{
    "collection": "privacy",
    "meta": {
      "singleton": true,
      "icon": "admin_panel_settings",
      "note": "Politique de confidentialité (Loi 25) — page /confidentialite/",
      "display_template": "{{title}}"
    },
    "schema": {},
    "fields": [
      {
        "field": "id",
        "type": "integer",
        "meta": { "hidden": true, "readonly": true },
        "schema": { "is_primary_key": true, "has_auto_increment": true }
      }
    ]
  }' > /dev/null
  echo "  + collection privacy créée"
fi
create_field privacy title string input 'null' \
  "Titre de la page (ex. « Politique de confidentialité »)"
create_field privacy updated string input 'null' \
  "Date de dernière mise à jour, affichée telle quelle (ex. « 11 juin 2026 »)"
create_field privacy body text input-multiline 'null' \
  "Corps : blocs séparés par une ligne vide · « ## Titre » = intertitre · lignes « - » = liste à puces"

# ⚠️ Toute nouvelle collection lue au build → permission read pour la policy
# « Build — lecture seule » (voir CLAUDE.md), sinon fallback silencieux au build.
policy_id=$(curl -sfg "${auth[@]}" \
  "${DIRECTUS_URL}/policies?filter[name][_eq]=Build%20%E2%80%94%20lecture%20seule&fields=id" \
  | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
if [ -z "${policy_id}" ]; then
  echo "  ⚠ policy « Build — lecture seule » introuvable — ajouter la permission read sur privacy À LA MAIN"
else
  has_perm=$(curl -sfg "${auth[@]}" \
    "${DIRECTUS_URL}/permissions?filter[policy][_eq]=${policy_id}&filter[collection][_eq]=privacy&filter[action][_eq]=read&fields=id" \
    | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
  if [ -n "${has_perm}" ]; then
    echo "  = permission read(privacy) existe déjà pour la policy de build — sautée"
  else
    curl -sf "${auth[@]}" -X POST "${DIRECTUS_URL}/permissions" -d "{
      \"policy\": \"${policy_id}\",
      \"collection\": \"privacy\",
      \"action\": \"read\",
      \"fields\": [\"*\"]
    }" > /dev/null
    echo "  + permission read(privacy) ajoutée à la policy de build"
  fi
fi

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
create_field site_settings privacy_link_label string input 'null' \
  "Libellé du lien footer vers /confidentialite/"
create_field site_settings notfound_title string input 'null' \
  "Page 404 — titre (ex. « Page introuvable »)"
create_field site_settings notfound_body text input-multiline 'null' \
  "Page 404 — texte explicatif"
create_field site_settings notfound_cta_label string input 'null' \
  "Page 404 — libellé du bouton retour (ex. « Retour à l'accueil »)"

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
  home:contact_name_label home:contact_email_label home:contact_phone_label \
  home:contact_message_label home:contact_submit_label \
  home:contact_success_message home:contact_error_message \
  home:contact_direct_title \
  services:slug services:body services:benefits services:seo_title \
  services:seo_description services:faq services:show_on_home \
  site_settings:cities site_settings:google_rating \
  site_settings:google_reviews_count site_settings:coordinates \
  site_settings:status_message site_settings:nav_links \
  site_settings:nav_cta_label site_settings:nav_cta_href \
  site_settings:privacy_link_label site_settings:notfound_title \
  site_settings:notfound_body site_settings:notfound_cta_label \
  privacy:title privacy:updated privacy:body; do
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
