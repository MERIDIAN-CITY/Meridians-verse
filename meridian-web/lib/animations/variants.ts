import type { Variants } from 'framer-motion';

/**
 * Shared Framer Motion variant definitions.
 * These are plain objects — no hooks, no context, safe to import in any file.
 */

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

/** Fade + slide up — used in FocusSection and StreamSection */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

/** Fade + slide in from left — used in PoolSection leaderboard rows */
export const itemVariantsLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 },
  },
};

/** Standard heading reveal used across all three sections */
export const headingVariants = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
  viewport: { once: true },
} as const;
