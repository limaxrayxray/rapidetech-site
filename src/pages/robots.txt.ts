import type { APIRoute } from "astro";

// robots.txt généré au BUILD selon l'environnement :
// - SITE_ENV=preprod (dans le .env de la machine de build) → tout bloqué,
//   pour que dev.galx.ca ne soit JAMAIS indexé avant le lancement.
// - sinon (prod) → tout permis + sitemap, avec autorisation EXPLICITE des
//   crawlers IA (GEO : ChatGPT search lit l'index Bing, Claude/Perplexity
//   crawlent directement). Un « Allow » explicite par bot évite qu'un futur
//   resserrement du bloc « * » ne les exclue par accident.
// Le jour du lancement : retirer SITE_ENV=preprod du .env, rebuilder. C'est tout.

/** Crawlers IA / moteurs qu'on veut voir citer le site (GEO). */
const AI_BOTS = [
  "GPTBot", // OpenAI — entraînement + navigation ChatGPT
  "OAI-SearchBot", // OpenAI — index de ChatGPT search
  "ClaudeBot", // Anthropic
  "PerplexityBot", // Perplexity
  "Bingbot", // Bing — alimente aussi ChatGPT search
];

export const GET: APIRoute = ({ site }) => {
  const preprod = import.meta.env.SITE_ENV === "preprod";
  const body = preprod
    ? "User-agent: *\nDisallow: /\n"
    : [
        "User-agent: *",
        "Allow: /",
        "",
        ...AI_BOTS.flatMap((bot) => [`User-agent: ${bot}`, "Allow: /", ""]),
        `Sitemap: ${new URL("sitemap-index.xml", site)}`,
        "",
      ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
