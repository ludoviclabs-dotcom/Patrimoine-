"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Transition de page (App Router remonte template.tsx à chaque navigation).
 * Fondu d'opacité UNIQUEMENT — aucun transform — pour ne pas créer de bloc
 * conteneur qui casserait la sidebar `position: fixed` de l'AppShell.
 */
export default function Template({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
