import { useEffect, useRef, useState } from "react";

/**
 * Hero CIRCUIT — île React (la seule partie du hero qui exige du JS :
 * scramble de caractères, horloge live, ping, CTA magnétique).
 * Les reveals d'entrée sont en CSS pur (html.js + body.loaded, voir
 * global.css + Base.astro) : ils jouent même avant l'hydratation.
 * Tout le texte vient de Directus via props — jamais de copy en dur ici.
 */
export interface HeroProps {
  eyebrow: string;
  /** Ligne 1 du titre display (ex. « Votre TI, »). */
  titleLine1: string;
  /** Mot fantôme (contour) de la ligne 2 (ex. « sans »). */
  titleGhost: string;
  /** Mots qui défilent en scramble après le mot fantôme. Le 1er est l'état de repos. */
  scrambleWords: string[];
  /** Ligne 3 du titre (ex. « Point final. »). */
  titleLine3: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  /** Barre de statut « live » (ADN MSP). */
  statusMessage: string;
  coordinates: string;
  city: string;
}

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#█";

type ScrambleCell = { char: string; noise: boolean };

function useScramble(words: string[]) {
  const resting = (words[0] ?? "").toUpperCase();
  const [cells, setCells] = useState<ScrambleCell[]>(() =>
    resting.split("").map((char) => ({ char, noise: false }))
  );
  const raf = useRef(0);

  useEffect(() => {
    if (words.length < 2) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let current = resting;
    let wi = 0;

    const scrambleTo = (word: string) => {
      const from = current;
      const len = Math.max(from.length, word.length);
      const queue = Array.from({ length: len }, (_, i) => ({
        from: from[i] ?? "",
        to: word[i] ?? "",
        start: Math.floor(Math.random() * 25),
        end: Math.floor(Math.random() * 25) + 18,
      }));
      current = word;
      let frame = 0;
      const update = () => {
        let done = 0;
        const out: ScrambleCell[] = [];
        for (const q of queue) {
          if (frame >= q.end) {
            done++;
            if (q.to) out.push({ char: q.to, noise: false });
          } else if (frame >= q.start) {
            out.push({
              char: SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)],
              noise: true,
            });
          } else if (q.from) {
            out.push({ char: q.from, noise: false });
          }
        }
        setCells(out);
        if (done < queue.length) {
          frame++;
          raf.current = requestAnimationFrame(update);
        }
      };
      update();
    };

    const id = setInterval(() => {
      wi = (wi + 1) % words.length;
      scrambleTo(words[wi].toUpperCase());
    }, 3200);

    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.join("|")]);

  return cells;
}

function useClock() {
  const [time, setTime] = useState("--:--:--");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("fr-CA", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function usePing() {
  const [ping, setPing] = useState(12);
  useEffect(() => {
    const id = setInterval(
      () => setPing(8 + Math.floor(Math.random() * 14)),
      2400
    );
    return () => clearInterval(id);
  }, []);
  return ping;
}

export default function Hero({
  eyebrow,
  titleLine1,
  titleGhost,
  scrambleWords,
  titleLine3,
  subtitle,
  ctaLabel,
  ctaHref,
  statusMessage,
  coordinates,
  city,
}: HeroProps) {
  const cells = useScramble(scrambleWords);
  const time = useClock();
  const ping = usePing();
  const ctaRef = useRef<HTMLAnchorElement>(null);

  // CTA magnétique — suit légèrement le pointeur (coupé sous reduced-motion).
  useEffect(() => {
    const cta = ctaRef.current;
    if (!cta) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = cta.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      cta.style.transform = `translate(${dx * 0.18}px, ${dy * 0.3}px)`;
    };
    const leave = () => {
      cta.style.transform = "";
    };
    cta.addEventListener("pointermove", move);
    cta.addEventListener("pointerleave", leave);
    return () => {
      cta.removeEventListener("pointermove", move);
      cta.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <header className="rt-hero">
      <div className="rt-hero-grid" aria-hidden="true" />

      <p className="rt-hero-eyebrow">
        <span>{eyebrow}</span>
      </p>

      <h1 className="rt-h1">
        <span className="rt-line">
          <span>{titleLine1}</span>
        </span>
        <span className="rt-line">
          <span>
            <span className="rt-ghost">{titleGhost}</span>{" "}
            <span className="rt-scramble">
              {cells.map((c, i) =>
                c.noise ? (
                  <span key={i} className="rt-scramble-noise">
                    {c.char}
                  </span>
                ) : (
                  c.char
                )
              )}
            </span>
          </span>
        </span>
        <span className="rt-line">
          <span>{titleLine3}</span>
        </span>
      </h1>

      <div className="rt-hero-foot">
        <p className="rt-hero-sub">{subtitle}</p>
        <a href={ctaHref} className="rt-hero-cta" ref={ctaRef}>
          {ctaLabel} <span className="rt-arr">→</span>
        </a>
      </div>

      <div className="rt-status" aria-hidden="true">
        <span className="rt-status-item">
          <span className="rt-dot" />
          <span className="rt-status-ok">{statusMessage}</span>
        </span>
        <span className="rt-status-item">{time}</span>
        <span className="rt-status-item">PING {ping} MS</span>
        <span className="rt-status-right">
          {coordinates && <span className="rt-status-item">{coordinates}</span>}
          {city && <span className="rt-status-item">EST. {city}</span>}
        </span>
      </div>
    </header>
  );
}
