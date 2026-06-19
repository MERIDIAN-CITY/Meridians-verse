'use client';

import { motion } from 'framer-motion';
import { containerVariants } from '@/lib/animations/variants';
import { PetProgression } from './focus/PetProgression';
import { TimerSelector } from './focus/TimerSelector';
import { StreakDisplay } from './focus/StreakDisplay';
import { SuperchargeTiers } from './focus/SuperchargeTiers';

export function FocusSection() {
  return (
    <section id="focus" className="py-20 px-4 max-w-7xl mx-auto">
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">Focus Pillar</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Nurture your productivity companion while earning rewards for staying focused.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left — pet, timer, streaks */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-8"
        >
          <PetProgression />
          <TimerSelector />
          <StreakDisplay />
        </motion.div>

        {/* Right — supercharge tiers */}
        <SuperchargeTiers />
      </div>
    </section>
  );
}
