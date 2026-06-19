'use client';

import { motion } from 'framer-motion';
import { itemVariants } from '@/lib/animations/variants';

export function PoolStats() {
  return (
    <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 pt-4">
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground mb-2">Total Pool Value</p>
        <p className="text-2xl font-bold text-primary">$5.2M</p>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground mb-2">Weekly APY</p>
        <p className="text-2xl font-bold text-primary">24%</p>
      </div>
    </motion.div>
  );
}
