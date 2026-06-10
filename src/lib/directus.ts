import { createDirectus, rest, readSingleton, readItems } from "@directus/sdk";

/**
 * Content model (mirror these as collections in Directus).
 * `home` is a SINGLETON (one editable record for the homepage).
 * `services` is a normal collection (repeatable cards).
 */
export interface HomeContent {
  hero_eyebrow: string;
  /** Titre legacy (une seule chaîne) — conservé pour compat, plus affiché. */
  hero_title: string;
  /** Titre display CIRCUIT, ligne par ligne (la ligne 2 = mot fantôme + scramble). */
  hero_title_line1: string;
  hero_title_ghost: string;
  /** Mots du scramble (interface "list" Directus). Le 1er = état de repos. */
  hero_scramble_words: { value: string }[];
  hero_title_line3: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_cta_href: string;
  /** ID du fichier Directus (collection directus_files), ou null. */
  hero_image: string | null;
  /** Items du marquee ✺ (interface "list"). */
  marquee_items: { value: string }[];
  differentiators_title: string;
  services_title: string;
  testimonials_title: string;
  /** Bandeau « ancrage local » (villes + avis Google). */
  local_title: string;
  about_title: string;
  partners_title: string;
  partners_intro: string;
  cta_final_title: string;
  cta_final_body: string;
  cta_final_label: string;
  cta_final_href: string;
  /** Formulaire de contact (libellés + messages d'état). */
  contact_name_label: string;
  contact_email_label: string;
  contact_phone_label: string;
  contact_message_label: string;
  contact_submit_label: string;
  contact_success_message: string;
  contact_error_message: string;
  /** Intertitre de la colonne « contact direct » (tel/courriel/heures). */
  contact_direct_title: string;
}

export interface Differentiator {
  id: string;
  title: string;
  description: string;
  sort: number;
}

export interface Testimonial {
  id: string;
  name: string;
  detail: string;
  /** Note 1-5, ou null si non renseignée. */
  rating: number | null;
  quote: string;
  sort: number;
}

export interface SiteSettings {
  company_name: string;
  phone: string;
  email: string;
  hours: string;
  city: string;
  service_area: string;
  google_reviews_url: string;
  footer_tagline: string;
  meta_title: string;
  meta_description: string;
  /** Villes desservies (interface "list") — bandeau « ancrage local ». La 1re est mise en gras. */
  cities: { value: string }[];
  /** Note Google affichée telle quelle (ex. « 5,0 »). */
  google_rating: string;
  /** Nombre d'avis Google vérifiés (null = masqué). */
  google_reviews_count: number | null;
  /** Coordonnées affichées dans la barre de statut (ex. « 45.6°N — 73.8°O »). */
  coordinates: string;
  /** Message de la barre de statut « live ». */
  status_message: string;
  /** Liens de navigation (interface "list" à 2 champs : label, href). */
  nav_links: { label: string; href: string }[];
  nav_cta_label: string;
  nav_cta_href: string;
}

export interface Partner {
  id: string;
  name: string;
  /** ID du fichier Directus (logo), ou null. */
  logo: string | null;
  url: string;
  sort: number;
}

export interface About {
  name: string;
  role: string;
  bio: string;
  photo: string | null;
  /** Tableau JSON stocké par l'interface "list" de Directus. */
  values: { value: string }[];
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string; // legacy (lucide) — plus affiché en direction CIRCUIT
  /** Slug d'URL de la page service (ex. « gestion-ti »). */
  slug: string;
  /** Corps long de la page service — paragraphes séparés par une ligne vide. */
  body: string;
  /** Bénéfices concrets (interface "list"). */
  benefits: { value: string }[];
  sort: number;
}

interface Schema {
  home: HomeContent;
  services: Service[];
  differentiators: Differentiator[];
  about: About;
  testimonials: Testimonial[];
  site_settings: SiteSettings;
  partners: Partner[];
}

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL ?? "http://localhost:8055";
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN ?? "";

const client = createDirectus<Schema>(DIRECTUS_URL).with(
  rest({
    onRequest: (options) => {
      if (DIRECTUS_TOKEN) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        };
      }
      return options;
    },
  })
);

/**
 * Pour un SINGLETON : tout champ vide (null / undefined / "") retombe sur le
 * fallback. Évite une UI cassée quand un champ existe dans Directus mais n'a
 * pas encore été rempli (le fallback global ne s'active, lui, que si toute la
 * requête échoue — Directus hors ligne). Le contenu réel saisi a priorité.
 */
function fillEmpty<T extends Record<string, unknown>>(data: T, fallback: T): T {
  const out = { ...data };
  for (const key in fallback) {
    const v = out[key];
    if (
      v === null ||
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0)
    )
      out[key] = fallback[key];
  }
  return out;
}

/** Static fallbacks: the build never fails just because Directus is down. */
const FALLBACK_HOME: HomeContent = {
  hero_eyebrow: "MSP — Rive-Nord de Montréal & Laurentides",
  hero_title: "L'infrastructure IT de vos PME, sans le casse-tête.",
  hero_title_line1: "Votre TI,",
  hero_title_ghost: "sans",
  hero_scramble_words: [
    { value: "surprise" },
    { value: "jargon" },
    { value: "stress" },
    { value: "détour" },
  ],
  hero_title_line3: "Point final.",
  hero_subtitle:
    "Gestion TI, cybersécurité et développement web pour les PME. Un seul interlocuteur, qui connaît votre infrastructure par cœur — et qui répond quand vous appelez.",
  hero_cta_label: "Parlons de votre projet",
  hero_cta_href: "#contact",
  hero_image: null,
  marquee_items: [
    { value: "Gestion TI" },
    { value: "Cybersécurité" },
    { value: "Développement web" },
    { value: "Microsoft 365" },
    { value: "Support local" },
    { value: "Sans surprise" },
  ],
  differentiators_title: "Fini les mauvaises surprises",
  services_title: "Nos services",
  testimonials_title: "Ce que nos clients disent",
  local_title: "Fièrement local — Rive-Nord & Laurentides",
  about_title: "Qui je suis",
  partners_title: "Nos partenaires",
  partners_intro:
    "On s'appuie sur des technologies éprouvées et des partenaires de confiance pour livrer un service fiable.",
  cta_final_title: "Prêt à simplifier votre informatique ?",
  cta_final_body:
    "Parlez-moi de votre situation. Sans engagement, sans jargon — juste un vrai diagnostic et des réponses claires.",
  cta_final_label: "Réservez un appel",
  cta_final_href: "/contact/",
  contact_name_label: "Votre nom",
  contact_email_label: "Courriel",
  contact_phone_label: "Téléphone (optionnel)",
  contact_message_label: "Décrivez votre situation",
  contact_submit_label: "Envoyer",
  contact_success_message:
    "Message reçu. On vous revient rapidement — promis.",
  contact_error_message:
    "L'envoi a échoué. Réessayez, ou écrivez-nous directement par courriel.",
  contact_direct_title: "Vous préférez parler à quelqu'un ?",
};

const FALLBACK_SERVICES: Service[] = [
  {
    id: "1",
    title: "Gestion TI",
    description:
      "Supervision, maintenance et support proactif de votre environnement Microsoft 365 et Windows. On voit les problèmes avant vous.",
    icon: "server",
    slug: "gestion-ti",
    body: "Votre informatique devrait travailler pour vous, pas l'inverse. On prend en charge la supervision complète de votre parc : postes, serveurs, Microsoft 365, sauvegardes. Les mises à jour se font en arrière-plan, les problèmes sont détectés avant qu'ils vous arrêtent, et quand vous appelez, c'est la même personne qui répond — quelqu'un qui connaît votre infrastructure par cœur.\n\nPas de contrat piège, pas de jargon. Un forfait clair, des rapports que vous comprenez, et la tranquillité de savoir que quelqu'un veille.",
    benefits: [
      { value: "Surveillance continue de vos postes et serveurs" },
      { value: "Mises à jour et correctifs appliqués sans vous interrompre" },
      { value: "Support direct — la même personne, qui connaît votre parc" },
      { value: "Rapports clairs, factures sans surprise" },
    ],
    sort: 1,
  },
  {
    id: "2",
    title: "Cybersécurité",
    description:
      "Durcissement, sauvegarde et réponse aux incidents pour dormir tranquille.",
    icon: "shield-check",
    slug: "cybersecurite",
    body: "Les PME sont devenues la cible préférée des attaques — pas parce qu'elles sont riches, mais parce qu'elles sont moins protégées. On durcit votre environnement (comptes, courriels, accès), on met en place des sauvegardes chiffrées testées régulièrement, et on prépare un plan simple pour que tout le monde sache quoi faire si quelque chose arrive.\n\nL'objectif n'est pas de vous vendre la peur : c'est de dormir tranquille. Des protections concrètes, expliquées en mots simples, adaptées à votre réalité et à votre budget.",
    benefits: [
      { value: "Durcissement Microsoft 365 et authentification multifacteur" },
      { value: "Sauvegardes chiffrées, testées régulièrement" },
      { value: "Sensibilisation de vos employés à l'hameçonnage" },
      { value: "Plan de réponse aux incidents, simple et connu de tous" },
    ],
    sort: 2,
  },
  {
    id: "3",
    title: "Développement web",
    description:
      "Sites performants et sur mesure, faciles à mettre à jour vous-même.",
    icon: "code",
    slug: "developpement-web",
    body: "Un site qui vous appartient, que vous pouvez mettre à jour vous-même, et qui charge vite. On construit sur mesure — pas de gabarit générique, pas d'abonnement piège qui vous tient en otage. Vous gardez le contrôle de votre contenu, de votre hébergement et de vos données.\n\nDe la vitrine simple à l'outil interne, on livre quelque chose de solide, rapide et facile à faire évoluer.",
    benefits: [
      { value: "Site sur mesure, rapide, conçu pour durer" },
      { value: "Un CMS simple pour modifier votre contenu vous-même" },
      { value: "Hébergement et données qui vous appartiennent" },
      { value: "Référencement local de base inclus" },
    ],
    sort: 3,
  },
];

const FALLBACK_DIFFERENTIATORS: Differentiator[] = [
  { id: "1", title: "Des factures honnêtes.", description: "Vous savez exactement ce que vous payez. Aucun service ajouté sans votre accord — et rien qu'on vous facture sans que ça fonctionne.", sort: 1 },
  { id: "2", title: "Toujours la même personne.", description: "Quelqu'un qui connaît votre infrastructure par cœur, pas un billet anonyme dans une file d'attente.", sort: 2 },
  { id: "3", title: "Des explications claires.", description: "On vous dit ce qu'on fait et pourquoi, en mots simples. Vous gardez le contrôle.", sort: 3 },
  { id: "4", title: "Une vraie réponse, vite.", description: "Quand quelque chose brise, vous parlez à quelqu'un, pas à un répondeur.", sort: 4 },
];

const FALLBACK_ABOUT: About = {
  name: "Alexandre Martin",
  role: "Fondateur & consultant TI",
  bio: "Passionné de technologie depuis toujours, j'ai fondé Rapidetech pour offrir aux PME de la Rive-Nord un service TI humain et sans surprise. Je gère votre infrastructure comme si c'était la mienne.",
  photo: null,
  values: [
    { value: "10+ ans d'expérience en infrastructure Microsoft" },
    { value: "Certifié sécurité et cloud" },
    { value: "Toujours joignable, toujours la même personne" },
    { value: "Basé sur la Rive-Nord, disponible dans les Laurentides" },
  ],
};

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  { id: "1", name: "Sylvie", detail: "PME à Blainville", rating: 5, quote: "Réponse rapide, toujours la même personne au bout du fil. On se sent en confiance.", sort: 1 },
  { id: "2", name: "Marc-André", detail: "Client depuis 8 ans", rating: 5, quote: "Des explications claires, jamais de jargon inutile. Mon parc informatique n'a jamais aussi bien roulé.", sort: 2 },
  { id: "3", name: "Julie", detail: "Commerce à Saint-Jérôme", rating: 5, quote: "Factures honnêtes, aucune surprise. Exactement ce qu'on cherchait pour notre PME.", sort: 3 },
];

const FALLBACK_SITE_SETTINGS: SiteSettings = {
  company_name: "Rapidetech",
  phone: "",
  email: "",
  hours: "Lun.–Ven. 8 h à 17 h",
  city: "Blainville, QC",
  service_area: "Rive-Nord & Basses-Laurentides",
  google_reviews_url: "#",
  footer_tagline:
    "Partenaire TI pour les PME de la Rive-Nord et des Laurentides.",
  meta_title: "Rapidetech — Gestion TI, cybersécurité et dev web",
  meta_description:
    "MSP pour PME sur la Rive-Nord de Montréal et dans les Laurentides.",
  cities: [
    { value: "Blainville" },
    { value: "Sainte-Thérèse" },
    { value: "Boisbriand" },
    { value: "Rosemère" },
    { value: "Lorraine" },
    { value: "Bois-des-Filion" },
    { value: "Mirabel" },
    { value: "Saint-Eustache" },
    { value: "Deux-Montagnes" },
    { value: "Terrebonne" },
    { value: "Saint-Jérôme" },
    { value: "Sainte-Anne-des-Plaines" },
  ],
  google_rating: "5,0",
  google_reviews_count: null,
  coordinates: "45.6°N — 73.8°O",
  status_message: "Tous systèmes opérationnels",
  nav_links: [
    { label: "Services", href: "#services" },
    { label: "Approche", href: "#approche" },
    { label: "À propos", href: "#a-propos" },
  ],
  nav_cta_label: "Parler à Alexandre",
  nav_cta_href: "#contact",
};

const FALLBACK_PARTNERS: Partner[] = [];

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const items = await client.request(
      readItems("testimonials", { sort: ["sort"] })
    );
    return items.length ? items : FALLBACK_TESTIMONIALS;
  } catch {
    return FALLBACK_TESTIMONIALS;
  }
}

export async function getPartners(): Promise<Partner[]> {
  try {
    const items = await client.request(
      readItems("partners", { sort: ["sort"] })
    );
    return items.length ? items : FALLBACK_PARTNERS;
  } catch {
    return FALLBACK_PARTNERS;
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    return fillEmpty(await client.request(readSingleton("site_settings")), FALLBACK_SITE_SETTINGS);
  } catch {
    return FALLBACK_SITE_SETTINGS;
  }
}

export async function getAbout(): Promise<About> {
  try {
    return fillEmpty(await client.request(readSingleton("about")), FALLBACK_ABOUT);
  } catch {
    return FALLBACK_ABOUT;
  }
}

export async function getHome(): Promise<HomeContent> {
  try {
    return fillEmpty(await client.request(readSingleton("home")), FALLBACK_HOME);
  } catch {
    return FALLBACK_HOME;
  }
}

/** Slug d'URL sûr dérivé d'un titre (accents retirés, kebab-case). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function getServices(): Promise<Service[]> {
  try {
    const items = await client.request(
      readItems("services", { sort: ["sort"] })
    );
    if (!items.length) return FALLBACK_SERVICES;
    // Défensif : tant que les champs CIRCUIT (slug, body, benefits) n'existent
    // pas dans Directus, on dérive le slug du titre et on dégrade proprement.
    return items.map((s) => ({
      ...s,
      slug: s.slug || slugify(s.title),
      body: s.body || "",
      benefits: Array.isArray(s.benefits) ? s.benefits : [],
    }));
  } catch {
    return FALLBACK_SERVICES;
  }
}

export async function getDifferentiators(): Promise<Differentiator[]> {
  try {
    const items = await client.request(
      readItems("differentiators", { sort: ["sort"] })
    );
    return items.length ? items : FALLBACK_DIFFERENTIATORS;
  } catch {
    return FALLBACK_DIFFERENTIATORS;
  }
}

/**
 * URL de l'asset Directus POUR LE BUILD (localhost, joignable au build).
 * Ne JAMAIS écrire cette URL telle quelle dans le HTML : elle doit passer par
 * le pipeline d'images d'Astro (getImage / <Image>) pour être localisée.
 */
export function assetUrl(fileId: string): string {
  const base = `${DIRECTUS_URL}/assets/${fileId}`;
  // Les assets Directus sont privés : getImage() fait un fetch DIRECT (sans
  // header d'auth), donc on passe le token en query param POUR LE BUILD.
  // L'image est rapatriée + ré-émise en local (dist/_astro/...), donc ce token
  // ne se retrouve JAMAIS dans le HTML final (qui ne contient que le chemin local).
  return DIRECTUS_TOKEN ? `${base}?access_token=${DIRECTUS_TOKEN}` : base;
}
