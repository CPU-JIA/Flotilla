/**
 * Utility functions for marketing website
 *
 * NOTE: This file is intentionally separate from apps/frontend/src/lib/utils.ts
 * Each workspace (frontend/website) maintains its own utils.ts to:
 * - Keep dependencies isolated (different Tailwind configs)
 * - Allow independent evolution of each app's utilities
 * - Avoid accidental cross-contamination between app and marketing site
 *
 * ECP-A1: Separation of Concerns - frontend vs marketing site utilities
 */
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
