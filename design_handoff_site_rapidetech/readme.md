# Rapidetech Design System

Système de design officiel de **Rapidetech** — MSP québécois (gestion TI, cybersécurité, développement web) au service des PME de la Rive-Nord de Montréal et des Laurentides.

**Direction artistique : CIRCUIT** — dark industriel, vert électrique roi, typographie display géante, langage « salle de serveurs » assumé. Choisie par le client après exploration de 3 directions (voir `directions.html` pour l'historique, `Circuit v2.html` pour le hero de référence approuvé).

## Contexte & sources

- **Entreprise** : Rapidetech, dirigée par Alexandre. Marque humaine, fiable, « sans surprise », ancrée localement (Blainville, QC — 45.6°N, 73.8°O).
- **Services** : 01 Gestion TI (supervision Microsoft 365 / Windows) · 02 Cybersécurité (durcissement, sauvegarde, incidents) · 03 Développement web (sites sur mesure).
- **Sources fournies** :
  - Codebase `rapidetech-site/` (Astro 5 + Directus + Tailwind/shadcn, montée en lecture seule via File System Access) — utilisée **uniquement pour le contenu et la structure** (hero, services, différenciateurs, témoignages, à propos d'Alexandre, partenaires, CTA contact). Le style du repo est un squelette par défaut, volontairement jeté.
  - Logo : `uploads/Rapidetech logo.png` (copié vers `assets/rapidetech-logo.png`) — source de la palette vert électrique `#6BC31A` sur charbon.

## Fondamentaux de contenu (COPY)

- **Langue** : français québécois. Anglicismes techniques tolérés s'ils sont d'usage (« IT » devient « TI », mais « MSP » reste).
- **Ton** : direct, humain, anti-jargon. On parle comme un voisin compétent, pas comme un vendeur SaaS.
- **Vous/on** : le client est vouvoyé (« votre infrastructure »), Rapidetech dit « on » (« On voit les problèmes avant vous »).
- **Promesses concrètes, jamais de superlatifs creux** : « sans surprise », « un seul interlocuteur », « des factures honnêtes », « qui répond quand vous appelez », « pour dormir tranquille », « sans abonnement piège ».
- **Casse** : les titres display sont en MAJUSCULES. Étiquettes mono en MAJUSCULES avec tracking large. Corps de texte en casse normale.
- **Ponctuation signature** : tirets cadratins ( — ), slashs d'étiquette (`/ 01`, `// SERVICES`), points de suite terminal (`.........`).
- **Emoji** : jamais. Le seul glyphe décoratif autorisé est ✺ (séparateur de marquee).
- **Mention humaine** : Alexandre est nommé (« Parler à Alexandre ») — la marque est incarnée, pas anonyme.

## Fondations visuelles

- **Couleurs** : charbon profond (#0A0A0A page, #060606 deep, #161616 cartes) + vert logo #6BC31A en accent unique. Off-white chaud #EDEDE8 pour le texte. Statuts : vert OK / ambre #E8B931 / rouge #E84A31. JAMAIS d'autres teintes, jamais de dégradés violets.
- **Typographie** : Clash Display 600 (display, UPPERCASE, leading 0.96, tracking -0.02em) + General Sans (texte courant — même fonderie) + Space Mono (étiquettes, données, statuts seulement). Trois familles, chacune un rôle strict.
- **Espacement** : échelle 4→120 px ; gouttière de page 48 px ; sections 90/110 px verticales.
- **Coins** : VIFS partout (radius 0). Exception unique : dots de statut (cercles).
- **Ombres** : aucune. La profondeur vient des bordures hairline (#1E1E1C) et des aplats.
- **Fonds** : noir mat + textures signature — grain animé (opacité 0.05), grille 80 px révélée au curseur (mask radial), spotlight vert qui suit le pointeur.
- **Cartes** : fond #161616, bordure hairline, coins vifs, pas d'ombre.
- **Survol** : inversion franche — fill vert qui monte (scaleY, ease-in-out 0.35s), texte qui passe au noir, flèche qui pivote à -45°. Nav : couleur grise → ink.
- **Pression** : vert assombri (--rt-green-dim), pas de scale.
- **Animation** : mécanique et franche — reveals masqués (translateY 110% → 0, ease-out-expo 0.9s), compteurs, scramble de caractères, marquee linéaire. Boucles (grain, pulse, marquee, scramble) coupées sous `prefers-reduced-motion` ; les reveals d'entrée deviennent des fondus d'opacité.
- **Transparence/flou** : pas de glassmorphism. Transparence réservée aux teintes vertes (ghost 0.35, tint 0.07).
- **Imagerie** : pas de photos pour l'instant (à fournir par le client). Si ajoutées : traitement froid, contrasté, éventuellement duotone noir/vert.
- **Signature** : barre de statut « live » (dot pulsant, horloge, ping, coordonnées) — l'ADN MSP de la marque.

## Iconographie

- **Pas d'icônes pictogrammes** dans la direction CIRCUIT : le système s'appuie sur la typographie (numéros `/ 01`, flèches →, ✺) plutôt que sur un set d'icônes.
- Flèche → (U+2192) = seul indicateur d'action. Pivot -45° au survol.
- Carré plein vert (10×10) = puce de marque (logo, titres de section).
- Si un vrai besoin d'icônes émerge : utiliser un set linéaire mono-weight 1.5px à coins droits (ex. Lucide en CDN) et le documenter ici. Ne jamais dessiner d'icônes à la main.
- **Logo** : `assets/rapidetech-logo.png`. En contexte UI, le wordmark est recomposé en Clash Display 600 + carré vert (composant `Logo`).

## Polices — distribution

- **Clash Display** — binaires locaux : `assets/fonts/ClashDisplay-{Regular,Medium,Semibold,Bold}.woff` (licence ITF FFL gratuite), déclarés en `@font-face` dans `tokens/fonts.css`.
- **General Sans** — binaires locaux : `assets/fonts/GeneralSans-{Regular,Italic,Medium,Semibold}.woff2` (même fonderie, même licence), déclarés en `@font-face` dans `tokens/fonts.css`.
- **Space Mono** — Google Fonts CDN (seule dépendance distante restante).

## Index du projet

| Chemin | Contenu |
|---|---|
| `styles.css` | Point d'entrée CSS global (@imports uniquement) |
| `tokens/` | `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css` |
| `components/core/` | `Logo`, `Button`, `Tag`, `Eyebrow`, `SectionHeader`, `StatusBar` |
| `components/content/` | `ServiceRow`, `Marquee`, `TestimonialCard` |
| `components/forms/` | `Input` |
| `guidelines/` | 12 cartes de fondations (couleurs, type, spacing, motifs, motion, voix, logo) |
| `assets/` | `rapidetech-logo.png` |
| `Circuit v2.html` | Hero + services de référence (direction approuvée, animée) |
| `directions.html` | Archive — les 3 directions explorées |
| `SKILL.md` | Manifeste Agent Skill pour Claude Code |

Composants exposés sous `window.RapidetechDesignSystem_5b84d1` ; chaque composant a son `.prompt.md` (usage + exemple JSX).

## Caveats / à faire

- **Pas encore de UI kit complet** (page entière avec témoignages, section Alexandre, partenaires, CTA contact) — le hero + services de `Circuit v2.html` servent de référence en attendant.
- Clash Display et General Sans auto-hébergées ; Space Mono encore en CDN (Google Fonts) — fournir les .woff2 pour auto-hébergement complet si requis.
- Bandeau « ancrage local » (villes desservies + note Google) inspiré de solutionsm.ca — valider la liste des villes et le nombre d'avis réels.
- Aucune photo/illustration de marque fournie — à téléverser pour compléter l'imagerie.
