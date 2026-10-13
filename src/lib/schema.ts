/** @id stable de l'entreprise dans le JSON-LD (SchemaOrg.astro) — les blocs
 *  Service des pages services y renvoient via `provider`. */
export function businessId(site: URL): string {
  return new URL("/#entreprise", site).href;
}
