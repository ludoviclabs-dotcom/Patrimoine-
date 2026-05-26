export type EInvoicingReadinessItem = {
  id: string;
  label: string;
  deadline: string;
  status: "ready" | "partial" | "missing";
};

export const eInvoicingReadiness: EInvoicingReadinessItem[] = [
  {
    id: "receive-2026",
    label: "Capacité à recevoir des factures électroniques",
    deadline: "1er septembre 2026",
    status: "partial",
  },
  {
    id: "emit-2027",
    label: "Capacité PME/micro à émettre des factures électroniques",
    deadline: "1er septembre 2027",
    status: "missing",
  },
  {
    id: "platform",
    label: "Choix d’une plateforme agréée",
    deadline: "Avant bascule opérationnelle",
    status: "missing",
  },
  {
    id: "formats",
    label: "Formats structurés UBL, CII ou mixte",
    deadline: "Paramétrage SI",
    status: "partial",
  },
  {
    id: "e-reporting",
    label: "Données e-reporting à cartographier",
    deadline: "Revue comptable",
    status: "missing",
  },
];

export function getEInvoicingScore() {
  const scoreByStatus = {
    ready: 1,
    partial: 0.5,
    missing: 0,
  };

  const score =
    eInvoicingReadiness.reduce((sum, item) => sum + scoreByStatus[item.status], 0) /
    eInvoicingReadiness.length;

  return Math.round(score * 100);
}
