import { getV2TaxRuns } from "../v2-engines";
import { simulateIrBareme2026 } from "./ir";
import { simulatePfuVsBareme } from "./pfu-arbitrage";
import type { TaxRun } from "../../types";

export {
  computeIrBareme2026,
  computeCdhr,
  simulateIrBareme2026,
  IR_BRACKETS_2026,
  FAMILY_QUOTIENT_CAP_PER_HALF_PART,
} from "./ir";
export {
  computePvImmo,
  simulatePvImmoV3,
  calculateRealEstateHoldingAllowances,
  calculateHighRealEstateGainSurtax,
} from "./pv-immo";
export {
  computePfuVsBareme,
  simulatePfuVsBareme,
  PFU_TOTAL_RATE_2026,
  PFU_SOCIAL_RATE_2026,
} from "./pfu-arbitrage";

/** Runs v3 exécutés avec leurs hypothèses par défaut (catalogue + rapport). */
export function getV3TaxRuns(): TaxRun[] {
  return [simulateIrBareme2026(), simulatePfuVsBareme()];
}

/** Ensemble des runs démo : moteurs v2 historiques + moteurs v3. */
export function getAllTaxRuns(): TaxRun[] {
  return [...getV2TaxRuns(), ...getV3TaxRuns()];
}
