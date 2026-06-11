# Phase 4 — Contenu, SEO, légal (🤖 rédaction + 👤 relecture)

## Contenu

1. 🤖 Claude Code rédige un **premier jet complet** (québécois, ton direct,
   pas de jargon) à DEUX endroits :
   - dans les `FALLBACK_*` de `src/lib/directus.ts` (filet de sécurité) ;
   - dans un script `deploy/fill-<collection>-content.mjs` (modèle dans le
     repo de référence) : **idempotent, ne remplit QUE les champs vides** —
     relançable sans jamais écraser ce que le client a saisi.
2. 👤 Tu lances le script sur la machine Directus, puis tu relis TOUT dans
   l'admin Directus et tu corriges là (jamais dans le code) : chaque
   sauvegarde redéploie. Vérifie en particulier que le texte ne promet rien
   que le client n'offre pas.

## SEO (🤖 — déjà dans le gabarit de build, à vérifier)

- [ ] `SITE_ENV=preprod` dans le `.env` de build ⇒ robots.txt `Disallow: /` +
  meta noindex partout (le site dev ne doit JAMAIS être indexé)
- [ ] sitemap (`@astrojs/sitemap`) excluant `/merci/` et `/404`
- [ ] canonical + Open Graph (`public/og.png` 1200×630 aux couleurs du
  design) + favicon.svg
- [ ] JSON-LD `ProfessionalService` sur l'accueil — `AggregateRating`
  SEULEMENT si le nombre d'avis Google est renseigné
- [ ] vraies pages `/services/<slug>/` (l'overlay de l'accueil ne compte pas
  pour Google)

## Page 404

- 🤖 `src/pages/404.astro` (noindex, hors sitemap), contenu via
  `site_settings` (`notfound_*`).
- 👤 Nginx ne la sert pas tout seul : CloudPanel → Vhost Editor →
  `error_page 404 /404.html;` — tester avec une URL bidon.

## Loi 25 (politique de confidentialité)

- 🤖 Singleton Directus `privacy` (`title`, `updated`, `body` avec la
  convention `## intertitre` / `- puce`) + page `/confidentialite/` + lien
  footer. Texte standard : responsable des renseignements personnels,
  ce qui est collecté (formulaire + IP), finalités, fournisseurs tiers
  (hébergeur, courriel — mention du stockage possible hors Québec),
  conservation, droits, incident, mises à jour.
- 👤 Adapter : nom du responsable + courriel. ⚠️ Si tu ajoutes des analytics
  plus tard, la mention « aucun témoin de suivi » doit changer. Un client
  avec des exigences particulières ⇒ validation juridique humaine.

## Sortie de phase

Contenu réel relu dans Directus, SEO vérifié sur dev.*, politique en ligne,
404 servie par Nginx. Prêt pour la fiche 05.
