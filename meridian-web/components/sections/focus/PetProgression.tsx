'use client';

import { motion } from 'framer-motion';
import { itemVariants } from '@/lib/animations/variants';

export function PetProgression() {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-card border border-border rounded-2xl p-8 text-center"
    >
      <div className="text-6xl mb-4">🥚 → 🐣 → 🦆 → 🦢 → 👑</div>
      <p className="text-muted-foreground">Your pet evolves as you stay focused</p>
    </motion.div>
  );
}
