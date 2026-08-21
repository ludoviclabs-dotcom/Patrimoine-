/**
 * PF-07 — one mapping from a server machine code to what a professional reads.
 *
 * The server already refuses precisely: PF-04B, PF-05 and PF-06 return stable
 * codes rather than prose. What was missing was the other half — a single place
 * that turns each code into a title, an explanation and the next action, so no
 * screen has to invent its own wording or collapse a refusal into a generic
 * toast.
 *
 * Two rules hold for every entry:
 *
 * 1. **Nothing is interpolated.** Every string is a constant. A message can
 *    therefore never carry a tenant name, a dossier reference, a file name or
 *    a provider detail belonging to another cabinet.
 * 2. **A refusal never explains what exists elsewhere.** Cross-tenant codes say
 *    the resource is outside the cabinet's scope, never whether it exists.
 */

export type ErrorSeverity = "blocking" | "review" | "info";

export type ErrorDescriptor = Readonly<{
  code: string;
  title: string;
  explanation: string;
  nextAction: string;
  severity: ErrorSeverity;
}>;

type Entry = Omit<ErrorDescriptor, "code">;

const authentication: Readonly<Record<string, Entry>> = {
  CLERK_SESSION_REQUIRED: {
    title: "Authentification requise",
    explanation: "Aucune session n'est ouverte pour ce navigateur.",
    nextAction: "Connectez-vous avec votre compte cabinet.",
    severity: "blocking",
  },
  CLERK_ORGANIZATION_REQUIRED: {
    title: "Organisation cabinet requise",
    explanation:
      "La session n'a pas d'organisation active. Le tenant est résolu côté serveur, jamais depuis le navigateur.",
    nextAction: "Sélectionnez l'organisation du cabinet dans le sélecteur de compte.",
    severity: "blocking",
  },
  CLERK_TENANT_CONTEXT_DENIED: {
    title: "Compte non rattaché à un cabinet",
    explanation:
      "Aucune adhésion active ne relie ce compte à un tenant interne. L'identité seule n'autorise rien.",
    nextAction:
      "Demandez à un administrateur de rattacher l'organisation et d'activer votre adhésion en base.",
    severity: "blocking",
  },
  TENANT_MEMBERSHIP_REQUIRED: {
    title: "Adhésion révoquée",
    explanation:
      "Votre adhésion au cabinet n'est plus active. Une session encore ouverte ne rétablit aucun accès.",
    nextAction: "Contactez un administrateur du cabinet pour réactiver votre adhésion.",
    severity: "blocking",
  },
  TENANT_AUTHORIZATION_DENIED: {
    title: "Rôle insuffisant",
    explanation: "Votre rôle ne dispose pas de cette capacité sur les ressources du cabinet.",
    nextAction: "Demandez l'action à un rôle habilité, ou une évolution de vos droits.",
    severity: "blocking",
  },
  TENANT_OWNERSHIP_VIOLATION: {
    title: "Ressource hors périmètre",
    explanation: "La ressource demandée n'appartient pas au cabinet de votre session.",
    nextAction: "Revenez à la liste des dossiers de votre cabinet.",
    severity: "blocking",
  },
};

const configuration: Readonly<Record<string, Entry>> = {
  PERSISTENCE_MODE_FIXTURE: {
    title: "Pipeline serveur inactif",
    explanation:
      "L'application tourne sur des données de démonstration. Aucun livrable professionnel n'est produit dans ce mode.",
    nextAction: "Activez PERSISTENCE_MODE=DATABASE avec une base PostgreSQL managée.",
    severity: "blocking",
  },
  PERSISTENCE_MODE_REQUIRED_IN_PRODUCTION: {
    title: "Mode de persistance non déclaré",
    explanation:
      "En production, le mode de persistance doit être explicite : aucune bascule implicite vers la base n'est autorisée.",
    nextAction: "Déclarez PERSISTENCE_MODE avant le déploiement.",
    severity: "blocking",
  },
  DATABASE_URL_REQUIRED_FOR_DATABASE_MODE: {
    title: "Connexion base absente",
    explanation: "Le mode base est demandé mais aucune connexion applicative n'est configurée.",
    nextAction: "Renseignez DATABASE_URL avec l'identifiant applicatif restreint.",
    severity: "blocking",
  },
  DATABASE_ACCESS_DISABLED_IN_FIXTURE_MODE: {
    title: "Accès base désactivé",
    explanation: "Le mode fixtures interdit tout accès à la base de production.",
    nextAction: "Basculez explicitement en mode base pour accéder aux données réelles.",
    severity: "blocking",
  },
  BLOB_READ_WRITE_TOKEN_REQUIRED: {
    title: "Stockage privé indisponible",
    explanation:
      "Aucun conteneur privé n'est configuré : une génération échouerait avant tout enregistrement.",
    nextAction: "Rattachez le conteneur privé et renseignez son jeton d'accès serveur.",
    severity: "blocking",
  },
  DOCUMENT_DOWNLOAD_SIGNING_SECRET_REQUIRED: {
    title: "Secret de téléchargement absent",
    explanation:
      "Sans secret de signature serveur, aucune autorisation de téléchargement temporaire ne peut être émise.",
    nextAction: "Renseignez le secret de signature côté serveur, puis relancez l'action.",
    severity: "blocking",
  },
  CLERK_WEBHOOK_DATABASE_URL_REQUIRED: {
    title: "Connexion webhook absente",
    explanation:
      "La synchronisation Clerk exige une identité base dédiée, distincte du runtime et de l'administration.",
    nextAction: "Provisionnez CLERK_WEBHOOK_DATABASE_URL puis exécutez npm run db:verify:webhook.",
    severity: "blocking",
  },
  CLERK_WEBHOOK_DATABASE_ROLE_UNSAFE: {
    title: "Identité webhook trop privilégiée",
    explanation:
      "L'identité configurée dépasse le périmètre autorisé : superutilisateur, contournement RLS, propriété de tables ou droits directs.",
    nextAction: "Recréez une connexion membre du seul rôle de service webhook.",
    severity: "blocking",
  },
};

const documents: Readonly<Record<string, Entry>> = {
  DOCUMENT_NOT_FOUND: {
    title: "Document introuvable",
    explanation: "Aucun document accessible dans votre périmètre ne correspond à cette demande.",
    nextAction: "Revenez à la liste des pièces du dossier.",
    severity: "blocking",
  },
  DOCUMENT_VERSION_NOT_FOUND: {
    title: "Version introuvable",
    explanation: "Cette version de document n'existe pas dans votre périmètre.",
    nextAction: "Ouvrez l'historique du document et choisissez une version listée.",
    severity: "blocking",
  },
  DOCUMENT_DELETED: {
    title: "Document supprimé",
    explanation:
      "Le document a été supprimé. Ses versions et leurs empreintes restent conservées pour l'audit.",
    nextAction: "Redéposez une pièce si le justificatif reste nécessaire.",
    severity: "blocking",
  },
  DOCUMENT_OBJECT_NOT_FOUND: {
    title: "Fichier absent du stockage",
    explanation:
      "La fiche existe en base mais l'objet correspondant est introuvable dans le conteneur privé.",
    nextAction: "Redéposez une nouvelle version, puis signalez l'incident.",
    severity: "blocking",
  },
  DOCUMENT_QUARANTINED: {
    title: "Document en quarantaine",
    explanation: "Un contrôle a marqué ce document comme non sûr : sa diffusion est bloquée.",
    nextAction: "Faites lever la quarantaine par un rôle cabinet, ou redéposez la pièce.",
    severity: "blocking",
  },
  DOCUMENT_VERSION_QUARANTINED: {
    title: "Version en quarantaine",
    explanation: "Cette version a été marquée comme non sûre et ne peut pas être servie.",
    nextAction: "Utilisez une version saine, ou redéposez la pièce.",
    severity: "blocking",
  },
  DOCUMENT_NOT_AVAILABLE: {
    title: "Document non disponible",
    explanation: "Le document n'a pas atteint l'état publié : aucun fichier n'est servi.",
    nextAction: "Reprenez le dépôt de la pièce.",
    severity: "blocking",
  },
  DOCUMENT_VERSION_NOT_AVAILABLE: {
    title: "Version non publiée",
    explanation: "Le dépôt de cette version ne s'est pas terminé.",
    nextAction: "Redéposez le fichier ; la version incomplète reste inexploitable.",
    severity: "blocking",
  },
  DOCUMENT_VERSION_AWAITING_VALIDATION: {
    title: "Version en attente de contrôle",
    explanation:
      "Une pièce fraîchement déposée n'est téléchargeable qu'après un contrôle explicite. C'est un refus par défaut, pas une erreur.",
    nextAction: "Faites enregistrer le résultat du contrôle par un rôle cabinet habilité.",
    severity: "blocking",
  },
  DOCUMENT_UPLOAD_EMPTY: {
    title: "Fichier vide",
    explanation: "Le fichier transmis ne contient aucune donnée.",
    nextAction: "Sélectionnez à nouveau le fichier et relancez le dépôt.",
    severity: "blocking",
  },
  DOCUMENT_UPLOAD_TOO_LARGE: {
    title: "Fichier trop volumineux",
    explanation: "La pièce dépasse la taille maximale acceptée pour un justificatif.",
    nextAction: "Réduisez le fichier, ou scindez-le, puis relancez le dépôt.",
    severity: "blocking",
  },
  DOCUMENT_FILE_NAME_INVALID: {
    title: "Nom de fichier refusé",
    explanation:
      "Le nom contient des séparateurs, une remontée de dossier ou des caractères de contrôle. Il n'est jamais réécrit silencieusement.",
    nextAction: "Renommez le fichier avec un nom simple, sans barre oblique ni point-point.",
    severity: "blocking",
  },
  DOCUMENT_MEDIA_TYPE_NOT_ALLOWED: {
    title: "Format non accepté",
    explanation:
      "Seuls les formats dont la signature binaire est vérifiable sont acceptés comme justificatif.",
    nextAction: "Convertissez la pièce en PDF, JPEG, PNG ou TIFF.",
    severity: "blocking",
  },
  DOCUMENT_MEDIA_TYPE_MISMATCH: {
    title: "Type de fichier incohérent",
    explanation:
      "Le contenu réel ne correspond pas au type annoncé par le navigateur. La déclaration n'est jamais retenue seule.",
    nextAction: "Vérifiez le fichier d'origine et redéposez-le.",
    severity: "blocking",
  },
  DOCUMENT_BLOB_KEY_INVALID: {
    title: "Référence de stockage invalide",
    explanation: "La clé d'objet ne respecte pas le format attendu.",
    nextAction: "Relancez l'action depuis la fiche du document.",
    severity: "blocking",
  },
  DOCUMENT_BLOB_KEY_TENANT_MISMATCH: {
    title: "Référence hors périmètre",
    explanation: "La clé d'objet ne correspond pas au cabinet de votre session.",
    nextAction: "Revenez à la liste des pièces de votre cabinet.",
    severity: "blocking",
  },
  DOCUMENT_REQUEST_INVALID: {
    title: "Requête invalide",
    explanation: "La demande ne comporte pas les éléments attendus.",
    nextAction: "Relancez l'action depuis l'écran du dossier.",
    severity: "blocking",
  },
  SIMULATION_RUN_NOT_FOUND: {
    title: "Simulation introuvable",
    explanation: "La simulation visée n'existe pas dans votre périmètre.",
    nextAction: "Choisissez une simulation dans la liste du dossier.",
    severity: "blocking",
  },
  DOSSIER_NOT_FOUND: {
    title: "Dossier introuvable",
    explanation: "Aucun dossier accessible dans votre périmètre ne correspond à cette demande.",
    nextAction: "Revenez à la liste des dossiers de votre cabinet.",
    severity: "blocking",
  },
};

const grants: Readonly<Record<string, Entry>> = {
  DOCUMENT_DOWNLOAD_GRANT_MALFORMED: {
    title: "Autorisation illisible",
    explanation: "Le jeton de téléchargement n'a pas la forme attendue.",
    nextAction: "Relancez le téléchargement depuis la fiche du document.",
    severity: "blocking",
  },
  DOCUMENT_DOWNLOAD_GRANT_INVALID_SIGNATURE: {
    title: "Autorisation non authentique",
    explanation: "La signature du jeton ne correspond pas à celle attendue par le serveur.",
    nextAction: "Relancez le téléchargement depuis la fiche du document.",
    severity: "blocking",
  },
  DOCUMENT_DOWNLOAD_GRANT_EXPIRED: {
    title: "Autorisation expirée",
    explanation: "Les autorisations de téléchargement sont volontairement de très courte durée.",
    nextAction: "Relancez le téléchargement pour obtenir une nouvelle autorisation.",
    severity: "blocking",
  },
  DOCUMENT_DOWNLOAD_GRANT_SUBJECT_MISMATCH: {
    title: "Autorisation émise pour un autre compte",
    explanation: "Un jeton est lié à l'identité qui l'a demandé et n'est pas transférable.",
    nextAction: "Demandez votre propre autorisation de téléchargement.",
    severity: "blocking",
  },
  REPORT_DOWNLOAD_GRANT_MALFORMED: {
    title: "Autorisation illisible",
    explanation: "Le jeton de téléchargement du rapport n'a pas la forme attendue.",
    nextAction: "Relancez le téléchargement depuis la console rapport.",
    severity: "blocking",
  },
  REPORT_DOWNLOAD_GRANT_INVALID_SIGNATURE: {
    title: "Autorisation non authentique",
    explanation: "La signature du jeton ne correspond pas à celle attendue par le serveur.",
    nextAction: "Relancez le téléchargement depuis la console rapport.",
    severity: "blocking",
  },
  REPORT_DOWNLOAD_GRANT_EXPIRED: {
    title: "Autorisation expirée",
    explanation: "Les autorisations de téléchargement sont volontairement de très courte durée.",
    nextAction: "Relancez le téléchargement pour obtenir une nouvelle autorisation.",
    severity: "blocking",
  },
  REPORT_DOWNLOAD_GRANT_SUBJECT_MISMATCH: {
    title: "Autorisation émise pour un autre compte",
    explanation: "Un jeton est lié à l'identité qui l'a demandé et n'est pas transférable.",
    nextAction: "Demandez votre propre autorisation de téléchargement.",
    severity: "blocking",
  },
};

const reports: Readonly<Record<string, Entry>> = {
  REPORT_VERSION_NOT_FOUND: {
    title: "Version de rapport introuvable",
    explanation: "Cette version n'existe pas dans votre périmètre.",
    nextAction: "Ouvrez l'historique des versions du dossier.",
    severity: "blocking",
  },
  REPORT_OBJECT_NOT_FOUND: {
    title: "PDF absent du stockage",
    explanation:
      "La version existe en base mais son PDF est introuvable dans le conteneur privé.",
    nextAction: "Régénérez une version, puis signalez l'incident.",
    severity: "blocking",
  },
  REPORT_ALREADY_VALIDATED: {
    title: "Version déjà validée",
    explanation: "Une version validée ne peut pas être validée une seconde fois.",
    nextAction: "Régénérez un brouillon si les faits du dossier ont changé.",
    severity: "blocking",
  },
  REPORT_VERSION_SUPERSEDED: {
    title: "Version dépassée",
    explanation: "Une version plus récente existe ; seule la version courante peut être validée.",
    nextAction: "Rechargez l'écran et reprenez sur la version courante.",
    severity: "blocking",
  },
  REPORT_READINESS_BLOCKED: {
    title: "Validation impossible : points bloquants",
    explanation:
      "L'approbation exige zéro point bloquant. Demander des corrections ou rejeter reste possible.",
    nextAction: "Traitez les points bloquants listés, régénérez, puis validez.",
    severity: "blocking",
  },
  REPORT_LEGAL_FREEZE_DATE_REQUIRED: {
    title: "Date de gel juridique manquante",
    explanation:
      "La date à laquelle le droit applicable est figé n'est jamais déduite : l'inventer reviendrait à choisir la loi applicable.",
    nextAction: "Saisissez la date de gel juridique au format AAAA-MM-JJ.",
    severity: "blocking",
  },
  REPORT_SIMULATION_RUN_REQUIRED: {
    title: "Aucune simulation sélectionnée",
    explanation: "Un rapport est construit à partir de simulations du dossier, jamais à vide.",
    nextAction: "Sélectionnez au moins une simulation terminée.",
    severity: "blocking",
  },
  REPORT_VALIDATION_COMMENT_REQUIRED: {
    title: "Commentaire de validation obligatoire",
    explanation: "Une décision professionnelle est toujours motivée et tracée.",
    nextAction: "Saisissez le motif de votre décision.",
    severity: "blocking",
  },
  REPORT_REQUEST_INVALID: {
    title: "Requête invalide",
    explanation: "La demande ne comporte pas les éléments attendus.",
    nextAction: "Reprenez l'action depuis la console rapport.",
    severity: "blocking",
  },
  REPORT_REGENERATION_REQUIRED: {
    title: "Rapport obsolète — régénération requise",
    explanation:
      "Les faits du dossier ont changé depuis la génération. Le PDF déjà produit n'est jamais réécrit.",
    nextAction: "Régénérez un brouillon pour repartir des faits actuels.",
    severity: "blocking",
  },
  REPORT_DOSSIER_NOT_ACCESSIBLE: {
    title: "Dossier hors périmètre",
    explanation:
      "Le dossier demandé n'est pas accessible dans le périmètre de votre cabinet. Aucun repli sur un autre dossier n'est effectué.",
    nextAction: "Revenez à la liste des dossiers de votre cabinet.",
    severity: "blocking",
  },
  REPORT_EVIDENCE_MISSING: {
    title: "Aucune pièce justificative rattachée",
    explanation:
      "Aucune version de document n'est reliée aux simulations retenues : l'index des preuves sera vide.",
    nextAction: "Rattachez les justificatifs aux simulations avant de produire le livrable.",
    severity: "review",
  },
  REPORT_BLOB_KEY_INVALID: {
    title: "Référence de stockage invalide",
    explanation: "La clé d'objet du rapport ne respecte pas le format attendu.",
    nextAction: "Régénérez une version du rapport.",
    severity: "blocking",
  },
  REPORT_BLOB_KEY_TENANT_MISMATCH: {
    title: "Référence hors périmètre",
    explanation: "La clé d'objet ne correspond pas au cabinet de votre session.",
    nextAction: "Revenez à la console rapport de votre cabinet.",
    severity: "blocking",
  },
};

/** Review flags produced from stored facts by the PF-06 readiness gate. */
const reviewFlags: Readonly<Record<string, Entry>> = {
  "simulation.none": {
    title: "Aucune simulation rattachée",
    explanation: "Le rapport ne repose sur aucun calcul.",
    nextAction: "Lancez ou sélectionnez une simulation du dossier.",
    severity: "blocking",
  },
  "simulation.not_completed": {
    title: "Simulation non terminée",
    explanation: "Une simulation retenue n'a pas abouti.",
    nextAction: "Relancez la simulation jusqu'à son achèvement.",
    severity: "blocking",
  },
  "calculation.step_not_validated": {
    title: "Étape de calcul non validée",
    explanation: "Une étape reste au statut indicatif et ne peut pas fonder un livrable.",
    nextAction: "Faites contrôler l'étape concernée avant de produire le rapport.",
    severity: "blocking",
  },
  "rule.version_unresolved": {
    title: "Version de règle introuvable",
    explanation: "Une étape référence une version de règle que le cabinet ne peut pas résoudre.",
    nextAction: "Régénérez la simulation, puis vérifiez le registre des règles.",
    severity: "blocking",
  },
  "rule.version_not_active": {
    title: "Version de règle non active",
    explanation: "Une étape s'appuie sur une règle qui n'est pas en vigueur.",
    nextAction: "Relancez la simulation sur la version active de la règle.",
    severity: "blocking",
  },
  "rule.version_without_source": {
    title: "Règle sans source officielle",
    explanation: "Une règle mobilisée ne cite aucune source officielle.",
    nextAction: "Complétez la source de la règle avant toute remise.",
    severity: "blocking",
  },
  "review.professional_not_signed": {
    title: "Revue professionnelle non signée",
    explanation: "Le dossier exige une revue professionnelle qui n'est pas signée.",
    nextAction: "Faites signer la revue par un professionnel habilité, puis régénérez.",
    severity: "blocking",
  },
  "simulation.professional_validation_required": {
    title: "Validation professionnelle requise",
    explanation: "La simulation est marquée comme exigeant une validation humaine.",
    nextAction: "Prévoyez la revue professionnelle avant remise au client.",
    severity: "review",
  },
  "coverage.limit": {
    title: "Limite de couverture déclarée",
    explanation: "Le périmètre couvert par le moteur est explicitement limité sur ce point.",
    nextAction: "Vérifiez manuellement le point concerné et documentez-le.",
    severity: "review",
  },
};

export const errorCatalog: Readonly<Record<string, Entry>> = {
  ...authentication,
  ...configuration,
  ...documents,
  ...grants,
  ...reports,
  ...reviewFlags,
};

const fallback: Entry = {
  title: "Action impossible",
  explanation:
    "Le serveur a refusé l'opération. Le code technique est affiché tel quel pour diagnostic, sans interprétation.",
  nextAction: "Réessayez ; si le refus persiste, transmettez le code à un administrateur.",
  severity: "blocking",
};

/**
 * Always returns a descriptor. An unmapped code keeps its own identifier and a
 * neutral wording rather than being silently rewritten into something friendlier
 * but wrong — the catalog test below is what keeps the fallback rare.
 */
export function describeError(code: string, override?: Partial<Entry>): ErrorDescriptor {
  const entry = errorCatalog[code] ?? fallback;
  return { code, ...entry, ...override };
}

export function isKnownErrorCode(code: string) {
  return Object.prototype.hasOwnProperty.call(errorCatalog, code);
}
