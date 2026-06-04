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

## Ajouter un composant 21st.dev
1. `npx shadcn add "https://21st.dev/r/<auteur>/<composant>"` → atterrit dans `src/components/ui/` (voir `components.json`).
2. Refactore-le pour que **tout le contenu soit en props** (jamais de texte en dur). Voir `src/components/Hero.tsx` comme patron de référence.
3. Ajoute les champs correspondants dans la collection Directus appropriée.
4. Monte-le depuis un `.astro` avec la bonne directive `client:*`.

## Modèle de contenu Directus (à créer)
- **`home`** (singleton) : `hero_eyebrow`, `hero_title`, `hero_subtitle`, `hero_cta_label`, `hero_cta_href`.
- **`services`** (collection) : `title`, `description`, `icon` (nom d'icône lucide), `sort`.
- Crée un token statique **lecture seule** pour le build, mets-le dans `.env` (`DIRECTUS_TOKEN`).
- Étends le modèle au besoin (réalisations, témoignages, FAQ, etc.) — toujours : champ Directus → prop → composant.

## Commandes
- `npm run dev` — dev local.
- `npm run build` — build statique vers `dist/`.
- `npm run preview` — sert le build localement.

## Déploiement (voir README.md)
Site statique servi par Nginx via CloudPanel. Rebuild déclenché par webhook Directus → script `deploy.sh`.
