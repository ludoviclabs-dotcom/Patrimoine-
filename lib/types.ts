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
  legalScope: LegalScope;
  reliability: "official" | "professional" | "internal";
  status: "active" | "to-review" | "archived";
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
};

export type Liability = {
  id: string;
  label: string;
  value: number;
  linkedCategory: "real-estate" | "company" | "personal";
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
  | "source.checked";

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
