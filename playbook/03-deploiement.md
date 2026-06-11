# Phase 3 — Plomberie de déploiement (🤖 scripts, 👤 exécution infra)

Quatre briques, toutes déjà écrites dans le repo de référence
(`deploy/`) — Claude Code les adapte, toi tu branches ce qui demande des
accès. Ordre conseillé : A → B → C → D.

## A. Déploiement manuel (`deploy/deploy.sh`)

🤖 Adapter les constantes : `REPO_DIR`, `VPS_SSH`, `VPS_WEBROOT`, `SSH_KEY`.

Pièges déjà réglés dans le script de référence — ne pas les réintroduire :
- le script se **ré-exécute après `git pull`** (bash lit les scripts au fil de
  l'eau : sans ça, un deploy qui se met à jour lui-même exécute un mélange
  ancien/nouveau code) ;
- rsync avec `--no-perms --no-owner --no-group --omit-dir-times` (webroot
  CloudPanel appartient à un autre user) ;
- commiter les scripts avec le bit exécutable
  (`git update-index --chmod=+x`).

👤 Premier run : `bash deploy/deploy.sh` depuis la machine Directus, vérifier
le site sur dev.*.

## B. Auto-déploiement (Directus → site)

En Directus 11, les webhooks = **Flows**, et l'op « Run Script » est
sandboxée (pas de shell). Architecture de référence :

1. 🤖 `deploy/webhook-listener.mjs` + unit systemd : écoute sur l'IP du
   bridge Docker (ex. `172.18.0.1:8787`, joignable par le conteneur, PAS par
   Internet), auth Bearer, debounce 8 s + single-flight, lance deploy.sh.
2. 👤 Installer le unit (root sur la machine Directus), créer le secret dans
   `/etc/<client>-deploy.env` (jamais dans le repo).
3. 👤 Créer le **Flow Directus** : trigger event create/update/delete sur les
   collections de contenu → opération *request* POST
   `http://172.18.0.1:8787/deploy`, header `Authorization: Bearer <secret>`.
4. ✅ Test : modifier un champ dans Directus → le site se redéploie seul
   (`journalctl -u <client>-deploy -f`).

## C. Formulaire de contact → courriel (`deploy/lead-mailer.mjs`)

Relais Node zéro dépendance sur le VPS web : honeypot, rate-limit 5/h/IP,
3 tentatives SMTP2GO (succès = `data.succeeded ≥ 1`, pas juste le 200),
journal JSONL de secours → un lead n'est JAMAIS perdu. Sans JS : 303 → /merci/.

**Deux modes selon ton accès au VPS :**

| | root disponible | PAS de root (CloudPanel, vécu) |
|---|---|---|
| process | systemd (`<client>-leads.service`) | crontab user : watchdog `@reboot` + `*/5min` (pgrep) |
| config | `/etc/<client>-leads.env` | `~/<client>-leads.env` (chmod 600) |
| node | paquet système | binaire officiel nodejs.org dans `~/.local/node` |
| logs | journalctl | `~/lead-mailer.log` + JSONL dans le HOME |

👤 Étapes (mode sans root) :
1. Installer Node user-space : tarball nodejs.org → `~/.local/node` (symlink).
2. `cp leads.env.example ~/<client>-leads.env`, chmod 600, remplir la clé
   SMTP2GO (⚠️ jamais dans le repo — même un instant : l'historique git
   n'oublie pas ; si ça arrive, révoquer la clé).
3. crontab + premier run du watchdog, `curl http://127.0.0.1:<port>/healthz` → `ok`.
4. CloudPanel → Vhost Editor :
   `location /api/lead { proxy_pass http://127.0.0.1:<port>/lead; }`
   ⚠️ Si `EADDRINUSE` ou `connection reset` : le port par défaut (8788) est
   peut-être déjà pris par un service invisible d'un autre user → change
   `LEAD_PORT` ET le vhost (vécu : 8791).
5. ✅ Test de bout en bout : formulaire sur dev.* → courriel reçu (vérifier
   aussi le dossier indésirable).

## D. Note Google → Directus (`deploy/sync-google-reviews.mjs`)

Par défaut le script ne synchronise QUE la note + le nombre d'avis
(bandeau « 4,9 ★ — N avis » + JSON-LD AggregateRating). Les témoignages
affichés se saisissent à la main dans Directus : l'API publique est limitée
à ~5 avis « pertinents », alors que le client peut piocher dans TOUS ses
avis — rotation plus riche. `GOOGLE_IMPORT_REVIEWS=1` réactive l'import
auto des ~5 avis (dédupliqué, ne touche jamais les témoignages manuels).

🤖 Adapter `GOOGLE_PLACE_QUERY` (« <Client> <Ville> QC »).

👤 Étapes :
1. Clé API dans le `.env` de la machine Directus (le script lit
   l'environnement — le sourcer avant : `set -a; source .env; set +a`).
2. Premier run manuel : il résout et AFFICHE le Place ID → vérifier que c'est
   la bonne fiche → figer `GOOGLE_PLACE_ID=` dans `.env`.
   - Si la recherche texte ne trouve rien alors que Maps oui : prendre l'URL
     Maps de la fiche, le couple hex `0x...:0x...` du paramètre `data=` se
     convertit en Place ID (Claude sait le faire — donne-lui l'URL).
   - Restriction IP de la clé = IP publique de la machine **Directus**.
3. Cron quotidien (root, machine Directus) :
   ```
   15 6 * * * cd /opt/<client>-site && set -a && . ./.env && set +a && node deploy/sync-google-reviews.mjs >> /var/log/<client>-reviews.log 2>&1
   ```

Le script met à jour note + nombre d'avis (affichés + JSON-LD) ; en mode
import (`GOOGLE_IMPORT_REVIEWS=1`) il déduplique par `google_review_id` et ne
touche jamais aux témoignages manuels.

## Sortie de phase

Sauvegarder dans Directus redéploie le site ; le formulaire livre un courriel ;
les avis Google rentrent seuls. Tout survit à un reboot des deux machines.
