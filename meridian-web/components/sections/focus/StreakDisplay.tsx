'use client';

import { motion } from 'framer-motion';
import { Trophy, Zap } from 'lucide-react';
import { itemVariants } from '@/lib/animations/variants';

export function StreakDisplay() {
  return (
    <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={18} className="text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Current Streak</span>
        </div>
        <div className="text-3xl font-bold text-primary">42 Days</div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={18} className="text-primary" />
          <span className="text-sm font-medium text-muted-foreground">XP Earned Today</span>
        </div>
        <div className="text-3xl font-bold text-primary">420 XP</div>
      </div>
    </motion.div>
  );
}
