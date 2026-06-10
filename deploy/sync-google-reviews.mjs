#!/usr/bin/env node
// Synchronise les avis Google Business → Directus (témoignages + note/compte).
// À exécuter sur la machine qui voit Directus (cron quotidien recommandé) :
//
//   GOOGLE_PLACES_API_KEY=xxx DIRECTUS_ADMIN_TOKEN=yyy node deploy/sync-google-reviews.mjs
//
// Premier lancement : sans GOOGLE_PLACE_ID, le script résout la fiche via une
// recherche texte (GOOGLE_PLACE_QUERY, défaut « Rapidetech Blainville QC »),
// AFFICHE le Place ID trouvé, puis continue. Mets-le ensuite dans le cron pour
// économiser une requête.
//
// Ce que ça fait :
//  1. interroge l'API Places (New) — note, nombre d'avis, et les ~5 avis les
//     plus pertinents (limite de l'API publique de Google) ;
//  2. upsert dans `testimonials` (dédupliqué par google_review_id — les champs
//     sont créés au besoin) ; les témoignages saisis À LA MAIN ne sont jamais
//     touchés ;
//  3. met à jour site_settings.google_rating / google_reviews_count ;
//  4. vide le cache Directus puis VÉRIFIE par un GET (pièges connus — voir
//     CLAUDE.md). La sauvegarde déclenche le Flow → le site se redéploie seul.
//
// Cron suggéré (crontab -e) :
//   15 6 * * *  cd /opt/rapidetech-site && GOOGLE_PLACES_API_KEY=... GOOGLE_PLACE_ID=... DIRECTUS_ADMIN_TOKEN=... node deploy/sync-google-reviews.mjs >> /var/log/rapidetech-reviews.log 2>&1

const GOOGLE_KEY = need("GOOGLE_PLACES_API_KEY");
const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://localhost:8055";
const ADMIN_TOKEN = need("DIRECTUS_ADMIN_TOKEN");
const PLACE_QUERY = process.env.GOOGLE_PLACE_QUERY || "Rapidetech Blainville QC";
let PLACE_ID = process.env.GOOGLE_PLACE_ID || "";

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`FATAL: variable ${name} requise`);
    process.exit(1);
  }
  return v;
}

const log = (...a) => console.log(new Date().toISOString(), ...a);

async function directus(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok)
    throw new Error(`Directus ${method} ${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : (await res.json()).data;
}

// ── 1. Champs de déduplication sur testimonials (idempotent) ──
async function ensureField(collection, field, payload) {
  try {
    await directus("GET", `/fields/${collection}/${field}`);
  } catch {
    await directus("POST", `/fields/${collection}`, payload);
    log(`+ champ ${collection}.${field} créé`);
  }
}

async function ensureFields() {
  await ensureField("testimonials", "google_review_id", {
    field: "google_review_id",
    type: "string",
    meta: {
      interface: "input",
      readonly: true,
      hidden: true,
      note: "Identifiant de l'avis Google (déduplication du sync) — ne pas éditer",
    },
    schema: {},
  });
  await ensureField("testimonials", "source", {
    field: "source",
    type: "string",
    meta: {
      interface: "input",
      readonly: true,
      note: "« google » = synchronisé automatiquement ; vide = saisi à la main",
    },
    schema: {},
  });
}

// ── 2. API Places (New) ──
async function resolvePlaceId() {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: PLACE_QUERY, languageCode: "fr" }),
  });
  if (!res.ok) throw new Error(`Places searchText → ${res.status} ${await res.text()}`);
  const { places } = await res.json();
  if (!places?.length) throw new Error(`Aucune fiche trouvée pour « ${PLACE_QUERY} »`);
  const p = places[0];
  log(`fiche trouvée : ${p.displayName?.text} — ${p.formattedAddress}`);
  log(`➜ GOOGLE_PLACE_ID=${p.id}  (à mettre dans le cron)`);
  return p.id;
}

async function fetchPlace(placeId) {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=fr`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
      },
    }
  );
  if (!res.ok) throw new Error(`Places details → ${res.status} ${await res.text()}`);
  return res.json();
}

// ── 3. Upsert ──
async function run() {
  await ensureFields();

  if (!PLACE_ID) PLACE_ID = await resolvePlaceId();
  const place = await fetchPlace(PLACE_ID);
  const reviews = place.reviews || [];
  log(`note ${place.rating} · ${place.userRatingCount} avis · ${reviews.length} avis détaillés reçus`);

  const existing = await directus(
    "GET",
    `/items/testimonials?filter[source][_eq]=google&fields=id,google_review_id,sort&limit=-1`
  );
  const byReviewId = new Map(existing.map((t) => [t.google_review_id, t]));

  const all = await directus("GET", `/items/testimonials?fields=sort&limit=-1`);
  let nextSort = Math.max(0, ...all.map((t) => t.sort || 0)) + 1;

  for (const r of reviews) {
    const reviewId = r.name; // ex. places/<id>/reviews/<id>
    const text = (r.text?.text || r.originalText?.text || "").trim();
    if (!text) continue; // note sans commentaire → rien à afficher
    const item = {
      name: r.authorAttribution?.displayName || "Client Google",
      detail: `Avis Google — ${r.relativePublishTimeDescription || ""}`.trim(),
      rating: r.rating ?? null,
      quote: text,
      source: "google",
      google_review_id: reviewId,
    };
    const found = byReviewId.get(reviewId);
    if (found) {
      await directus("PATCH", `/items/testimonials/${found.id}`, item);
      log(`~ avis mis à jour : ${item.name}`);
    } else {
      await directus("POST", `/items/testimonials`, { ...item, sort: nextSort++ });
      log(`+ avis ajouté : ${item.name}`);
    }
  }

  // Note + nombre d'avis (bandeau « ancrage local » + JSON-LD)
  const rating =
    place.rating != null ? place.rating.toFixed(1).replace(".", ",") : null;
  await directus("PATCH", `/items/site_settings`, {
    ...(rating && { google_rating: rating }),
    ...(place.userRatingCount != null && {
      google_reviews_count: place.userRatingCount,
    }),
  });
  log(`✓ site_settings mis à jour (${rating} · ${place.userRatingCount} avis)`);

  // ── 4. Cache + vérification (un 200 ne garantit rien — CLAUDE.md) ──
  await directus("POST", "/utils/cache/clear").catch(() =>
    log("⚠ flush cache KO — docker restart directus-directus-1 au besoin")
  );
  const check = await directus(
    "GET",
    "/items/site_settings?fields=google_rating,google_reviews_count"
  );
  log(
    `vérification : google_rating=${check.google_rating} google_reviews_count=${check.google_reviews_count}`
  );
  log("terminé — le Flow Directus va redéployer le site automatiquement.");
}

run().catch((err) => {
  console.error("ÉCHEC:", err.message);
  process.exit(1);
});
