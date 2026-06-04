import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * This is the PATTERN for every 21st.dev component you'll drop in:
 * the component owns the look + animation, but every piece of text/link is a
 * PROP fed from Directus. You never edit this file to change copy again.
 *
 * To swap in a real 21st.dev hero later:
 *   1. npx shadcn add "https://21st.dev/r/<author>/<component>"
 *   2. Replace the markup below, keep the same props interface.
 *   3. Mount it from index.astro with client:visible.
 */
export interface HeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  /** Chemin LOCAL (déjà localisé au build), ex. /_astro/hero.xxxx.webp.
      Jamais une URL Directus. undefined → hero en dégradé seul. */
  imageSrc?: string;
}

export default function Hero({ eyebrow, title, subtitle, ctaLabel, ctaHref, imageSrc }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Image de fond localisée au build (si fournie par le CMS) */}
      {imageSrc && (
        <div aria-hidden className="absolute inset-0 -z-20">
          <img src={imageSrc} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-background/60" />
        </div>
      )}
      {/* Animated gradient backdrop — cheap "sort du lot" flourish */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, hsl(var(--primary) / 0.18), transparent 70%)",
        }}
      />
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-28 text-center sm:py-36">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground"
        >
          {eyebrow}
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className={cn(
            "bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent",
            "text-4xl font-bold tracking-tight sm:text-6xl"
          )}
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          {subtitle}
        </motion.p>

        <motion.a
          href={ctaHref}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-10 inline-flex items-center rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25"
        >
          {ctaLabel}
        </motion.a>
      </div>
    </section>
  );
}
