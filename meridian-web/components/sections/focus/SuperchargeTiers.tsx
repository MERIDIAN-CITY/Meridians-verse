'use client';

import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/lib/animations/variants';

interface Tier {
  tier: string;
  multiplier: string;
  color: string;
  features: string[];
}

const tiers: Tier[] = [
  {
    tier: 'Bronze',
    multiplier: '1.0x',
    color: '#CD7F32',
    features: ['Pet evolution', 'Basic streaks', '10 min sessions'],
  },
  {
    tier: 'Silver',
    multiplier: '1.5x',
    color: '#C0C0C0',
    features: ['All Bronze features', '2x XP rewards', '25 min sessions', 'Custom pets'],
  },
  {
    tier: 'Gold',
    multiplier: '2.0x',
    color: '#FFD700',
    features: ['All Silver features', '3x XP rewards', '45 min sessions', 'Exclusive shop access'],
  },
];

export function SuperchargeTiers() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="space-y-4"
    >
      <h3 className="text-2xl font-bold text-foreground mb-6">Supercharge Your Focus</h3>

      {tiers.map((tier) => (
        <motion.div
          key={tier.tier}
          variants={itemVariants}
          className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-bold text-foreground text-lg">{tier.tier} Tier</h4>
              <p className="text-sm text-muted-foreground">{tier.multiplier} XP Multiplier</p>
            </div>
            <div
              className="w-8 h-8 rounded-full"
              style={{ backgroundColor: tier.color, opacity: 0.2 }}
            />
          </div>
          <ul className="space-y-2">
            {tier.features.map((feature) => (
              <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </motion.div>
  );
}
