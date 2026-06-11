# Phase 2 — Build du site (🤖 Claude Code, 👤 toi pour les tokens Directus)

Claude Code implémente le site complet à partir du design handoff. Toi, tu
n'interviens que pour créer les tokens Directus et valider le rendu.

## 👤 Toi — avant de lancer Claude Code

1. Copie `playbook/templates/CLAUDE.md` → `CLAUDE.md` à la racine du repo et
   remplis les placeholders de la section « Projet » (client, domaine, chemins).
2. Crée dans Directus (Settings → Users) un user **build** avec un **token
   statique**, et une policy **« Build — lecture seule »** (note son nom exact
   dans CLAUDE.md — les scripts la retrouvent par nom).
3. Sur la machine Directus : clone le repo dans `/opt/<client>-site`, crée
   `.env` :
   ```
   DIRECTUS_URL=http://localhost:8055
   DIRECTUS_TOKEN=<token build lecture seule>
   DIRECTUS_ADMIN_TOKEN=<token admin — pour les scripts de setup/sync>
   SITE_ENV=preprod
   ```

## 🤖 Claude Code — gabarit de prompt initial

> Lis CLAUDE.md puis construis le site vitrine de {{CLIENT}} :
>
> 1. **Scaffold** : Astro 5 statique + Tailwind v4 (`@tailwindcss/vite`,
>    pas de tailwind.config.js) + `@astrojs/react` pour les seuls îlots
>    interactifs + `@directus/sdk`. Alias `@/* → src/*`.
> 2. **Implémente le design handoff** `design_handoff_{{CLIENT}}/` à la
>    lettre : tokens dans `src/styles/global.css`, fonts copiées dans
>    `public/fonts/`, chaque maquette devient un composant `.astro` pur ;
>    seules les sections réellement animées/interactives deviennent des îlots
>    React (`client:idle`/`client:visible`).
> 3. **Modèle de contenu Directus** : conçois les collections (singletons
>    `home`, `site_settings`, `about`, `privacy` ; collections `services`,
>    `differentiators`, `testimonials`, `partners`), écris
>    `deploy/directus-setup.sh` (idempotent, API REST, token admin) qui crée
>    collections, champs ET les permissions read de la policy de build.
>    Repars du script du repo de référence — il contient déjà les pièges
>    réglés (UUID, display_template, cache, permissions).
> 4. **Getters avec fallbacks** : `src/lib/directus.ts` — chaque getter a un
>    `FALLBACK_*` complet (le build ne casse JAMAIS si Directus est down) et
>    les singletons passent par `fillEmpty()` champ par champ.
> 5. **Images localisées au build** : pipeline `astro:assets` + `assetUrl()`
>    avec token en query (jamais d'URL Directus dans le HTML final).
> 6. **Pages** : accueil, `/services/<slug>/` (vraies pages indexables) + le
>    même contenu en overlay `<dialog>` sur l'accueil (pushState, fermeture
>    Esc/clic dehors/back), `/confidentialite/`, `/merci/`, 404.
> 7. Vérifie le résultat avec un build local et navigateur headless avant de
>    me dire que c'est fini.

## Règles non négociables (déjà dans le CLAUDE.md gabarit)

- Aucun texte/lien/image en dur dans les composants : tout vient de Directus
  via props, sinon expose un champ.
- Un composant n'est un îlot React QUE s'il est interactif. Sinon `.astro`.
- Tout nouveau champ de singleton ⇒ valeur dans le `FALLBACK_*`.
- Toute nouvelle collection lue au build ⇒ permission read sur la policy de
  build (sinon : « texte OK, images absentes » ou fallback silencieux).
- Formulaires : `data-astro-reload` + listener submit en phase CAPTURE
  (sinon le ClientRouter d'Astro intercepte le submit).

## 👤 Toi — boucle de validation

- [ ] `bash deploy/directus-setup.sh` (token admin) sur la machine Directus
- [ ] `npm run build && npm run preview` — comparer au handoff, section par section
- [ ] Créer 2-3 items réels dans Directus (un service, un témoignage) et
  vérifier qu'ils apparaissent au build suivant
- [ ] Tester sans JavaScript (les overlays dégradent en navigation normale)

## Sortie de phase

Le site se builde en local avec contenu Directus + fallbacks, fidèle au
handoff. Rien n'est encore déployé automatiquement — c'est la phase 3.
