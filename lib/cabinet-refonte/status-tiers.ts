import type { CabinetStatus } from "./v2-6";

/**
 * Couche de présentation des statuts — 3 niveaux publics.
 *
 * Le vocabulaire détaillé à 10 statuts (cabinetStatuses/statusDictionary)
 * reste la source de vérité de la couche preuves et des tests : ce module
 * n'est qu'un mapping d'AFFICHAGE pour les surfaces guidées (accueil Simuler,
 * cartes de recommandation, labo progressif), afin de réduire le bruit visuel
 * sans rien perdre de la granularité interne.
 *
 * Record exhaustif : ajouter un statut au vocabulaire casse la compilation
 * tant qu'il n'est pas mappé vers un niveau d'affichage.
 */

export type DisplayTier = "Indicatif" | "Revue requise" | "Bloquant";

const tierByStatus: Record<CabinetStatus, DisplayTier> = {
  Brouillon: "Indicatif",
  "Donnée simulée": "Indicatif",
  "À renseigner": "Revue requise",
  "À documenter": "Revue requise",
  "À vérifier": "Revue requise",
  "Simulation indicative": "Indicatif",
  "Revue requise": "Revue requise",
  "Validé cabinet": "Indicatif",
  Bloqué: "Bloquant",
  "Hors couverture": "Bloquant",
};

export function getDisplayTier(status: CabinetStatus): DisplayTier {
  return tierByStatus[status];
}

export const tierTone: Record<DisplayTier, "teal" | "warning" | "danger"> = {
  Indicatif: "teal",
  "Revue requise": "warning",
  Bloquant: "danger",
};
