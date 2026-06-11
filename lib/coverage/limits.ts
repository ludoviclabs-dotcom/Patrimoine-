import type { CoverageLimit } from "@/lib/types";

export const coverageLimits: CoverageLimit[] = [
  {
    id: "coverage-ifi-main-residence",
    module: "ifi",
    label: "Résidence principale",
    status: "covered",
    explanation: "Abattement de 30 % appliqué uniquement si la résidence principale est détenue en direct.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-ifi-rental-simple",
    module: "ifi",
    label: "Immobilier locatif simple",
    status: "covered",
    explanation: "Valeur déclarée retenue avant contrôle des justificatifs.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-ifi-sci-simple",
    module: "ifi",
    label: "SCI simple",
    status: "partially_covered",
    explanation: "Valeur des parts prise en compte, répartition et dettes à vérifier.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-ifi-deductible-debt",
    module: "ifi",
    label: "Dettes immobilières simples",
    status: "partially_covered",
    explanation: "Dette déduite si elle est rattachée à un actif immobilier et justifiable.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-ifi-trusts",
    module: "ifi",
    label: "Trusts",
    status: "not_covered_v1",
    explanation: "Cas exclus du périmètre V2, revue avocat fiscaliste obligatoire.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-ifi-demembrement-complexe",
    module: "ifi",
    label: "Démembrement complexe",
    status: "not_covered_v1",
    explanation: "La V2 traite le démembrement simple, pas les chaînes complexes.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-ifi-actifs-pro-complexes",
    module: "ifi",
    label: "Actifs professionnels complexes",
    status: "not_covered_v1",
    explanation: "Exonérations et affectations professionnelles non automatisées.",
    requiredProfessional: "expert-comptable",
  },
  {
    id: "coverage-ifi-non-residents-complexes",
    module: "ifi",
    label: "Non-résidents complexes",
    status: "not_covered_v1",
    explanation: "Périmètres internationaux et conventions non couverts par le moteur démo.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-ifi-holdings",
    module: "ifi",
    label: "Holdings patrimoniales avancées",
    status: "not_covered_v1",
    explanation: "Analyse des sociétés interposées reportée après revue professionnelle.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-transmission-checklist",
    module: "transmission",
    label: "Checklist transmission familiale",
    status: "covered",
    explanation: "Questions et pièces à réunir, avec calcul indicatif non opposable.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-e-invoicing-tpe",
    module: "facturation-electronique",
    label: "Préparation TPE/PME 2026/2027",
    status: "covered",
    explanation: "Score de préparation déclaratif fondé sur réception, émission et e-reporting.",
    requiredProfessional: "expert-comptable",
  },
  {
    id: "coverage-donation-usufruit-simple",
    module: "donation",
    label: "Donation démembrée simple",
    status: "partially_covered",
    explanation: "Valorisation indicative avec âge du donateur, sans liquidation complète des droits.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-dmtg-multi-liens",
    module: "transmission",
    label: "Barème DMTG multi-liens",
    status: "partially_covered",
    explanation:
      "Ligne directe, petits-enfants, frères/sœurs, neveux/nièces et non-parents couverts ; donation entre époux (tableau II, abattement 80 724 €), handicap et représentations non automatisés.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-demembrement-ifi-968",
    module: "donation",
    label: "Démembrement et IFI art. 968",
    status: "partially_covered",
    explanation:
      "Valorisation art. 669 couverte ; à l'IFI, l'usufruitier déclare en principe la pleine propriété (art. 968), avec exceptions à qualifier par le professionnel.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-plus-value-structure",
    module: "plus-value",
    label: "Plus-value immobilière complète V2",
    status: "partially_covered",
    explanation: "Durée de détention, abattements et surtaxe couverts pour cas simple.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-sci-arbitrage",
    module: "sci",
    label: "Arbitrage SCI/direct",
    status: "partially_covered",
    explanation: "Flux et exposition visibles, fiscalité détaillée non automatisée.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-ir-pfu-cdhr-simple",
    module: "ir-pfu-cdhr",
    label: "IR/PFU/CDHR dirigeant",
    status: "partially_covered",
    explanation: "Pré-diagnostic sur revenus déclarés, PFU 30/31,4 % et CDHR à valider.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-ir-bareme-2026",
    module: "ir-bareme",
    label: "IR barème 2026 complet",
    status: "partially_covered",
    explanation:
      "Barème, quotient familial plafonné, décote, CEHR et CDHR couverts pour les cas standards ; demi-parts spéciales, revenus exceptionnels et crédits d'impôt non automatisés.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-pfu-arbitrage-2026",
    module: "pfu-arbitrage",
    label: "Arbitrage PFU vs barème",
    status: "partially_covered",
    explanation:
      "Comparaison indicative dividendes/PV mobilières ; l'option barème est globale et irrévocable pour l'année, à valider sur l'avis complet.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-pfu-assurance-vie-30",
    module: "pfu-arbitrage",
    label: "Assurance-vie maintenue à 30 %",
    status: "not_covered_v1",
    explanation:
      "Les produits d'assurance-vie restent au PFU 30 % (PS 17,2 % par dérogation LFSS 2026) : ils ne sont pas comparés par ce moteur.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-dutreil-eligibility",
    module: "dutreil",
    label: "Pacte Dutreil LF 2026",
    status: "partially_covered",
    explanation: "Contrôle d'éligibilité, abattement 75 % et exclusions, sans validation notariale.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-apport-cession-150-0-b-ter",
    module: "apport-cession",
    label: "Apport-cession 150-0 B ter",
    status: "partially_covered",
    explanation: "Réinvestissement 70 %, délai de trois ans et conservation documentés.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-holding-tax-235-ter-c",
    module: "holding-tax",
    label: "Taxe holding patrimoniale",
    status: "partially_covered",
    explanation: "Critères cumulés et assiette de biens non professionnels, cas complexes à valider.",
    requiredProfessional: "avocat",
  },
  {
    id: "coverage-documents-cabinet",
    module: "documents-cabinet",
    label: "DER, FIL, lettre de mission, rapport d'adéquation",
    status: "partially_covered",
    explanation: "Génération de modèles de travail non signés, à relire avant remise client.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-pea-withdrawal-simple",
    module: "pea",
    label: "Retrait PEA après cinq ans",
    status: "partially_covered",
    explanation:
      "Cas pédagogique limité au retrait partiel après cinq ans : l'IR est distingué des prélèvements sociaux à contrôler.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-per-deduction-simple",
    module: "per",
    label: "Déduction PER à l'entrée",
    status: "partially_covered",
    explanation:
      "Plafond disponible, reliquats et mutualisation simulés, sans liquidation complète de la déclaration fiscale.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-bank-import-demo",
    module: "bank-import",
    label: "Import bancaire simulé",
    status: "not_covered_v1",
    explanation:
      "Aucun connecteur réel : le parcours illustre consentement, SCA, normalisation et alertes avec fixtures.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-succession-simple-v24",
    module: "succession",
    label: "Succession simple et checklist notaire",
    status: "partially_covered",
    explanation:
      "La V2.4 structure actif brut, documents, notaire et paiement, sans liquider definitivement les droits.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-per-early-exit-primary-home-v24",
    module: "per-exit",
    label: "PER sortie anticipee residence principale",
    status: "partially_covered",
    explanation:
      "Le moteur separe versements et gains mais impose revue fiscale avant conclusion sur le traitement exact.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-succession-liquidity-stress-v24",
    module: "liquidity-stress",
    label: "Stress test liquidite succession",
    status: "partially_covered",
    explanation:
      "Stress test pedagogique : droits estimes et cash disponible, sans liquidation notariale ni echeancier opposable.",
    requiredProfessional: "notaire",
  },
  {
    id: "coverage-product-adequacy-demo-v24",
    module: "product-adequacy",
    label: "Adequation produit simulee",
    status: "not_covered_v1",
    explanation:
      "Aucune recommandation automatique : horizon, risque et durabilite servent seulement a declencher la revue.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-regulatory-native-v24",
    module: "cif-orias",
    label: "Qualification reglementaire native",
    status: "partially_covered",
    explanation:
      "Information, simulation et conseil personnalise sont distingues dans l'interface, mais les habilitations restent a controler.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-dora-dsp2-demo-v24",
    module: "dora",
    label: "DORA / DSP2 en simulation",
    status: "not_covered_v1",
    explanation:
      "Pas de connecteur ni d'exploitation operationnelle : les obligations sont listees comme prerequis produit.",
    requiredProfessional: "cgp",
  },
  {
    id: "coverage-cyber-storage-demo-v24",
    module: "cyber",
    label: "Cybersecurite et stockage documentaire",
    status: "not_covered_v1",
    explanation:
      "La demo n'active aucun stockage sensible reel ; la securite est presentee comme exigence de roadmap.",
    requiredProfessional: "cgp",
  },
];

export function getCoverageLimit(id: string) {
  return coverageLimits.find((limit) => limit.id === id);
}

export function getCoverageByModule(module: CoverageLimit["module"]) {
  return coverageLimits.filter((limit) => limit.module === module);
}
