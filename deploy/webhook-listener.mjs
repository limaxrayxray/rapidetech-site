#!/usr/bin/env node
// Récepteur de déploiement : écoute un POST authentifié (depuis un Flow Directus)
// et lance deploy.sh. Zéro dépendance (http natif).
//
// Sécurité : lié par défaut à l'IP du bridge Docker (172.18.0.1) → joignable
// par le conteneur Directus et l'hôte, PAS depuis Internet. + secret Bearer.
//
// Robustesse :
//  - debounce : une rafale de saves Directus = UN seul build.
//  - single-flight : jamais deux deploy.sh en parallèle ; si du contenu change
//    pendant un build, on relance UNE fois à la fin.
//
// Config via variables d'environnement (voir rapidetech-deploy.service) :
//  DEPLOY_SECRET (requis), DEPLOY_BIND, DEPLOY_PORT, DEPLOY_DEBOUNCE_MS,
//  DEPLOY_CMD, DEPLOY_ARGS.
import http from "node:http";
import { spawn } from "node:child_process";

const PORT = Number(process.env.DEPLOY_PORT || 8787);
const BIND = process.env.DEPLOY_BIND || "172.18.0.1";
const SECRET = process.env.DEPLOY_SECRET || "";
const CMD = process.env.DEPLOY_CMD || "bash";
const ARGS = (process.env.DEPLOY_ARGS || "/opt/rapidetech-site/deploy/deploy.sh").split(" ");
const DEBOUNCE_MS = Number(process.env.DEPLOY_DEBOUNCE_MS || 8000);

if (!SECRET) {
  console.error("FATAL: DEPLOY_SECRET manquant");
  process.exit(1);
}

const log = (...a) => console.log(new Date().toISOString(), ...a);

let timer = null;
let running = false;
let pending = false;

function runDeploy() {
  if (running) {
    pending = true;
    log("· build déjà en cours → relance prévue à la fin");
    return;
  }
  running = true;
  log("→ déploiement lancé");
  const p = spawn(CMD, ARGS, { stdio: ["ignore", "pipe", "pipe"] });
  p.stdout.on("data", (d) => process.stdout.write(d));
  p.stderr.on("data", (d) => process.stderr.write(d));
  p.on("close", (code) => {
    running = false;
    log(`✓ déploiement terminé (exit ${code})`);
    if (pending) {
      pending = false;
      log("↻ du contenu a changé pendant le build → relance");
      schedule(0);
    }
  });
}

function schedule(delay = DEBOUNCE_MS) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    runDeploy();
  }, delay);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" }).end("ok");
    return;
  }
  if (req.method === "POST" && req.url.startsWith("/deploy")) {
    const auth = req.headers["authorization"] || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== SECRET) {
      res.writeHead(401).end("unauthorized");
      log("✗ 401 — token invalide");
      return;
    }
    req.resume(); // draine le corps
    res.writeHead(202, { "content-type": "text/plain" }).end("scheduled");
    log(`✓ trigger reçu → build planifié dans ${DEBOUNCE_MS} ms`);
    schedule();
    return;
  }
  res.writeHead(404).end("not found");
});

server.listen(PORT, BIND, () =>
  log(`récepteur de déploiement à l'écoute sur http://${BIND}:${PORT}  (cmd: ${CMD} ${ARGS.join(" ")})`)
);
