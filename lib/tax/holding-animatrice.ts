/**
 * PF-02B3 — Qualification de holding animatrice (CGI art. 787 B, al. 1-2).
 *
 * Sources vérifiées le 19/08/2026 :
 * - Légifrance, CGI art. 787 B (LEGIARTI000047623071), texte consolidé depuis
 *   la LF 2024 : « Est néanmoins considérée comme exerçant une activité
 *   commerciale la société qui, outre la gestion d'un portefeuille de
 *   participations, a pour activité principale la participation active à la
 *   conduite de la politique de son groupe constitué de sociétés contrôlées
 *   directement ou indirectement, exerçant une activité industrielle,
 *   commerciale, artisanale, agricole ou libérale, et auxquelles elle rend,
 *   le cas échéant et à titre purement interne, des services spécifiques,
 *   administratifs, juridiques, comptables, financiers et immobiliers. »
 *   Alinéa 1 exclut expressément « l'exercice par une société d'une activité
 *   de gestion de son propre patrimoine mobilier ou immobilier ».
 * - Légifrance, Cass. com., 17 décembre 2025, n° 24-17.415, publié au
 *   bulletin (JURITEXT000053196991) : pourvoi rejeté. § 10 : « en cas de
 *   transmission par décès, c'est au jour du décès, fait générateur de
 *   l'impôt, et non au jour de la déclaration de succession, que le
 *   caractère opérationnel des sociétés, dont les titres sont transmis,
 *   doit être apprécié. » § 13 : « Il appartient au redevable, qui entend
 *   bénéficier de l'exonération prévue à l'article 787 B du code général
 *   des impôts, de rapporter la preuve que les filiales de la société
 *   holding... exercent une activité commerciale. » La holding en cause a
 *   été jugée non animatrice : ses filiales, des SCI valorisées sur leur
 *   rendement locatif, n'exerçaient pas d'activité opérationnelle éligible.
 * - `docs/reference/2026-08/REGLEMENTATION_AOUT_2026.md` § 12.3 : aucune
 *   doctrine BOFiP 2026 pleinement alignée n'est confirmée dans le gel
 *   (`pending_doctrine`) — un ratio d'actifs opérationnels ne doit jamais
 *   devenir un safe harbor automatique.
 *
 * La qualification est un faisceau de faits structurés, jamais un score. Les
 * quatre critères cumulatifs de l'art. 787 B, al. 2 doivent être établis,
 * étayés par des preuves contemporaines, puis validés par un professionnel
 * habilité avant qu'un résultat `QUALIFIED` ne soit jamais retenu. Toute
 * situation insuffisamment établie retombe sur `NEEDS_REVIEW` ; un critère
 * expressément écarté retombe sur `NOT_QUALIFIED`. Le moteur ne tranche
 * jamais seul une qualification favorable.
 */

export const HOLDING_ANIMATRICE_RULE_ID = "rule-holding-animatrice-2026-v1";
const SOURCE_CGI_787B = "src-legifrance-cgi-787b-holding-animatrice-2026";
const SOURCE_JURISPRUDENCE_2025 = "src-jurisprudence-cass-com-2025-24-17415";

export const HOLDING_ANIMATRICE_SOURCE_REFS = [SOURCE_CGI_787B, SOURCE_JURISPRUDENCE_2025];

/** Liste fermée des preuves contemporaines visées par REGLEMENTATION_AOUT_2026.md § 7.4. */
export type HoldingAnimatriceEvidenceType =
  | "proces-verbaux"
  | "conventions"
  | "reporting"
  | "decisions"
  | "prestations"
  | "moyens-humains";

export type HoldingAnimatriceFacts = {
  /**
   * Participation active à la conduite de la politique du groupe (CGI
   * art. 787 B, al. 2). Non renseigné = fait manquant, jamais présumé.
   */
  groupPolicyActivelyLed?: boolean;
  /** Contrôle direct ou indirect des filiales du groupe (art. 787 B, al. 2). */
  subsidiariesControlled?: boolean;
  /**
   * Les filiales contrôlées exercent réellement une activité industrielle,
   * commerciale, artisanale, agricole ou libérale, prouvée au jour du fait
   * générateur (art. 787 B, al. 2 ; Cass. com. précitée). La gestion de
   * filiales à objet purement patrimonial ne suffit jamais, quelle que soit
   * l'intensité de l'animation alléguée au niveau de la holding.
   */
  operationalSubsidiariesActivityProven?: boolean;
  /**
   * L'animation constitue l'activité PRINCIPALE de la holding (art. 787 B,
   * al. 2 : « a pour activité principale »). Une activité mixte est admise
   * si l'activité éligible reste prépondérante ; ce n'est jamais un simple
   * ratio numérique qui en décide seul.
   */
  animationIsPrincipalActivity?: boolean;
  /**
   * Prestations internes rendues aux filiales — administratives, juridiques,
   * comptables, financières, immobilières (art. 787 B, al. 2 : « le cas
   * échéant »). Élément de soutien FACULTATIF, jamais déterminant seul :
   * n'entre dans aucune condition cumulative de qualification.
   */
  internalServicesProvided?: boolean;
  /**
   * Types de preuves contemporaines effectivement rassemblées (liste fermée,
   * § 7.4). Un tableau vide ou absent signifie qu'aucune preuve n'a été
   * produite : une allégation seule ne suffit jamais (charge de la preuve,
   * Cass. com. 17 déc. 2025, n° 24-17.415).
   */
  contemporaneousEvidenceTypes?: HoldingAnimatriceEvidenceType[];
  /**
   * Date du fait générateur (ISO). Le caractère opérationnel s'apprécie à
   * cette date précise, jamais à une autre (Cass. com. précitée). Purement
   * informatif ici : la date n'entre dans aucune branche de décision.
   */
  taxableEventDate?: string;
  /**
   * Ratio d'actifs opérationnels du groupe, si connu (0 à 1). Un INDICE
   * parmi d'autres (§ 7.4) — n'entre dans AUCUNE condition de qualification
   * de cette fonction, pour ne jamais devenir un safe harbor automatique.
   */
  operationalAssetRatio?: number;
  /**
   * Validation déjà obtenue d'un professionnel habilité (avocat fiscaliste)
   * sur ce dossier précis — jamais présumée, jamais déduite des autres faits.
   */
  professionalValidationConfirmed?: boolean;
};

export type HoldingAnimatriceQualification = "QUALIFIED" | "NOT_QUALIFIED" | "NEEDS_REVIEW";

export type HoldingAnimatriceAssessment = {
  qualification: HoldingAnimatriceQualification;
  /** Libellés des faits effectivement renseignés et pris en compte. */
  factsConsidered: string[];
  /** Libellés des faits requis mais non renseignés. */
  missingFacts: string[];
  ruleVersionId: string;
  sourceRefs: string[];
  /** Motif de la conclusion — toujours renseigné, y compris pour QUALIFIED/NOT_QUALIFIED. */
  reviewReason: string;
};

const CORE_CRITERIA_LABELS = {
  groupPolicyActivelyLed: "Participation active à la conduite de la politique du groupe",
  subsidiariesControlled: "Contrôle direct ou indirect des filiales",
  operationalSubsidiariesActivityProven:
    "Activité opérationnelle des filiales prouvée au fait générateur",
  animationIsPrincipalActivity: "Animation retenue comme activité principale de la holding",
} as const;

type CoreCriterionKey = keyof typeof CORE_CRITERIA_LABELS;

const CORE_CRITERIA_KEYS = Object.keys(CORE_CRITERIA_LABELS) as CoreCriterionKey[];

function describeSupportingFacts(facts: HoldingAnimatriceFacts): string[] {
  const described: string[] = [];
  if (facts.internalServicesProvided !== undefined) {
    described.push(
      `Prestations internes aux filiales : ${facts.internalServicesProvided ? "déclarées" : "non déclarées"}`,
    );
  }
  if (facts.operationalAssetRatio !== undefined) {
    described.push(
      `Ratio d'actifs opérationnels déclaré : ${Math.round(facts.operationalAssetRatio * 100)} % (indice, non déterminant)`,
    );
  }
  if (facts.taxableEventDate) {
    described.push(`Date du fait générateur : ${facts.taxableEventDate}`);
  }
  return described;
}

/**
 * Qualifie une holding comme animatrice à partir d'un faisceau de faits
 * structurés. N'invente jamais un fait manquant, ne pondère jamais les
 * critères en score : les quatre critères cumulatifs de l'art. 787 B, al. 2
 * doivent être explicitement établis, étayés par des preuves contemporaines,
 * puis validés par un professionnel avant tout résultat `QUALIFIED`.
 */
export function assessHoldingAnimatrice(
  facts: HoldingAnimatriceFacts = {},
): HoldingAnimatriceAssessment {
  const factsConsidered: string[] = [];
  const missingFacts: string[] = [];

  for (const key of CORE_CRITERIA_KEYS) {
    const label = CORE_CRITERIA_LABELS[key];
    const value = facts[key];
    if (value === undefined) {
      missingFacts.push(label);
    } else {
      factsConsidered.push(`${label} : ${value ? "établi" : "expressément écarté"}`);
    }
  }

  const evidenceTypes = facts.contemporaneousEvidenceTypes ?? [];
  if (facts.contemporaneousEvidenceTypes !== undefined) {
    factsConsidered.push(
      evidenceTypes.length > 0
        ? `Preuves contemporaines rassemblées : ${evidenceTypes.join(", ")}`
        : "Preuves contemporaines rassemblées : aucune",
    );
  } else {
    missingFacts.push("Preuves contemporaines rassemblées");
  }

  if (facts.professionalValidationConfirmed !== undefined) {
    factsConsidered.push(
      `Validation professionnelle confirmée : ${facts.professionalValidationConfirmed ? "oui" : "non"}`,
    );
  } else {
    missingFacts.push("Validation professionnelle confirmée");
  }

  factsConsidered.push(...describeSupportingFacts(facts));

  const base = {
    factsConsidered,
    missingFacts,
    ruleVersionId: HOLDING_ANIMATRICE_RULE_ID,
    sourceRefs: HOLDING_ANIMATRICE_SOURCE_REFS,
  };

  const explicitlyFailedCriteria = CORE_CRITERIA_KEYS.filter((key) => facts[key] === false);
  if (explicitlyFailedCriteria.length > 0) {
    return {
      ...base,
      qualification: "NOT_QUALIFIED",
      reviewReason:
        `Au moins un critère cumulatif de l'art. 787 B, al. 2 est expressément écarté : ` +
        `${explicitlyFailedCriteria.map((key) => CORE_CRITERIA_LABELS[key]).join(", ")}. ` +
        `L'exclusion de la gestion d'un patrimoine purement personnel (art. 787 B, al. 1) s'applique.`,
    };
  }

  const undefinedCriteria = CORE_CRITERIA_KEYS.filter((key) => facts[key] === undefined);
  if (undefinedCriteria.length > 0) {
    return {
      ...base,
      qualification: "NEEDS_REVIEW",
      reviewReason:
        `Données insuffisantes pour statuer : ${undefinedCriteria
          .map((key) => CORE_CRITERIA_LABELS[key])
          .join(", ")} non renseigné(s). Aucune qualification n'est présumée en l'absence de faits.`,
    };
  }

  // Les quatre critères cumulatifs sont ici explicitement établis (=== true).
  if (evidenceTypes.length === 0) {
    return {
      ...base,
      qualification: "NEEDS_REVIEW",
      reviewReason:
        "Faits déclarés favorables mais aucune preuve contemporaine rassemblée : une allégation ne " +
        "suffit jamais, la charge de la preuve pèse sur le contribuable (Cass. com., 17 décembre 2025, " +
        "n° 24-17.415).",
    };
  }

  if (facts.professionalValidationConfirmed !== true) {
    return {
      ...base,
      qualification: "NEEDS_REVIEW",
      reviewReason:
        "Faits établis et étayés par des preuves contemporaines, mais validation professionnelle non " +
        "encore confirmée pour ce dossier précis — la doctrine BOFiP 2026 n'est pas stabilisée " +
        "(REGLEMENTATION_AOUT_2026.md § 12.3, statut pending_doctrine).",
    };
  }

  return {
    ...base,
    qualification: "QUALIFIED",
    reviewReason:
      "Les quatre critères cumulatifs de l'art. 787 B, al. 2 sont établis, étayés par des preuves " +
      "contemporaines et validés par un professionnel habilité pour ce dossier.",
  };
}
