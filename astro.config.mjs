// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // Static output: built to ./dist and served by CloudPanel's Nginx.
  // No Node runtime needed to *serve* the site — rebuild on content change.
  output: "static",
  // Autorise Astro à RAPATRIER + optimiser les images Directus AU BUILD.
  // Le build tape Directus en localhost → les images deviennent des fichiers
  // locaux dans dist/. Aucune URL Directus/privée ne fuit dans le HTML public.
  // Si un jour le build tourne ailleurs que sur le LXC Directus, ajoute ici
  // l'hôte Tailscale correspondant.
  image: {
    domains: ["localhost"],
  },
  integrations: [
    react(),
    // /merci/ est une page de confirmation post-formulaire — rien à indexer.
    sitemap({ filter: (page) => !page.includes("/merci/") }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  site: "https://rapidetech.ca",
});
