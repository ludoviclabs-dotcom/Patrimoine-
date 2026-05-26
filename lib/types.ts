export type EvidenceAuthority =
  | "service-public"
  | "impots"
  | "bofip"
  | "legifrance"
  | "cnil"
  | "eurlex";

export type LegalScope =
  | "IFI"
  | "transmission"
  | "facturation-electronique"
  | "rgpd";

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
  scenario: "ifi" | "transmission" | "facturation-electronique";
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
  ruleSet: "ifi" | "transmission" | "facturation-electronique" | "rgpd";
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
