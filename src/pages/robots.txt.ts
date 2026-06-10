import type { APIRoute } from "astro";

// robots.txt généré au BUILD selon l'environnement :
// - SITE_ENV=preprod (dans le .env de la machine de build) → tout bloqué,
//   pour que dev.galx.ca ne soit JAMAIS indexé avant le lancement.
// - sinon (prod) → tout permis + sitemap.
// Le jour du lancement : retirer SITE_ENV=preprod du .env, rebuilder. C'est tout.
export const GET: APIRoute = ({ site }) => {
  const preprod = import.meta.env.SITE_ENV === "preprod";
  const body = preprod
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site)}\n`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
