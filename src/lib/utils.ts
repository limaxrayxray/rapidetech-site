import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Required by virtually every shadcn / 21st.dev component.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
