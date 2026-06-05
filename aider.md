# aider.md — Site Rapidetech

Contexte pour aider. Lis ce fichier avant toute modification.

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

## Modèle de contenu Directus (état actuel)
- **`home`** (singleton) : `hero_eyebrow`, `hero_title`, `hero_subtitle`, `hero_cta_label`, `hero_cta_href`, `hero_image` (uuid → directus_files), `differentiators_title`.
- **`services`** (collection) : `title`, `description`, `icon` (nom d'icône Lucide), `sort`.
- **`differentiators`** (collection) : `title`, `description`, `sort`.
- Crée un token statique **lecture seule** pour le build, mets-le dans `.env` (`DIRECTUS_TOKEN`).
- Étends le modèle au besoin (réalisations, témoignages, FAQ, etc.) — toujours : champ Directus → prop → composant.

## Commandes
- `npm run dev` — dev local.
- `npm run build` — build statique vers `dist/`.
- `npm run preview` — sert le build localement.

## Déploiement (voir README.md)
Site statique servi par Nginx via CloudPanel. Rebuild déclenché par webhook Directus → script `deploy.sh`.

## Versions cibles (la syntaxe a changé récemment — vise CELLES-CI)
- Astro 5 (sortie statique ; ClientRouter pour les transitions ; image.domains)
- Tailwind v4 via @tailwindcss/vite (PAS de tailwind.config.js ; tokens en CSS)
- Directus 11 (permissions par Policies ; API REST/schema)
- @directus/sdk v19
- React 18
