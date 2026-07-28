import { motion, useReducedMotion } from "motion/react";

export function PageShell({ children }: { children: React.ReactNode }) {
  const systemReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={systemReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.995 }}
      animate={{ opacity: 1, y: 0 }}
      transition={systemReducedMotion ? { duration: 0.01 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5"
    >
      {children}
    </motion.div>
  );
}
