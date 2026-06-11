# CLAUDE.md — Site Rapidetech

Contexte pour Claude Code. Lis ce fichier avant toute modification.

## Stack
- **Astro 5** (sortie `static`) — front, build vers `./dist/`.
- **Îlots React** via `@astrojs/react` — uniquement pour les composants interactifs/animés (21st.dev). Tout le reste reste en `.astro` (zéro JS).
- **Tailwind v4** via `@tailwindcss/vite` (PAS l'intégration astro tailwind, PAS de `tailwind.config.js`). Tokens dans `src/styles/global.css`.
- **Directus** (headless, self-hosted) comme CMS. SDK dans `src/lib/directus.ts`.
- **framer-motion** pour les animations d'îlots.
- Alias d'import : `@/*` → `src/*`.

## Règles de travail
1. **On n'édite jamais le code pour changer du contenu.** Tout texte/image/lien affiché vient de Directus. Si un nouveau composant a du contenu en dur, expose-le en champ Directus et câble-le en prop.
2. **Perf d'abord.** Un composant n'est un îlot React que s'il est réellement interactif/animé. Sinon → `.astro` pur. Hydrate avec `client:visible` (différé au scroll), `client:idle`, ou `client:load` seulement si vraiment nécessaire above-the-fold.
3. **Le build ne doit jamais casser si Directus est hors ligne** — voir les `FALLBACK_*` dans `src/lib/directus.ts`. Tout nouveau getter doit avoir un fallback.
4. **Images CMS = TOUJOURS localisées au build.** Directus est privé (Tailscale) : une URL Directus dans le HTML final = images invisibles pour le public. Règle absolue :
   - `.astro` → composant `<Image src={assetUrl(id)} ... />` de `astro:assets`.
   - îlot React → appelle `getImage({ src: assetUrl(id), ... })` dans le frontmatter `.astro`, passe le `.src` (chemin local) en prop. Voir le hero dans `src/pages/index.astro`.
   - L'hôte Directus (localhost) doit être dans `image.domains` de `astro.config.mjs`.
   - Jamais d'URL `DIRECTUS_URL`/PUBLIC_URL brute dans le markup rendu.
5. **Quebec French** pour tout le contenu visible. Code/commentaires en français ou anglais, peu importe.

6. **Vérifie avant d'utiliser ; ne te fie pas à ta mémoire.** L'outillage ici est
   récent et la syntaxe a pu changer depuis ta date de coupure. Avant d'employer
   une commande CLI ou un endpoint d'API dont tu n'es pas certain :
   - vérifie contre la version installée (`--help`, `npx astro --help`, etc.) ;
   - pour Directus, introspecte l'API LIVE sur http://localhost:8055
     (le schéma réel = vérité terrain) au lieu de te rappeler la syntaxe ;
   - au moindre doute, web search de la doc courante.
   Une vérification coûte toujours moins cher qu'un retry.

## Ajouter un composant 21st.dev
1. `npx shadcn add "https://21st.dev/r/<auteur>/<composant>"` → atterrit dans `src/components/ui/` (voir `components.json`).
2. Refactore-le pour que **tout le contenu soit en props** (jamais de texte en dur). Voir `src/components/Hero.tsx` comme patron de référence.
3. Ajoute les champs correspondants dans la collection Directus appropriée.
4. Monte-le depuis un `.astro` avec la bonne directive `client:*`.

## Pièges Directus (erreurs vécues — ne pas répéter)

### Icônes de collection
Directus utilise **Google Material Icons**, pas Lucide ni MDI.
Icônes valides confirmées : `home`, `bolt`, `folder`, `grade`, `database`, `input`, `people_alt`, `admin_panel_settings`, `bookmark`.
Ne jamais utiliser un nom Lucide (ex: `sparkles`, `shield-check`) comme icône de collection — Directus affiche le nom en texte brut si l'icône n'existe pas.

### Clé primaire UUID — auto-génération obligatoire
Quand on crée une collection avec `type: "uuid"` comme PK, il **faut** explicitement ajouter `meta.special: ["uuid"]` sur le champ, sinon Directus exige une valeur manuelle à chaque création d'item ("Value is required").
```
PATCH /fields/{collection}/id
{ "meta": { "special": ["uuid"], "hidden": true, "readonly": true } }
```

### Affichage dans la liste/cards Directus
Après création d'une collection, configurer obligatoirement :
1. `meta.display_template: "{{title}}"` sur la collection (sinon les cards sont vides).
2. `meta.hidden: false` sur les champs à afficher dans la vue table (title, description…).
Sans ça, les items apparaissent sans contenu dans l'admin.

### Champ `sort` — valeur null = item invisible dans la liste admin
Directus ne remplit pas automatiquement le champ `sort` à la création. Un item avec `sort=null` n'apparaît pas dans la vue liste/cards quand `sort_field` est activé — l'utilisateur croit que la création a échoué et recommence, créant des doublons.
Après avoir créé des items manuellement, toujours patcher les valeurs de tri via l'API :
```
PATCH /items/{collection}/{id}  { "sort": N }
```
Ou mieux : après création de la collection, setter `meta.sort` sur le champ `sort` pour qu'il s'auto-incrémente côté Directus (à investiguer).

### Vérifier après chaque PATCH
Un appel PATCH qui retourne `200 OK` ne garantit pas que la valeur a persisté. Toujours enchaîner un GET de confirmation sur la ressource modifiée.

### ⚠️ CAUSE RACINE : CACHE_AUTO_PURGE non activé
Le conteneur tourne avec `CACHE_ENABLED=true` mais **sans** `CACHE_AUTO_PURGE` (défaut `false`). Directus ne vide donc JAMAIS son cache quand le contenu change → l'admin sert des listes vides / un schéma périmés. C'est l'origine de TOUS les symptômes « je crée un item/une collection mais je ne le vois pas ».
Correctif permanent (à appliquer une fois) : dans `/data/compose/1/docker-compose.yml`, service `directus` → `environment:` ajouter `CACHE_AUTO_PURGE: "true"`, puis `docker compose up -d`.
Tant que ce n'est pas fait : vider le cache (`POST /utils/cache/clear`) après chaque écriture, et redémarrer le conteneur si le schéma ne se rafraîchit pas.

### Cache de schéma périmé après création via API
Directus tourne avec Redis (`directus-cache-1`). Après création d'une collection/d'un champ via l'API REST, la **liste** `/collections` (et la navigation de l'admin) peut continuer à servir une version cachée SANS la nouveauté — même si `GET /collections/<nom>` répond 200 et que la table Postgres existe. Symptôme : « je ne vois pas la collection / le champ dans Directus ».
Correctif : vider le cache puis hard refresh du navigateur.
```
POST /utils/cache/clear        # (avec le token admin)
```
⚠️ VÉCU : `POST /utils/cache/clear` n'a PAS suffi — le process Directus gardait le schéma en mémoire. Il a fallu **redémarrer le conteneur** pour que les nouvelles collections apparaissent dans la barre latérale de l'admin :
```
docker restart directus-directus-1
```
Réflexe : après création de collection(s)/champ(s) via API, flush le cache ; si l'utilisateur ne voit toujours rien après hard refresh → `docker restart directus-directus-1`.

### Infra Directus (déploiement local)
- Conteneurs Docker : `directus-directus-1` (app, tourne en uid **1000/node**), `directus-database-1` (postgres 16), `directus-cache-1` (redis 7).
- Volume uploads : hôte `/data/compose/1/data/uploads` → conteneur `/directus/uploads`. Doit appartenir à l'uid **1000**, sinon upload = `EACCES` → erreur 500.
- Logs utiles : `docker logs directus-directus-1 --tail 50`.

## Modèle de contenu Directus (état actuel)
- **`home`** (singleton) : `hero_eyebrow`, `hero_title` (legacy, plus affiché), `hero_title_line1`, `hero_title_ghost`, `hero_scramble_words` (JSON liste), `hero_title_line3`, `hero_subtitle`, `hero_cta_label`, `hero_cta_href`, `hero_image` (uuid → directus_files, plus affiché — direction CIRCUIT sans photo de hero), `marquee_items` (JSON liste), `services_title`, `differentiators_title`, `testimonials_title`, `local_title`, `about_title`, `partners_title`, `partners_intro`, `cta_final_title`, `cta_final_body`, `cta_final_label`, `cta_final_href`.
  Champs formulaire de contact : `contact_name_label`, `contact_email_label`, `contact_phone_label`, `contact_message_label`, `contact_submit_label`, `contact_success_message`, `contact_error_message`, `contact_direct_title`.
  ⚠️ Les champs CIRCUIT (`hero_title_line1`…) doivent être créés via `deploy/directus-circuit-setup.sh` (idempotent, token admin requis) — tant qu'ils n'existent pas/sont vides, les `FALLBACK_*` affichent le contenu par défaut.
- **`services`** (collection) : `title`, `description`, `icon` (legacy Lucide, plus affiché), `slug`, `body` (texte long, paragraphes séparés par ligne vide), `benefits` (JSON liste), `sort`. Chaque service a sa page statique `/services/<slug>/` (SEO) ET un overlay sur l'accueil (`<dialog>` + pushState — même contenu via `ServicePanel.astro`, sans JS le lien navigue normalement).
- **`differentiators`** (collection) : `title`, `description`, `sort`.
- **`testimonials`** (collection) : `name`, `detail`, `rating` (1-5, optionnel), `quote`, `sort`.
- **`partners`** (collection) : `name`, `logo` (uuid → directus_files), `url`, `sort`.
- **`about`** (singleton) : `name`, `role`, `bio`, `values` (JSON liste), `photo` (uuid → directus_files).
- **`site_settings`** (singleton) : `company_name`, `phone`, `email`, `hours`, `city`, `service_area`, `google_reviews_url`, `footer_tagline`, `meta_title`, `meta_description`, `cities` (JSON liste — bandeau ancrage local, la 1re ville est en gras), `google_rating`, `google_reviews_count`, `coordinates`, `status_message`, `nav_links` (JSON liste label+href), `nav_cta_label`, `nav_cta_href`, `privacy_link_label` (lien footer vers /confidentialite/), `notfound_title`/`notfound_body`/`notfound_cta_label` (page 404).
- **`privacy`** (singleton) : `title`, `updated` (date affichée telle quelle), `body` (texte long — blocs séparés par ligne vide ; « ## Titre » = intertitre ; bloc de lignes « - » = liste à puces). Page `/confidentialite/` (Loi 25), liée depuis le footer. Collection + permission read de la policy de build créées par `deploy/directus-circuit-setup.sh`.
- Crée un token statique **lecture seule** pour le build, mets-le dans `.env` (`DIRECTUS_TOKEN`).
- Étends le modèle au besoin (réalisations, FAQ, etc.) — toujours : champ Directus → prop → composant.

## Patterns front (établis — réutilise-les)

### Direction artistique CIRCUIT (en vigueur)
Le style du site = design system `design_handoff_site_rapidetech/` (tokens, composants, readme = source de vérité). Points clés :
- Tokens CSS CIRCUIT dans `src/styles/global.css` (`--rt-*` + alias sémantiques), pontés vers les alias shadcn via `@theme inline` — les composants 21st.dev se thèment seuls.
- Fonts auto-hébergées dans `public/fonts/` (Clash Display, General Sans, Space Mono). Pas de CDN.
- Composants `.astro` purs (zéro JS) : `Logo`, `Button`, `SectionHeader`, `ServiceRow`, `TestimonialCard`, `Marquee` (piste dupliquée côté serveur). Seul îlot React : `Hero.tsx` (scramble, horloge, ping, CTA magnétique), monté `client:idle`.
- Reveals d'entrée : CSS pur, gated par `html.js` (posé dans `<head>`) + `body.loaded` (script inline de `Base.astro`, rejoué sur `astro:page-load`) → no-JS safe, indépendant de l'hydratation.
- Pas d'icônes pictogrammes (numéros `/ 01`, flèche →, ✺) : `ServiceIcon.tsx` est conservé mais plus monté.
- Toutes les boucles (grain, pulse, marquee, scramble) coupées sous `prefers-reduced-motion`.

### Champs de singleton vides → fallback champ par champ
`getHome`/`getSiteSettings`/`getAbout` passent par `fillEmpty(data, FALLBACK)` dans `directus.ts` : tout champ `null`/`""` retombe sur le fallback. Indispensable car les items sont en lecture publique → un champ existant mais non rempli reviendrait vide et casserait l'UI (CTA/footer vides). Le `try/catch → FALLBACK` global, lui, ne couvre QUE Directus hors ligne. **Tout nouveau champ de singleton doit avoir une valeur dans le FALLBACK correspondant.**

### Icônes Lucide pour les services (rendu statique, zéro JS)
`src/components/ServiceIcon.tsx` = **dictionnaire explicite** clé→composant lucide + `DEFAULT_ICON` si clé inconnue. On ne devine jamais une icône depuis une string. Monté dans `.astro` SANS `client:*` → Astro le rend en SVG statique au build (zéro JS). Ajouter une icône = importer + une ligne dans la map. `lucide-react` est installé.

### Token de build (lecture seule) — permissions requises
La policy du token de build (`directus_users.token` → `DIRECTUS_TOKEN`) — ici **« Build — lecture seule »** (`062db0aa…`) — doit avoir `read` sur :
- **chaque collection de contenu** lue par un getter (`home`, `services`, `differentiators`, `about`, `testimonials`, `partners`, `site_settings`, `directus_fields`) ;
- **`directus_files`** — SANS ça, `/assets/<id>` renvoie **403** et aucune image ne se localise (les `/items` peuvent réussir alors que les fichiers échouent → symptôme « texte OK, images absentes »).
⚠️ **Toute nouvelle collection lue au build → ajouter sa permission `read` à cette policy**, sinon fallback silencieux côté site. Ajout via API admin : `POST /permissions {policy, collection, action:"read", fields:["*"]}` puis flush cache.
Le token est passé en `?access_token=` sur l'URL d'asset au build (voir `assetUrl`) — uniquement au build, jamais dans le HTML final.

### Localisation d'images CMS tolérante aux pannes
Dans `index.astro`, le helper `localizeImage(fileId, width)` enrobe `getImage({ src: assetUrl(id), inferSize: true, ... })` dans un try/catch :
- `inferSize: true` est **obligatoire** pour un asset distant (sinon erreur `MissingImageDimension`).
- L'asset binaire `/assets/...` de Directus exige un **token** (les /items sont en lecture publique, pas les fichiers). Tant que `DIRECTUS_TOKEN` n'est pas configuré, le fetch échoue → le try/catch dégrade en « pas d'image » et le **build reste vert**. Une fois le token en place, les images apparaissent sans changement de code.

### Formulaire de contact → courriel (relais VPS)
`ContactForm.astro` POST vers `/api/lead` (Nginx → `deploy/lead-mailer.mjs`, port local 8788 par défaut — ⚠️ **sur CE VPS le port est 8791** via `LEAD_PORT` : 8788 était déjà pris par un service invisible d'un autre user ; le vhost CloudPanel pointe donc sur 8791). ⚠️ **Pas de root sur le VPS** (CloudPanel, user `galx-dev-ssh`, clé root indisponible) → le relais tourne SANS systemd : `deploy.sh` pousse le code vers `~/apps/rapidetech-leads/` et le crontab de l'utilisateur supervise via `lead-mailer-watchdog.sh` (`@reboot` + `*/5min`, pgrep avant relance). Node installé SANS root (binaire officiel dans `~/.local/node`). Config dans `~/rapidetech-leads.env` (PAS /etc, jamais écrasée par les déploiements), journal dans le HOME. La directive Nginx s'ajoute par l'admin web CloudPanel (Sites → Vhost Editor), jamais par /etc. Le unit systemd `rapidetech-leads.service` reste dans le repo si root devient disponible un jour. Envoi via l'API HTTP de SMTP2GO (clé dans `/etc/rapidetech-leads.env`, jamais dans le repo ; le succès se vérifie sur `data.succeeded ≥ 1`, pas juste le 200). Honeypot `entreprise`, rate-limit 5/h/IP, retries, et journal JSONL de secours (lead jamais perdu même si SMTP2GO tombe). Sans JS : POST classique → 303 vers `/merci/`. ⚠️ Le formulaire porte `data-astro-reload` + listener submit en phase CAPTURE — sinon le ClientRouter d'Astro intercepte le submit et « navigue » vers /api/lead.

### Avis Google → Directus (sync automatique)
`deploy/sync-google-reviews.mjs` (cron sur la machine Directus) : API Places (New) → upsert `testimonials` (dédup. par `google_review_id`, champs auto-créés ; les témoignages manuels ne sont jamais touchés) + met à jour `site_settings.google_rating`/`google_reviews_count`. Limite API : ~5 avis les plus pertinents. Les témoignages affichés sont mélangés à CHAQUE BUILD (le Flow redéploie à chaque sauvegarde → l'ordre tourne réellement).

### SEO
- `SITE_ENV=preprod` dans le `.env` de build → robots.txt « Disallow: / » + meta noindex partout (dev.galx.ca ne doit jamais être indexé). Au lancement : retirer la variable, rebuilder.
- Sitemap (`@astrojs/sitemap`, `/merci/` et `/404` exclus), canonical, Open Graph (`public/og.png`), favicon.svg, JSON-LD ProfessionalService sur l'accueil (AggregateRating seulement si `google_reviews_count` est renseigné).
- Page 404 (`src/pages/404.astro` → `dist/404.html`, noindex) : Nginx ne la sert PAS tout seul — ajouter `error_page 404 /404.html;` dans le vhost (CloudPanel → Vhost Editor).
- `/confidentialite/` : politique de confidentialité (Loi 25), contenu = singleton `privacy`, indexable, dans le sitemap.

## Commandes
- `npm run dev` — dev local.
- `npm run build` — build statique vers `dist/`.
- `npm run preview` — sert le build localement.

## Déploiement (voir README.md)
Site statique servi par Nginx via CloudPanel. Build local puis `rsync` vers le VPS (`deploy/deploy.sh`).

### Déploiement automatique (webhook Directus → Flow)
En Directus 11 les webhooks classiques = **Flows** ; l'op « Run Script » est sandboxée (pas de shell). Donc :
1. **Récepteur** `deploy/webhook-listener.mjs` (Node natif) tourne en service systemd `rapidetech-deploy`, lié à **`172.18.0.1:8787`** (bridge Docker → joignable par le conteneur Directus + l'hôte, **pas exposé sur Internet**). Auth par secret Bearer (`/etc/rapidetech-deploy.env`, hors repo). Debounce 8 s + single-flight (pas de builds concurrents).
2. **Flow Directus** « Déploiement auto du site » : trigger event (create/update/delete) sur les 7 collections de contenu → opération *request* qui POST `http://172.18.0.1:8787/deploy` avec le header `Authorization: Bearer <secret>`.
- Service tourne en root (a besoin de `/root/.ssh/galx_deploy`, git, npm) ; le unit fixe `HOME=/root` et `PATH` (sinon `set -u` → `HOME: unbound variable`).
- Logs : `journalctl -u rapidetech-deploy -f`. Réinstaller le unit : `cp deploy/rapidetech-deploy.service /etc/systemd/system/ && systemctl daemon-reload && systemctl restart rapidetech-deploy`.
- Le secret n'est **jamais** dans le repo (dans `/etc/rapidetech-deploy.env` + dans le header du Flow stocké en base Directus).

## Versions cibles (la syntaxe a changé récemment — vise CELLES-CI)
- Astro 5 (sortie statique ; ClientRouter pour les transitions ; image.domains)
- Tailwind v4 via @tailwindcss/vite (PAS de tailwind.config.js ; tokens en CSS)
- Directus 11 (permissions par Policies ; API REST/schema)
- @directus/sdk v19
- React 18
