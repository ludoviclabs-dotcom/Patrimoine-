import { getV2TaxRuns } from "../v2-engines";
import { simulateAssuranceVieTransmission } from "./assurance-vie";
import { simulateDemembrement } from "./demembrement";
import { simulateExitTaxSignal } from "./exit-tax";
import { simulateIrBareme2026 } from "./ir";
import { simulateIs } from "./is";
import { simulatePfuVsBareme } from "./pfu-arbitrage";
import { simulateSciIrVsIs } from "./sci-arbitrage";
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
export {
  computeDmtg,
  computeDmtgForShare,
  getAvailableAllowance,
  DMTG_ALLOWANCES,
  DMTG_RELATIONSHIP_LABELS,
  type DmtgRelationship,
} from "./dmtg";
export { computeDemembrement, simulateDemembrement } from "./demembrement";
export {
  computeAssuranceVieTransmission,
  simulateAssuranceVieTransmission,
} from "./assurance-vie";
export { computeIs, simulateIs } from "./is";
export { computeSciIrVsIs, simulateSciIrVsIs } from "./sci-arbitrage";
export { computeExitTaxSignal, simulateExitTaxSignal } from "./exit-tax";
export {
  computePerCeiling2026,
  PASS_2025,
  PASS_2026,
  PER_SALARIE_MAX_2026,
  PER_TNS_MAX_2026,
} from "./per";

/** Runs v3 exécutés avec leurs hypothèses par défaut (catalogue + rapport). */
export function getV3TaxRuns(): TaxRun[] {
  return [
    simulateIrBareme2026(),
    simulatePfuVsBareme(),
    simulateDemembrement(),
    simulateAssuranceVieTransmission(),
    simulateIs(),
    simulateSciIrVsIs(),
    simulateExitTaxSignal(),
  ];
}

/** Ensemble des runs démo : moteurs v2 historiques + moteurs v3. */
export function getAllTaxRuns(): TaxRun[] {
  return [...getV2TaxRuns(), ...getV3TaxRuns()];
}
