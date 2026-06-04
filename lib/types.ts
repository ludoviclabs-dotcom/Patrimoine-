export type EvidenceAuthority =
  | "service-public"
  | "impots"
  | "bofip"
  | "legifrance"
  | "cnil"
  | "eurlex"
  | "banque-france"
  | "acpr"
  | "anssi"
  | "aife"
  | "amf"
  | "cnb"
  | "ordre-ec"
  | "commission-europeenne";

export type LegalScope =
  | "IFI"
  | "transmission"
  | "succession"
  | "facturation-electronique"
  | "rgpd"
  | "donation"
  | "plus-value"
  | "sci"
  | "ai-act"
  | "ir-pfu-cdhr"
  | "dutreil"
  | "apport-cession"
  | "holding-tax"
  | "mif2-dda"
  | "pea"
  | "per"
  | "open-banking"
  | "dsp2"
  | "lcb-ft"
  | "dac6-dac7"
  | "cif-orias"
  | "dora"
  | "cyber"
  | "atad";

export type EvidenceSource = {
  id: string;
  title: string;
  authority: EvidenceAuthority;
  url: string;
  legalReference?: string;
  archivedSnapshotLabel?: string;
  checkedAt: string;
  sourceVersion: string;
  verifiedAt: string;
  contentHash: string;
  summary: string;
  linkedRuleIds: string[];
  lastControlAt: string;
  snapshotStatus: "current" | "to-review" | "archived";
  legalScope: LegalScope;
  reliability: "official" | "professional" | "internal";
  status: "active" | "to-review" | "archived";
};

export type ReliabilityStatus =
  | "validated_calculation"
  | "indicative_calculation"
  | "user_assumption"
  | "official_source"
  | "professional_review_required"
  | "not_covered_v1";

export type DataQualityStatus =
  | "user_declared"
  | "supporting_document_received"
  | "estimated"
  | "external_source"
  | "professional_validated";

export type CoverageStatus = "covered" | "partially_covered" | "not_covered_v1";

export type CoverageLimit = {
  id: string;
  module:
    | "ifi"
    | "transmission"
    | "facturation-electronique"
    | "donation"
    | "plus-value"
    | "sci"
    | "ir-pfu-cdhr"
    | "dutreil"
    | "apport-cession"
    | "holding-tax"
    | "documents-cabinet"
    | "pea"
    | "per"
    | "bank-import"
    | "lcb-ft"
    | "dac6-dac7"
    | "succession"
    | "per-exit"
    | "liquidity-stress"
    | "product-adequacy"
    | "cif-orias"
    | "dora"
    | "cyber";
  label: string;
  status: CoverageStatus;
  explanation: string;
  requiredProfessional?: "notaire" | "avocat" | "expert-comptable" | "cgp";
};

export type DataQualityProfile = {
  status: DataQualityStatus;
  supportingDocumentId?: string;
  expectedAction: string;
  validationStatus: "not_started" | "pending" | "validated";
};

export type CalculationStep = {
  id: string;
  order: number;
  label: string;
  inputValue: number | string;
  formula: string;
  outputValue: number | string;
  ruleVersionId: string;
  evidenceSourceId: string;
  confidenceStatus: "validated" | "indicative" | "needs_review";
  usedData: string[];
  intermediateResult: string;
  coverageLimitIds: string[];
  nextAction: string;
  displayStatus: ReliabilityStatus;
};

export type SimulationRun = {
  id: string;
  scenario:
    | "ifi"
    | "transmission"
    | "facturation-electronique"
    | "donation"
    | "demembrement"
    | "plus-value"
    | "sci-arbitrage"
    | "ir-pfu-cdhr"
    | "dutreil"
    | "apport-cession"
    | "holding-tax"
    | "pea-withdrawal"
    | "per-deduction"
    | "bank-import"
    | "succession-checklist"
    | "per-early-exit"
    | "succession-liquidity-stress"
    | "product-adequacy";
  householdId: string;
  status: "indicative" | "needs_review";
  steps: CalculationStep[];
  createdAt: string;
  inputSnapshotId?: string;
  ruleSnapshotId?: string;
  coverageLimitIds?: string[];
  professionalValidationRequired?: boolean;
  computedResult?: Record<string, number | string | boolean | null>;
};

export type AssetCategory =
  | "liquidity"
  | "financial"
  | "insurance"
  | "real-estate"
  | "company"
  | "retirement"
  | "holding"
  | "other";

export type TaxEnvelope =
  | "liquidites"
  | "immobilier-direct"
  | "sci"
  | "societe-operationnelle"
  | "holding"
  | "cto"
  | "pea"
  | "assurance-vie"
  | "per"
  | "autres";

export type Asset = {
  id: string;
  label: string;
  category: AssetCategory;
  value: number;
  ifiKind?: "main-residence" | "rental" | "sci" | "excluded";
  envelope?: TaxEnvelope;
  acquisitionDate?: string;
  acquisitionValue?: number;
  ownerAge?: number;
  isDirectlyHeld?: boolean;
  isProfessionalAsset?: boolean;
  dataQuality: DataQualityProfile;
};

export type Liability = {
  id: string;
  label: string;
  value: number;
  linkedCategory: "real-estate" | "company" | "personal";
  dataQuality: DataQualityProfile;
};

export type Household = {
  id: string;
  name: string;
  profile: string;
  members: string[];
  children: number;
  fiscalResidence: string;
  professionalContext: string;
  assets: Asset[];
  liabilities: Liability[];
  objectives: string[];
};

export type RuleVersion = {
  id: string;
  ruleSet:
    | "ifi"
    | "transmission"
    | "facturation-electronique"
    | "rgpd"
    | "donation"
    | "plus-value"
    | "sci"
    | "ai-governance"
    | "ir-pfu-cdhr"
    | "dutreil"
    | "apport-cession"
    | "holding-tax"
    | "documents-cabinet"
    | "pea"
    | "per"
    | "bank-import"
    | "lcb-ft"
    | "dac6-dac7"
    | "succession"
    | "per-exit"
    | "liquidity-stress"
    | "product-adequacy"
    | "cif-orias"
    | "dora"
    | "cyber";
  version: string;
  title: string;
  effectiveFrom: string;
  status: "active" | "draft" | "archived";
  evidenceSourceIds: string[];
};

export type IfiResult = {
  threshold: number;
  taxableBase: number | null;
  taxableRealEstateBeforeDebt: number | null;
  deductibleDebt: number;
  triggered: boolean | null;
  message: string;
  grossIfi?: number;
  discount?: number;
  cappedIfi?: number;
  netIfi?: number;
  capApplied?: boolean;
};

export type UserRole = "admin" | "conseiller" | "expert" | "client";

export type TenantStatus = "active" | "pilot" | "paused";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  dataRegion: "eu";
  createdAt: string;
};

export type UserAccount = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited" | "disabled";
};

export type ClientRecord = {
  id: string;
  tenantId: string;
  householdId: string;
  ownerUserId: string;
  clientUserId?: string;
  name: string;
  riskLevel: "standard" | "sensitive" | "high";
  createdAt: string;
};

export type CaseStatus =
  | "draft"
  | "simulation_indicative"
  | "review_required"
  | "validated_by_professional"
  | "archived";

export type ClientCase = {
  id: string;
  tenantId: string;
  clientId: string;
  householdId: string;
  title: string;
  status: CaseStatus;
  openedAt: string;
  updatedAt: string;
  assignedExpertUserId?: string;
};

export type DocumentKind =
  | "tax_notice"
  | "loan_contract"
  | "company_statutes"
  | "life_insurance"
  | "real_estate_title"
  | "transmission_family_record"
  | "identity"
  | "other";

export type DocumentStatus = "missing" | "received" | "to_review" | "validated";

export type DocumentRecord = {
  id: string;
  tenantId: string;
  clientId: string;
  caseId: string;
  kind: DocumentKind;
  label: string;
  status: DocumentStatus;
  storageProvider: "vercel-blob-private" | "demo-placeholder";
  blobPath?: string;
  required: boolean;
  updatedAt: string;
  dataQuality: DataQualityProfile;
};

export type ReviewDecision = "pending" | "approved" | "changes_requested" | "rejected";

export type ProfessionalReview = {
  id: string;
  tenantId: string;
  caseId: string;
  reviewerUserId: string;
  decision: ReviewDecision;
  reviewedAt?: string;
  summary: string;
  requiredActions: string[];
};

export type AuditAction =
  | "case.created"
  | "document.received"
  | "simulation.run"
  | "review.requested"
  | "review.decided"
  | "data.export.requested"
  | "data.deletion.requested"
  | "data.retention.checked"
  | "document.metadata.created"
  | "golden_case.reviewed"
  | "source.checked"
  | "source.changed"
  | "rule.updated"
  | "simulation.recalculation_required"
  | "scenario.compared"
  | "report.exported";

export type AuditLogEntry = {
  id: string;
  tenantId: string;
  actorUserId: string;
  action: AuditAction;
  entityType: "case" | "document" | "simulation" | "review" | "source" | "rule" | "data_request";
  entityId: string;
  createdAt: string;
  summary: string;
  metadata?: Record<string, string | number | boolean>;
};

export type ConsentRecord = {
  id: string;
  tenantId: string;
  clientId: string;
  purpose: "simulation" | "document_storage" | "professional_review" | "ai_assistance";
  status: "granted" | "withdrawn" | "not_required";
  capturedAt: string;
};

export type DpiaRecord = {
  id: string;
  tenantId: string;
  title: string;
  riskLevel: "medium" | "high";
  status: "draft" | "in_review" | "approved";
  lastReviewedAt: string;
  mitigations: string[];
};

export type CompletenessScore = {
  householdId: string;
  score: number;
  missingItems: string[];
  checkedItems: string[];
  status: "incomplete" | "ready_for_simulation" | "review_required";
};

export type SourceSnapshot = {
  id: string;
  sourceId: string;
  sourceVersion: string;
  capturedAt: string;
  contentHash: string;
  summary: string;
  linkedRuleIds: string[];
  status: "current" | "changed" | "to-review" | "archived";
};

export type RuleDiff = {
  id: string;
  fromVersion: string;
  toVersion: string;
  changedField: string;
  impact: string;
  dossiersToRecalculate: number;
  status: "fixture" | "review_required";
};

export type ScenarioComparison = {
  id: string;
  label: string;
  netWealthEstimate: number;
  availableLiquidity: number;
  legalComplexity: "faible" | "moderee" | "elevee";
  taxRisk: "faible" | "moyen" | "eleve";
  requiredDocuments: string[];
  requiredValidation: string;
  transmissionImpact: string;
};

export type RiskRadarAxis =
  | "fiscalite"
  | "transmission"
  | "liquidite"
  | "concentration_immobiliere"
  | "dette"
  | "documentation"
  | "conformite_entreprise";

export type RiskRadarItem = {
  axis: RiskRadarAxis;
  vigilanceLevel: 1 | 2 | 3 | 4 | 5;
  label: string;
  rationale: string;
};

export type TimelineEvent = {
  id: string;
  year: string;
  title: string;
  description: string;
  status: "regulatory" | "planned" | "to-review";
};

export type DemoPersona = {
  id: string;
  name: string;
  profile: string;
  demoObjective: string;
  prefilledData: string[];
  suggestedScenarios: string[];
  expectedResults: string[];
  missingDocuments: string[];
  sourceIds: string[];
  sampleReportId: string;
};

export type MeetingBrief = {
  id: string;
  audience: "expert-comptable" | "notaire" | "avocat-fiscaliste" | "cgp";
  title: string;
  dossierSummary: string;
  questions: string[];
  documentsToBring: string[];
  taxPointsToValidate: string[];
  testedScenarios: string[];
};

export type SourceWatchResult = {
  sourceId: string;
  previousHash: string;
  currentHash: string;
  status: "unchanged" | "changed" | "failed";
  checkedAt: string;
  recommendedAction: string;
};

export type DemoRequestContext = {
  mode: "demo-fixtures";
  tenantId: string;
  userId: string;
  role: UserRole;
};

export type DocumentUploadPolicy = {
  provider: "vercel-blob-private" | "demo-placeholder";
  visibility: "private";
  allowPublicUrl: false;
  maxSizeMb: number;
  acceptedKinds: DocumentKind[];
  reason: string;
};

export type PersistedSimulationRun = SimulationRun & {
  tenantId: string;
  caseId: string;
  ruleSnapshotId: string;
  inputSnapshotId: string;
  replayable: true;
  result: IfiResult;
};

export type SimulationReplay = {
  previousRunId: string;
  replayRunId: string;
  changedFields: string[];
  previousTaxableBase: number | null;
  replayTaxableBase: number | null;
  status: "unchanged" | "changed" | "needs_review";
};

export type ReportVersion = {
  id: string;
  tenantId: string;
  caseId: string;
  version: string;
  status: "draft" | "issued_for_review" | "validated";
  generatedAt: string;
  simulationRunIds: string[];
  reviewerUserId?: string;
  validationDecision: ReviewDecision;
  evidenceSourceIds: string[];
  coverageLimitIds: string[];
};

export type TaxModule =
  | "ifi"
  | "ir-pfu-cdhr"
  | "plus-value-immo"
  | "transmission"
  | "dutreil"
  | "apport-cession"
  | "holding-tax"
  | "pea"
  | "per"
  | "bank-import"
  | "succession"
  | "per-exit"
  | "liquidity-stress"
  | "product-adequacy";

export type DossierSnapshot = {
  id: string;
  tenantId: string;
  caseId: string;
  householdId: string;
  capturedAt: string;
  assetIds: string[];
  liabilityIds: string[];
  objectiveLabels: string[];
  dataQualityScore: number;
  sourceVersionIds: string[];
};

export type PersonaInstantiation = {
  id: string;
  personaId: string;
  tenantId: string;
  caseId: string;
  householdId: string;
  title: string;
  createdAt: string;
  dossierSnapshotId: string;
  suggestedScenarioIds: string[];
  missingDocuments: string[];
};

export type ProfessionalDocumentKind =
  | "der"
  | "fil"
  | "lettre-mission"
  | "rapport-adequation"
  | "note-synthese-fiscale"
  | "checklist-lcb-ft";

export type ProfessionalDocument = {
  id: string;
  tenantId: string;
  caseId: string;
  kind: ProfessionalDocumentKind;
  title: string;
  status: "draft" | "issued_for_review" | "validated" | "archived";
  generatedAt: string;
  version: string;
  hash: string;
  requiredInputs: string[];
  professionalValidationRequired: boolean;
};

export type ValidationStatus =
  | "draft"
  | "pending_professional_review"
  | "professionally_reviewed"
  | "rejected"
  | "superseded";

export type GoldenCase = {
  id: string;
  module: TaxModule;
  title: string;
  inputSnapshotId: string;
  expected: Record<string, number | string | boolean | null>;
  actual: Record<string, number | string | boolean | null>;
  executionStatus: GoldenCaseExecutionStatus;
  coverageBadge: GoldenCaseCoverageBadge;
  failureReason?: string;
  executedAt: string;
  sourceVersionIds: string[];
  ruleVersionIds: string[];
  validationStatus: ValidationStatus;
  reviewer?: "notaire" | "avocat" | "expert-comptable" | "cgp";
  reviewedAt?: string;
  notes: string[];
};

export type DataRequestKind = "export" | "deletion";

export type DataRequest = {
  id: string;
  tenantId: string;
  clientId: string;
  caseId: string;
  kind: DataRequestKind;
  status: "draft" | "queued" | "completed" | "rejected";
  requestedAt: string;
  completedAt?: string;
  exportFormat?: "json" | "pdf";
  reason: string;
  auditLogId: string;
};

export type DataExportBundle = {
  id: string;
  tenantId: string;
  clientId: string;
  caseId: string;
  generatedAt: string;
  format: "json";
  sections: {
    client: ClientRecord;
    case: ClientCase;
    household: Household;
    simulations: TaxRun[];
    reports: ReportVersion[];
    documents: DocumentRecord[];
    audit: AuditLogEntry[];
  };
  limitations: string[];
};

export type RetentionPolicy = {
  id: string;
  tenantId: string;
  scope: "demo" | "pilot" | "production";
  personalDataMonths: number;
  auditLogYears: number;
  documentRetentionYears: number;
  deletionRequiresProfessionalApproval: boolean;
  exportAvailable: boolean;
  lastReviewedAt: string;
};

export type PrivateDocumentMetadata = {
  id: string;
  tenantId: string;
  clientId: string;
  caseId: string;
  kind: DocumentKind;
  label: string;
  status: DocumentStatus;
  storageProvider: "demo-private-metadata";
  visibility: "private";
  allowPublicUrl: false;
  sha256?: string;
  createdAt: string;
  expectedAction: string;
};

export type RepositoryReadinessReport = {
  mode: "demo-fixtures";
  tenantIsolation: "enforced-in-repository-contract";
  persistenceTarget: "postgres";
  tablesReady: string[];
  externalConnectorsRequired: string[];
  safeWithoutConnectors: true;
};

export type OfflineEvidenceSnapshot = {
  id: string;
  sourceId: string;
  capturedAt: string;
  canonicalContentHash: string;
  previousHash: string;
  status: "unchanged" | "changed";
  recommendedAction: string;
};

export type TaxRun = SimulationRun & {
  module: TaxModule;
  tenantId: string;
  caseId: string;
  dossierSnapshotId: string;
  evidenceSourceIds: string[];
  resultLabel: string;
  resultAmount?: number;
  reviewerRequired: "notaire" | "avocat" | "expert-comptable" | "cgp";
};

export type OnboardingInput = {
  householdName: string;
  matrimonialRegime: string;
  children: number;
  fiscalResidence: string;
  primaryGoal: string;
  horizon: string;
  professionalToConsult: "notaire" | "avocat" | "expert-comptable" | "cgp";
};

export type EvidenceControlResult = {
  sourceId: string;
  url: string;
  previousHash: string;
  currentHash: string;
  status: "unchanged" | "changed" | "failed";
  checkedAt: string;
  alert: boolean;
  recommendedAction: string;
  error?: string;
};

export type RuleDiffImpact = {
  id: string;
  ruleVersionId: string;
  sourceId: string;
  fromRule: string;
  toRule: string;
  effectiveFrom: string;
  legalBasisUrl: string;
  fromHash: string;
  toHash: string;
  impactedCaseIds: string[];
  impactedRuns: Array<{
    runId: string;
    caseId: string;
    caseLabel: string;
    module: TaxModule;
    metric: string;
    amountBefore: number;
    amountAfter: number;
    delta: number;
    recalculationRequired: boolean;
  }>;
  amountBefore: number;
  amountAfter: number;
  delta: number;
  auditEventIds: string[];
  recommendedAction: string;
  status: "review_required" | "no_action";
};

export type GoldenCaseExecutionStatus = "pass" | "fail" | "needs_professional_review";

export type GoldenCaseCoverageBadge =
  | "covered"
  | "partially_covered"
  | "not_covered_v1";

export type MaturityItem = {
  id: string;
  area: string;
  status: "fixtures_demo" | "production_ready_without_connector" | "not_built" | "external_connector_required";
  evidence: string;
  externalDependency?: string;
  nextAction: string;
};

export type AiAssistanceStatus = "disabled" | "draft_only" | "enabled_with_review";

export type AiGovernancePolicy = {
  id: string;
  runtimeStatus: AiAssistanceStatus;
  allowedUses: string[];
  prohibitedUses: string[];
  citationRequired: boolean;
  abstentionRequired: boolean;
};
