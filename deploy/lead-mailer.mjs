#!/usr/bin/env node
// Relais formulaire → courriel (tourne sur le VPS, derrière Nginx).
// Reçoit POST /lead (JSON via fetch, ou form-encoded sans JS) et envoie un
// courriel via l'API HTTP de SMTP2GO (compte existant, expéditeur déjà
// vérifié — plus simple et plus robuste que SMTP brut, zéro dépendance npm).
//
// Solidité :
//  - honeypot « entreprise » : rempli = bot → on répond succès sans envoyer ;
//  - Turnstile (si TURNSTILE_SECRET est défini) : le jeton « cf-turnstile-response »
//    est vérifié via siteverify ; TURNSTILE_HOSTNAMES restreint aux hostnames
//    autorisés (le root seulement — un jeton résolu sur un autre host est rejeté).
//    Si siteverify est injoignable, on laisse passer (fail-open) pour ne pas
//    perdre de vrais leads sur une panne Cloudflare.
//  - validation des champs + limite de taille de corps (32 Ko) ;
//  - rate-limit en mémoire : 5 envois / heure / IP ;
//  - 3 tentatives d'envoi (backoff 2 s/4 s) ; si tout échoue, le lead est
//    APPENDÉ dans LEAD_LOG (JSONL) → jamais perdu, et on répond quand même 200.
//  - chaque lead accepté est aussi journalisé dans LEAD_LOG (trace locale).
//
// Nginx (vhost CloudPanel, dans le server {}) :
//   location /api/lead { proxy_pass http://127.0.0.1:8788/lead; }
//
// Config : /etc/rapidetech-leads.env (voir leads.env.example).
import http from "node:http";
import { appendFile } from "node:fs/promises";

const PORT = Number(process.env.LEAD_PORT || 8788);
const BIND = process.env.LEAD_BIND || "127.0.0.1";
const SMTP2GO_API_KEY = process.env.SMTP2GO_API_KEY || "";
const TO = process.env.LEAD_TO || "";
const FROM = process.env.LEAD_FROM || "";
const FROM_NAME = process.env.LEAD_FROM_NAME || "Site Rapidetech";
const LOG = process.env.LEAD_LOG || "/var/log/rapidetech-leads.jsonl";
const REDIRECT = process.env.LEAD_REDIRECT || "/merci/";
const MAX_BODY = 32 * 1024;
const RATE_MAX = 5; // envois / fenêtre / IP
const RATE_WINDOW_MS = 60 * 60 * 1000;
// Anti-spam Cloudflare Turnstile (optionnel — vide = désactivé, comportement
// identique à avant). TURNSTILE_HOSTNAMES : liste séparée par virgules des
// hostnames où le défi doit avoir été résolu (ex.: rapidetech.ca,www.rapidetech.ca).
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || "";
const TURNSTILE_HOSTNAMES = (process.env.TURNSTILE_HOSTNAMES || "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

if (!SMTP2GO_API_KEY || !TO || !FROM) {
  console.error("FATAL: SMTP2GO_API_KEY, LEAD_TO et LEAD_FROM sont requis");
  process.exit(1);
}

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ── Rate-limit naïf en mémoire (suffisant pour un site vitrine) ──
const hits = new Map(); // ip → timestamps[]
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) return true;
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // garde-fou mémoire
  return false;
}

function parseBody(raw, contentType) {
  if (contentType.includes("application/json")) return JSON.parse(raw);
  // formulaire classique (sans JS)
  return Object.fromEntries(new URLSearchParams(raw));
}

function validate(d) {
  const nom = String(d.nom || "").trim();
  const courriel = String(d.courriel || "").trim();
  const telephone = String(d.telephone || "").trim();
  const message = String(d.message || "").trim();
  if (nom.length < 2 || nom.length > 120) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(courriel) || courriel.length > 200)
    return null;
  if (message.length < 10 || message.length > 5000) return null;
  if (telephone.length > 40) return null;
  return { nom, courriel, telephone, message };
}

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Vérifie le jeton Turnstile. Retourne "ok", "fail" (jeton absent/invalide ou
// résolu sur un hostname non autorisé) ou "error" (siteverify injoignable —
// l'appelant décide ; ici on fail-open pour ne pas perdre de leads légitimes).
async function verifyTurnstile(token, ip) {
  if (!token) return "fail";
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET,
          response: String(token),
          remoteip: ip,
        }),
      }
    );
    const body = await res.json();
    if (!body.success) {
      log("· turnstile refusé:", JSON.stringify(body["error-codes"] || []));
      return "fail";
    }
    const host = String(body.hostname || "").toLowerCase();
    if (TURNSTILE_HOSTNAMES.length && !TURNSTILE_HOSTNAMES.includes(host)) {
      log(`· turnstile résolu sur hostname non autorisé: ${host}`);
      return "fail";
    }
    return "ok";
  } catch (err) {
    log("⚠ siteverify injoignable:", err.message);
    return "error";
  }
}

async function sendEmail(lead, ip) {
  const payload = {
    sender: `${FROM_NAME} <${FROM}>`,
    to: [TO],
    subject: `Nouveau lead — ${lead.nom}`,
    custom_headers: [
      { header: "Reply-To", value: `${lead.nom} <${lead.courriel}>` },
    ],
    text_body: `Nouveau message du site

Nom : ${lead.nom}
Courriel : ${lead.courriel}
Téléphone : ${lead.telephone || "—"}

${lead.message}

—
IP : ${ip} · ${new Date().toISOString()}`,
    html_body: `<h2>Nouveau message du site</h2>
<p><b>Nom :</b> ${esc(lead.nom)}<br>
<b>Courriel :</b> ${esc(lead.courriel)}<br>
<b>Téléphone :</b> ${esc(lead.telephone) || "—"}</p>
<p><b>Message :</b></p>
<p>${esc(lead.message).replace(/\n/g, "<br>")}</p>
<hr><p style="color:#888;font-size:12px">IP : ${esc(ip)} · ${new Date().toISOString()}</p>`,
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.smtp2go.com/v3/email/send", {
        method: "POST",
        headers: {
          "X-Smtp2go-Api-Key": SMTP2GO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      // SMTP2GO confirme par data.succeeded ≥ 1 (un 200 seul ne suffit pas).
      if (res.ok && body?.data?.succeeded >= 1) return true;
      log(
        `✗ SMTP2GO ${res.status} (tentative ${attempt})`,
        JSON.stringify(body?.data ?? body)
      );
    } catch (err) {
      log(`✗ SMTP2GO injoignable (tentative ${attempt}):`, err.message);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  return false;
}

async function journal(entry) {
  try {
    await appendFile(LOG, JSON.stringify(entry) + "\n");
  } catch (err) {
    log("✗ écriture LEAD_LOG impossible:", err.message);
  }
}

function respond(res, req, status, jsonBody) {
  const wantsJson = (req.headers["accept"] || "").includes("application/json");
  if (wantsJson) {
    res
      .writeHead(status, { "content-type": "application/json" })
      .end(JSON.stringify(jsonBody));
  } else {
    // Soumission sans JS → redirection vers la page de remerciement (ou erreur).
    if (status < 400) {
      res.writeHead(303, { location: REDIRECT }).end();
    } else {
      res
        .writeHead(status, { "content-type": "text/plain; charset=utf-8" })
        .end("Échec de l'envoi. Revenez en arrière et réessayez.");
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" }).end("ok");
    return;
  }
  if (req.method !== "POST" || !req.url.startsWith("/lead")) {
    res.writeHead(404).end("not found");
    return;
  }

  const ip =
    String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() || req.socket.remoteAddress;

  let raw = "";
  let tooBig = false;
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > MAX_BODY) {
      tooBig = true;
      req.destroy();
    }
  });
  req.on("end", async () => {
    if (tooBig) return;
    try {
      const data = parseBody(raw, String(req.headers["content-type"] || ""));

      // Honeypot : un bot l'a rempli → on fait semblant que tout va bien.
      if (String(data.entreprise || "").trim() !== "") {
        log(`· honeypot déclenché (${ip}) — ignoré`);
        respond(res, req, 200, { ok: true });
        return;
      }
      if (rateLimited(ip)) {
        log(`✗ rate-limit (${ip})`);
        respond(res, req, 429, { ok: false, error: "rate_limited" });
        return;
      }
      const lead = validate(data);
      if (!lead) {
        respond(res, req, 400, { ok: false, error: "invalid" });
        return;
      }

      if (TURNSTILE_SECRET) {
        const verdict = await verifyTurnstile(data["cf-turnstile-response"], ip);
        if (verdict === "fail") {
          log(`✗ turnstile invalide (${ip}) — rejeté`);
          respond(res, req, 403, { ok: false, error: "turnstile" });
          return;
        }
        // "error" (siteverify down) → fail-open : le lead continue.
      }

      const sent = await sendEmail(lead, ip);
      await journal({ ts: new Date().toISOString(), ip, sent, ...lead });
      if (sent) {
        log(`✓ lead envoyé — ${lead.nom} <${lead.courriel}>`);
        respond(res, req, 200, { ok: true });
      } else {
        // Courriel KO mais lead journalisé sur disque → on accepte quand même
        // (le visiteur n'a pas à payer pour une panne SMTP).
        log(`⚠ lead JOURNALISÉ SEULEMENT (SMTP2GO KO) — ${lead.courriel}`);
        respond(res, req, 200, { ok: true });
      }
    } catch (err) {
      log("✗ requête invalide:", err.message);
      respond(res, req, 400, { ok: false, error: "bad_request" });
    }
  });
});

server.listen(PORT, BIND, () =>
  log(
    `relais leads à l'écoute sur http://${BIND}:${PORT} → ${TO}`,
    TURNSTILE_SECRET
      ? `· turnstile ACTIF (hostnames: ${TURNSTILE_HOSTNAMES.join(", ") || "tous"})`
      : "· turnstile inactif"
  )
);
