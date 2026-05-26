export type EvidenceAuthority =
  | "service-public"
  | "impots"
  | "bofip"
  | "legifrance"
  | "cnil"
  | "eurlex"
  | "aife"
  | "amf"
  | "cnb"
  | "ordre-ec"
  | "commission-europeenne";

export type LegalScope =
  | "IFI"
  | "transmission"
  | "facturation-electronique"
  | "rgpd"
  | "donation"
  | "plus-value"
  | "sci"
  | "ai-act";

export type EvidenceSource = {
  id: string;
  title: string;
  authority: EvidenceAuthority;
  url: string;
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
  module: "ifi" | "transmission" | "facturation-electronique" | "donation" | "plus-value" | "sci";
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
    | "sci-arbitrage";
  householdId: string;
  status: "indicative" | "needs_review";
  steps: CalculationStep[];
  createdAt: string;
};

export type AssetCategory =
  | "liquidity"
  | "financial"
  | "insurance"
  | "real-estate"
  | "company";

export type Asset = {
  id: string;
  label: string;
  category: AssetCategory;
  value: number;
  ifiKind?: "main-residence" | "rental" | "sci" | "excluded";
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
    | "ai-governance";
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
  | "source.checked"
  | "source.changed"
  | "rule.updated"
  | "scenario.compared"
  | "report.exported";

export type AuditLogEntry = {
  id: string;
  tenantId: string;
  actorUserId: string;
  action: AuditAction;
  entityType: "case" | "document" | "simulation" | "review" | "source" | "data_request";
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

export type AiAssistanceStatus = "disabled" | "draft_only" | "enabled_with_review";

export type AiGovernancePolicy = {
  id: string;
  runtimeStatus: AiAssistanceStatus;
  allowedUses: string[];
  prohibitedUses: string[];
  citationRequired: boolean;
  abstentionRequired: boolean;
};
