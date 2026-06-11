import { demoHousehold } from "../demo-data/household";
import { calculateIfi } from "../simulations/ifi";
import {
  simulateDutreilV2,
  simulateHoldingTaxV2,
  simulateIrPfuCdhr,
  simulatePerDeductionV2,
} from "../tax/v2-engines";
import type { FiscalAlert } from "../types";

/**
 * Alertes fiscales chiffrées — dérivées des RUNS moteurs, jamais de textes
 * statiques : chaque montant est une sortie de calcul traçable
 * (computedFromRunId). Remplace les alertes éditoriales du tableau de bord.
 */

export function getFiscalAlerts(): FiscalAlert[] {
  const alerts: FiscalAlert[] = [];

  // IFI : écart entre la base nette et le seuil de 1,3 M€.
  const ifiRun = calculateIfi(demoHousehold);
  const ifiBase = ifiRun.result.taxableBase ?? 0;
  const ifiGap = Math.abs(ifiRun.result.threshold - ifiBase);
  alerts.push({
    id: "alert-ifi-seuil",
    title: ifiRun.result.triggered ? "IFI : seuil dépassé" : "IFI : marge avant le seuil",
    severity: ifiRun.result.triggered ? "warning" : "info",
    amount: ifiRun.result.triggered ? (ifiRun.result.netIfi ?? 0) : ifiGap,
    threshold: ifiRun.result.threshold,
    computedFromRunId: ifiRun.id,
    explanation: ifiRun.result.triggered
      ? `Base nette ${ifiBase.toLocaleString("fr-FR")} € au-dessus du seuil : IFI net indicatif chiffré.`
      : `Base nette ${ifiBase.toLocaleString("fr-FR")} € : ${ifiGap.toLocaleString("fr-FR")} € de marge avant le seuil de 1,3 M€.`,
    nextAction: "Contrôler valorisations immobilières, dettes déductibles et parts de SCI.",
  });

  // CDHR : distance au seuil de RFR (couple : 500 k€) ou contribution due.
  const cdhrRun = simulateIrPfuCdhr();
  const rfr = Number(cdhrRun.computedResult?.rfr ?? 0);
  const cdhr = Number(cdhrRun.computedResult?.cdhr ?? 0);
  alerts.push({
    id: "alert-cdhr",
    title: cdhr > 0 ? "CDHR due : imposition minimale 20 %" : "CDHR : distance au seuil",
    severity: cdhr > 0 ? "critical" : "info",
    amount: cdhr > 0 ? cdhr : Math.max(0, 500_000 - rfr),
    threshold: 500_000,
    computedFromRunId: cdhrRun.id,
    explanation:
      cdhr > 0
        ? `RFR ${rfr.toLocaleString("fr-FR")} € : contribution différentielle estimée par le moteur.`
        : `RFR ${rfr.toLocaleString("fr-FR")} € : ${Math.max(0, 500_000 - rfr).toLocaleString("fr-FR")} € sous le seuil CDHR du foyer.`,
    nextAction: "Valider le RFR exact et les impôts déjà acquittés avec l'avocat fiscaliste.",
  });

  // PER : plafond disponible non consommé.
  const perRun = simulatePerDeductionV2();
  const unusedPerCeiling =
    Number(perRun.computedResult?.availableCeiling ?? 0) -
    Number(perRun.computedResult?.deductionUsed ?? 0);
  alerts.push({
    id: "alert-per-plafond",
    title: "PER : plafond de déduction inutilisé",
    severity: unusedPerCeiling > 0 ? "warning" : "info",
    amount: unusedPerCeiling,
    computedFromRunId: perRun.id,
    explanation: `${unusedPerCeiling.toLocaleString("fr-FR")} € de plafond disponible non consommé cette année (report 5 ans).`,
    nextAction: "Arbitrer un versement complémentaire avant le 31/12 avec le client.",
  });

  // Dutreil : économie en jeu si les engagements sont documentés.
  const dutreilRun = simulateDutreilV2();
  alerts.push({
    id: "alert-dutreil-engagements",
    title: "Dutreil : économie conditionnée aux engagements",
    severity: "warning",
    amount: Number(dutreilRun.computedResult?.dutreilSavings ?? 0),
    computedFromRunId: dutreilRun.id,
    explanation:
      "Économie indicative du pacte (vs donation sans pacte) suspendue à l'engagement collectif, la fonction de direction et l'engagement individuel de 6 ans.",
    nextAction: "Suivre le calendrier des attestations annuelles avec le notaire.",
  });

  // Taxe holding : éligibilité détectée par le moteur.
  const holdingRun = simulateHoldingTaxV2();
  const holdingTax = Number(holdingRun.computedResult?.holdingTax ?? 0);
  if (holdingRun.computedResult?.conditionsMet) {
    alerts.push({
      id: "alert-holding-tax",
      title: "Taxe holding : critères cumulés réunis",
      severity: "critical",
      amount: holdingTax,
      computedFromRunId: holdingRun.id,
      explanation:
        "Les quatre critères de l'art. 235 ter C sont réunis sur les hypothèses du dossier : taxe indicative chiffrée, première campagne au printemps 2027.",
      nextAction: "Qualifier l'inventaire d'actifs non professionnels avec l'avocat fiscaliste.",
    });
  }

  return alerts;
}
