/**
 * Facturation électronique — calendrier réglementaire daté.
 * Correction P0 TAX-P0-005.
 *
 * La timeline ne stocke plus « 1er septembre 2026 » comme chaîne statique :
 * chaque jalon est un événement structuré porteur d'une obligation, d'une
 * catégorie d'entreprise, d'une date d'effet et de ses sources. Le statut
 * (à venir / en vigueur) est **calculé** par comparaison avec une date
 * explicitement fournie — jamais avec l'horloge système à l'intérieur du
 * moteur, afin que la règle reste déterministe et testable à n'importe quelle
 * date passée ou future.
 *
 * Calendrier (référentiel `REGLEMENTATION_AOUT_2026.md` § 15.1, recontrôlé sur
 * impots.gouv.fr et economie.gouv.fr) :
 * - 01/09/2026 : capacité de RÉCEPTION pour toutes les entreprises concernées ;
 * - 01/09/2026 : ÉMISSION et E-REPORTING pour les grandes entreprises et ETI ;
 * - 01/09/2027 : ÉMISSION et E-REPORTING pour les PME, TPE et micro-entreprises.
 *
 * Réception, émission et e-reporting sont trois obligations distinctes : elles
 * ne doivent jamais être fusionnées en une échéance générique unique.
 */

export type EInvoicingObligation = "RECEIVE_E_INVOICE" | "ISSUE_E_INVOICE" | "E_REPORTING";

/** Catégories d'entreprise portées par le calendrier. */
export type EInvoicingCompanyCategory = "ALL" | "LARGE" | "ETI" | "SME" | "MICRO";

/** Taille du dossier lorsqu'elle est connue ; `UNKNOWN` interdit toute présomption. */
export type EInvoicingCompanySize = Exclude<EInvoicingCompanyCategory, "ALL"> | "UNKNOWN";

export type EInvoicingEventStatus = "UPCOMING" | "IN_FORCE";

/** Première échéance : réception pour tous, émission/e-reporting GE et ETI. */
export const E_INVOICING_FIRST_MILESTONE_DATE = "2026-09-01";
/** Seconde échéance : émission/e-reporting PME, TPE et micro-entreprises. */
export const E_INVOICING_SECOND_MILESTONE_DATE = "2027-09-01";

export const E_INVOICING_RULE_VERSION_ID = "rule-e-invoicing-timeline-2026-v2";

const SOURCE_REFS = [
  "src-impots-facturation-electronique-2026",
  "src-aife-facturation-electronique",
];

export type EInvoicingTimelineEvent = {
  id: string;
  obligation: EInvoicingObligation;
  companyCategory: EInvoicingCompanyCategory;
  effectiveDate: string;
  label: string;
  ruleVersionId: string;
  sourceRefs: readonly string[];
};

/**
 * Jalons légaux. Aucune date de report hypothétique n'est inscrite ici : seul
 * le calendrier effectivement publié figure dans ce registre. La détection
 * d'un éventuel décret de report relève du source-watcher, hors périmètre.
 */
export const E_INVOICING_TIMELINE: readonly EInvoicingTimelineEvent[] = [
  {
    id: "e-invoicing-receive-all-2026",
    obligation: "RECEIVE_E_INVOICE",
    companyCategory: "ALL",
    effectiveDate: E_INVOICING_FIRST_MILESTONE_DATE,
    label: "Capacité à recevoir des factures électroniques",
    ruleVersionId: E_INVOICING_RULE_VERSION_ID,
    sourceRefs: SOURCE_REFS,
  },
  {
    id: "e-invoicing-issue-large-2026",
    obligation: "ISSUE_E_INVOICE",
    companyCategory: "LARGE",
    effectiveDate: E_INVOICING_FIRST_MILESTONE_DATE,
    label: "Émission de factures électroniques — grandes entreprises",
    ruleVersionId: E_INVOICING_RULE_VERSION_ID,
    sourceRefs: SOURCE_REFS,
  },
  {
    id: "e-invoicing-issue-eti-2026",
    obligation: "ISSUE_E_INVOICE",
    companyCategory: "ETI",
    effectiveDate: E_INVOICING_FIRST_MILESTONE_DATE,
    label: "Émission de factures électroniques — ETI",
    ruleVersionId: E_INVOICING_RULE_VERSION_ID,
    sourceRefs: SOURCE_REFS,
  },
  {
    id: "e-invoicing-ereporting-large-2026",
    obligation: "E_REPORTING",
    companyCategory: "LARGE",
    effectiveDate: E_INVOICING_FIRST_MILESTONE_DATE,
    label: "E-reporting des données de transaction — grandes entreprises",
    ruleVersionId: E_INVOICING_RULE_VERSION_ID,
    sourceRefs: SOURCE_REFS,
  },
  {
    id: "e-invoicing-ereporting-eti-2026",
    obligation: "E_REPORTING",
    companyCategory: "ETI",
    effectiveDate: E_INVOICING_FIRST_MILESTONE_DATE,
    label: "E-reporting des données de transaction — ETI",
    ruleVersionId: E_INVOICING_RULE_VERSION_ID,
    sourceRefs: SOURCE_REFS,
  },
  {
    id: "e-invoicing-issue-sme-2027",
    obligation: "ISSUE_E_INVOICE",
    companyCategory: "SME",
    effectiveDate: E_INVOICING_SECOND_MILESTONE_DATE,
    label: "Émission de factures électroniques — PME",
    ruleVersionId: E_INVOICING_RULE_VERSION_ID,
    sourceRefs: SOURCE_REFS,
  },
  {
    id: "e-invoicing-issue-micro-2027",
    obligation: "ISSUE_E_INVOICE",
    companyCategory: "MICRO",
    effectiveDate: E_INVOICING_SECOND_MILESTONE_DATE,
    label: "Émission de factures électroniques — TPE et micro-entreprises",
    ruleVersionId: E_INVOICING_RULE_VERSION_ID,
    sourceRefs: SOURCE_REFS,
  },
  {
    id: "e-invoicing-ereporting-sme-2027",
    obligation: "E_REPORTING",
    companyCategory: "SME",
    effectiveDate: E_INVOICING_SECOND_MILESTONE_DATE,
    label: "E-reporting des données de transaction — PME",
    ruleVersionId: E_INVOICING_RULE_VERSION_ID,
    sourceRefs: SOURCE_REFS,
  },
  {
    id: "e-invoicing-ereporting-micro-2027",
    obligation: "E_REPORTING",
    companyCategory: "MICRO",
    effectiveDate: E_INVOICING_SECOND_MILESTONE_DATE,
    label: "E-reporting des données de transaction — TPE et micro-entreprises",
    ruleVersionId: E_INVOICING_RULE_VERSION_ID,
    sourceRefs: SOURCE_REFS,
  },
];

export type ResolvedEInvoicingEvent = EInvoicingTimelineEvent & {
  /** `UPCOMING` avant la date d'effet, `IN_FORCE` à compter de celle-ci (jour inclus). */
  status: EInvoicingEventStatus;
  /** L'événement concerne-t-il la catégorie analysée ? */
  appliesToCompany: boolean;
  /**
   * `true` lorsque l'applicabilité dépend d'une taille d'entreprise non
   * renseignée : l'obligation n'est ni retenue ni écartée sans qualification.
   */
  qualificationRequired: boolean;
};

export type EInvoicingTimelineResolution = {
  asOfDate: string;
  companySize: EInvoicingCompanySize;
  events: ResolvedEInvoicingEvent[];
  /** Événements applicables et déjà en vigueur à la date analysée. */
  inForceEvents: ResolvedEInvoicingEvent[];
  /** Événements applicables mais encore à venir. */
  upcomingEvents: ResolvedEInvoicingEvent[];
  /** Une taille d'entreprise est nécessaire pour trancher émission/e-reporting. */
  qualificationRequired: boolean;
};

/** Statut d'un jalon à une date donnée. Frontière inclusive le jour d'entrée en vigueur. */
export function resolveEInvoicingEventStatus(
  effectiveDate: string,
  asOfDate: string,
): EInvoicingEventStatus {
  // Comparaison lexicographique de dates ISO de même format : ordonnée au jour
  // près, contrairement à une comparaison fondée sur la seule année.
  return asOfDate >= effectiveDate ? "IN_FORCE" : "UPCOMING";
}

/**
 * Résout le calendrier applicable à une entreprise à une date donnée.
 * `asOfDate` est obligatoire et explicite : le moteur n'appelle jamais
 * l'horloge système, ce qui rend les tests déterministes.
 */
export function resolveEInvoicingTimeline({
  companySize = "UNKNOWN",
  asOfDate,
}: {
  companySize?: EInvoicingCompanySize;
  asOfDate: string;
}): EInvoicingTimelineResolution {
  const events = E_INVOICING_TIMELINE.map((event): ResolvedEInvoicingEvent => {
    const status = resolveEInvoicingEventStatus(event.effectiveDate, asOfDate);
    // La réception vise toutes les entreprises : elle est déterminable même
    // sans connaître la taille du dossier.
    if (event.companyCategory === "ALL") {
      return { ...event, status, appliesToCompany: true, qualificationRequired: false };
    }
    if (companySize === "UNKNOWN") {
      // Aucune présomption de taille : ni retenue, ni écartée.
      return { ...event, status, appliesToCompany: false, qualificationRequired: true };
    }
    return {
      ...event,
      status,
      appliesToCompany: event.companyCategory === companySize,
      qualificationRequired: false,
    };
  });

  const applicable = events.filter((event) => event.appliesToCompany);

  return {
    asOfDate,
    companySize,
    events,
    inForceEvents: applicable.filter((event) => event.status === "IN_FORCE"),
    upcomingEvents: applicable.filter((event) => event.status === "UPCOMING"),
    qualificationRequired: events.some((event) => event.qualificationRequired),
  };
}

// ---------------------------------------------------------------------------
// Préparation opérationnelle du cabinet (distincte du calendrier légal).
// ---------------------------------------------------------------------------

export type EInvoicingReadinessItem = {
  id: string;
  label: string;
  /** Rattachement au jalon légal, lorsque l'item en dépend. */
  timelineEventId?: string;
  /** Échéance opérationnelle, pour les items sans date légale propre. */
  operationalDeadline?: string;
  status: "ready" | "partial" | "missing";
};

export const eInvoicingReadiness: EInvoicingReadinessItem[] = [
  {
    id: "receive-2026",
    label: "Capacité à recevoir des factures électroniques",
    timelineEventId: "e-invoicing-receive-all-2026",
    status: "partial",
  },
  {
    id: "emit-2027",
    label: "Capacité PME/micro à émettre des factures électroniques",
    timelineEventId: "e-invoicing-issue-sme-2027",
    status: "missing",
  },
  {
    id: "platform",
    label: "Choix d’une plateforme agréée",
    operationalDeadline: "Avant bascule opérationnelle",
    status: "missing",
  },
  {
    id: "formats",
    label: "Formats structurés UBL, CII ou mixte",
    operationalDeadline: "Paramétrage SI",
    status: "partial",
  },
  {
    id: "e-reporting",
    label: "Données e-reporting à cartographier",
    timelineEventId: "e-invoicing-ereporting-sme-2027",
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

export function getEInvoicingTimelineEvent(id: string) {
  return E_INVOICING_TIMELINE.find((event) => event.id === id);
}
