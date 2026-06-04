import { createDirectus, rest, readSingleton, readItems } from "@directus/sdk";

/**
 * Content model (mirror these as collections in Directus).
 * `home` is a SINGLETON (one editable record for the homepage).
 * `services` is a normal collection (repeatable cards).
 */
export interface HomeContent {
  hero_eyebrow: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_cta_href: string;
  /** ID du fichier Directus (collection directus_files), ou null. */
  hero_image: string | null;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name, e.g. "shield-check"
  sort: number;
}

interface Schema {
  home: HomeContent;
  services: Service[];
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

/** Static fallbacks: the build never fails just because Directus is down. */
const FALLBACK_HOME: HomeContent = {
  hero_eyebrow: "MSP • Cybersécurité • Dev web",
  hero_title: "L'infrastructure IT de vos PME, sans le casse-tête.",
  hero_subtitle:
    "Rapidetech gère, sécurise et modernise votre parc informatique sur la Rive-Nord et dans les Laurentides.",
  hero_cta_label: "Parlons de votre projet",
  hero_cta_href: "#contact",
  hero_image: null,
};

const FALLBACK_SERVICES: Service[] = [
  { id: "1", title: "Gestion TI", description: "Supervision, maintenance et support proactif de votre environnement Microsoft 365 et Windows.", icon: "server", sort: 1 },
  { id: "2", title: "Cybersécurité", description: "Durcissement, sauvegarde et réponse aux incidents pour dormir tranquille.", icon: "shield-check", sort: 2 },
  { id: "3", title: "Développement web", description: "Sites performants et sur mesure, faciles à mettre à jour vous-même.", icon: "code", sort: 3 },
];

export async function getHome(): Promise<HomeContent> {
  try {
    return await client.request(readSingleton("home"));
  } catch {
    return FALLBACK_HOME;
  }
}

export async function getServices(): Promise<Service[]> {
  try {
    const items = await client.request(
      readItems("services", { sort: ["sort"] })
    );
    return items.length ? items : FALLBACK_SERVICES;
  } catch {
    return FALLBACK_SERVICES;
  }
}

/**
 * URL de l'asset Directus POUR LE BUILD (localhost, joignable au build).
 * Ne JAMAIS écrire cette URL telle quelle dans le HTML : elle doit passer par
 * le pipeline d'images d'Astro (getImage / <Image>) pour être localisée.
 */
export function assetUrl(fileId: string): string {
  return `${DIRECTUS_URL}/assets/${fileId}`;
}
