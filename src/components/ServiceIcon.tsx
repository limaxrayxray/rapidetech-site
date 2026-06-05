import type { LucideIcon } from "lucide-react";
import {
  LifeBuoy,
  PhoneCall,
  Wifi,
  BriefcaseMedical,
  ShieldCheck,
  Globe,
  Server,
  Code,
  Cloud,
  Database,
  Lock,
  Wrench,
} from "lucide-react";

/**
 * Carte d'icônes EXPLICITE : clé (telle que saisie dans Directus, champ
 * `services.icon`) → composant lucide. On ne devine JAMAIS un composant à
 * partir du nom — toute clé inconnue retombe sur DEFAULT_ICON.
 *
 * Pour ajouter une icône : importe-la ci-dessus et ajoute la ligne ici.
 * Rendu SANS directive client:* dans le .astro → SVG statique, zéro JS.
 */
const ICONS: Record<string, LucideIcon> = {
  "life-buoy": LifeBuoy,
  "phone-call": PhoneCall,
  wifi: Wifi,
  "briefcase-medical": BriefcaseMedical,
  "shield-check": ShieldCheck,
  globe: Globe,
  server: Server,
  code: Code,
  cloud: Cloud,
  database: Database,
  lock: Lock,
};

const DEFAULT_ICON: LucideIcon = Wrench;

export interface ServiceIconProps {
  /** Clé d'icône (kebab-case lucide) venant de Directus. */
  name: string;
  className?: string;
}

export default function ServiceIcon({ name, className }: ServiceIconProps) {
  const Icon = ICONS[name] ?? DEFAULT_ICON;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75} />;
}
