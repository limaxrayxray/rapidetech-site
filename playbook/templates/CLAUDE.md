# CLAUDE.md — Site {{CLIENT}}

Contexte pour Claude Code. Lis ce fichier avant toute modification.
(Gabarit du playbook — remplace les {{PLACEHOLDERS}} et SUPPRIME les sections
non encore applicables ; complète au fil du projet : ce fichier est la mémoire.)

## Projet
- Client : {{CLIENT}} ({{SECTEUR}}, {{REGION}})
- Domaine final : {{DOMAINE}} · dev : {{DOMAINE_DEV}} (jamais indexé)
- Machine Directus/build : {{HOTE_DIRECTUS}} (repo dans /opt/{{CLIENT}}-site)
- VPS web : CloudPanel, user SSH `{{USER_SSH}}`, webroot `{{WEBROOT}}`,
  root disponible : {{OUI/NON}}
- Design handoff : `design_handoff_{{CLIENT}}/` = source de vérité visuelle

## Stack
- **Astro 5** (sortie `static`) — build vers `./dist/`.
- **Îlots React** via `@astrojs/react` — uniquement pour les composants
  réellement interactifs/animés. Tout le reste en `.astro` (zéro JS).
- **Tailwind v4** via `@tailwindcss/vite` (PAS l'intégration astro, PAS de
  `tailwind.config.js`). Tokens dans `src/styles/global.css`.
- **Directus 11** (headless, self-hosted, privé). SDK dans `src/lib/directus.ts`.
- Alias d'import : `@/*` → `src/*`.

## Règles de travail
1. **On n'édite jamais le code pour changer du contenu.** Tout texte/image/lien
   affiché vient de Directus. Contenu en dur dans un composant = bug : expose un
   champ Directus et câble-le en prop.
2. **Perf d'abord.** Îlot React seulement si interactif ; hydrate
   `client:visible`/`client:idle` (jamais `client:load` sans raison).
3. **Le build ne casse jamais si Directus est down** : chaque getter a un
   `FALLBACK_*` complet ; les singletons passent par `fillEmpty()` champ par
   champ. **Tout nouveau champ de singleton ⇒ valeur dans le FALLBACK.**
4. **Images CMS TOUJOURS localisées au build** (Directus est privé : une URL
   Directus dans le HTML final = image invisible pour le public) :
   - `.astro` → `<Image src={assetUrl(id)} ... />` d'`astro:assets` ;
   - îlot React → `getImage({ src: assetUrl(id), inferSize: true })` dans le
     frontmatter, passe le `.src` en prop ;
   - hôte Directus dans `image.domains` d'`astro.config.mjs` ;
   - le token d'asset passe en query AU BUILD seulement, jamais dans le HTML.
5. **Français québécois** pour tout le contenu visible.
6. **Vérifie avant d'utiliser ; ne te fie pas à ta mémoire.** CLI : `--help` ;
   Directus : introspecte l'API live (le schéma réel = vérité terrain) ; au
   moindre doute, web search de la doc courante. Une vérification coûte
   toujours moins cher qu'un retry.

## Pièges Directus (vécus — ne pas répayer)
- **CAUSE RACINE des « je ne vois pas ce que je viens de créer »** :
  `CACHE_AUTO_PURGE` doit être `"true"` dans le compose. Sinon : flush
  (`POST /utils/cache/clear`) après chaque écriture, et si le schéma reste
  périmé → `docker restart <conteneur-directus>` (cache en mémoire).
- Icônes de collection = **Google Material Icons** (jamais des noms Lucide).
- PK `uuid` ⇒ obligatoirement `meta.special: ["uuid"]`, sinon « Value is
  required » à chaque création. (Ou PK integer auto-increment, plus simple.)
- Après création de collection : `meta.display_template` + champs visibles,
  sinon cards vides dans l'admin.
- Champ `sort` non rempli ⇒ item INVISIBLE dans la liste admin quand
  `sort_field` est actif (l'utilisateur recrée → doublons). Patcher les sort.
- **Un PATCH 200 ne garantit pas la persistance** : toujours GET de
  confirmation.
- Uploads : le volume doit appartenir à l'uid 1000, sinon erreur 500.

## Token de build (lecture seule)
Policy « {{NOM_POLICY_BUILD}} » : `read` sur chaque collection lue par un
getter + **`directus_files`** (sans ça : « textes OK, images absentes » —
les /items passent, les /assets renvoient 403).
⚠️ **Toute nouvelle collection lue au build ⇒ ajouter sa permission read à
cette policy** (les scripts de setup le font ; sinon fallback silencieux).

## Modèle de contenu (état actuel — tenir à jour)
- `home` (singleton) : {{CHAMPS}}
- `services` : title, description, slug, body (paragraphes séparés par ligne
  vide), benefits (JSON liste), sort — page `/services/<slug>/` + overlay accueil
- `differentiators`, `testimonials` (name, detail, rating, quote, sort),
  `partners`, `about` (singleton), `site_settings` (singleton — inclut
  privacy_link_label, notfound_*), `privacy` (singleton Loi 25 : title,
  updated, body avec « ## » = intertitre, lignes « - » = puces)
- Tout passe par `deploy/directus-setup.sh` (idempotent, token admin).

## Patterns front établis
- **Échelle typo : tokens centralisés, 3 paliers** (détail : playbook
  fiche 02) : base px (mobile) → `≥1100px` px plus gros (validés par le
  client sur SON écran) → `≥2000px` tout en vw (= taille à 1920 ÷ 1920 :
  proportions d'un 1080p sur 2K/4K). JAMAIS de `font-size` en px dur dans un
  composant — toujours un token (`--text-body`, `--text-ui`, `--text-label`…).
  Hero : `clamp(min_mobile, taille_1080p÷1920 vw, max_4K)`.
  ⚠️ Ne jamais calibrer un coefficient vw sur une mesure rapportée par le
  client : sa fenêtre CSS est peut-être rétrécie (DevTools, zoom, échelle
  Windows) — ancrer sur un vrai 1920 plein écran.
- Reveals d'entrée : CSS pur gaté par `html.js` + `body.loaded` (script inline
  du layout, rejoué sur `astro:page-load`) → no-JS safe.
- Boucles d'animation coupées sous `prefers-reduced-motion`.
- Icônes : dictionnaire explicite clé→composant (jamais deviné depuis une
  string), rendu statique au build (monté SANS `client:*`).
- **Formulaires : `data-astro-reload` sur le `<form>` + listener submit en
  phase CAPTURE** — sinon le ClientRouter intercepte le submit et « navigue »
  vers l'API.
- Overlay service : `<dialog>` natif + pushState/popstate ; sans JS le lien
  navigue vers la vraie page.

## Plomberie (fiches playbook/03 et 04)
- Formulaire → `/api/lead` → `deploy/lead-mailer.mjs` (port {{LEAD_PORT}},
  défaut 8788 — ⚠️ vérifier qu'il est libre : `ss -ltn`). Sans root : watchdog
  cron + node dans `~/.local/node` + config `~/{{CLIENT}}-leads.env`.
  Succès SMTP2GO = `data.succeeded ≥ 1`. Leads journalisés en JSONL (jamais perdus).
- Auto-deploy : Flow Directus → POST `http://172.18.0.1:8787/deploy`
  (webhook-listener systemd, secret hors repo, debounce + single-flight).
- Avis Google : `deploy/sync-google-reviews.mjs` (cron sur la machine
  Directus ; Place ID figé dans `.env` ; dédup `google_review_id` ; ne touche
  jamais les témoignages manuels).
- Secrets : JAMAIS dans le repo, même un instant (l'historique git n'oublie
  pas — clé compromise = clé à recycler). `.env` est gitignoré.

## SEO
- `SITE_ENV=preprod` dans le `.env` de build ⇒ noindex partout + robots
  Disallow (le site dev ne doit jamais être indexé). Retirer au lancement.
- Sitemap (exclut /merci/ et /404), canonical, OG (`public/og.png`),
  JSON-LD ProfessionalService (AggregateRating seulement si avis renseignés).
- 404 : `error_page 404 /404.html;` à ajouter dans le vhost (CloudPanel).

## Commandes
- `npm run dev` · `npm run build` · `npm run preview`
- Déploiement : `bash deploy/deploy.sh` (machine Directus) — auto via Flow ensuite.

## Versions cibles (la syntaxe a changé récemment — vise CELLES-CI)
- Astro 5 (statique ; ClientRouter ; image.domains)
- Tailwind v4 via @tailwindcss/vite (pas de tailwind.config.js)
- Directus 11 (permissions par Policies) · @directus/sdk v19 · React 18
