/**
 * Convention de texte long saisie dans Directus (privacy.body, guides.body) :
 * blocs séparés par une ligne vide ; « ## Titre » = intertitre ; bloc dont
 * chaque ligne commence par « - » = liste à puces ; sinon paragraphe.
 */
export type Block =
  | { kind: "h2"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "p"; text: string };

export function parseBlocks(body: string | null | undefined): Block[] {
  return (body || "")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b): Block => {
      if (b.startsWith("## ")) return { kind: "h2", text: b.slice(3).trim() };
      const lines = b.split("\n").map((l) => l.trim());
      if (lines.every((l) => l.startsWith("- ")))
        return { kind: "ul", items: lines.map((l) => l.slice(2).trim()) };
      return { kind: "p", text: lines.join(" ") };
    });
}
