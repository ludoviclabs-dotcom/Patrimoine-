import { demoTenant, getDemoUser } from "../demo-data/v1";
import type {
  ClientCase,
  ClientRecord,
  DemoRequestContext,
  DocumentRecord,
  DocumentUploadPolicy,
  UserAccount,
} from "../types";

type TenantScoped = {
  tenantId: string;
};

const reviewRoles = new Set<UserAccount["role"]>(["admin", "expert"]);
const cabinetRoles = new Set<UserAccount["role"]>(["admin", "conseiller", "expert"]);
const caseWriteRoles = new Set<UserAccount["role"]>(["admin", "conseiller"]);
const evidenceAdminRoles = new Set<UserAccount["role"]>(["admin", "expert"]);

export function filterByTenant<T extends TenantScoped>(records: readonly T[], tenantId: string) {
  return records.filter((record) => record.tenantId === tenantId);
}

export function assertTenantScoped(record: TenantScoped, tenantId: string) {
  if (record.tenantId !== tenantId) {
    throw new Error("TENANT_SCOPE_VIOLATION");
  }
}

export function canAccessCase(user: UserAccount, clientCase: ClientCase) {
  if (user.tenantId !== clientCase.tenantId) {
    return false;
  }

  if (cabinetRoles.has(user.role)) {
    return true;
  }

  return false;
}

export function canAccessClient(user: UserAccount, client: ClientRecord) {
  if (user.tenantId !== client.tenantId) {
    return false;
  }

  if (cabinetRoles.has(user.role)) {
    return true;
  }

  return user.role === "client" && client.clientUserId === user.id;
}

export function canAccessCaseRecord(
  user: UserAccount,
  clientCase: ClientCase,
  client: ClientRecord,
) {
  if (user.tenantId !== clientCase.tenantId || client.tenantId !== clientCase.tenantId) {
    return false;
  }

  if (cabinetRoles.has(user.role)) {
    return true;
  }

  return user.role === "client" && client.clientUserId === user.id && clientCase.clientId === client.id;
}

export function canWriteCase(user: UserAccount, clientCase: ClientCase) {
  return user.tenantId === clientCase.tenantId && caseWriteRoles.has(user.role);
}

export function canReviewCase(user: UserAccount, clientCase: ClientCase) {
  return user.tenantId === clientCase.tenantId && reviewRoles.has(user.role);
}

export function canManageEvidence(user: UserAccount) {
  return evidenceAdminRoles.has(user.role);
}

export function canAccessDocument(
  user: UserAccount,
  document: DocumentRecord,
  client: ClientRecord,
) {
  if (user.tenantId !== document.tenantId || client.tenantId !== document.tenantId) {
    return false;
  }

  if (cabinetRoles.has(user.role)) {
    return true;
  }

  return user.role === "client" && client.clientUserId === user.id && document.clientId === client.id;
}

export function requireCaseAccess(user: UserAccount, clientCase: ClientCase) {
  if (!canAccessCase(user, clientCase)) {
    throw new Error("CASE_ACCESS_DENIED");
  }
}

export function requireCaseRecordAccess(
  user: UserAccount,
  clientCase: ClientCase,
  client: ClientRecord,
) {
  if (!canAccessCaseRecord(user, clientCase, client)) {
    throw new Error("CASE_ACCESS_DENIED");
  }
}

export function requireCaseWrite(user: UserAccount, clientCase: ClientCase) {
  if (!canWriteCase(user, clientCase)) {
    throw new Error("CASE_WRITE_DENIED");
  }
}

export function requireEvidenceAdmin(user: UserAccount) {
  if (!canManageEvidence(user)) {
    throw new Error("EVIDENCE_ADMIN_DENIED");
  }
}

export function getDemoRequestContext(role: UserAccount["role"] = "conseiller"): DemoRequestContext {
  const user = getDemoUser(role);

  return {
    mode: "demo-fixtures",
    tenantId: user.tenantId,
    userId: user.id,
    role: user.role,
  };
}

export function getDemoRoleFromRequest(request: Request) {
  const requested = request.headers.get("x-demo-role") as UserAccount["role"] | null;
  const allowed: UserAccount["role"][] = ["admin", "conseiller", "expert", "client"];

  if (requested && allowed.includes(requested)) {
    return requested;
  }

  return "conseiller";
}

export function getDocumentUploadPolicy(): DocumentUploadPolicy {
  return {
    provider: process.env.BLOB_READ_WRITE_TOKEN ? "vercel-blob-private" : "demo-placeholder",
    visibility: "private",
    allowPublicUrl: false,
    maxSizeMb: 25,
    acceptedKinds: [
      "tax_notice",
      "loan_contract",
      "company_statutes",
      "life_insurance",
      "real_estate_title",
      "transmission_family_record",
      "identity",
      "other",
    ],
    reason: "Les pieces cabinet sont privees par defaut ; aucun lien public n'est genere.",
  };
}

export function assertPrivateDocumentPolicy(policy: DocumentUploadPolicy) {
  if (policy.visibility !== "private" || policy.allowPublicUrl !== false) {
    throw new Error("DOCUMENT_POLICY_MUST_BE_PRIVATE");
  }
}

export function assertCronSecretPolicy({
  vercelEnv = process.env.VERCEL_ENV,
  cronSecret = process.env.CRON_SECRET,
}: {
  vercelEnv?: string;
  cronSecret?: string;
}) {
  if (vercelEnv === "production" && !cronSecret) {
    throw new Error("CRON_SECRET_REQUIRED_IN_PRODUCTION");
  }

  return {
    required: vercelEnv === "production",
    configured: Boolean(cronSecret),
    tenantId: demoTenant.id,
  };
}
