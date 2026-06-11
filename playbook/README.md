# Playbook — Site vitrine PME (Astro + Directus)

Recette réutilisable pour livrer un site vitrine performant à un client PME,
basée sur le projet Rapidetech (juin 2026). Copie ce dossier `playbook/` à la
racine d'un nouveau repo GitHub et suis les fiches dans l'ordre.

## Le résultat livré

- Site **statique Astro 5** (performances maximales, ~zéro JS), design sur
  mesure, hébergé sur un VPS CloudPanel (Nginx).
- **Directus** (CMS headless self-hosted) : le client édite 100 % du contenu
  sans toucher au code ; chaque sauvegarde **redéploie le site
  automatiquement** (Flow → webhook → build → rsync).
- Formulaire de contact → courriel (relais Node + SMTP2GO, leads jamais
  perdus), avis Google synchronisés chaque nuit, SEO complet (sitemap, OG,
  JSON-LD), politique de confidentialité Loi 25, page 404.

## Les trois rôles

| Rôle | Outil | Responsabilités |
|---|---|---|
| **👤 Toi** | navigateur, SSH | comptes, accès, infra (Directus, VPS), validations, contenu final, mise en prod |
| **🎨 Claude design** | claude.ai (chat/artefacts) | direction artistique → **design handoff** (tokens, composants, readme) |
| **🤖 Claude Code** | terminal / web | tout le code : site, scripts Directus, plomberie de déploiement, contenu provisoire |

Règle d'or : **Claude Code ne devine jamais l'infra** — toi tu fournis les
accès et tu exécutes ce qui demande root/admin ; lui prépare des scripts
idempotents que tu lances.

## Les phases (dans l'ordre)

| # | Fiche | Qui | Durée typique |
|---|---|---|---|
| 0 | [00-prerequis.md](00-prerequis.md) — comptes, accès, infos client | 👤 | 1-2 h (+ délais d'ouverture de comptes) |
| 1 | [01-design.md](01-design.md) — direction artistique → design handoff | 🎨 + 👤 | 1-2 jours (itérations) |
| 2 | [02-build.md](02-build.md) — le site : code + modèle de contenu | 🤖 | 1-2 jours |
| 3 | [03-deploiement.md](03-deploiement.md) — plomberie : auto-deploy, formulaire, avis | 🤖 + 👤 | ½-1 jour |
| 4 | [04-contenu-seo-legal.md](04-contenu-seo-legal.md) — contenu, SEO, Loi 25, 404 | 🤖 + 👤 | ½ jour |
| 5 | [05-lancement.md](05-lancement.md) — bascule prod + post-lancement | 👤 | ½ jour |

## Démarrage d'un nouveau projet

1. Crée le repo GitHub `<client>-site`, copie-y ce dossier `playbook/`.
2. Copie [templates/CLAUDE.md](templates/CLAUDE.md) à la racine du repo et
   remplace les `{{PLACEHOLDERS}}` au fur et à mesure des phases — c'est le
   fichier que Claude Code lit à chaque session ; il accumule les décisions
   et les pièges du projet. **Tiens-le à jour, c'est lui la mémoire.**
3. Suis la fiche 00.

## Référence vivante

Le repo `rapidetech-site` est l'implémentation de référence : quand une fiche
dit « réutilise le script X », pars de sa version là-bas (`deploy/*.mjs`,
`deploy/*.sh`, `src/lib/directus.ts`). Ne réinvente pas — adapte.
