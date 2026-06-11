# Phase 1 — Direction artistique → design handoff (🎨 Claude design + 👤 toi)

Le but de cette phase n'est PAS de produire du code de site : c'est de
produire un **paquet de handoff** (dossier `design_handoff_<client>/`) qui
devient la **source de vérité visuelle** pour la phase 2. Claude Code ne
prendra aucune décision esthétique : il implémente le handoff.

## Pourquoi séparer design et build

Vécu Rapidetech : la direction « CIRCUIT » (tokens, fonts, composants,
signatures visuelles) a été conçue en amont, puis la phase build n'a fait que
l'implémenter. Résultat : zéro débat esthétique pendant le code, et un site
cohérent. Quand design et code se font en même temps, on obtient du
« joli générique » et des reprises sans fin.

## 👤 Toi — préparer le brief

Donne à Claude (claude.ai, mode chat/artefacts) :

- les infos client de la phase 0 (secteur, ton, clientèle visée) ;
- 2-3 sites que le client aime / déteste (ou ton propre goût) ;
- les contraintes : logo/couleurs imposés, langue (français québécois) ;
- la liste des sections attendues (voir gabarit de prompt ci-dessous).

## 🎨 Claude design — gabarit de prompt

> Tu es directeur artistique. Conçois une direction artistique complète pour
> le site vitrine de **{{CLIENT}}** ({{SECTEUR}}, clientèle {{CIBLE}},
> région {{REGION}}). Je veux une direction AFFIRMÉE et distinctive, pas du
> SaaS générique. Livre un dossier de handoff prêt pour un développeur :
>
> 1. **README de direction** : concept nommé, intentions, ce qui est
>    interdit (ex. pas de photos banque d'images, pas d'icônes décoratives…),
>    signatures visuelles récurrentes.
> 2. **tokens.css** : palette complète en variables CSS préfixées
>    (`--xx-*`) + alias sémantiques (`--accent`, `--text-primary`,
>    `--surface-deep`…), échelle typo (display/body/mono + tailles clamp —
>    la phase build la déclinera en 3 paliers responsives, voir fiche 02),
>    espacements, durées d'animation.
> 3. **Choix de fonts auto-hébergeables** (licence libre — Fontshare,
>    Google Fonts en woff2) : display, texte, mono.
> 4. **Maquette HTML statique de chaque section** (un fichier par section,
>    CSS pur, sans framework) : header/nav, hero, bandeau défilant, services,
>    différenciateurs, témoignages, ancrage local, à propos, partenaires,
>    CTA final + formulaire de contact, footer, page service détaillée,
>    page 404.
> 5. **Notes d'animation** : quoi animer, quoi laisser statique, et le
>    comportement `prefers-reduced-motion`.
>
> Itère avec moi section par section avant de finaliser.

## 👤 Toi — valider

- [ ] Le handoff couvre TOUTES les sections (le build ne doit rien inventer)
- [ ] Les fonts sont téléchargées dans le handoff (pas de CDN)
- [ ] Le client (ou toi) a approuvé le hero + une section type — c'est là que
  les goûts s'expriment ; après, on ne revient plus en arrière
- [ ] Commit du dossier `design_handoff_<client>/` à la racine du repo

## Sortie de phase

Un dossier de handoff commité, avec README + tokens + maquettes HTML.
La phase 2 le référencera depuis CLAUDE.md comme source de vérité.
