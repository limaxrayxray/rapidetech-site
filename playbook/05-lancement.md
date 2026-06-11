# Phase 5 — Mise en production (👤 toi, avec Claude en copilote)

## Avant la bascule

- [ ] **Sauvegardes en place** : machine Directus (LXC complet sur PBS/etc.)
  — c'est LE point de défaillance unique du contenu
- [ ] Backup du site actuel du client (s'il y en a un — WordPress, etc.)
- [ ] Contenu relu et approuvé par le client sur dev.*
- [ ] Test courriel : lead de test reçu, pas dans l'indésirable ; SPF/DKIM du
  domaine expéditeur OK dans SMTP2GO + enregistrement **DMARC** présent
- [ ] La clé SMTP2GO en service n'a jamais transité par git (sinon : recycler)

## La bascule

1. Créer le site `<client>.ca` dans CloudPanel (SSL), avec dans le vhost :
   ```nginx
   location /api/lead {
     proxy_pass http://127.0.0.1:<LEAD_PORT>/lead;
     proxy_set_header X-Forwarded-For $remote_addr;
   }
   error_page 404 /404.html;
   ```
   ⚠️ Sans `X-Forwarded-For`, le rate-limit du relais voit tous les visiteurs
   comme 127.0.0.1 — un seul spammeur bloque les leads de tout le monde.
   `$remote_addr` (et non `$proxy_add_x_forwarded_for`) : écrase un en-tête
   forgé par le client. Le certificat doit couvrir apex ET www (le bloc www
   termine le TLS avant de rediriger).
   + redirection www → apex.
2. Pointer le DNS du client vers le VPS.
3. Dans `deploy/deploy.sh` : `VPS_WEBROOT` → webroot du nouveau site (commit).
4. Sur la machine Directus : retirer `SITE_ENV=preprod` du `.env`, puis
   `bash deploy/deploy.sh`.
5. Vérifier : robots.txt n'a PLUS `Disallow: /`, pas de meta noindex, le
   formulaire fonctionne sur le domaine final.
6. **Décider du sort de dev.*** : rediriger vers le domaine final ou fermer.
   ⚠️ S'il continue de servir le même build, il sera indexé (contenu dupliqué).

## Juste après

- [ ] Google Search Console : propriété + soumettre `sitemap-index.xml`
- [ ] Fiche Google Business : vérifier que le lien site pointe au bon endroit
- [ ] Monitoring (Uptime Kuma) : `https://<client>.ca` +
  `http://127.0.0.1:<LEAD_PORT>/healthz` (depuis le VPS) +
  `journalctl -u <client>-deploy` sans erreurs
- [ ] Demander 2-3 avis Google au client → la sync les affichera toute seule

## Dans les semaines qui suivent

- [ ] Search Console : couverture d'indexation, erreurs
- [ ] Analytics si désiré (Plausible/Umami = pas de bannière ; GA = consentement
  Loi 25 + mise à jour de la politique de confidentialité)
- [ ] Restaurer UNE FOIS la sauvegarde Directus dans un conteneur jetable —
  une sauvegarde jamais restaurée, c'est un espoir, pas une protection
  (oui, c'est la phrase du site)

## Rétro (15 min qui valent cher)

Mettre à jour CE playbook et le CLAUDE.md gabarit avec tout nouveau piège
rencontré — c'est ce qui rend la recette meilleure à chaque client.
