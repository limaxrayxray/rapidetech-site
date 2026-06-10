#!/usr/bin/env node
// Remplit le contenu détaillé (slug, body, benefits — et description si vide)
// des services dans Directus. IDEMPOTENT et NON DESTRUCTIF : ne touche QUE les
// champs vides — tout ce qui a déjà été saisi dans l'admin est conservé.
//
// À exécuter sur la machine qui voit Directus :
//   cd /opt/rapidetech-site
//   set -a; source .env; set +a       # DIRECTUS_ADMIN_TOKEN requis
//   node deploy/fill-services-content.mjs
//
// La correspondance se fait par slug (ou slug dérivé du titre si le champ est
// vide — même règle que le front). Les services sans contenu prévu ici sont
// listés en fin d'exécution. Chaque PATCH est suivi d'un GET de vérification
// (piège connu — voir CLAUDE.md), puis le cache Directus est vidé.

const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://localhost:8055";
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.error("FATAL: variable DIRECTUS_ADMIN_TOKEN requise");
  process.exit(1);
}

const log = (...a) => console.log(new Date().toISOString(), ...a);

// Même règle que slugify() de src/lib/directus.ts.
const slugify = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

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

// ── Contenu rédigé (québécois, ton direct — voir FALLBACK_SERVICES) ──
const CONTENT = {
  "maintenance-support": {
    description:
      "Supervision et support proactif de votre parc informatique. On voit les problèmes avant vous.",
    body: "Votre informatique devrait travailler pour vous, pas l'inverse. On prend en charge la supervision complète de votre parc : postes, serveurs, Microsoft 365, imprimantes. Les mises à jour se font en arrière-plan, les problèmes sont détectés avant qu'ils vous arrêtent, et quand vous appelez, c'est la même personne qui répond — quelqu'un qui connaît votre infrastructure par cœur.\n\nPas de contrat piège, pas de jargon. Un forfait clair, des rapports que vous comprenez, et la tranquillité de savoir que quelqu'un veille.",
    benefits: [
      { value: "Surveillance continue de vos postes et serveurs" },
      { value: "Mises à jour et correctifs appliqués sans vous interrompre" },
      { value: "Support direct — la même personne, qui connaît votre parc" },
      { value: "Rapports clairs, factures sans surprise" },
    ],
  },
  "telephonie-ip": {
    description:
      "Un système téléphonique moderne qui vous suit partout — au bureau, à la maison, sur la route.",
    body: "Les lignes traditionnelles coûtent cher et vous attachent à un bureau. La téléphonie IP, c'est votre numéro d'entreprise qui vous suit partout : au poste, sur le cellulaire, en télétravail. Vous gardez vos numéros actuels, et vos clients ne voient aucune différence — sauf que vous répondez plus vite.\n\nOn s'occupe de tout : choix du fournisseur, installation, menus d'accueil, boîtes vocales, formation de votre équipe. Le jour du basculement, ça fonctionne, point.",
    benefits: [
      { value: "Vos appels au bureau, à la maison ou sur le cellulaire" },
      { value: "Conservation de vos numéros actuels" },
      { value: "Menus d'accueil, boîtes vocales et files d'attente configurés" },
      { value: "Facture mensuelle réduite face aux lignes traditionnelles" },
    ],
  },
  "infrastructure-wi-fi": {
    description:
      "Un réseau d'entreprise solide et un Wi-Fi qui couvre partout, sans zones mortes.",
    body: "Un Wi-Fi qui décroche dans la salle de conférence ou un réseau qui ralentit tout le monde, ça coûte plus cher qu'on pense. On conçoit et on installe votre réseau avec de l'équipement professionnel : câblage, commutateurs, bornes Wi-Fi placées là où ça compte, couverture mesurée — pas devinée.\n\nVos invités naviguent sur un réseau séparé, vos données d'entreprise restent isolées, et tout est supervisé à distance. Le réseau est pensé pour suivre la croissance de votre entreprise, pas pour être refait dans deux ans.",
    benefits: [
      { value: "Couverture Wi-Fi complète, mesurée sur place" },
      { value: "Réseau invité séparé de vos données d'entreprise" },
      { value: "Équipement professionnel, supervisé à distance" },
      { value: "Conçu pour évoluer avec votre entreprise" },
    ],
  },
  "sauvegarde-recuperation": {
    description:
      "Des sauvegardes testées et un plan de reprise clair. Parce que la question n'est pas si, mais quand.",
    body: "Panne de disque, vol, dégât d'eau, rançongiciel : la question n'est pas si ça va arriver, mais quand. On met en place des sauvegardes automatiques, chiffrées et conservées hors site — et surtout, on les teste régulièrement. Une sauvegarde jamais restaurée, c'est un espoir, pas une protection.\n\nVous savez d'avance combien de temps il faut pour repartir et qui fait quoi. Le jour où ça compte, pas de panique : un plan, des copies saines, et votre entreprise qui redémarre.",
    benefits: [
      { value: "Sauvegardes automatiques, chiffrées et hors site" },
      { value: "Tests de restauration réguliers — des preuves, pas des espoirs" },
      { value: "Reprise rapide après panne, vol ou rançongiciel" },
      { value: "Plan de récupération documenté et connu de tous" },
    ],
  },
  "cybersecurite-anti-fraude": {
    description:
      "Des protections concrètes contre les attaques et les fraudes, expliquées en mots simples.",
    body: "Les PME sont devenues la cible préférée des attaques — pas parce qu'elles sont riches, mais parce qu'elles sont moins protégées. On durcit votre environnement : comptes, courriels, accès, authentification multifacteur, filtrage de l'hameçonnage. Et on prépare votre équipe aux fraudes qui font le plus de dégâts ici : faux fournisseurs, fausses factures, fraude du président.\n\nL'objectif n'est pas de vous vendre la peur : c'est de dormir tranquille. Des protections concrètes, expliquées en mots simples, adaptées à votre réalité et à votre budget.",
    benefits: [
      { value: "Durcissement Microsoft 365 et authentification multifacteur" },
      { value: "Filtrage des courriels frauduleux et de l'hameçonnage" },
      { value: "Sensibilisation de vos employés aux fraudes courantes" },
      { value: "Plan de réponse aux incidents, simple et connu de tous" },
    ],
  },
  "web-hebergement": {
    description:
      "Sites rapides et sur mesure, hébergement géré — et tout vous appartient.",
    body: "Un site qui vous appartient, que vous pouvez mettre à jour vous-même, et qui charge vite. On construit sur mesure — pas de gabarit générique, pas d'abonnement piège qui vous tient en otage. Vous gardez le contrôle de votre contenu, de votre hébergement et de vos données.\n\nL'hébergement est géré de bout en bout : certificats, sauvegardes, mises à jour, courriels professionnels. Vous vous occupez de votre entreprise, le site suit.",
    benefits: [
      { value: "Site sur mesure, rapide, conçu pour durer" },
      { value: "Un CMS simple pour modifier votre contenu vous-même" },
      { value: "Hébergement géré : certificats, sauvegardes, mises à jour" },
      { value: "Référencement local de base inclus" },
    ],
  },
};

const isEmpty = (v) =>
  v == null || (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.length === 0);

async function run() {
  const services = await directus(
    "GET",
    "/items/services?fields=id,title,slug,description,body,benefits&limit=-1"
  );
  log(`${services.length} service(s) dans Directus`);

  const unmatched = [];
  for (const s of services) {
    const slug = (s.slug || "").trim() || slugify(s.title || "");
    const content = CONTENT[slug];
    if (!content) {
      unmatched.push(`${s.title} (${slug})`);
      continue;
    }

    const patch = {};
    if (isEmpty(s.slug)) patch.slug = slug; // fige l'URL (sinon dérivée du titre)
    if (isEmpty(s.body)) patch.body = content.body;
    if (isEmpty(s.benefits) || !Array.isArray(s.benefits))
      patch.benefits = content.benefits;
    if (isEmpty(s.description)) patch.description = content.description;

    if (Object.keys(patch).length === 0) {
      log(`· ${s.title} — déjà rempli, rien à faire`);
      continue;
    }

    await directus("PATCH", `/items/services/${s.id}`, patch);
    // Un 200 ne garantit pas la persistance — on confirme par un GET.
    const check = await directus(
      "GET",
      `/items/services/${s.id}?fields=slug,body,benefits,description`
    );
    const ok = Object.keys(patch).every((k) => !isEmpty(check[k]));
    if (!ok) throw new Error(`la vérification post-PATCH a échoué pour « ${s.title} »`);
    log(`✓ ${s.title} — champs remplis : ${Object.keys(patch).join(", ")}`);
  }

  if (unmatched.length)
    log(`⚠ sans contenu prévu (slug inconnu) : ${unmatched.join(" · ")}`);

  await directus("POST", "/utils/cache/clear").catch((e) =>
    log("⚠ cache non vidé :", e.message)
  );
  log("terminé — le Flow va redéployer le site avec le nouveau contenu");
}

run().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
